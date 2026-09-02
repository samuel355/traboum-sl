import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE, PLOT_TABLE } from "@/lib/plots";
import { writeAuditLog } from "@/lib/audit";

const VALID_OWNERS = ["tsl", "lhc", null];
const VALID_STATUSES = ["Available", "Reserved", "Sold", "On Hold"];

function normalizeOwnerValue(value) {
  if (value === null || value === undefined || value === "") return "tsl";
  const trimmed = String(value).trim();
  return trimmed || "tsl";
}

// Read-only detail fetch for the "View plot details" modal — any signed-in
// dashboard role can view, not just those who can allocate/transfer.
export async function GET(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !isAllowedRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const [{ data: plot, error: plotError }, { data: allocations }, { data: transfers }] = await Promise.all([
    db.from(PLOT_TABLE).select("*").eq("id", params.plotId).single(),
    db
      .from(ALLOCATIONS_TABLE)
      .select("*")
      .eq("plot_id", String(params.plotId))
      .order("created_at", { ascending: false }),
    db
      .from("tsl_transfers")
      .select("*")
      .eq("plot_id", String(params.plotId))
      .order("created_at", { ascending: false }),
  ]);

  if (plotError || !plot) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }

  return NextResponse.json({ plot, allocations: allocations ?? [], transfers: transfers ?? [] });
}

// Sysadmin-only correction endpoint — sets the tsl/lhc ownership split and/or
// status directly on the plot row. Deliberately narrow: only these two
// top-level columns, never the raw GIS properties blob shared with get-plot.
export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "editPlots")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  if ("owner" in body) {
    const normalizedOwner = normalizeOwnerValue(body.owner);
    if (typeof normalizedOwner !== "string" || !normalizedOwner.length) {
      return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
    }
    if (!VALID_OWNERS.includes(normalizedOwner) && !body.owner) {
      return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
    }
    updates.owner = normalizedOwner;
  }
  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  const incomingPlotNumber = "plotNumber" in body ? body.plotNumber : "plot_number" in body ? body.plot_number : undefined;
  if ("plotNumber" in body || "plot_number" in body) {
    const trimmed = typeof incomingPlotNumber === "string" ? incomingPlotNumber.trim() : incomingPlotNumber ?? null;
    updates.plot_number = trimmed || null;
  }

  const incomingStreetName = "streetName" in body ? body.streetName : "street_name" in body ? body.street_name : undefined;
  if ("streetName" in body || "street_name" in body) {
    const trimmed = typeof incomingStreetName === "string" ? incomingStreetName.trim() : incomingStreetName ?? null;
    updates.street_name = trimmed || null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from(PLOT_TABLE)
    .update(updates)
    .eq("id", params.plotId)
    .select("id, owner, status, plot_number, street_name")
    .single();

  if (error || !data) {
    console.error("Failed to update plot", params.plotId, error);
    return NextResponse.json({ error: "Failed to update plot" }, { status: 500 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "plot.updated",
    entityType: PLOT_TABLE,
    entityId: params.plotId,
    metadata: updates,
  });

  return NextResponse.json({ ok: true, plot: data });
}
