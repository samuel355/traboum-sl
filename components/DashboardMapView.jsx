"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleMap, InfoWindow, OverlayView, Polygon, useJsApiLoader } from "@react-google-maps/api";
import {
  AlertTriangle,
  Layers,
  List,
  Map as MapIcon,
  Maximize,
  Pencil,
  Search,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import {
  canManagePlot,
  formatPlotSize,
  getPlotStyle,
  getPolygonCenter,
  getPolygonPath,
  OWNER_OPTIONS,
  ownerLabel,
  plotNumber,
  plotOwner,
  plotStatus,
  statusKey,
  streetName,
} from "@/lib/plots";
import { can, ROLES } from "@/lib/roles";
import { EditPlotModal } from "./EditPlotModal";
import { PlotDetailsModal } from "./PlotDetailsModal";
import { PlotListView } from "./PlotListView";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  scrollwheel: true,
};

const LEGEND = [
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
  { key: "hold", label: "On Hold" },
];

// Plot numbers only render once zoomed in this close — with hundreds of
// plots, labeling all of them at a zoomed-out view would just be clutter.
const LABEL_MIN_ZOOM = 16.5;
const labelPixelOffset = (width, height) => ({ x: -width / 2, y: -height / 2 });

function useStats(plots) {
  return useMemo(() => {
    const managedPlots = plots.filter((plot) => plotOwner(plot) !== "lhc");
    const base = { total: managedPlots.length, available: 0, reserved: 0, sold: 0, hold: 0 };
    managedPlots.forEach((plot) => {
      const key = statusKey(plotStatus(plot));
      if (key in base) base[key] += 1;
    });
    return base;
  }, [plots]);
}

export function DashboardMapView({ plots, loadError, role }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("map"); // "map" | "list"
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [mapType, setMapType] = useState("roadmap");
  const [isMapTypeMenuOpen, setIsMapTypeMenuOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [viewingPlotId, setViewingPlotId] = useState(null);
  const [zoom, setZoom] = useState(16);
  const [bounds, setBounds] = useState(null);
  const canEdit = role === ROLES.SYSADMIN || can(role, "editPlots");
  const filteredPlots = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    return plots.filter((plot) => {
      const matchesQuery =
        !query ||
        String(plotNumber(plot)).toLowerCase().includes(query) ||
        streetName(plot).toLowerCase().includes(query);
      const matchesStatus = filterStatus === "all" || statusKey(plotStatus(plot)) === filterStatus;
      const matchesOwner = filterOwner === "all" || plotOwner(plot) === filterOwner;
      return matchesQuery && matchesStatus && matchesOwner;
    });
  }, [plots, filterQuery, filterStatus, filterOwner]);
  const stats = useStats(plots);

  const syncViewport = () => {
    if (!mapRef.current) return;
    setZoom(mapRef.current.getZoom());
    setBounds(mapRef.current.getBounds());
  };

  const labeledPlots = useMemo(() => {
    if (zoom < LABEL_MIN_ZOOM) return [];
    return filteredPlots.filter((plot) => {
      const path = getPolygonPath(plot);
      if (path.length < 3) return false;
      if (!bounds) return true;
      const center = getPolygonCenter(path);
      return center && bounds.contains(new window.google.maps.LatLng(center.lat, center.lng));
    });
  }, [filteredPlots, zoom, bounds]);

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

  const changeMapType = (type) => {
    setMapType(type);
    mapRef.current?.setMapTypeId(type);
    setIsMapTypeMenuOpen(false);
  };

  const toggleFullscreen = async () => {
    if (!mapContainerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await mapContainerRef.current.requestFullscreen();
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <header className="border-b border-navy-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <h1 className="text-base font-bold text-navy-900 sm:text-lg">Plot Map</h1>
          <p className="text-xs text-navy-400">Trabuom Stool Lands plots (Sector 1 layout)</p>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="thin-scroll flex max-w-full gap-2 overflow-x-auto pb-1">
            <StatPill
              value={stats.total}
              label="Total"
              active={filterStatus === "all"}
              onClick={() => setFilterStatus("all")}
            />
            <StatPill
              value={stats.available}
              label="Available"
              tone="text-green-700"
              active={filterStatus === "available"}
              onClick={() => setFilterStatus("available")}
            />
            <StatPill
              value={stats.reserved}
              label="Reserved"
              tone="text-navy-900"
              active={filterStatus === "reserved"}
              onClick={() => setFilterStatus("reserved")}
            />
            <StatPill
              value={stats.sold}
              label="Sold"
              tone="text-red-600"
              active={filterStatus === "sold"}
              onClick={() => setFilterStatus("sold")}
            />
            <StatPill
              value={stats.hold}
              label="On Hold"
              tone="text-gray-500"
              active={filterStatus === "hold"}
              onClick={() => setFilterStatus("hold")}
            />
          </div>

          <div className="hidden h-9 w-px bg-navy-100 sm:block" />

          <div className="flex w-full items-center gap-1 rounded-lg bg-navy-50 p-1 shadow-sm ring-1 ring-navy-100 sm:w-auto">
            <button
              onClick={() => setView("map")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                view === "map" ? "bg-navy-900 text-amber-300 shadow-sm" : "text-navy-600 hover:bg-white"
              }`}
            >
              <MapIcon className="h-4 w-4" /> Map
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                view === "list" ? "bg-navy-900 text-amber-300 shadow-sm" : "text-navy-600 hover:bg-white"
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
          </div>
        </div>
        <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Search plot number or street"
              className="w-full rounded-lg border border-navy-100 py-2 pl-9 pr-3 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
            />
          </div>
          <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
            ["all", "All statuses"],
            ["available", "Available"],
            ["reserved", "Reserved"],
            ["sold", "Sold"],
            ["hold", "On hold"],
          ]} />
          <FilterSelect value={filterOwner} onChange={setFilterOwner} options={[
            ["all", "All owners"],
            ...OWNER_OPTIONS.map(({ value, label }) => [value, label]),
          ]} />
          {filterQuery || filterStatus !== "all" || filterOwner !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setFilterQuery("");
                setFilterStatus("all");
                setFilterOwner("all");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </header>

      <div ref={mapContainerRef} className="relative flex-1">
        {view === "list" ? (
          <PlotListView
            plots={filteredPlots}
            totalPlots={plots.length}
            role={role}
            query={filterQuery}
            status={filterStatus}
            owner={filterOwner}
            onQueryChange={setFilterQuery}
            onStatusChange={setFilterStatus}
            onOwnerChange={setFilterOwner}
            onEdit={setEditingPlot}
            onView={(plot) => setViewingPlotId(plot.id)}
          />
        ) : loadError ? (
          <ErrorState message={`Couldn't load plots: ${loadError}`} />
        ) : !filteredPlots.length ? (
          <ErrorState message="No plots match the selected filters." />
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
            options={{ ...MAP_OPTIONS, mapTypeId: mapType }}
            onLoad={(map) => {
              mapRef.current = map;
              window.setTimeout(() => fitAll(map), 150);
            }}
            onZoomChanged={syncViewport}
            onIdle={syncViewport}
          >
            {filteredPlots.map((plot) => {
              const path = getPolygonPath(plot);
              if (path.length < 3) return null;
              const style = getPlotStyle(plot);
              const isSelected = selected?.id === plot.id;
              const isReserved = statusKey(plotStatus(plot)) === "reserved";
              return (
                <Polygon
                  key={plot.id}
                  path={path}
                  options={{
                    fillColor: style.fill,
                    fillOpacity: isReserved ? (isSelected ? 0.9 : 0.8) : isSelected ? 0.65 : 0.4,
                    strokeColor: isSelected ? "#0B0E2D" : style.stroke,
                    strokeWeight: isSelected ? 3 : 1.5,
                    clickable: true,
                  }}
                  onClick={() => setSelected(plot)}
                />
              );
            })}

            {labeledPlots.map((plot) => {
              const center = getPolygonCenter(getPolygonPath(plot));
              if (!center) return null;
              return (
                <OverlayView
                  key={`label-${plot.id}`}
                  position={center}
                  mapPaneName={OverlayView.OVERLAY_LAYER}
                  getPixelPositionOffset={labelPixelOffset}
                >
                  <div
                    className="pointer-events-none inline-flex select-none items-center justify-center whitespace-nowrap rounded-md border border-white/80 px-2 py-1 text-xs font-extrabold leading-none text-white shadow-lg"
                    style={{
                      backgroundColor: "#0b0e2d",
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.95)",
                      WebkitTextStroke: "0.2px currentColor",
                    }}
                  >
                    {plotNumber(plot)}
                  </div>
                </OverlayView>
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

        {view === "map" && isLoaded && !mapsLoadError ? (
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-navy-100">
            <button
              type="button"
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 16) + 1)}
              className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 16) - 1)}
              className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMapTypeMenuOpen((open) => !open)}
                className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50"
                title="Change map type"
                aria-label="Change map type"
                aria-expanded={isMapTypeMenuOpen}
              >
                <Layers className="h-5 w-5" />
              </button>
              {isMapTypeMenuOpen ? (
                <div className="absolute right-full top-0 mr-2 w-32 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-navy-100">
                  {[
                    ["roadmap", "Road map"],
                    ["satellite", "Satellite"],
                    ["hybrid", "Hybrid"],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => changeMapType(type)}
                      className={`block w-full px-3 py-2 text-left text-xs font-medium transition hover:bg-navy-50 ${
                        mapType === type ? "bg-navy-50 text-navy-900" : "text-navy-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg p-2 text-navy-700 transition hover:bg-navy-50"
              title="Toggle fullscreen"
              aria-label="Toggle fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        ) : null}

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
        <PlotDetailsModal plotId={viewingPlotId} onClose={() => setViewingPlotId(null)} role={role} />
      ) : null}
    </div>
  );
}

function StatPill({ value, label, tone = "text-navy-900", active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[64px] rounded-lg border px-3 py-1.5 text-center transition ${
        active
          ? "border-navy-900 bg-navy-900 shadow-sm"
          : "border-navy-100 bg-white hover:border-navy-300 hover:bg-navy-50"
      }`}
    >
      <p className={`text-sm font-bold ${active ? "text-white" : tone}`}>{value}</p>
      <p className={`text-[10px] ${active ? "text-navy-200" : "text-navy-400"}`}>{label}</p>
    </button>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
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
  const canEdit = role === ROLES.SYSADMIN || can(role, "editPlots");

  return (
    <div className="pointer-events-auto w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-100">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-bold text-slate-900">Plot {plotNumber(plot)}</p>
              <StatusPill status={status} />
            </div>
            <p className="mt-1 truncate text-sm font-medium text-slate-600">
              {streetName(plot) || "Street not set"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit ? (
              <button
                onClick={onEdit}
                type="button"
                title="Edit plot"
                aria-label="Edit plot"
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-md bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Size</p>
            <p className="mt-1 whitespace-pre-line font-semibold text-slate-900">{formatPlotSize(plot)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Owner</p>
            <p className="mt-1 font-semibold text-slate-900">{ownerLabel(owner)}</p>
          </div>
          {key === "sold" ? (
            <div className="col-span-2 rounded-xl border border-amber-100 bg-amber-50 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-amber-700">Allocated to</p>
              <p className="mt-1 font-semibold text-slate-900">{plot.currentClientName || "Client not recorded"}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5">
          {key === "available" || key === "reserved" ? (
            canManageAllocate ? (
              <Link
                href={`/dashboard/allocate/${plot.id}`}
                className="block w-full rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                Buy plot
              </Link>
            ) : hasAllocatePermission ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {owner
                  ? `This plot belongs to ${ownerLabel(owner)} — Trabuom Stool Lands staff can't act on it from here.`
                  : "This plot's owner hasn't been set yet — ask a sysadmin to assign it first."}
              </p>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                You don&apos;t have permission to allocate plots.
              </p>
            )
          ) : null}

          {key === "available" && canManageAllocate ? (
            <Link
              href={`/dashboard/reserve/${plot.id}`}
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reserve plot
            </Link>
          ) : null}

          {key === "sold" ? (
            canManageTransfer ? (
              <Link
                href={`/dashboard/transfers/new?plotId=${plot.id}`}
                className="block w-full rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Transfer
              </Link>
            ) : hasTransferPermission ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {owner
                  ? `This plot belongs to ${ownerLabel(owner)} — Trabuom Stool Lands staff can't transfer it from here.`
                  : "This plot's owner hasn't been set yet — ask a sysadmin to assign it first."}
              </p>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                You don&apos;t have permission to transfer plots.
              </p>
            )
          ) : null}

          {key === "hold" || key === "other" ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              This plot is {status.toLowerCase()}.
            </p>
          ) : null}

          <button
            onClick={onView}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            View plot details
          </button>
        </div>
      </div>
    </div>
  );
}
