"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, FileSpreadsheet, Loader2, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { ALLOCATION_STAGES, ALLOCATION_STATUS_STYLE, allocationStatusLabel } from "@/lib/plots";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { AllocationEditModal } from "./AllocationEditModal";

const PILL_GHOST = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50";
const PILL_DANGER = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50";
const NEXT_STATUS = {
  pending: { value: "signed", label: "Mark signed" },
  signed: { value: "ready_to_collect", label: "Mark ready" },
  ready_to_collect: { value: "collected", label: "Mark collected" },
};

function referenceNumber(row) {
  return row.reference_number || (row.id ? `TSL-${String(row.id).slice(-8).toUpperCase()}` : "—");
}

function fileNumber(row) {
  if (row.file_number) return row.file_number;
  const plot = String(row.plot_number || "PLOT").replace(/\s+/g, "").toUpperCase();
  const year = row.created_at ? new Date(row.created_at).getFullYear() : null;
  return year ? `TSL-${plot}-${year}` : "—";
}

function StatusBadge({ status }) {
  const tone = ALLOCATION_STATUS_STYLE[status] || ALLOCATION_STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {allocationStatusLabel(status)}
    </span>
  );
}

function SortButton({ label, onClick, active, direction }) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 font-inherit text-left hover:text-navy-900">
      {label}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AllocationsTable({ allocations, canManage, canDelete }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState({ key: "created_at", direction: "desc" });
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [deletingAllocation, setDeletingAllocation] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteState, setDeleteState] = useState("idle");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = !q ? allocations : allocations.filter((row) =>
      [
        row.plot_number,
        row.street_name,
        row.client_name,
        row.client_phone,
        row.agent,
        referenceNumber(row),
        fileNumber(row),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
    return rows
      .filter((row) => !statusFilter || row.status === statusFilter)
      .sort((a, b) => {
        const value = (row) => {
          if (sort.key === "reference") return referenceNumber(row);
          if (sort.key === "file") return fileNumber(row);
          return row[sort.key] ?? "";
        };
        const left = String(value(a)).toLowerCase();
        const right = String(value(b)).toLowerCase();
        const result = left.localeCompare(right, undefined, { numeric: true });
        return sort.direction === "asc" ? result : -result;
      });
  }, [allocations, query, statusFilter, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function exportRows(format) {
    const columns = [
      ["Plot number", (row) => row.plot_number || ""],
      ["Street name", (row) => row.street_name || ""],
      ["Reference number", referenceNumber],
      ["File number", fileNumber],
      ["Client", (row) => row.client_name || ""],
      ["Phone", (row) => row.client_phone || ""],
      ["Agent", (row) => row.agent || ""],
      ["Date", (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "")],
      ["Status", (row) => allocationStatusLabel(row.status)],
    ];
    if (format === "csv") {
      const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
      const csv = [columns.map(([label]) => escape(label)), ...filtered.map((row) => columns.map(([, get]) => escape(get(row))))]
        .map((line) => line.join(","))
        .join("\n");
      downloadBlob(`trabuom-allocations-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
      return;
    }
    const table = `<table><thead><tr>${columns.map(([label]) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${filtered
      .map((row) => `<tr>${columns.map(([, get]) => `<td>${escapeHtml(get(row))}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Trabuom Allocations</title><style>body{font-family:Arial,sans-serif;color:#0b0e2d;padding:28px}h1{font-size:20px}p{color:#64748b;font-size:12px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#0b0e2d;color:#fff;text-align:left}th,td{border:1px solid #d6daec;padding:7px}tr:nth-child(even){background:#f7f8fb}</style></head><body><h1>Trabuom Stool Lands — Allocations</h1><p>Exported ${new Date().toLocaleString("en-GB")} · ${filtered.length} record${filtered.length === 1 ? "" : "s"}</p>${table}</body></html>`;
    if (format === "word") {
      downloadBlob(`trabuom-allocations-${new Date().toISOString().slice(0, 10)}.doc`, html, "application/msword");
    } else {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

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

  async function generateAndPrint(allocation) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatusError("Allow pop-ups to generate and print the allocation.");
      return;
    }

    setPrintingId(allocation.id);
    setStatusError(null);
    try {
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateDocument: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate allocation document");
      if (!data.allocation?.pdf_url) throw new Error("Allocation document could not be generated");
      printWindow.location.href = data.allocation.pdf_url;
      router.refresh();
    } catch (err) {
      printWindow.close();
      setStatusError(err.message);
    } finally {
      setPrintingId(null);
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
      <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plot, client, reference, or file number" className="w-full rounded-xl border border-navy-100 py-3 pl-9 pr-3.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-navy-100 bg-white px-3 py-3 text-sm text-navy-700 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15">
            <option value="">All statuses</option>
            {ALLOCATION_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => exportRows("csv")} className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 px-3 py-2.5 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FileSpreadsheet className="h-4 w-4 text-green-700" /> CSV</button>
            <button type="button" onClick={() => exportRows("word")} className="inline-flex items-center gap-1.5 rounded-xl border border-navy-200 px-3 py-2.5 text-xs font-semibold text-navy-700 hover:bg-navy-50"><FileText className="h-4 w-4 text-blue-700" /> Word</button>
            <button type="button" onClick={() => exportRows("pdf")} className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-navy-800"><Printer className="h-4 w-4 text-amber-300" /> PDF</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy-400">
          <Download className="h-3.5 w-3.5" /> Exports use the current search, status filter, and sort order.
        </div>
      </div>

      <p className="mt-3 text-xs text-navy-400">
        {query || statusFilter
          ? `Showing ${filtered.length} of ${allocations.length} filtered allocations`
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
          <>
            <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3"><SortButton label="Plot" onClick={() => toggleSort("plot_number")} active={sort.key === "plot_number"} direction={sort.direction} /></th>
                <th className="px-4 py-3"><SortButton label="Reference / file" onClick={() => toggleSort("reference")} active={sort.key === "reference"} direction={sort.direction} /></th>
                <th className="px-4 py-3"><SortButton label="Client" onClick={() => toggleSort("client_name")} active={sort.key === "client_name"} direction={sort.direction} /></th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3"><SortButton label="Date" onClick={() => toggleSort("created_at")} active={sort.key === "created_at"} direction={sort.direction} /></th>
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
                  <td className="px-4 py-3 text-navy-500">
                    <span className="block font-medium text-navy-700">{referenceNumber(row)}</span>
                    <span className="block text-xs text-navy-400">{fileNumber(row)}</span>
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
                        url={`${row.pdf_url}${row.updated_at ? `?v=${encodeURIComponent(row.updated_at)}` : ""}`}
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
                        <button
                          type="button"
                          onClick={() => generateAndPrint(row)}
                          disabled={printingId === row.id}
                          className={PILL_GHOST}
                        >
                          {printingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                          Print
                        </button>
                      ) : null}
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
            <div className="divide-y divide-navy-50 md:hidden">
            {filtered.map((row) => (
              <div key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy-900">Plot {row.plot_number || "—"}</p>
                    <p className="truncate text-xs text-navy-500">{row.street_name || "Street not set"}</p>
                    </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-navy-400">Client</p><p className="mt-0.5 truncate font-semibold text-navy-700">{row.client_name}</p></div>
                  <div><p className="text-navy-400">Phone</p><p className="mt-0.5 truncate text-navy-600">{row.client_phone}</p></div>
                  <div><p className="text-navy-400">Reference</p><p className="mt-0.5 truncate text-navy-600">{referenceNumber(row)}</p></div>
                  <div><p className="text-navy-400">Date</p><p className="mt-0.5 text-navy-600">{new Date(row.created_at).toLocaleDateString("en-GB")}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-navy-50 pt-3">
                  {row.pdf_url ? <ViewDocumentButton url={`${row.pdf_url}${row.updated_at ? `?v=${encodeURIComponent(row.updated_at)}` : ""}`} title={`Allocation — Plot ${row.plot_number}`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50" /> : null}
                  {canManage ? <button type="button" onClick={() => generateAndPrint(row)} disabled={printingId === row.id} className={PILL_GHOST}>{printingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />} Print</button> : null}
                  {canManage ? <button onClick={() => setEditingAllocation(row)} className={PILL_GHOST}><Pencil className="h-3 w-3" /> Edit</button> : null}
                  {canDelete ? <button onClick={() => setDeletingAllocation(row)} className={PILL_DANGER}><Trash2 className="h-3 w-3" /> Delete</button> : null}
                </div>
              </div>
            ))}
            </div>
          </>
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
              Plot {deletingAllocation.plot_number || ""}
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
