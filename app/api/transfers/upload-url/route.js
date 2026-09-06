import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { createR2UploadUrl, publicR2Url, transferOldDocKey } from "@/lib/r2";

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "transfer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const fileSize = Number(body.fileSize);

  if (!fileName || !contentType || !Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "A valid document is required" }, { status: 400 });
  }
  if (!(contentType === "application/pdf" || contentType.startsWith("image/"))) {
    return NextResponse.json({ error: "Only PDF and image documents are supported" }, { status: 400 });
  }
  if (fileSize > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "The document must be 25 MB or smaller" }, { status: 400 });
  }

  const key = transferOldDocKey(crypto.randomUUID(), fileName);
  try {
    const uploadUrl = await createR2UploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, fileUrl: publicR2Url(key) });
  } catch (error) {
    console.error("Failed to create transfer document upload URL", error);
    return NextResponse.json({ error: "Could not prepare document upload" }, { status: 500 });
  }
}
