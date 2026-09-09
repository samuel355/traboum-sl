import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATION_STAGES, ALLOCATIONS_TABLE, PLOT_TABLE } from "@/lib/plots";
import { allocationPdfKey, deleteFromR2ByUrl, uploadToR2 } from "@/lib/r2";
import { generateAllocationPdf } from "@/lib/pdf";
import { writeAuditLog } from "@/lib/audit";
import { saveClientPhoto } from "@/lib/client-photo";
import { DOCUMENTS_TABLE } from "@/lib/clients";

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

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("multipart/form-data") ? await request.formData() : await request.json();
  const has = (key) => (body instanceof FormData ? body.has(key) : key in body);
  const get = (key) => (body.get ? body.get(key) : body[key]);
  const updates = {};
  const regenerateDocument = has("regenerateDocument") && String(get("regenerateDocument")) === "true";

  if (has("clientName")) updates.client_name = String(get("clientName") ?? "").trim();
  if (has("clientEmail")) updates.client_email = get("clientEmail") || null;
  if (has("clientPhone")) updates.client_phone = String(get("clientPhone") ?? "").trim();
  if (has("clientAddress")) updates.client_address = get("clientAddress") || null;
  if (has("agent")) updates.agent = String(get("agent") ?? "").trim() || null;
  if (has("plotNumber")) updates.plot_number = get("plotNumber") || null;
  if (has("streetName")) updates.street_name = get("streetName") || null;
  if (has("amount")) {
    const amount = Number(get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    updates.amount = amount;
  }

  if (has("status")) {
    const status = get("status");
    if (!STATUS_KEYS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const nextStatus = {
      pending: "signed",
      signed: "ready_to_collect",
      ready_to_collect: "collected",
    }[existing.status];
    if (status !== existing.status && status !== nextStatus) {
      return NextResponse.json(
        { error: "Allocation statuses must be updated in order." },
        { status: 409 },
      );
    }
    updates.status = status;
  }

  let clientPhotoUrl;
  const clientPhoto = get("clientPhoto");
  if (clientPhoto && clientPhoto.size > 0) {
    try {
      const photo = await saveClientPhoto(
        db,
        existing.client_id,
        clientPhoto,
        user.id,
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      );
      clientPhotoUrl = photo.file_url;
    } catch (error) {
      return NextResponse.json({ error: error.message || "Failed to save client photo" }, { status: 400 });
    }
  } else {
    const { data: existingPhoto } = await db
      .from(DOCUMENTS_TABLE)
      .select("file_url")
      .eq("client_id", existing.client_id)
      .eq("doc_type", "passport_photo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    clientPhotoUrl = existingPhoto?.file_url;
  }

  if ("client_phone" in updates && !updates.client_phone) {
    return NextResponse.json({ error: "Client phone is required" }, { status: 400 });
  }

  if (!Object.keys(updates).length && !(clientPhoto && clientPhoto.size > 0) && !regenerateDocument) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: allocation, error } = Object.keys(updates).length
    ? await db
        .from(ALLOCATIONS_TABLE)
        .update(updates)
        .eq("id", params.allocationId)
        .select()
        .single()
    : { data: existing, error: null };

  if (error || !allocation) {
    console.error("Failed to update allocation", params.allocationId, error);
    return NextResponse.json({ error: "Failed to update allocation" }, { status: 500 });
  }

  const statusOnlyUpdate = Object.keys(updates).length === 1 && "status" in updates && !regenerateDocument;
  if (statusOnlyUpdate) {
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
    clientPhotoUrl,
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
