import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { createR2UploadUrl, publicR2Url } from "@/lib/r2";

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "transfer")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const fileSize = Number(body.fileSize);
  if (!["image/jpeg", "image/png"].includes(contentType) || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Client photo must be a JPG or PNG image up to 8 MB" }, { status: 400 });
  }

  const key = `transfers/${new Date().getFullYear()}/client-photo-${crypto.randomUUID()}.${contentType === "image/png" ? "png" : "jpg"}`;
  try {
    const uploadUrl = await createR2UploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, fileUrl: publicR2Url(key) });
  } catch (error) {
    console.error("Failed to create transfer client photo upload URL", error);
    return NextResponse.json({ error: "Could not prepare client photo upload" }, { status: 500 });
  }
}
