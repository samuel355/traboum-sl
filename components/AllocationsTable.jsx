"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { ALLOCATION_STATUS_STYLE, allocationStatusLabel } from "@/lib/plots";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { AllocationEditModal } from "./AllocationEditModal";

const PILL_GHOST = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50";
const PILL_DANGER = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50";
const NEXT_STATUS = {
  pending: { value: "signed", label: "Mark signed" },
  signed: { value: "ready_to_collect", label: "Mark ready" },
  ready_to_collect: { value: "collected", label: "Mark collected" },
};

function StatusBadge({ status }) {
  const tone = ALLOCATION_STATUS_STYLE[status] || ALLOCATION_STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {allocationStatusLabel(status)}
    </span>
  );
}

export function AllocationsTable({ allocations, canManage, canDelete }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [deletingAllocation, setDeletingAllocation] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteState, setDeleteState] = useState("idle");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allocations;
    return allocations.filter((row) =>
      [row.plot_number, row.street_name, row.client_name, row.client_phone, row.agent]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [allocations, query]);

  function handleSaved() {
    setEditingAllocation(null);
    router.refresh();
  }

  async function updateStatus(allocation, status) {
    setUpdatingStatusId(allocation.id);
    setStatusError(null);
    try {
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update allocation status");
      router.refresh();
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function confirmDelete() {
    setDeleteState("submitting");
    setDeleteError(null);
    try {
      const res = await fetch(`/api/allocations/${deletingAllocation.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete allocation");
      setDeletingAllocation(null);
      setDeleteState("idle");
      router.refresh();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteState("error");
    }
  }

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

      {statusError ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{statusError}</p>
      ) : null}

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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={row.status} />
                      {canManage && NEXT_STATUS[row.status] ? (
                        <button
                          type="button"
                          onClick={() => updateStatus(row, NEXT_STATUS[row.status].value)}
                          disabled={updatingStatusId === row.id}
                          className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2 py-1 text-[11px] font-semibold text-navy-700 hover:bg-navy-50 disabled:opacity-60"
                        >
                          {updatingStatusId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {NEXT_STATUS[row.status].label}
                        </button>
                      ) : null}
                    </div>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canManage ? (
                        <button onClick={() => setEditingAllocation(row)} className={PILL_GHOST}>
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button onClick={() => setDeletingAllocation(row)} className={PILL_DANGER}>
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

      {editingAllocation ? (
        <AllocationEditModal
          allocation={editingAllocation}
          onClose={() => setEditingAllocation(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deletingAllocation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
          onClick={() => setDeletingAllocation(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-panel" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Delete Allocation</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">
              Plot {deletingAllocation.plot_number || deletingAllocation.plot_id}
            </h2>
            <p className="mt-2 text-sm text-navy-500">
              This can&apos;t be undone. The plot will be set back to Available and the allocation
              document removed.
            </p>
            {deleteError ? <p className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingAllocation(null)}
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
