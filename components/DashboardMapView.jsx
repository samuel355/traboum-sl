"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleMap, InfoWindow, Polygon, useJsApiLoader } from "@react-google-maps/api";
import { AlertTriangle, List, Map as MapIcon, Pencil, X } from "lucide-react";
import {
  canManagePlot,
  formatArea,
  getPlotStyle,
  getPolygonCenter,
  getPolygonPath,
  ownerLabel,
  plotNumber,
  plotOwner,
  plotStatus,
  statusKey,
  streetName,
} from "@/lib/plots";
import { can } from "@/lib/roles";
import { EditPlotModal } from "./EditPlotModal";
import { PlotDetailsModal } from "./PlotDetailsModal";
import { PlotListView } from "./PlotListView";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = {
  clickableIcons: false,
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: true,
  gestureHandling: "greedy",
};

const LEGEND = [
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
  { key: "hold", label: "On Hold" },
];

function useStats(plots) {
  return useMemo(() => {
    const base = { total: plots.length, available: 0, reserved: 0, sold: 0, hold: 0 };
    plots.forEach((plot) => {
      const key = statusKey(plotStatus(plot));
      if (key in base) base[key] += 1;
    });
    return base;
  }, [plots]);
}

export function DashboardMapView({ plots, loadError, role }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("map"); // "map" | "list"
  const [editingPlot, setEditingPlot] = useState(null);
  const [viewingPlotId, setViewingPlotId] = useState(null);
  const stats = useStats(plots);
  const canEdit = can(role, "editPlots");

  function handlePlotSaved(updates) {
    // Reflect the change immediately in whichever card is open, then
    // re-fetch the plots list server-side so map colors/list rows catch up.
    setSelected((prev) => (prev && prev.id === editingPlot.id ? { ...prev, ...updates } : prev));
    setEditingPlot(null);
    router.refresh();
  }

  const { isLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: "tsl-google-map",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const center = useMemo(() => {
    const first = plots.map(getPolygonPath).find((path) => path.length);
    return getPolygonCenter(first ?? []) ?? { lat: 6.5967673, lng: -1.7712608 };
  }, [plots]);

  const fitAll = (map) => {
    if (!window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let any = false;
    plots.forEach((plot) => {
      getPolygonPath(plot).forEach((point) => {
        bounds.extend(point);
        any = true;
      });
    });
    if (any) map.fitBounds(bounds, 60);
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-navy-100 bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-navy-900">Plot Map</h1>
          <p className="text-xs text-navy-400">Trabuom Stool Lands plots (Sector 1 layout)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <StatPill value={stats.total} label="Total" />
            <StatPill value={stats.available} label="Available" tone="text-green-700" />
            <StatPill value={stats.reserved} label="Reserved" tone="text-navy-900" />
            <StatPill value={stats.sold} label="Sold" tone="text-red-600" />
            <StatPill value={stats.hold} label="On Hold" tone="text-gray-500" />
          </div>

          <div className="hidden h-9 w-px bg-navy-100 sm:block" />

          <div className="flex items-center gap-1 rounded-lg bg-navy-50 p-1 shadow-sm ring-1 ring-navy-100">
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === "map" ? "bg-navy-900 text-white shadow-sm" : "text-navy-600 hover:bg-white"
              }`}
            >
              <MapIcon className="h-4 w-4" /> Map
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === "list" ? "bg-navy-900 text-white shadow-sm" : "text-navy-600 hover:bg-white"
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex-1">
        {view === "list" ? (
          <PlotListView plots={plots} role={role} onEdit={setEditingPlot} onView={(plot) => setViewingPlotId(plot.id)} />
        ) : loadError ? (
          <ErrorState message={`Couldn't load plots: ${loadError}`} />
        ) : !plots.length ? (
          <ErrorState message="No plots found in the trabuom table." />
        ) : !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || mapsLoadError ? (
          <ErrorState message="Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY." />
        ) : !isLoaded ? (
          <div className="h-full flex items-center justify-center text-navy-400 text-sm">
            Loading map…
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={center}
            zoom={16}
            options={MAP_OPTIONS}
            onLoad={(map) => {
              mapRef.current = map;
              window.setTimeout(() => fitAll(map), 150);
            }}
          >
            {plots.map((plot) => {
              const path = getPolygonPath(plot);
              if (path.length < 3) return null;
              const style = getPlotStyle(plot);
              const isSelected = selected?.id === plot.id;
              return (
                <Polygon
                  key={plot.id}
                  path={path}
                  options={{
                    fillColor: style.fill,
                    fillOpacity: isSelected ? 0.65 : 0.4,
                    strokeColor: isSelected ? "#0B0E2D" : style.stroke,
                    strokeWeight: isSelected ? 3 : 1.5,
                    clickable: true,
                  }}
                  onClick={() => setSelected(plot)}
                />
              );
            })}

            {selected
              ? (() => {
                  const anchor = getPolygonCenter(getPolygonPath(selected));
                  if (!anchor) return null;
                  return (
                    <InfoWindow
                      key={selected.id}
                      position={anchor}
                      onCloseClick={() => setSelected(null)}
                      options={{ pixelOffset: new window.google.maps.Size(0, -6), disableAutoPan: false }}
                    >
                      <PlotCard
                        plot={selected}
                        role={role}
                        onClose={() => setSelected(null)}
                        onEdit={() => setEditingPlot(selected)}
                        onView={() => setViewingPlotId(selected.id)}
                      />
                    </InfoWindow>
                  );
                })()
              : null}
          </GoogleMap>
        )}

        {view === "map" ? (
          <div className="pointer-events-none absolute bottom-4 left-4 flex gap-3 rounded-xl border border-navy-100 bg-white/95 px-4 py-2.5 shadow-card">
            {LEGEND.map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-navy-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: getPlotStyle({ status: label }).fill }}
                />
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {editingPlot ? (
        <EditPlotModal plot={editingPlot} onClose={() => setEditingPlot(null)} onSaved={handlePlotSaved} />
      ) : null}
      {viewingPlotId ? (
        <PlotDetailsModal plotId={viewingPlotId} onClose={() => setViewingPlotId(null)} />
      ) : null}
    </div>
  );
}

function StatPill({ value, label, tone = "text-navy-900" }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-1.5 text-center min-w-[64px]">
      <p className={`text-sm font-bold ${tone}`}>{value}</p>
      <p className="text-[10px] text-navy-400">{label}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-navy-300" />
        <p className="mt-3 text-sm text-navy-500 leading-6">{message}</p>
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const style = getPlotStyle({ status });
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: style.fill }}
    >
      {status}
    </span>
  );
}

function PlotCard({ plot, role, onClose, onEdit, onView }) {
  const status = plotStatus(plot);
  const key = statusKey(status);
  const owner = plotOwner(plot);
  const hasAllocatePermission = can(role, "allocate");
  const hasTransferPermission = can(role, "transfer");
  const canManageAllocate = canManagePlot(role, plot, "allocate");
  const canManageTransfer = canManagePlot(role, plot, "transfer");
  const canEdit = can(role, "editPlots");

  return (
    <div className="w-72 overflow-hidden rounded-2xl bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-navy-50 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-navy-900">Plot {plotNumber(plot)}</p>
            <StatusPill status={status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-navy-500">{streetName(plot) || "Street not set"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canEdit ? (
            <button
              onClick={onEdit}
              title="Edit plot"
              className="rounded-md p-1 text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-navy-400">Area</p>
            <p className="font-semibold text-navy-900">{formatArea(plot)}</p>
          </div>
          <div>
            <p className="text-xs text-navy-400">Owner</p>
            <p className="font-semibold text-navy-900">{ownerLabel(owner)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {key === "available" || key === "reserved" ? (
            canManageAllocate ? (
              <Link
                href={`/dashboard/allocate/${plot.id}`}
                className="block w-full rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-navy-800"
              >
                Buy plot
              </Link>
            ) : hasAllocatePermission ? (
              <p className="text-xs text-navy-400">
                {owner
                  ? `This plot belongs to ${ownerLabel(owner)} — Trabuom Stool Lands staff can't act on it from here.`
                  : "This plot's owner hasn't been set yet — ask a sysadmin to assign it first."}
              </p>
            ) : (
              <p className="text-xs text-navy-400">You don&apos;t have permission to allocate plots.</p>
            )
          ) : null}

          {key === "available" && canManageAllocate ? (
            <Link
              href={`/dashboard/reserve/${plot.id}`}
              className="block w-full rounded-lg border border-navy-200 px-4 py-2.5 text-center text-sm font-semibold text-navy-700 hover:bg-navy-50"
            >
              Reserve plot
            </Link>
          ) : null}

          {key === "sold" ? (
            canManageTransfer ? (
              <Link
                href={`/dashboard/transfers/new?plotId=${plot.id}`}
                className="block w-full rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-navy-800"
              >
                Transfer
              </Link>
            ) : hasTransferPermission ? (
              <p className="text-xs text-navy-400">
                {owner
                  ? `This plot belongs to ${ownerLabel(owner)} — Trabuom Stool Lands staff can't transfer it from here.`
                  : "This plot's owner hasn't been set yet — ask a sysadmin to assign it first."}
              </p>
            ) : (
              <p className="text-xs text-navy-400">You don&apos;t have permission to transfer plots.</p>
            )
          ) : null}

          {key === "hold" || key === "other" ? (
            <p className="text-xs text-navy-400">This plot is {status.toLowerCase()}.</p>
          ) : null}

          <button
            onClick={onView}
            className="block w-full rounded-lg px-4 py-2 text-center text-sm font-medium text-navy-500 hover:bg-navy-50"
          >
            View plot details
          </button>
        </div>
      </div>
    </div>
  );
}
