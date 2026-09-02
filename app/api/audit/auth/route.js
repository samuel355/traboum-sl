import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit";

const AUTH_ACTIONS = new Set(["auth.signed_in", "auth.signed_out"]);

export async function POST(request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { action } = await request.json();
  if (!AUTH_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid authentication action" }, { status: 400 });
  }

  const role = getEffectiveRole(user);
  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.id;

  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: isAllowedRole(role) ? role : null,
    action,
    entityType: "authentication",
    entityId: user.id,
    metadata: { email: user.primaryEmailAddress?.emailAddress || null },
  });

  return NextResponse.json({ ok: true });
}
