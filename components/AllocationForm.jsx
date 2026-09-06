"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { ViewDocumentButton } from "./ViewDocumentButton";
import { ClientPhotoField } from "./ClientPhotoField";

const FIELD_CLASS =
  "w-full rounded-xl border border-navy-100 px-3.5 py-3 text-sm text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function AllocationForm({ plotId, plotNumber, streetName, agentName }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", address: "", phone: "", amount: "" });
  const [clientPhoto, setClientPhoto] = useState(null);
  const [state, setState] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submitAllocation() {
    setState("submitting");
    setError(null);

    if (!String(plotNumber || "").trim() || !String(streetName || "").trim()) {
      setError("Plot number and street name cannot be empty.");
      setState("error");
      return;
    }

    try {
      const payload = new FormData();
      Object.entries({ plotId, plotNumber, streetName, clientName: form.name, clientEmail: form.email, clientAddress: form.address, clientPhone: form.phone, amount: form.amount }).forEach(([key, value]) =>
        payload.set(key, value ?? ""),
      );
      if (clientPhoto) payload.set("clientPhoto", clientPhoto);

      const res = await fetch("/api/allocations", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create allocation");
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!reviewing) {
      if (!form.name.trim() || !form.phone.trim() || !form.amount) {
        setError("Complete the client name, phone number, and amount before reviewing.");
        setState("error");
        return;
      }
      setError(null);
      setReviewing(true);
      return;
    }
    submitAllocation();
  }

  if (reviewing && state !== "done") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Allocation preview</p>
          <h2 className="mt-1 text-lg font-bold text-navy-900">Review before generating</h2>
          <p className="mt-1 text-sm text-navy-600">
            Confirm that the information below is correct. The official allocation document will be generated after confirmation.
          </p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <PreviewField label="Plot number" value={plotNumber || "—"} />
            <PreviewField label="Street" value={streetName || "—"} />
            <PreviewField label="Agent" value={agentName || "—"} />
            <PreviewField label="Amount paid" value={`GHS ${Number(form.amount || 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`} />
          </div>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="mb-4 text-sm font-bold text-navy-900">Client details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PreviewField label="Full name" value={form.name || "—"} />
            <PreviewField label="Phone number" value={form.phone || "—"} />
            <PreviewField label="Email" value={form.email || "—"} />
            <PreviewField label="Address" value={form.address || "—"} />
          </div>
          <p className="mt-4 text-xs text-navy-500">
            Client photo: <span className="font-semibold text-navy-700">{clientPhoto ? clientPhoto.name : "Not provided"}</span>
          </p>
        </div>

        {error ? <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-3">
          <button type="button" onClick={() => { setReviewing(false); setError(null); }} className="flex-1 rounded-xl border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50">
            Edit details
          </button>
          <button type="button" onClick={submitAllocation} disabled={state === "submitting"} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-navy-950 hover:bg-amber-300 disabled:opacity-60">
            {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate allocation
          </button>
        </div>
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-green-600" />
        <h2 className="mt-3 text-base font-bold text-navy-900">Allocation recorded</h2>
        <p className="mt-1 text-sm text-navy-500">
          Plot {plotNumber} has been allocated to {form.name}. Notifications have been sent.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {result.pdfUrl ? (
            <ViewDocumentButton
              url={result.pdfUrl}
              title={`Allocation — Plot ${plotNumber}`}
              label="View document"
              icon={() => null}
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            />
          ) : null}
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
          >
            Back to map
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-navy-100 bg-navy-50/70 p-4 text-sm">
        <div>
          <p className="text-navy-400 text-xs">Plot number</p>
          <p className="font-semibold text-navy-900">{plotNumber}</p>
        </div>
        <div>
          <p className="text-navy-400 text-xs">Street</p>
          <p className="font-semibold text-navy-900">{streetName || "—"}</p>
        </div>
        <div className="col-span-2 border-t border-navy-100 pt-3">
          <p className="text-navy-400 text-xs">Agent</p>
          <p className="font-semibold text-navy-900">{agentName}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-navy-100 p-4 sm:p-5">
        <p className="mb-4 text-sm font-bold text-navy-900">Client details</p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-700">Client full name</label>
          <input required className={FIELD_CLASS} value={form.name} onChange={update("name")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Email</label>
            <input type="email" className={FIELD_CLASS} value={form.email} onChange={update("email")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label>
            <input required className={FIELD_CLASS} value={form.phone} onChange={update("phone")} />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label>
          <textarea rows={3} className={FIELD_CLASS} value={form.address} onChange={update("address")} />
        </div>
        <div className="mt-4"><ClientPhotoField file={clientPhoto} onChange={setClientPhoto} /></div>
      </section>
      <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
        <p className="mb-4 text-sm font-bold text-navy-900">Payment</p>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">Amount paid (GHS)</label>
        <input type="number" min="0" step="0.01" required className={FIELD_CLASS} value={form.amount} onChange={update("amount")} />
        <p className="mt-1.5 text-xs text-navy-400">Buying a plot is recorded as paid in full — for a part-payment plan, use Reserve plot instead.</p>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3.5 text-sm font-bold text-navy-950 shadow-sm hover:bg-amber-300 disabled:opacity-60"
      >
        {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Review allocation
      </button>
    </form>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}
