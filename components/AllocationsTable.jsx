"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ViewDocumentButton } from "./ViewDocumentButton";

export function AllocationsTable({ allocations }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allocations;
    return allocations.filter((row) =>
      [row.plot_number, row.street_name, row.client_name, row.client_phone, row.agent]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [allocations, query]);

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by plot, client, or phone"
          className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${allocations.length} allocations matching "${query}"`
          : `${allocations.length} allocation${allocations.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">
            {query ? `No allocations match "${query}".` : "No allocations recorded yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Plot</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Document</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {row.plot_number}
                    {row.street_name ? (
                      <span className="block text-xs text-navy-400">{row.street_name}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-navy-700">{row.client_name}</td>
                  <td className="px-4 py-3 text-navy-500">{row.client_phone}</td>
                  <td className="px-4 py-3 text-navy-500">{row.agent}</td>
                  <td className="px-4 py-3 text-navy-500">
                    {new Date(row.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    {row.pdf_url ? (
                      <ViewDocumentButton
                        url={row.pdf_url}
                        title={`Allocation — Plot ${row.plot_number}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-navy-900 hover:underline"
                      />
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
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
