"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleLabel } from "@/lib/roles";

export const ACTION_LABELS = {
  "allocation.created": "Allocation created",
  "allocation.updated": "Allocation edited",
  "allocation.deleted": "Allocation deleted",
  "transfer.created": "Transfer recorded",
  "plot.reserved": "Plot reserved",
  "plot.updated": "Plot edited",
  "user.role_updated": "Staff role updated",
  "client.created": "Client added",
  "client.updated": "Client edited",
  "client.deleted": "Client deleted",
  "document.uploaded": "Document uploaded",
  "document.updated": "Document edited",
  "document.deleted": "Document deleted",
  "staff.invited": "Staff invited",
  "staff.invite_revoked": "Invitation revoked",
};

const ACTION_TONES = {
  "allocation.created": "bg-green-50 text-green-700",
  "allocation.updated": "bg-purple-50 text-purple-700",
  "allocation.deleted": "bg-red-50 text-red-700",
  "transfer.created": "bg-navy-50 text-navy-700",
  "plot.reserved": "bg-amber-50 text-amber-700",
  "plot.updated": "bg-purple-50 text-purple-700",
  "user.role_updated": "bg-navy-50 text-navy-700",
  "client.created": "bg-green-50 text-green-700",
  "client.updated": "bg-purple-50 text-purple-700",
  "client.deleted": "bg-red-50 text-red-700",
  "document.uploaded": "bg-green-50 text-green-700",
  "document.updated": "bg-purple-50 text-purple-700",
  "document.deleted": "bg-red-50 text-red-700",
  "staff.invited": "bg-green-50 text-green-700",
  "staff.invite_revoked": "bg-red-50 text-red-700",
};

function ActionBadge({ action }) {
  const tone = ACTION_TONES[action] || "bg-navy-50 text-navy-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}

export function AuditTrailList({ entries }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      [entry.actor_name, entry.actor_id, ACTION_LABELS[entry.action] || entry.action, roleLabel(entry.actor_role)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [entries, query]);

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by person or action"
          className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${entries.length} entries matching "${query}"`
          : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">
            {query ? `No activity matches "${query}".` : "No activity recorded yet."}
          </p>
        ) : (
          <ul className="divide-y divide-navy-50">
            {filtered.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ActionBadge action={entry.action} />
                  <p className="text-xs text-navy-400">
                    {new Date(entry.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
                <p className="mt-2 text-xs text-navy-500">
                  {entry.actor_name || entry.actor_id}
                  {entry.actor_role ? ` · ${roleLabel(entry.actor_role)}` : ""}
                </p>
                {entry.metadata && Object.keys(entry.metadata).length ? (
                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-navy-500">
                    {Object.entries(entry.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-1.5">
                        <dt className="font-medium text-navy-400">{key}:</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
