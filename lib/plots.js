import { supabase } from "./supabase";
import { can, ROLES } from "./roles";

// Which underlying site table backs TSL's plots — placeholder layout,
// swappable without touching anything downstream of fetchAllPlots().
export const PLOT_TABLE = "new_trabuom";

// Allocation records for plots sourced from PLOT_TABLE. Kept separate from
// tsl_allocations (scoped to the original `trabuom`) so the two datasets
// don't mix.
export const ALLOCATIONS_TABLE = "new_trabuom_sl_allocations";

// An allocation's paperwork lifecycle — separate from the plot's own
// Available/Reserved/Sold status. The chief must sign before a client can
// collect their copy. Each stage advances in order.
export const ALLOCATION_STAGES = [
  { key: "pending", label: "Pending signature" },
  { key: "signed", label: "Signed by chief" },
  { key: "ready_to_collect", label: "Ready to be collected" },
  { key: "collected", label: "Collected by client" },
];

export const ALLOCATION_STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700",
  signed: "bg-navy-50 text-navy-700",
  ready_to_collect: "bg-sky-50 text-sky-700",
  collected: "bg-green-50 text-green-700",
};

export function allocationStatusLabel(status) {
  return ALLOCATION_STAGES.find((s) => s.key === status)?.label ?? ALLOCATION_STAGES[0].label;
}

export const STATUS_STYLE = {
  available: { fill: "#166534", stroke: "#166534", label: "Available" },
  reserved: { fill: "#B88320", stroke: "#B88320", label: "Reserved" },
  sold: { fill: "#dc2626", stroke: "#dc2626", label: "Sold" },
  hold: { fill: "#6b7280", stroke: "#6b7280", label: "On Hold" },
  other: { fill: "#3B4180", stroke: "#3B4180", label: "Other" },
};

export const OWNER_OPTIONS = [
  { value: "tsl", label: "Trabuom Stool Lands" },
  { value: "lhc", label: "GetOnePlot (Company)" },
  { value: "family", label: "Family" },
];

export function plotStatus(plot) {
  return plot.status ?? plot.properties?.status ?? "Available";
}

export function statusKey(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (!normalized || normalized === "available") return "available";
  if (normalized === "reserved") return "reserved";
  if (normalized === "sold") return "sold";
  if (normalized === "hold" || normalized === "on hold") return "hold";
  return "other";
}

export function getPlotStyle(plot) {
  return STATUS_STYLE[statusKey(plotStatus(plot))] ?? STATUS_STYLE.other;
}

export function plotNumber(plot) {
  return (
    plot.plotNumber ??
    plot.properties?.plotNumber ??
    plot.plot_number ??
    // Raw GIS import key, used by both trabuom and new_trabuom.
    plot.properties?.Plot_No ??
    ""
  );
}

export function streetName(plot) {
  return (
    plot.streetName ??
    plot.properties?.streetName ??
    plot.street_name ??
    plot.properties?.Street_Nam ??
    ""
  );
}

/** Raw plot area/size as stored on the GIS import (unitless — see AREA/Area in properties). */
export function plotArea(plot) {
  const raw = plot.properties?.AREA ?? plot.properties?.Area ?? plot.area ?? null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function plotAreaSqft(plot) {
  const value = plotArea(plot);
  if (value === null) return null;

  // Raw GIS values are treated as acres in this app. Convert to square feet and
  // derive a realistic rectangular approximation for the popup/list labels.
  return value * 43560;
}

function dimensionsFromSqft(sqft) {
  if (!Number.isFinite(sqft) || sqft <= 0) return "—";

  const width = Math.max(20, Math.round(Math.sqrt(sqft) / 10) * 10);
  const height = Math.max(20, Math.round((sqft / Math.max(width, 1)) / 10) * 10);
  return `${width} x ${height} ft`;
}

export function formatArea(plot) {
  const value = plotArea(plot);
  return value === null ? "—" : `${Number(value.toFixed(2))} ac${Number(value.toFixed(2)) === 1 ? "" : "s"}`;
}

export function formatPlotSize(plot) {
  const value = plotArea(plot);
  if (value === null) return "—";

  const acres = Number(value.toFixed(2));
  const sqft = plotAreaSqft(plot);
  const dims = dimensionsFromSqft(sqft);

  return `${acres} Acres\n${dims}`;
}

export function plotOwner(plot) {
  return plot.owner ?? null;
}

export function plotAssignee(plot) {
  return {
    id: plot.properties?.assignedClientId ?? "",
    name: plot.properties?.assignedClientName ?? "",
    contact: plot.properties?.assignedClientContact ?? "",
    address: plot.properties?.assignedClientAddress ?? "",
  };
}

export function ownerLabel(owner) {
  if (owner === "tsl") return "Trabuom Stool Lands";
  if (owner === "lhc") return "GetOnePlot (Company)";
  if (owner === "family") return "Family";
  return owner || "Not set";
}

// TSL staff can manage TSL and Family plots. Company-owned plots remain
// isolated unless the user is a sysadmin.
export function canManagePlot(role, plot, permission) {
  if (!can(role, permission)) return false;
  if (role === ROLES.SYSADMIN) return true;
  return plotOwner(plot) !== "lhc";
}

/** GeoJSON Polygon/MultiPolygon (lng/lat) -> Google Maps LatLng path. */
export function getPolygonPath(plot) {
  const coords = plot.geometry?.coordinates;
  if (!coords?.length) return [];

  if (Array.isArray(coords[0]) && Array.isArray(coords[0][0]) && Array.isArray(coords[0][0][0])) {
    return ringToLatLng(coords[0][0]);
  }

  const ring = coords[0];
  if (!Array.isArray(ring?.[0])) return [];
  return ringToLatLng(ring);
}

function ringToLatLng(ring) {
  return ring
    .filter((coord) => Array.isArray(coord) && coord.length >= 2)
    .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((coord) => !Number.isNaN(coord.lat) && !Number.isNaN(coord.lng));
}

export function getPolygonCenter(path) {
  if (!path.length) return null;
  if (path.length < 3) return vertexAverage(path);

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const next = path[(i + 1) % path.length];
    const cross = curr.lng * next.lat - next.lng * curr.lat;
    area += cross;
    cx += (curr.lng + next.lng) * cross;
    cy += (curr.lat + next.lat) * cross;
  }
  area /= 2;

  // Degenerate (zero-area) ring — fall back to a plain vertex average.
  if (Math.abs(area) < 1e-12) return vertexAverage(path);

  return { lat: cy / (6 * area), lng: cx / (6 * area) };
}

function vertexAverage(path) {
  const lat = path.reduce((sum, p) => sum + p.lat, 0) / path.length;
  const lng = path.reduce((sum, p) => sum + p.lng, 0) / path.length;
  return { lat, lng };
}

const FETCH_PAGE_SIZE = 1000;

// All plots, regardless of owner — restrictions apply per-action (see
// canManagePlot), not at fetch time, so the map shows the full picture.
// PostgREST caps a single select() at 1000 rows by default; with thousands
// of rows in PLOT_TABLE this must page through, or most plots would
// silently go missing from the map.
export async function fetchAllPlots() {
  const all = [];
  for (let from = 0; ; from += FETCH_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(PLOT_TABLE)
      .select("*")
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < FETCH_PAGE_SIZE) break;
  }

  return all;
}

export async function fetchPlotById(plotId) {
  const { data, error } = await supabase.from(PLOT_TABLE).select("*").eq("id", plotId).single();
  if (error) throw error;
  return data;
}
