"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { DOC_TYPE_LABELS, formatGHS } from "@/lib/clients";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { UploadDocumentModal } from "./UploadDocumentModal";

const RESERVATION_STATUS_LABEL = { active: "Active", converted: "Converted to sale", cancelled: "Cancelled" };

export function ClientDetailsModal({ clientId, canManage, onClose }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleteState, setDeleteState] = useState("idle");
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => (prev === "ready" ? "ready" : "loading"));
    setError(null);

    fetch(`/api/clients/${clientId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load client");
        if (!cancelled) {
          setData(json);
          setState("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => load(), [load]);

  function handleDocSaved() {
    setUploading(false);
    setEditingDoc(null);
    load();
  }

  async function confirmDeleteDoc() {
    setDeleteState("submitting");
    setDeleteError(null);
    try {
      const res = await fetch(`/api/documents/${deletingDoc.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete document");
      setDeletingDoc(null);
      setDeleteState("idle");
      load();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteState("error");
    }
  }

  const passportPhoto = data?.documents?.find((d) => d.doc_type === "passport_photo");
  const otherDocs = data?.documents?.filter((d) => d.doc_type !== "passport_photo") ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {passportPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={passportPhoto.file_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-navy-100 object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Client</p>
              <h2 className="mt-0.5 truncate text-lg font-bold text-navy-900">
                {state === "ready" ? data.client.name : "Loading…"}
              </h2>
              {state === "ready" ? <p className="text-sm text-navy-500">{data.client.phone}</p> : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {state === "loading" ? (
          <div className="flex items-center justify-center py-16 text-navy-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : state === "error" ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-4 rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm">
              <Field label="Plots" value={data.summary.plotCount} />
              <Field label="Total paid" value={formatGHS(data.summary.totalPaid)} />
              <Field label="Remaining" value={formatGHS(data.summary.totalRemaining)} />
            </div>
            {data.client.email || data.client.address ? (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                {data.client.email ? <Field label="Email" value={data.client.email} /> : null}
                {data.client.address ? <Field label="Address" value={data.client.address} /> : null}
              </div>
            ) : null}

            <Section title="Allocations (bought)">
              {!data.allocations.length ? (
                <EmptyRow text="No allocations for this client." />
              ) : (
                data.allocations.map((row) => (
                  <HistoryRow
                    key={row.id}
                    title={`Plot ${row.plot_number}${row.street_name ? ` — ${row.street_name}` : ""}`}
                    subtitle={`Paid ${formatGHS(row.amount)}`}
                    date={row.created_at}
                    pdfUrl={row.pdf_url}
                  />
                ))
              )}
            </Section>

            <Section title="Reservations">
              {!data.reservations.length ? (
                <EmptyRow text="No reservations for this client." />
              ) : (
                data.reservations.map((row) => (
                  <HistoryRow
                    key={row.id}
                    title={`Plot ${row.plot_number}${row.street_name ? ` — ${row.street_name}` : ""}`}
                    subtitle={`${formatGHS(row.amount_paid)} of ${formatGHS(row.total_amount)} paid · ${
                      RESERVATION_STATUS_LABEL[row.status] || row.status
                    }${
                      row.status === "active"
                        ? ` · balance due ${new Date(row.balance_due_date).toLocaleDateString("en-GB")}`
                        : ""
                    }`}
                    date={row.created_at}
                  />
                ))
              )}
            </Section>

            <Section title="Transfers received">
              {!data.transfers.length ? (
                <EmptyRow text="No transfers for this client." />
              ) : (
                data.transfers.map((row) => (
                  <HistoryRow
                    key={row.id}
                    title={`Plot ${row.plot_number}${row.street_name ? ` — ${row.street_name}` : ""}`}
                    subtitle={`Paid ${formatGHS(row.payment_amount)}`}
                    date={row.recorded_at}
                    pdfUrl={row.pdf_url}
                  />
                ))
              )}
            </Section>

            <div className="mt-5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">Documents</h3>
              {canManage ? (
                <button
                  onClick={() => setUploading(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Upload
                </button>
              ) : null}
            </div>
            <div className="mt-2 overflow-hidden rounded-xl border border-navy-100">
              {!data.documents?.length ? (
                <EmptyRow text="No documents on file." />
              ) : (
                [passportPhoto, ...otherDocs].filter(Boolean).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 border-b border-navy-50 px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy-900">
                        {doc.label || DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                      </p>
                      {doc.label || doc.plot_number ? (
                        <p className="truncate text-xs text-navy-400">
                          {doc.label ? DOC_TYPE_LABELS[doc.doc_type] : ""}
                          {doc.label && doc.plot_number ? " · " : ""}
                          {doc.plot_number ? `Plot ${doc.plot_number}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <ViewDocumentButton url={doc.file_url} title={doc.file_name} />
                      {canManage ? (
                        <>
                          <button
                            onClick={() => setEditingDoc(doc)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingDoc(doc)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {uploading ? (
        <UploadDocumentModal clientId={clientId} onClose={() => setUploading(false)} onSaved={handleDocSaved} />
      ) : null}
      {editingDoc ? (
        <UploadDocumentModal
          clientId={clientId}
          document={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaved={handleDocSaved}
        />
      ) : null}

      {deletingDoc ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/40 p-4"
          onClick={() => setDeletingDoc(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-panel" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Delete Document</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">
              {deletingDoc.label || DOC_TYPE_LABELS[deletingDoc.doc_type]}
            </h2>
            <p className="mt-2 text-sm text-navy-500">This can&apos;t be undone.</p>
            {deleteError ? <p className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="flex-1 rounded-lg border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDoc}
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

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-navy-100">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="p-4 text-center text-sm text-navy-400">{text}</p>;
}

function HistoryRow({ title, subtitle, date, pdfUrl }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy-50 px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-900">{title}</p>
        {subtitle ? <p className="truncate text-xs text-navy-400">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs text-navy-400">{new Date(date).toLocaleDateString("en-GB")}</span>
        <ViewDocumentButton url={pdfUrl} title={title} />
      </div>
    </div>
  );
}
