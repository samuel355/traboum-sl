import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(request, { params }) {
  const requester = await currentUser();
  const requesterRole = getEffectiveRole(requester);
  if (!requester || !can(requesterRole, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await clerkClient();
  try {
    await client.invitations.revokeInvitation(params.invitationId);
  } catch (err) {
    console.error("Failed to revoke invitation", params.invitationId, err);
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }

  const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.username;
  await writeAuditLog({
    actorId: requester.id,
    actorName: requesterName,
    actorRole: requesterRole,
    action: "staff.invite_revoked",
    entityType: "clerk_invitation",
    entityId: params.invitationId,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
