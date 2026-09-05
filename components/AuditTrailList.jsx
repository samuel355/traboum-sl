"use client";

import { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { ACTION_LABELS, ACTION_TONES } from "@/lib/audit-actions";
import { formatAuditDate } from "@/lib/audit-date";
import { roleLabel } from "@/lib/roles";

const PAGE_SIZE = 20;

function ActionBadge({ action }) {
  const tone = ACTION_TONES[action] || "bg-navy-50 text-navy-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}

function metadataLabel(key) {
  return {
    plotNumber: "Plot number",
    streetName: "Street name",
  }[key] || key;
}

export function AuditTrailList({ entries }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.action).filter(Boolean))].sort((a, b) =>
        (ACTION_LABELS[a] || a).localeCompare(ACTION_LABELS[b] || b),
      ),
    [entries],
  );

  const roleOptions = useMemo(
    () =>
      [...new Set(entries.map((entry) => entry.actor_role).filter(Boolean))].sort((a, b) =>
        roleLabel(a).localeCompare(roleLabel(b)),
      ),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) =>
      (!q ||
        [
          entry.actor_name,
          entry.actor_id,
          entry.action,
          ACTION_LABELS[entry.action] || entry.action,
          roleLabel(entry.actor_role),
          entry.created_at,
          formatAuditDate(entry.created_at),
          JSON.stringify(entry.metadata || {}),
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))) &&
      (!actionFilter || entry.action === actionFilter) &&
      (!roleFilter || entry.actor_role === roleFilter) &&
      (!fromDate || new Date(entry.created_at) >= new Date(`${fromDate}T00:00:00`)) &&
      (!toDate || new Date(entry.created_at) <= new Date(`${toDate}T23:59:59.999`)),
    );
  }, [entries, query, actionFilter, roleFilter, fromDate, toDate]);

  const hasFilters = Boolean(query || actionFilter || roleFilter || fromDate || toDate);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clearFilters() {
    setQuery("");
    setActionFilter("");
    setRoleFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <div>
      <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, action, role, time, or details"
              className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-navy-500">
            <Filter className="h-4 w-4 text-navy-400" />
            <span>Filter activity</span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-navy-100 bg-white px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
          >
            <option value="">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {ACTION_LABELS[action] || action}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-navy-100 bg-white px-3 py-2.5 text-sm text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
          >
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2 text-xs text-navy-400">
            <span className="shrink-0">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-navy-700 outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2 text-xs text-navy-400">
            <span className="shrink-0">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-navy-700 outline-none"
            />
          </label>
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-900"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {hasFilters
          ? `Showing ${filtered.length} of ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
          : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">
            {hasFilters ? "No activity matches the selected search and filters." : "No activity recorded yet."}
          </p>
        ) : (
          <ul className="divide-y divide-navy-50">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ActionBadge action={entry.action} />
                  <p className="text-xs text-navy-400">
                    {formatAuditDate(entry.created_at)}
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
                        <dt className="font-medium text-navy-400">{metadataLabel(key)}:</dt>
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

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-navy-400">
            Page {page} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
