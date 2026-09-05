"use client";

import { useMemo, useRef, useState } from "react";
import { GoogleMap, InfoWindow, OverlayView, Polygon, useJsApiLoader } from "@react-google-maps/api";
import { Check, LocateFixed, Map as MapIcon, Minus, Plus, Search } from "lucide-react";
import { getPolygonCenter, getPolygonPath } from "@/lib/plots";

const MAP_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { clickableIcons: false, disableDefaultUI: true, gestureHandling: "greedy", scrollwheel: true };

export function TransferPlotPicker({ plots, value, onChange }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("search");
  const [candidate, setCandidate] = useState(null);
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "tsl-transfer-map",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plots;
    return plots.filter((plot) =>
      [plot.plotNumber, plot.streetName, plot.currentClientName]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [plots, query]);

  const selected = plots.find((plot) => String(plot.id) === String(value));
  const activeCandidate = candidate || selected;
  const center = useMemo(() => {
    const path = getPolygonPath(activeCandidate || plots[0] || {});
    return getPolygonCenter(path) || { lat: 6.5967673, lng: -1.7712608 };
  }, [plots, activeCandidate]);

  function inspect(plot) {
    setCandidate(plot);
  }

  function choose(plot) {
    onChange(String(plot.id));
    setCandidate(null);
  }

  function fitAll() {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    plots.forEach((plot) => getPolygonPath(plot).forEach((point) => bounds.extend(point)));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 40);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
      <div className="border-b border-navy-100 bg-navy-50/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-navy-900">Choose the plot</p>
            <p className="mt-0.5 text-xs text-navy-500">Search by plot, street, or current allottee.</p>
          </div>
          <div className="flex rounded-lg bg-white p-1 ring-1 ring-navy-100">
            <button type="button" onClick={() => setView("search")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "search" ? "bg-navy-900 text-amber-300" : "text-navy-500"}`}>
              Search
            </button>
            <button type="button" onClick={() => setView("map")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${view === "map" ? "bg-navy-900 text-amber-300" : "text-navy-500"}`}>
              <MapIcon className="h-3.5 w-3.5" /> Map
            </button>
          </div>
        </div>
      </div>

      {view === "search" ? (
        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plot number or street" className="w-full rounded-xl border border-navy-100 py-3 pl-9 pr-3 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15" />
          </div>
          <p className="mt-3 text-xs text-navy-400">{filtered.length} sold plot{filtered.length === 1 ? "" : "s"} found</p>
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {!filtered.length ? <p className="py-8 text-center text-sm text-navy-400">No sold plots match your search.</p> : filtered.map((plot) => (
              <div key={plot.id} className={`rounded-xl border p-3 transition ${String(value) === String(plot.id) ? "border-amber-400 bg-amber-50" : "border-navy-100"}`}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => inspect(plot)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-navy-900">Plot {plot.plotNumber || "—"}</span>
                    <span className="block truncate text-xs text-navy-500">{plot.plotSize?.replace("\n", " · ") || "Size not set"} · {plot.streetName || "Street not set"}</span>
                  </button>
                  <button type="button" onClick={() => choose(plot)} className="shrink-0 rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800">
                    {String(value) === String(plot.id) ? "Chosen" : "Choose"}
                  </button>
                </div>
                {candidate?.id === plot.id ? <p className="mt-2 border-t border-amber-200 pt-2 text-xs text-navy-600">Current allottee: {plot.currentClientName || "Not recorded"}</p> : null}
              </div>
            ))}</div>
          {candidate ? <PlotChoiceCard plot={candidate} onChoose={() => choose(candidate)} /> : null}
        </div>
      ) : (
        <div>
          {!plots.length ? <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-navy-400"><p>No sold plots are available for transfer.</p><button type="button" onClick={() => setView("search")} className="font-semibold text-navy-700 underline">Use search instead</button></div> : !isLoaded ? <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-navy-400"><p>{loadError ? "Map unavailable in this browser." : "Loading map…"}</p>{loadError ? <button type="button" onClick={() => setView("search")} className="font-semibold text-navy-700 underline">Use search instead</button> : null}</div> : (
            <div className="relative h-[28rem] min-h-[360px] w-full">
              <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={center}
                zoom={16}
                options={MAP_OPTIONS}
                onLoad={(map) => {
                  mapRef.current = map;
                  fitAll();
                }}
                onUnmount={() => {
                  mapRef.current = null;
                }}
              >
              {plots.map((plot) => {
                const path = getPolygonPath(plot);
                if (path.length < 3) return null;
                const active = String(value) === String(plot.id);
                return (
                  <Polygon
                    key={plot.id}
                    path={path}
                    onClick={() => inspect(plot)}
                    options={{ fillColor: active ? "#B88320" : "#dc2626", fillOpacity: active ? 0.75 : 0.35, strokeColor: active ? "#8b6416" : "#991b1b", strokeWeight: active ? 3 : 1.5, clickable: true }}
                  />
                );
              })}
              {plots.map((plot) => {
                const center = getPolygonCenter(getPolygonPath(plot));
                if (!center) return null;
                return (
                  <OverlayView
                    key={`plot-label-${plot.id}`}
                    position={center}
                    mapPaneName="floatPane"
                  >
                    <button
                      type="button"
                      onClick={() => inspect(plot)}
                      className={`-translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-1.5 py-1 text-[10px] font-bold shadow-sm ${
                        String(value) === String(plot.id)
                          ? "bg-amber-400 text-navy-950"
                          : "bg-white/95 text-navy-900"
                      }`}
                    >
                      {plot.plotNumber || "—"}
                    </button>
                  </OverlayView>
                );
              })}
              {candidate && getPolygonCenter(getPolygonPath(candidate)) ? <InfoWindow position={getPolygonCenter(getPolygonPath(candidate))} onCloseClick={() => setCandidate(null)}>
                <div className="w-56 p-1 text-navy-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Sold plot</p>
                  <p className="mt-1 font-bold">Plot {candidate.plotNumber || "—"}</p>
                  <p className="mt-1 text-xs text-navy-500">{candidate.plotSize?.replace("\n", " · ")} · {candidate.streetName || "Street not set"}</p>
                  <button type="button" onClick={() => choose(candidate)} className="mt-3 w-full rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white">Choose this plot</button>
                </div>
              </InfoWindow> : null}
              </GoogleMap>
              <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-navy-100 bg-white shadow-lg">
                <button type="button" onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 16) + 1)} className="flex h-10 w-10 items-center justify-center text-navy-700 hover:bg-navy-50" aria-label="Zoom in">
                  <Plus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => mapRef.current?.setZoom(Math.max(1, (mapRef.current.getZoom() || 16) - 1))} className="flex h-10 w-10 items-center justify-center border-t border-navy-100 text-navy-700 hover:bg-navy-50" aria-label="Zoom out">
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" onClick={fitAll} className="flex h-10 w-10 items-center justify-center border-t border-navy-100 text-navy-700 hover:bg-navy-50" aria-label="Fit all plots">
                  <LocateFixed className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-navy-900/85 px-3 py-2 text-[11px] font-medium text-white shadow-sm">
                Click a plot or its number to view details
              </div>
            </div>
          )}
          {candidate ? (
            <div className="border-t border-amber-200 bg-amber-50 p-4">
              <PlotChoiceCard plot={candidate} onChoose={() => choose(candidate)} />
            </div>
          ) : null}
        </div>
      )}

      {selected ? <div className="border-t border-navy-100 bg-amber-50 px-4 py-3 text-xs text-navy-700"><span className="font-bold">Selected:</span> Plot {selected.plotNumber || "—"}{selected.streetName ? ` — ${selected.streetName}` : ""}</div> : null}
    </div>
  );
}

function PlotChoiceCard({ plot, onChoose }) {
  return (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Plot details</p>
          <p className="mt-1 font-bold text-navy-900">Plot {plot.plotNumber || "—"}</p>
          <p className="mt-1 text-xs text-navy-600">{plot.plotSize?.replace("\n", " · ")}</p>
          <p className="text-xs text-navy-600">{plot.streetName || "Street not set"}</p>
        </div>
        <button type="button" onClick={onChoose} className="shrink-0 rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800">Choose</button>
      </div>
    </div>
  );
}
