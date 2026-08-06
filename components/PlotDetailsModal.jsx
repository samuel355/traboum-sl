"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { formatArea, ownerLabel, plotNumber, plotOwner, plotStatus, streetName } from "@/lib/plots";
import { ViewDocumentButton } from "./ViewDocumentButton";

export function PlotDetailsModal({ plotId, onClose }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    setError(null);

    fetch(`/api/plots/${plotId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load plot");
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
  }, [plotId]);

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
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Plot Details</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-navy-900">
              {state === "ready"
                ? `Plot ${plotNumber(data.plot)}${streetName(data.plot) ? ` — ${streetName(data.plot)}` : ""}`
                : "Loading…"}
            </h2>
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
            <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-navy-100 bg-navy-50/50 p-4 text-sm">
              <Field label="Status" value={plotStatus(data.plot)} />
              <Field label="Owner" value={ownerLabel(plotOwner(data.plot))} />
              <Field label="Area" value={formatArea(data.plot)} />
              <Field label="Street" value={streetName(data.plot) || "—"} />
            </div>

            <Section title="Allocation history">
              {!data.allocations.length ? (
                <EmptyRow text="No allocations recorded for this plot." />
              ) : (
                data.allocations.map((row) => (
                  <HistoryRow
                    key={row.id}
                    title={row.client_name}
                    subtitle={[row.client_phone, row.agent].filter(Boolean).join(" · ")}
                    date={row.created_at}
                    pdfUrl={row.pdf_url}
                  />
                ))
              )}
            </Section>

            <Section title="Transfer history">
              {!data.transfers.length ? (
                <EmptyRow text="No transfers recorded for this plot." />
              ) : (
                data.transfers.map((row) => (
                  <HistoryRow
                    key={row.id}
                    title={row.new_client_name}
                    subtitle={[row.new_client_phone, row.recorded_by_name].filter(Boolean).join(" · ")}
                    date={row.recorded_at}
                    pdfUrl={row.pdf_url}
                  />
                ))
              )}
            </Section>
          </>
        )}
      </div>
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
        <ViewDocumentButton url={pdfUrl} title={title} label="Document" />
      </div>
    </div>
  );
}
