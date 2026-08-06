import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { DOC_TYPES, DOCUMENTS_TABLE } from "@/lib/clients";
import { clientDocumentKey, uploadToR2 } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const clientId = form.get("clientId");
  const docType = form.get("docType");
  const label = form.get("label");
  const plotNumber = form.get("plotNumber");
  const file = form.get("file");

  if (!clientId || !docType || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  let fileUrl;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fileUrl = await uploadToR2(buffer, clientDocumentKey(clientId, docType, file.name), file.type || "application/octet-stream");
  } catch (err) {
    console.error("Failed to upload document", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  const { data: document, error } = await db
    .from(DOCUMENTS_TABLE)
    .insert({
      client_id: clientId,
      plot_number: plotNumber || null,
      doc_type: docType,
      label: label || null,
      file_url: fileUrl,
      file_name: file.name,
      mime_type: file.type || null,
      uploaded_by: user.id,
      uploaded_by_name: actorName,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save document", error);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "document.uploaded",
    entityType: DOCUMENTS_TABLE,
    entityId: document.id,
    metadata: { clientId, docType, label: label || undefined, fileName: file.name },
  });

  return NextResponse.json({ document });
}
