import { supabase } from "./supabase";
import { can, ROLES } from "./roles";

// Which underlying site table backs TSL's plots. The current layout is
// borrowed from get-plot's `trabuom` (Sector 1) table — this is a
// placeholder layout per the brief and can be swapped later without
// touching anything downstream of fetchAllPlots().
export const PLOT_TABLE = "new_trabuom";

// Allocation records ("plot purchases") for plots sourced from PLOT_TABLE.
// Kept as its own table (rather than reusing tsl_allocations, which was
// scoped to the original `trabuom`) so the two plot datasets' purchase
// records don't mix — see migration 005.
export const ALLOCATIONS_TABLE = "new_trabuom_sl_allocations";

export const STATUS_STYLE = {
  available: { fill: "#166534", stroke: "#166534", label: "Available" },
  reserved: { fill: "#171717", stroke: "#171717", label: "Reserved" },
  sold: { fill: "#dc2626", stroke: "#dc2626", label: "Sold" },
  hold: { fill: "#6b7280", stroke: "#6b7280", label: "On Hold" },
  other: { fill: "#3B4180", stroke: "#3B4180", label: "Other" },
};

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
    String(plot.id ?? "")
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

export function formatArea(plot) {
  const value = plotArea(plot);
  return value === null ? "—" : value.toFixed(2);
}

export function plotOwner(plot) {
  return plot.owner ?? null;
}

export function ownerLabel(owner) {
  if (owner === "tsl") return "Trabuom Stool Lands";
  if (owner === "lhc") return "GetOnePlot (Company)";
  return "Not set";
}

// Only sysadmin can act across both owners. Everyone else with the base
// role permission (allocate/transfer) is restricted to plots owned by 'tsl'
// — a plot owned by 'lhc' (or not yet assigned an owner) is off-limits.
export function canManagePlot(role, plot, permission) {
  if (!can(role, permission)) return false;
  if (role === ROLES.SYSADMIN) return true;
  return plotOwner(plot) === "tsl";
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
