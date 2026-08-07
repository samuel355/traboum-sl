import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { DOC_TYPES, DOCUMENTS_TABLE } from "@/lib/clients";
import { clientDocumentKey, deleteFromR2ByUrl, uploadToR2 } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";

// Handles both metadata edits and file replacement — if `file` is present,
// the old R2 object is deleted and the new one takes its place.
export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing, error: fetchError } = await db
    .from(DOCUMENTS_TABLE)
    .select("*")
    .eq("id", params.documentId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const form = await request.formData();
  const docType = form.get("docType");
  const label = form.get("label");
  const plotNumber = form.get("plotNumber");
  const file = form.get("file");

  if (docType && !DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const updates = {};
  if (docType) updates.doc_type = docType;
  if (form.has("label")) updates.label = label || null;
  if (form.has("plotNumber")) updates.plot_number = plotNumber || null;

  if (file && file.size > 0) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const newUrl = await uploadToR2(
        buffer,
        clientDocumentKey(existing.client_id, docType || existing.doc_type, file.name),
        file.type || "application/octet-stream",
      );
      await deleteFromR2ByUrl(existing.file_url);
      updates.file_url = newUrl;
      updates.file_name = file.name;
      updates.mime_type = file.type || null;
    } catch (err) {
      console.error("Failed to replace document file", err);
      return NextResponse.json({ error: "Failed to upload new file" }, { status: 500 });
    }
  }

  const { data: document, error } = await db
    .from(DOCUMENTS_TABLE)
    .update(updates)
    .eq("id", params.documentId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update document", params.documentId, error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "document.updated",
    entityType: DOCUMENTS_TABLE,
    entityId: params.documentId,
    metadata: { ...updates, replacedFile: Boolean(file && file.size > 0) },
  });

  return NextResponse.json({ document });
}

export async function DELETE(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db.from(DOCUMENTS_TABLE).select("*").eq("id", params.documentId).maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { error } = await db.from(DOCUMENTS_TABLE).delete().eq("id", params.documentId);
  if (error) {
    console.error("Failed to delete document", params.documentId, error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  await deleteFromR2ByUrl(existing.file_url);

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "document.deleted",
    entityType: DOCUMENTS_TABLE,
    entityId: params.documentId,
    metadata: { docType: existing.doc_type, label: existing.label, fileName: existing.file_name },
  });

  return NextResponse.json({ ok: true });
}
