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

// Authorized plot-edit endpoint — sets ownership, status, and editable plot
// metadata. Plot number and street name live in the GIS properties JSON on
// new_trabuom rather than in standalone database columns.
export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "editPlots")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const db = supabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from(PLOT_TABLE)
    .select("id, properties")
    .eq("id", params.plotId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to load plot for update", params.plotId, existingError);
    return NextResponse.json({ error: "Failed to update plot" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }

  const updates = {};
  const auditMetadata = {};
  const properties = { ...(existing.properties ?? {}) };
  let propertiesChanged = false;

  if ("owner" in body) {
    const normalizedOwner = normalizeOwnerValue(body.owner);
    if (typeof normalizedOwner !== "string" || !normalizedOwner.length) {
      return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
    }
    if (!VALID_OWNERS.includes(normalizedOwner) && !body.owner) {
      return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
    }
    updates.owner = normalizedOwner;
    auditMetadata.owner = normalizedOwner;
  }
  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
    auditMetadata.status = body.status;
  }

  const incomingPlotNumber = "plotNumber" in body ? body.plotNumber : "plot_number" in body ? body.plot_number : undefined;
  if ("plotNumber" in body || "plot_number" in body) {
    const trimmed = typeof incomingPlotNumber === "string" ? incomingPlotNumber.trim() : incomingPlotNumber ?? null;
    const value = trimmed || null;
    properties.Plot_No = value;
    if (Object.hasOwn(properties, "plotNumber")) properties.plotNumber = value;
    auditMetadata.plotNumber = value;
    propertiesChanged = true;
  }

  const incomingStreetName = "streetName" in body ? body.streetName : "street_name" in body ? body.street_name : undefined;
  if ("streetName" in body || "street_name" in body) {
    const trimmed = typeof incomingStreetName === "string" ? incomingStreetName.trim() : incomingStreetName ?? null;
    const value = trimmed || null;
    properties.Street_Nam = value;
    if (Object.hasOwn(properties, "streetName")) properties.streetName = value;
    auditMetadata.streetName = value;
    propertiesChanged = true;
  }

  if (propertiesChanged) updates.properties = properties;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from(PLOT_TABLE)
    .update(updates)
    .eq("id", params.plotId)
    .select("id, owner, status, properties")
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
    metadata: auditMetadata,
  });

  return NextResponse.json({ ok: true, plot: data });
}
