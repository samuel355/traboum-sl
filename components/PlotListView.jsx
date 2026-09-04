"use client";

import { Pencil } from "lucide-react";
import { can, ROLES } from "@/lib/roles";
import { formatArea, ownerLabel, plotNumber, plotOwner, plotStatus, streetName } from "@/lib/plots";
import { StatusPill } from "./DashboardMapView";

const MAX_UNFILTERED = 300;

export function PlotListView({ plots, totalPlots, role, query, onEdit, onView }) {
  const canEdit = role === ROLES.SYSADMIN || can(role, "editPlots");
  const filtered = query ? plots : plots.slice(0, MAX_UNFILTERED);

  return (
    <div className="h-full overflow-auto p-6">
      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${totalPlots} plots matching "${query}"`
          : `Showing ${filtered.length} of ${totalPlots} plots — use the filters above to narrow down`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">No plots match the selected filters.</p>
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
