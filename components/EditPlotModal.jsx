"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { OWNER_OPTIONS, plotAssignee, plotNumber, streetName } from "@/lib/plots";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-navy-100 bg-white px-3.5 text-sm text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

const STATUS_OPTIONS = ["Available", "Reserved", "Sold", "On Hold"];

export function EditPlotModal({ plot, onClose, onSaved, onGenerateAllocation }) {
  const initialPlotNumber =
    plot.plotNumber ??
    plot.properties?.plotNumber ??
    plot.plot_number ??
    plot.properties?.Plot_No ??
    "";
  const initialStreetName =
    plot.streetName ??
    plot.properties?.streetName ??
    plot.street_name ??
    plot.properties?.Street_Nam ??
    "";
  const initialAssignee = plotAssignee(plot);

  const [owner, setOwner] = useState(plot.owner ?? "tsl");
  const [plotNumberValue, setPlotNumberValue] = useState(String(initialPlotNumber ?? ""));
  const [streetNameValue, setStreetNameValue] = useState(String(initialStreetName ?? ""));
  const [status, setStatus] = useState(plot.status ?? "Available");
  const [assignee, setAssignee] = useState({
    name: initialAssignee.name,
    contact: initialAssignee.contact,
    address: initialAssignee.address,
  });
  const [state, setState] = useState("idle"); // idle | submitting | error
  const [error, setError] = useState(null);

  const updateAssignee = (field) => (e) => setAssignee((current) => ({ ...current, [field]: e.target.value }));

  async function savePlot(generateAllocation = false) {
    setState("submitting");
    setError(null);

    const updates = {
      owner: owner || null,
      status,
      plotNumber: plotNumberValue.trim() || null,
      streetName: streetNameValue.trim() || null,
      clientName: assignee.name.trim(),
      clientContact: assignee.contact.trim(),
      clientAddress: assignee.address.trim(),
    };

    try {
      const res = await fetch(`/api/plots/${plot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plot");
      if (generateAllocation) {
        onGenerateAllocation(data.plot);
      } else {
        onSaved(data.plot);
      }
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    savePlot();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Edit Plot</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-navy-900">
              Plot {plotNumber(plot)}
              {streetName(plot) ? ` — ${streetName(plot)}` : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Plot number</label>
            <input
              type="text"
              value={plotNumberValue}
              onChange={(e) => setPlotNumberValue(e.target.value)}
              className={FIELD_CLASS}
              placeholder="e.g. 12A"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Street name</label>
            <input
              type="text"
              value={streetNameValue}
              onChange={(e) => setStreetNameValue(e.target.value)}
              className={FIELD_CLASS}
              placeholder="e.g. Main Street"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Owner</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={SELECT_CLASS}>
              {OWNER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLASS}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-navy-100 pt-4">
            <p className="text-sm font-bold text-navy-900">Assign to client</p>
            <p className="mt-1 text-xs text-navy-500">
              Save client details now and generate the allocation later.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Full name (optional)</label>
                <input className={FIELD_CLASS} value={assignee.name} onChange={updateAssignee("name")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Contact</label>
                <input className={FIELD_CLASS} value={assignee.contact} onChange={updateAssignee("contact")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label>
                <textarea rows={2} className={FIELD_CLASS} value={assignee.address} onChange={updateAssignee("address")} />
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state === "submitting"}
              className="flex-1 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => savePlot(true)}
              disabled={state === "submitting"}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-navy-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
