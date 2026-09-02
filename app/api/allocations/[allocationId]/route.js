import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATION_STAGES, ALLOCATIONS_TABLE, PLOT_TABLE } from "@/lib/plots";
import { deleteFromR2ByUrl } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";

const STATUS_KEYS = ALLOCATION_STAGES.map((s) => s.key);

export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing, error: fetchError } = await db
    .from(ALLOCATIONS_TABLE)
    .select("*")
    .eq("id", params.allocationId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates = {};

  if ("clientName" in body) updates.client_name = String(body.clientName ?? "").trim();
  if ("clientEmail" in body) updates.client_email = body.clientEmail || null;
  if ("clientPhone" in body) updates.client_phone = String(body.clientPhone ?? "").trim();
  if ("clientAddress" in body) updates.client_address = body.clientAddress || null;
  if ("agent" in body) updates.agent = String(body.agent ?? "").trim();
  if ("plotNumber" in body) updates.plot_number = body.plotNumber || null;
  if ("streetName" in body) updates.street_name = body.streetName || null;
  if ("amount" in body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }
    updates.amount = amount;
  }

  if ("status" in body) {
    if (!STATUS_KEYS.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.status === "collected" && existing.status === "pending") {
      return NextResponse.json(
        { error: "This allocation must be signed by the chief before it can be marked as collected." },
        { status: 409 },
      );
    }
    updates.status = body.status;
  }

  if ("clientName" in updates && !updates.client_name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }
  if ("clientPhone" in updates && !updates.client_phone) {
    return NextResponse.json({ error: "Client phone is required" }, { status: 400 });
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data: allocation, error } = await db
    .from(ALLOCATIONS_TABLE)
    .update(updates)
    .eq("id", params.allocationId)
    .select()
    .single();

  if (error || !allocation) {
    console.error("Failed to update allocation", params.allocationId, error);
    return NextResponse.json({ error: "Failed to update allocation" }, { status: 500 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "allocation.updated",
    entityType: ALLOCATIONS_TABLE,
    entityId: params.allocationId,
    metadata: updates,
  });

  return NextResponse.json({ allocation });
}

export async function DELETE(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from(ALLOCATIONS_TABLE)
    .select("*")
    .eq("id", params.allocationId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  const { error } = await db.from(ALLOCATIONS_TABLE).delete().eq("id", params.allocationId);
  if (error) {
    console.error("Failed to delete allocation", params.allocationId, error);
    return NextResponse.json({ error: "Failed to delete allocation" }, { status: 500 });
  }

  // Deleting the record undoes the sale — free the plot back up.
  await db.from(PLOT_TABLE).update({ status: "Available" }).eq("id", existing.plot_id);

  if (existing.pdf_url) {
    await deleteFromR2ByUrl(existing.pdf_url);
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "allocation.deleted",
    entityType: ALLOCATIONS_TABLE,
    entityId: params.allocationId,
    metadata: { plotNumber: existing.plot_number, clientName: existing.client_name },
  });

  return NextResponse.json({ ok: true });
}
