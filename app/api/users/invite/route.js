import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { ALL_TSL_ROLES, can, getEffectiveRole, ROLES } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit";

// Creates a brand-new staff account via Clerk's invitation flow, with the
// role already attached to publicMetadata — it lands on the user the moment
// they accept, so there's no separate "search and assign" step needed for
// people who don't have an account yet (unlike /api/users/assign-role,
// which only works for users who've already signed in at least once).
export async function POST(request) {
  const requester = await currentUser();
  const requesterRole = getEffectiveRole(requester);
  if (!requester || !can(requesterRole, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await request.json();
  const normalizedEmail = String(email ?? "").trim();
  if (!normalizedEmail || !ALL_TSL_ROLES.includes(role)) {
    return NextResponse.json({ error: "A valid email and role are required" }, { status: 400 });
  }
  if (role === ROLES.SYSADMIN && !can(requesterRole, "grantSysadmin")) {
    return NextResponse.json({ error: "Only a sysadmin can grant the sysadmin role" }, { status: 403 });
  }

  const client = await clerkClient();
  let invitation;
  try {
    invitation = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      publicMetadata: { role },
      notify: true,
    });
  } catch (err) {
    console.error("Failed to create invitation", err);
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
  await writeAuditLog({
    actorId: requester.id,
    actorName: requesterName,
    actorRole: requesterRole,
    action: "staff.invited",
    entityType: "clerk_invitation",
    entityId: invitation.id,
    metadata: { email: normalizedEmail, role },
  });

  return NextResponse.json({ invitation });
}
