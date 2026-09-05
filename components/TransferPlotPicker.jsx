"use client";

import { useMemo, useState } from "react";
import { GoogleMap, Polygon, useJsApiLoader } from "@react-google-maps/api";
import { Check, Map as MapIcon, Search } from "lucide-react";
import { getPolygonCenter, getPolygonPath } from "@/lib/plots";

const MAP_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { clickableIcons: false, disableDefaultUI: true, gestureHandling: "greedy", scrollwheel: true };

export function TransferPlotPicker({ plots, value, onChange }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("search");
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
  const center = useMemo(() => {
    const path = getPolygonPath(selected || plots[0] || {});
    return getPolygonCenter(path) || { lat: 6.5967673, lng: -1.7712608 };
  }, [plots, selected]);

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
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {!filtered.length ? <p className="py-8 text-center text-sm text-navy-400">No sold plots match your search.</p> : filtered.map((plot) => (
              <button type="button" key={plot.id} onClick={() => onChange(String(plot.id))} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${String(value) === String(plot.id) ? "border-amber-400 bg-amber-50" : "border-navy-100 hover:border-navy-300 hover:bg-navy-50"}`}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-navy-900">Plot {plot.plotNumber || "—"}</span>
                  <span className="block truncate text-xs text-navy-500">{plot.streetName || "Street not set"}{plot.currentClientName ? ` · ${plot.currentClientName}` : ""}</span>
                </span>
                {String(value) === String(plot.id) ? <Check className="h-4 w-4 shrink-0 text-amber-700" /> : null}
              </button>
            ))}</div>
        </div>
      ) : (
        <div className="h-80">
          {!isLoaded ? <div className="flex h-full items-center justify-center text-sm text-navy-400">{loadError ? "Map unavailable" : "Loading map…"}</div> : (
            <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={16} options={MAP_OPTIONS}>
              {plots.map((plot) => {
                const path = getPolygonPath(plot);
                if (path.length < 3) return null;
                const active = String(value) === String(plot.id);
                return <Polygon key={plot.id} path={path} onClick={() => onChange(String(plot.id))} options={{ fillColor: active ? "#B88320" : "#dc2626", fillOpacity: active ? 0.75 : 0.35, strokeColor: active ? "#8b6416" : "#991b1b", strokeWeight: active ? 3 : 1.5, clickable: true }} />;
              })}
            </GoogleMap>
          )}
        </div>
      )}

      {selected ? <div className="border-t border-navy-100 bg-amber-50 px-4 py-3 text-xs text-navy-700"><span className="font-bold">Selected:</span> Plot {selected.plotNumber || "—"}{selected.streetName ? ` — ${selected.streetName}` : ""}</div> : null}
    </div>
  );
}
