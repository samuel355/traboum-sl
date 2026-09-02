import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const requester = await currentUser();
  const requesterRole = getEffectiveRole(requester);
  if (!requester || !can(requesterRole, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const client = await clerkClient();
  const target = await client.users.getUser(userId);
  const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
  const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.username;

  try {
    await client.users.deleteUser(userId);
    await supabaseAdmin().from("tsl_staff").delete().eq("clerk_user_id", userId);

    await writeAuditLog({
      actorId: requester.id,
      actorName: requesterName,
      actorRole: requesterRole,
      action: "user.deleted",
      entityType: "clerk_user",
      entityId: userId,
      metadata: { targetName, email: target.primaryEmailAddress?.emailAddress || null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete staff user", err);
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Failed to remove staff member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
