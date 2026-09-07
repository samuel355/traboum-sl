"use client";

import { useMemo, useState } from "react";
import { Edit3, Search, Trash2 } from "lucide-react";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { TransferEditModal } from "./TransferEditModal";

export function TransfersTable({ transfers, plots }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter((row) =>
      [row.plot_number, row.street_name, row.new_client_name, row.new_client_phone, row.recorded_by_name]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [transfers, query]);

  function startEdit(row) {
    setEditing(row);
    setError("");
  }

  async function deleteTransfer(row) {
    if (!window.confirm(`Delete the transfer for ${row.new_client_name || "this client"}?`)) return;
    const response = await fetch(`/api/transfers/${row.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Failed to delete transfer");
    window.location.reload();
  }

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by plot, client, or recorded by"
          className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${transfers.length} transfers matching "${query}"`
          : `${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">
            {query ? `No transfers match "${query}".` : "No transfers recorded yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Plot</th>
                <th className="px-4 py-3">New client</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Recorded by</th>
                <th className="px-4 py-3">Recorded at</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Actions</th>
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
                  <td className="px-4 py-3 text-navy-700">{row.new_client_name}</td>
                  <td className="px-4 py-3 text-navy-500">
                    GHS {Number(row.payment_amount).toLocaleString("en-GH")}
                    <span className="block text-xs text-navy-400">{row.payment_method || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-navy-500">{row.recorded_by_name}</td>
                  <td className="px-4 py-3 text-navy-500">
                    {new Date(row.recorded_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ViewDocumentButton
                        url={row.pdf_url}
                        title={`Transfer — Plot ${row.plot_number}`}
                        label="New"
                        className="inline-flex items-center gap-1 font-semibold text-navy-900 hover:underline"
                      />
                      <ViewDocumentButton
                        url={row.old_allocation_file_url}
                        title={`Old allocation — Plot ${row.plot_number}`}
                        label="Old"
                        className="inline-flex items-center gap-1 text-navy-500 hover:underline"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                      <button type="button" onClick={() => deleteTransfer(row)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editing ? <TransferEditModal transfer={editing} plots={plots} onClose={() => setEditing(null)} onSaved={() => window.location.reload()} /> : null}
    </div>
  );
}
