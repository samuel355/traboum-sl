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
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = body.role;

  if (!firstName || !lastName || !email || !password || !ALL_TSL_ROLES.includes(role)) {
    return NextResponse.json({ error: "First name, last name, email, password and role are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
  }

  if (role === ROLES.SYSADMIN && !can(requesterRole, "grantSysadmin")) {
    return NextResponse.json({ error: "Only a sysadmin can grant the sysadmin role" }, { status: 403 });
  }

  const client = await clerkClient();

  try {
    const createdUser = await client.users.createUser({
      firstName,
      lastName,
      emailAddress: [email],
      password,
      publicMetadata: { role },
    });

    await supabaseAdmin().from("tsl_staff").upsert({
      clerk_user_id: createdUser.id,
      role,
      updated_by: requester.id,
      updated_at: new Date().toISOString(),
    });

    const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
    await writeAuditLog({
      actorId: requester.id,
      actorName: requesterName,
      actorRole: requesterRole,
      action: "user.created",
      entityType: "clerk_user",
      entityId: createdUser.id,
      metadata: { targetName: `${firstName} ${lastName}`.trim(), email, role },
    });

    return NextResponse.json({ ok: true, user: { id: createdUser.id, email } });
  } catch (err) {
    console.error("Failed to create Clerk user", err);
    const message =
      err?.errors?.[0]?.longMessage ||
      err?.errors?.[0]?.message ||
      err?.message ||
      "Failed to create staff account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
