import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 is S3-compatible, so the AWS SDK works against it unmodified
// once pointed at the account's R2 endpoint. Server-only (needs the secret
// access key) — never import from a "use client" component.
function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not set");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a buffer to R2 under `key` and returns its public URL.
 * `key` should include a folder prefix, e.g. "allocations/2026/uuid.pdf".
 */
export async function uploadToR2(buffer, key, contentType) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET is not set");

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not set");
  return `${base}/${key}`;
}

export function allocationPdfKey(allocationId) {
  const year = new Date().getFullYear();
  return `allocations/${year}/${allocationId}.pdf`;
}

export function transferPdfKey(transferId) {
  const year = new Date().getFullYear();
  return `transfers/${year}/${transferId}-allocation.pdf`;
}

export function transferOldDocKey(transferId, originalFilename) {
  const year = new Date().getFullYear();
  const ext = originalFilename?.split(".").pop() || "bin";
  return `transfers/${year}/${transferId}-old-allocation.${ext}`;
}

export function clientDocumentKey(clientId, docType, originalFilename) {
  const year = new Date().getFullYear();
  const ext = originalFilename?.split(".").pop() || "bin";
  return `clients/${year}/${clientId}/${docType}-${Date.now()}.${ext}`;
}

/** Deletes an object given its full public URL (derives the key from R2_PUBLIC_URL). */
export async function deleteFromR2ByUrl(fileUrl) {
  const bucket = process.env.R2_BUCKET;
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !base || !fileUrl?.startsWith(`${base}/`)) return;

  const key = fileUrl.slice(base.length + 1);
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
