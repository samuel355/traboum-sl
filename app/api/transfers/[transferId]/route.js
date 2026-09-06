import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { canManagePlot, PLOT_TABLE } from "@/lib/plots";
import { findOrCreateClient } from "@/lib/clients";
import { generateAllocationPdf } from "@/lib/pdf";
import { deleteFromR2ByUrl, transferPdfKey, uploadToR2 } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";
import { saveClientPhotoFromUrl } from "@/lib/client-photo";
import { DOCUMENTS_TABLE } from "@/lib/clients";

async function authorizeTransfer(transferId, role) {
  const db = supabaseAdmin();
  const { data: transfer, error } = await db.from("tsl_transfers").select("*").eq("id", transferId).maybeSingle();
  if (error || !transfer) return { db, transfer: null, response: NextResponse.json({ error: "Transfer not found" }, { status: 404 }) };
  if (!String(transfer.plot_id).startsWith("manual-")) {
    const { data: plot } = await db.from(PLOT_TABLE).select("owner").eq("id", transfer.plot_id).maybeSingle();
    if (plot && !canManagePlot(role, plot, "transfer")) {
      return { db, transfer: null, response: NextResponse.json({ error: "This plot isn't managed by Trabuom Stool Lands" }, { status: 403 }) };
    }
  }
  return { db, transfer, response: null };
}

export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "transfer")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const authorized = await authorizeTransfer(params.transferId, role);
  if (authorized.response) return authorized.response;
  const { db, transfer } = authorized;
  const body = await request.json();
  const plotId = String(body.plotId || transfer.plot_id);
  const plotNumber = String(body.plotNumber || "").trim();
  const streetName = String(body.streetName || "").trim();
  const oldAllocationFileUrl = String(body.oldAllocationFileUrl || transfer.old_allocation_file_url || "");
  const clientPhotoUrl = String(body.clientPhotoUrl || "");
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const address = String(body.address || "").trim();
  const paymentAmount = Number(body.amount);
  const paymentMethod = String(body.method || "").trim();
  const paymentReference = String(body.reference || "").trim();

  const publicR2Base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!plotId || !name || !phone || !Number.isFinite(paymentAmount) || paymentAmount <= 0 || !paymentMethod || !oldAllocationFileUrl) {
    return NextResponse.json({ error: "Plot, name, phone, positive payment amount, payment method, and old allocation document are required" }, { status: 400 });
  }
  if (publicR2Base && !oldAllocationFileUrl.startsWith(`${publicR2Base}/transfers/`)) {
    return NextResponse.json({ error: "Invalid old allocation document" }, { status: 400 });
  }
  if (!String(plotId).startsWith("manual-")) {
    const { data: plot } = await db.from(PLOT_TABLE).select("owner").eq("id", plotId).maybeSingle();
    if (!plot || !canManagePlot(role, plot, "transfer")) {
      return NextResponse.json({ error: "The selected plot cannot be used for this transfer" }, { status: 403 });
    }
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  let clientId;
  try {
    clientId = await findOrCreateClient(db, { name, phone, email, address, userId: user.id, userName: actorName });
    if (clientPhotoUrl) await saveClientPhotoFromUrl(db, clientId, clientPhotoUrl, user.id, actorName);
  } catch (error) {
    console.error("Failed to find/create edited transfer client", error);
    return NextResponse.json({ error: "Failed to save client details" }, { status: 500 });
  }

  let resolvedPhotoUrl = clientPhotoUrl || null;
  if (!resolvedPhotoUrl) {
    const { data: existingPhoto } = await db.from(DOCUMENTS_TABLE).select("file_url").eq("client_id", clientId).eq("doc_type", "passport_photo").order("created_at", { ascending: false }).limit(1).maybeSingle();
    resolvedPhotoUrl = existingPhoto?.file_url || null;
  }

  const date = new Date();
  const referenceNumber = `TSL-${String(transfer.id).slice(-8).toUpperCase()}`;
  const fileNumber = `TSL-${String(plotNumber || "PLOT").replace(/\s+/g, "").toUpperCase()}-${date.getFullYear()}`;
  let pdfBuffer;
  try {
    pdfBuffer = await generateAllocationPdf({
      allocationId: transfer.id,
      referenceNumber,
      fileNumber,
      allocationDate: transfer.recorded_at || date.toISOString(),
      plotNumber,
      streetName,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      clientAddress: address,
      clientPhotoUrl: resolvedPhotoUrl,
      agent: transfer.recorded_by_name || actorName,
      amount: paymentAmount,
      date,
    });
  } catch (error) {
    console.error("Failed to regenerate transfer PDF", error);
    return NextResponse.json({ error: "Failed to regenerate transfer document" }, { status: 500 });
  }

  let pdfUrl;
  try {
    pdfUrl = await uploadToR2(pdfBuffer, transferPdfKey(transfer.id), "application/pdf");
  } catch (error) {
    console.error("Failed to upload edited transfer PDF", error);
    return NextResponse.json({ error: "Failed to save updated transfer document" }, { status: 500 });
  }

  const { data: updated, error } = await db
    .from("tsl_transfers")
    .update({
      client_id: clientId,
      plot_id: plotId,
      plot_number: plotNumber,
      street_name: streetName || null,
      new_client_name: name,
      new_client_email: email || null,
      new_client_phone: phone,
      new_client_address: address || null,
      payment_amount: paymentAmount,
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      pdf_url: pdfUrl,
      old_allocation_file_url: oldAllocationFileUrl,
    })
    .eq("id", transfer.id)
    .select()
    .single();
  if (error) {
    console.error("Failed to update transfer", error);
    return NextResponse.json({ error: "Failed to update transfer" }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "transfer.updated",
    entityType: "tsl_transfers",
    entityId: transfer.id,
    metadata: { plotId, plotNumber, newClientName: name, paymentAmount, paymentMethod },
  });

  return NextResponse.json({ transfer: updated });
}

export async function DELETE(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "transfer")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const authorized = await authorizeTransfer(params.transferId, role);
  if (authorized.response) return authorized.response;
  const { db, transfer } = authorized;
  const { error } = await db.from("tsl_transfers").delete().eq("id", transfer.id);
  if (error) {
    console.error("Failed to delete transfer", error);
    return NextResponse.json({ error: "Failed to delete transfer" }, { status: 500 });
  }

  await Promise.allSettled([deleteFromR2ByUrl(transfer.pdf_url), deleteFromR2ByUrl(transfer.old_allocation_file_url), writeAuditLog({
    actorId: user.id,
    actorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
    actorRole: role,
    action: "transfer.deleted",
    entityType: "tsl_transfers",
    entityId: transfer.id,
    metadata: { plotId: transfer.plot_id, plotNumber: transfer.plot_number, newClientName: transfer.new_client_name },
  })]);

  return NextResponse.json({ ok: true });
}
