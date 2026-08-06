import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ALL_TSL_ROLES, can, getEffectiveRole, ROLES } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const requester = await currentUser();
  const requesterRole = getEffectiveRole(requester);
  if (!requester || !can(requesterRole, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role } = await request.json();
  if (!userId || !ALL_TSL_ROLES.includes(role)) {
    return NextResponse.json({ error: "A valid userId and role are required" }, { status: 400 });
  }
  if (role === ROLES.SYSADMIN && !can(requesterRole, "grantSysadmin")) {
    return NextResponse.json({ error: "Only a sysadmin can grant the sysadmin role" }, { status: 403 });
  }

  const client = await clerkClient();
  const target = await client.users.updateUser(userId, { publicMetadata: { role } });
  const requesterName =
    [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
  const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.username;

  await supabaseAdmin().from("tsl_staff").upsert({
    clerk_user_id: userId,
    role,
    updated_by: requester.id,
    updated_at: new Date().toISOString(),
  });

  await writeAuditLog({
    actorId: requester.id,
    actorName: requesterName,
    actorRole: requesterRole,
    action: "user.role_updated",
    entityType: "clerk_user",
    entityId: userId,
    metadata: { targetName, role },
  });

  return NextResponse.json({ ok: true });
}
