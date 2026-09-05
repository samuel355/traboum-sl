"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { ALLOCATION_STAGES } from "@/lib/plots";
import { ClientPhotoField } from "./ClientPhotoField";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function AllocationEditModal({ allocation, onClose, onSaved }) {
  const [form, setForm] = useState({
    clientName: allocation.client_name ?? "",
    clientPhone: allocation.client_phone ?? "",
    clientEmail: allocation.client_email ?? "",
    clientAddress: allocation.client_address ?? "",
    agent: allocation.agent ?? "",
    amount: allocation.amount ?? "",
    status: allocation.status ?? "pending",
  });
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [clientPhoto, setClientPhoto] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const currentStatusIndex = ALLOCATION_STAGES.findIndex((stage) => stage.key === allocation.status);
  const selectedStatusIndex = ALLOCATION_STAGES.findIndex((stage) => stage.key === form.status);
  const invalidStatusChange =
    selectedStatusIndex !== currentStatusIndex && selectedStatusIndex !== currentStatusIndex + 1;

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const res = await fetch(`/api/allocations/${allocation.id}`, {
        method: "PATCH",
        body: (() => {
          const payload = new FormData();
          Object.entries({ ...form, amount: Number(form.amount) }).forEach(([key, value]) => payload.set(key, value ?? ""));
          if (clientPhoto) payload.set("clientPhoto", clientPhoto);
          return payload;
        })(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save allocation");
      onSaved(data.allocation);
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Edit Allocation</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">
              Plot {allocation.plot_number || allocation.plot_id}
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
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Status</label>
            <select className={FIELD_CLASS} value={form.status} onChange={update("status")}>
              {ALLOCATION_STAGES.map((stage) => (
                <option
                  key={stage.key}
                  value={stage.key}
                  disabled={stage.key !== allocation.status && ALLOCATION_STAGES[currentStatusIndex + 1]?.key !== stage.key}
                >
                  {stage.label}
                </option>
              ))}
            </select>
            {invalidStatusChange ? (
              <p className="mt-1.5 text-xs text-amber-600">
                Allocation statuses must be updated in order.
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Client name</label>
            <input required className={FIELD_CLASS} value={form.clientName} onChange={update("clientName")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label>
            <input required className={FIELD_CLASS} value={form.clientPhone} onChange={update("clientPhone")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Email</label>
            <input type="email" className={FIELD_CLASS} value={form.clientEmail} onChange={update("clientEmail")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label>
            <textarea rows={2} className={FIELD_CLASS} value={form.clientAddress} onChange={update("clientAddress")} />
          </div>
          <ClientPhotoField file={clientPhoto} onChange={setClientPhoto} />
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-navy-700">Agent</label>
              {form.agent ? (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, agent: "" }))}
                  className="text-xs font-semibold text-navy-500 hover:text-navy-900"
                >
                  Remove agent
                </button>
              ) : null}
            </div>
            <input
              className={FIELD_CLASS}
              value={form.agent}
              onChange={update("agent")}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Amount paid (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className={FIELD_CLASS}
              value={form.amount}
              onChange={update("amount")}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state === "submitting" || invalidStatusChange}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
