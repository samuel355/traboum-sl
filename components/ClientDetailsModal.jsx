"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Clock,
  FileStack,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { DOC_TYPE_LABELS, DOCUMENTATION_STAGES, formatGHS } from "@/lib/clients";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { UploadDocumentModal } from "./UploadDocumentModal";

const RESERVATION_STATUS_LABEL = { active: "Active", converted: "Converted to sale", cancelled: "Cancelled" };
const STAGE_DOC_TYPES = DOCUMENTATION_STAGES.map((s) => s.docType).filter(Boolean);

const PILL_GHOST = "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50";
const PILL_DANGER = "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50";
const PILL_PRIMARY = "inline-flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy-800";

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function ClientDetailsModal({ clientId, canManage, onClose }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false); // false | true (generic) | docType string (stage)
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
  const miscDocs =
    data?.documents?.filter((d) => d.doc_type !== "passport_photo" && !STAGE_DOC_TYPES.includes(d.doc_type)) ?? [];

  const stageStatus =
    state === "ready"
      ? DOCUMENTATION_STAGES.map((stage) => {
          const isAllocation = stage.key === "allocation";
          const doc = isAllocation ? null : data.documents.find((d) => d.doc_type === stage.docType);
          const latestAllocation = data.allocations[0];
          return {
            stage,
            isAllocation,
            doc,
            complete: isAllocation ? Boolean(latestAllocation) : Boolean(doc),
            viewUrl: isAllocation ? latestAllocation?.pdf_url : doc?.file_url,
            completedDate: isAllocation ? latestAllocation?.created_at : doc?.created_at,
          };
        })
      : [];
  const completedCount = stageStatus.filter((s) => s.complete).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-navy-50 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            {passportPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={passportPhoto.file_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-navy-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-navy-800 to-navy-950 text-sm font-bold text-white shadow-sm">
                {state === "ready" ? initials(data.client.name) : ""}
              </div>
            )}
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
            className="shrink-0 rounded-md p-1 text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 pt-5">
          {state === "loading" ? (
            <div className="flex items-center justify-center py-16 text-navy-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : state === "error" ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm">
                <Field label="Plots" value={data.summary.plotCount} />
                <Field label="Total paid" value={formatGHS(data.summary.totalPaid)} tone="text-green-700" />
                <Field
                  label="Remaining"
                  value={formatGHS(data.summary.totalRemaining)}
                  tone={data.summary.totalRemaining > 0 ? "text-amber-700" : undefined}
                />
              </div>
              {data.client.email || data.client.address ? (
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  {data.client.email ? <Field label="Email" value={data.client.email} /> : null}
                  {data.client.address ? <Field label="Address" value={data.client.address} /> : null}
                </div>
              ) : null}

              <Section title="Allocations (bought)" icon={ScrollText}>
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

              <Section title="Reservations" icon={Clock}>
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

              <Section title="Transfers received" icon={ArrowLeftRight}>
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

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <FileStack className="h-4 w-4 text-navy-400" />
                  <h3 className="text-sm font-bold text-navy-900">Documentation progress</h3>
                  <span className="ml-auto text-xs font-semibold text-navy-500">
                    {completedCount} of {DOCUMENTATION_STAGES.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-50">
                  <div
                    className="h-full rounded-full bg-green-600 transition-all"
                    style={{ width: `${(completedCount / DOCUMENTATION_STAGES.length) * 100}%` }}
                  />
                </div>

                <div className="relative mt-4 rounded-xl border border-navy-100 p-4">
                  <div className="absolute left-[27px] top-7 bottom-7 w-px bg-navy-100" />
                  <div className="space-y-5">
                    {stageStatus.map(({ stage, isAllocation, doc, complete, viewUrl, completedDate }, i) => (
                      <div key={stage.key} className="relative flex items-start gap-3">
                        <span
                          className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                            complete ? "border-green-600 bg-green-600" : "border-navy-200 bg-white"
                          }`}
                        >
                          {complete ? (
                            <Check className="h-3.5 w-3.5 text-white" />
                          ) : (
                            <span className="text-[10px] font-bold text-navy-300">{i + 1}</span>
                          )}
                        </span>
                        <div className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-0.5">
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-semibold ${complete ? "text-navy-900" : "text-navy-400"}`}
                            >
                              {stage.label}
                            </p>
                            {complete && completedDate ? (
                              <p className="text-xs text-navy-400">
                                {new Date(completedDate).toLocaleDateString("en-GB")}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {complete ? (
                              <>
                                <ViewDocumentButton url={viewUrl} title={stage.label} className={PILL_GHOST} />
                                {canManage && !isAllocation ? (
                                  <button onClick={() => setEditingDoc(doc)} className={PILL_GHOST}>
                                    <Pencil className="h-3 w-3" /> Replace
                                  </button>
                                ) : null}
                              </>
                            ) : canManage && !isAllocation ? (
                              <button onClick={() => setUploading(stage.docType)} className={PILL_PRIMARY}>
                                <Plus className="h-3 w-3" /> Upload
                              </button>
                            ) : (
                              <span className="text-xs text-navy-300">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-navy-400" />
                  <h3 className="text-sm font-bold text-navy-900">Other documents</h3>
                </div>
                {canManage ? (
                  <button onClick={() => setUploading(true)} className={PILL_GHOST}>
                    <Plus className="h-3.5 w-3.5" /> Upload
                  </button>
                ) : null}
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-navy-100">
                {!passportPhoto && !miscDocs.length ? (
                  <EmptyRow text="No other documents on file." />
                ) : (
                  [passportPhoto, ...miscDocs].filter(Boolean).map((doc) => (
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
                      <div className="flex shrink-0 items-center gap-2">
                        <ViewDocumentButton url={doc.file_url} title={doc.file_name} className={PILL_GHOST} />
                        {canManage ? (
                          <>
                            <button onClick={() => setEditingDoc(doc)} className={PILL_GHOST}>
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => setDeletingDoc(doc)} className={PILL_DANGER}>
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
      </div>

      {uploading ? (
        <UploadDocumentModal
          clientId={clientId}
          defaultDocType={typeof uploading === "string" ? uploading : undefined}
          onClose={() => setUploading(false)}
          onSaved={handleDocSaved}
        />
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

function Field({ label, value, tone }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className={`mt-0.5 font-semibold ${tone || "text-navy-900"}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-navy-400" /> : null}
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      </div>
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
        <ViewDocumentButton url={pdfUrl} title={title} className={PILL_GHOST} />
      </div>
    </div>
  );
}
