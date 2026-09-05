import { DOCUMENTS_TABLE } from "@/lib/clients";
import { clientDocumentKey, deleteFromR2ByUrl, uploadToR2 } from "@/lib/r2";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);

export function validateClientPhoto(file) {
  if (!file || file.size === 0) return null;
  if (!PHOTO_TYPES.has(file.type)) {
    throw new Error("Client photo must be a JPG or PNG image");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Client photo must be 8 MB or smaller");
  }
  return file;
}

export async function saveClientPhoto(db, clientId, file, uploadedBy, uploadedByName) {
  validateClientPhoto(file);
  if (!file || file.size === 0) return null;

  const { data: existing } = await db
    .from(DOCUMENTS_TABLE)
    .select("*")
    .eq("client_id", clientId)
    .eq("doc_type", "passport_photo")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileUrl = await uploadToR2(
    buffer,
    clientDocumentKey(clientId, "passport_photo", file.name || "client-photo.jpg"),
    file.type,
  );

  let document;
  if (existing) {
    const { data, error } = await db
      .from(DOCUMENTS_TABLE)
      .update({
        file_url: fileUrl,
        file_name: file.name || "client-photo",
        mime_type: file.type,
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      await deleteFromR2ByUrl(fileUrl);
      throw error;
    }
    document = data;
    await deleteFromR2ByUrl(existing.file_url);
  } else {
    const { data, error } = await db
      .from(DOCUMENTS_TABLE)
      .insert({
        client_id: clientId,
        doc_type: "passport_photo",
        label: "Client photo",
        file_url: fileUrl,
        file_name: file.name || "client-photo",
        mime_type: file.type,
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
      })
      .select()
      .single();
    if (error) {
      await deleteFromR2ByUrl(fileUrl);
      throw error;
    }
    document = data;
  }

  return document;
}
