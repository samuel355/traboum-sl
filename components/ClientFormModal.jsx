"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function ClientFormModal({ client, onClose, onSaved }) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
  });
  const [state, setState] = useState("idle"); // idle | submitting | error
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const res = await fetch(isEdit ? `/api/clients/${client.id}` : "/api/clients", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save client");
      onSaved(data.client);
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              {isEdit ? "Edit Client" : "Add Client"}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">{isEdit ? client.name : "New client"}</h2>
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
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Full name</label>
            <input required className={FIELD_CLASS} value={form.name} onChange={update("name")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label>
            <input required className={FIELD_CLASS} value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Email</label>
            <input type="email" className={FIELD_CLASS} value={form.email} onChange={update("email")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label>
            <textarea rows={2} className={FIELD_CLASS} value={form.address} onChange={update("address")} />
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
              disabled={state === "submitting"}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save" : "Add client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
