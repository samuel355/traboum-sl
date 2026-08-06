"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { can } from "@/lib/roles";
import { formatArea, ownerLabel, plotNumber, plotOwner, plotStatus, streetName } from "@/lib/plots";
import { StatusPill } from "./DashboardMapView";

const MAX_UNFILTERED = 300;

export function PlotListView({ plots, role, onEdit, onView }) {
  const [query, setQuery] = useState("");
  const canEdit = can(role, "editPlots");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plots.slice(0, MAX_UNFILTERED);
    return plots.filter((plot) => {
      const number = String(plotNumber(plot)).toLowerCase();
      const street = streetName(plot).toLowerCase();
      return number.includes(q) || street.includes(q);
    });
  }, [plots, query]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by plot number or street"
          className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${plots.length} plots matching "${query}"`
          : `Showing ${filtered.length} of ${plots.length} plots — search to narrow down`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">No plots match &quot;{query}&quot;.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Plot</th>
                <th className="px-4 py-3">Street</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plot) => (
                <tr key={plot.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-3 font-medium text-navy-900">{plotNumber(plot)}</td>
                  <td className="px-4 py-3 text-navy-500">{streetName(plot) || "—"}</td>
                  <td className="px-4 py-3 text-navy-500">{formatArea(plot)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={plotStatus(plot)} />
                  </td>
                  <td className="px-4 py-3 text-navy-500">{ownerLabel(plotOwner(plot))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <button
                        onClick={() => onView(plot)}
                        className="text-xs font-semibold text-navy-700 hover:underline"
                      >
                        View
                      </button>
                      {canEdit ? (
                        <button
                          onClick={() => onEdit(plot)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
