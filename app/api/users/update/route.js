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

  const body = await request.json();
  const userId = body.userId;
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const role = body.role;

  if (!userId || !firstName || !lastName || !username || !email || !ALL_TSL_ROLES.includes(role)) {
    return NextResponse.json({ error: "User ID, first name, last name, username, email and role are required" }, { status: 400 });
  }

  if (role === ROLES.SYSADMIN && !can(requesterRole, "grantSysadmin")) {
    return NextResponse.json({ error: "Only a sysadmin can grant the sysadmin role" }, { status: 403 });
  }

  const client = await clerkClient();

  try {
    const updatePayload = {
      firstName,
      lastName,
      username,
      emailAddress: [email],
      publicMetadata: { role },
    };

    if (password) {
      updatePayload.password = password;
    }

    const updatedUser = await client.users.updateUser(userId, updatePayload);

    await supabaseAdmin().from("tsl_staff").upsert({
      clerk_user_id: userId,
      role,
      updated_by: requester.id,
      updated_at: new Date().toISOString(),
    });

    const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
    const targetName = [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(" ") || updatedUser.username;

    await writeAuditLog({
      actorId: requester.id,
      actorName: requesterName,
      actorRole: requesterRole,
      action: "user.role_updated",
      entityType: "clerk_user",
      entityId: userId,
      metadata: { targetName, email, role },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update staff user", err);
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Failed to update user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
