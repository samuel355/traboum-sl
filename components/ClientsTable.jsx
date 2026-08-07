"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { formatGHS } from "@/lib/clients";
import { ClientFormModal } from "./ClientFormModal";
import { ClientDetailsModal } from "./ClientDetailsModal";

const PILL_GHOST = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50";
const PILL_DANGER = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50";

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function ClientsTable({ clients, canManage, canDelete }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteState, setDeleteState] = useState("idle");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.email].filter(Boolean).some((field) => field.toLowerCase().includes(q)),
    );
  }, [clients, query]);

  function handleSaved() {
    setAdding(false);
    setEditingClient(null);
    router.refresh();
  }

  async function confirmDelete() {
    setDeleteState("submitting");
    setDeleteError(null);
    try {
      const res = await fetch(`/api/clients/${deletingClient.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete client");
      setDeletingClient(null);
      setDeleteState("idle");
      router.refresh();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteState("error");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or email"
            className="w-full rounded-lg border border-navy-100 py-2.5 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
          />
        </div>
        {canManage ? (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" /> Add client
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query
          ? `Showing ${filtered.length} of ${clients.length} clients matching "${query}"`
          : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {!filtered.length ? (
          <p className="p-10 text-center text-sm text-navy-400">
            {query ? `No clients match "${query}".` : "No clients yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Plots</th>
                <th className="px-4 py-3">Total paid</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-navy-800 to-navy-950 text-[11px] font-bold text-white">
                        {initials(client.name)}
                      </div>
                      <span className="font-medium text-navy-900">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy-500">{client.phone}</td>
                  <td className="px-4 py-3 text-navy-500">{client.plotCount}</td>
                  <td className="px-4 py-3 text-navy-500">{formatGHS(client.totalPaid)}</td>
                  <td className="px-4 py-3">
                    {client.totalRemaining > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {formatGHS(client.totalRemaining)}
                      </span>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewingClientId(client.id)} className={PILL_GHOST}>
                        View
                      </button>
                      {canManage ? (
                        <button onClick={() => setEditingClient(client)} className={PILL_GHOST}>
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button onClick={() => setDeletingClient(client)} className={PILL_DANGER}>
                          <Trash2 className="h-3 w-3" /> Delete
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

      {adding ? (
        <ClientFormModal onClose={() => setAdding(false)} onSaved={handleSaved} />
      ) : null}
      {editingClient ? (
        <ClientFormModal client={editingClient} onClose={() => setEditingClient(null)} onSaved={handleSaved} />
      ) : null}
      {viewingClientId ? (
        <ClientDetailsModal clientId={viewingClientId} canManage={canManage} onClose={() => setViewingClientId(null)} />
      ) : null}

      {deletingClient ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
          onClick={() => setDeletingClient(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Delete Client</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">{deletingClient.name}</h2>
            <p className="mt-2 text-sm text-navy-500">
              This can&apos;t be undone. Clients with any allocations, reservations, or transfers on
              record can&apos;t be deleted.
            </p>
            {deleteError ? <p className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
                className="flex-1 rounded-lg border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteState === "submitting"}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteState === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
