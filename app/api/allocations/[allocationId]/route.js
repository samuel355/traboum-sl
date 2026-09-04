import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATION_STAGES, ALLOCATIONS_TABLE, PLOT_TABLE } from "@/lib/plots";
import { allocationPdfKey, deleteFromR2ByUrl, uploadToR2 } from "@/lib/r2";
import { generateAllocationPdf } from "@/lib/pdf";
import { writeAuditLog } from "@/lib/audit";

const STATUS_KEYS = ALLOCATION_STAGES.map((s) => s.key);

export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing, error: fetchError } = await db
    .from(ALLOCATIONS_TABLE)
    .select("*")
    .eq("id", params.allocationId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates = {};

  if ("clientName" in body) updates.client_name = String(body.clientName ?? "").trim();
  if ("clientEmail" in body) updates.client_email = body.clientEmail || null;
  if ("clientPhone" in body) updates.client_phone = String(body.clientPhone ?? "").trim();
  if ("clientAddress" in body) updates.client_address = body.clientAddress || null;
  if ("agent" in body) updates.agent = String(body.agent ?? "").trim() || null;
  if ("plotNumber" in body) updates.plot_number = body.plotNumber || null;
  if ("streetName" in body) updates.street_name = body.streetName || null;
  if ("amount" in body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    updates.amount = amount;
  }

  if ("status" in body) {
    if (!STATUS_KEYS.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const nextStatus = {
      pending: "signed",
      signed: "ready_to_collect",
      ready_to_collect: "collected",
    }[existing.status];
    if (body.status !== existing.status && body.status !== nextStatus) {
      return NextResponse.json(
        { error: "Allocation statuses must be updated in order." },
        { status: 409 },
      );
    }
    updates.status = body.status;
  }

  if ("clientName" in updates && !updates.client_name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }
  if ("clientPhone" in updates && !updates.client_phone) {
    return NextResponse.json({ error: "Client phone is required" }, { status: 400 });
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: allocation, error } = await db
    .from(ALLOCATIONS_TABLE)
    .update(updates)
    .eq("id", params.allocationId)
    .select()
    .single();

  if (error || !allocation) {
    console.error("Failed to update allocation", params.allocationId, error);
    return NextResponse.json({ error: "Failed to update allocation" }, { status: 500 });
  }

  const allocationDate = allocation.created_at || new Date().toISOString();
  const date = new Date(allocationDate);
  const referenceNumber = `TSL-${String(allocation.id).slice(-8).toUpperCase()}`;
  const fileNumber = `TSL-${String(allocation.plot_number || "PLOT")
    .replace(/\s+/g, "")
    .toUpperCase()}-${date.getFullYear()}`;
  const pdfBuffer = await generateAllocationPdf({
    allocationId: allocation.id,
    referenceNumber,
    fileNumber,
    allocationDate,
    plotNumber: allocation.plot_number,
    streetName: allocation.street_name,
    clientName: allocation.client_name,
    clientEmail: allocation.client_email,
    clientPhone: allocation.client_phone,
    clientAddress: allocation.client_address,
    agent: allocation.agent,
    amount: allocation.amount,
    date,
    kind: "Allocation",
  });

  let pdfUrl = allocation.pdf_url;
  try {
    pdfUrl = await uploadToR2(pdfBuffer, allocationPdfKey(allocation.id), "application/pdf");
    const { error: pdfUpdateError } = await db
      .from(ALLOCATIONS_TABLE)
      .update({ reference_number: referenceNumber, file_number: fileNumber, pdf_url: pdfUrl })
      .eq("id", allocation.id);
    if (pdfUpdateError) throw pdfUpdateError;
    allocation.reference_number = referenceNumber;
    allocation.file_number = fileNumber;
    allocation.pdf_url = pdfUrl;
  } catch (pdfError) {
    console.error("Failed to refresh allocation PDF", allocation.id, pdfError);
    return NextResponse.json({ error: "Allocation saved, but the document could not be refreshed" }, { status: 500 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "allocation.updated",
    entityType: ALLOCATIONS_TABLE,
    entityId: params.allocationId,
    metadata: updates,
  });

  return NextResponse.json({ allocation });
}

export async function DELETE(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from(ALLOCATIONS_TABLE)
    .select("*")
    .eq("id", params.allocationId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  const { error } = await db.from(ALLOCATIONS_TABLE).delete().eq("id", params.allocationId);
  if (error) {
    console.error("Failed to delete allocation", params.allocationId, error);
    return NextResponse.json({ error: "Failed to delete allocation" }, { status: 500 });
  }

  // Deleting the record undoes the sale — free the plot back up.
  await db.from(PLOT_TABLE).update({ status: "Available" }).eq("id", existing.plot_id);

  if (existing.pdf_url) {
    await deleteFromR2ByUrl(existing.pdf_url);
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "allocation.deleted",
    entityType: ALLOCATIONS_TABLE,
    entityId: params.allocationId,
    metadata: { plotNumber: existing.plot_number, clientName: existing.client_name },
  });

  return NextResponse.json({ ok: true });
}
