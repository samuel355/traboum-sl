"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Upload } from "lucide-react";
import { ViewDocumentButton } from "./ViewDocumentButton";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const OTHER = "__other__";

export function TransferForm({ plots, defaultFee, preselectedPlotId }) {
  const router = useRouter();
  const [plotChoice, setPlotChoice] = useState(() => {
    if (preselectedPlotId && plots.some((p) => p.id === preselectedPlotId)) return preselectedPlotId;
    return plots[0]?.id ?? OTHER;
  });
  const [manualPlot, setManualPlot] = useState({ number: "", street: "" });
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    amount: defaultFee,
    method: "cash",
    reference: "",
  });
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const selectedPlot = plots.find((p) => p.id === plotChoice);
  const isOther = plotChoice === OTHER || !selectedPlot;

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    const fd = new FormData();
    fd.set("plotId", isOther ? `manual-${manualPlot.number}` : selectedPlot.id);
    fd.set("plotNumber", isOther ? manualPlot.number : selectedPlot.plotNumber);
    fd.set("streetName", isOther ? manualPlot.street : selectedPlot.streetName || "");
    fd.set("newClientName", form.name);
    fd.set("newClientEmail", form.email);
    fd.set("newClientPhone", form.phone);
    fd.set("newClientAddress", form.address);
    fd.set("paymentAmount", form.amount);
    fd.set("paymentMethod", form.method);
    fd.set("paymentReference", form.reference);
    if (file) fd.set("oldAllocationFile", file);

    try {
      const res = await fetch("/api/transfers", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record transfer");
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  if (state === "done" && result) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-green-600" />
        <h2 className="mt-3 text-base font-bold text-navy-900">Transfer recorded</h2>
        <p className="mt-1 text-sm text-navy-500">
          The allocation has been transferred to {form.name}. Notifications have been sent.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {result.pdfUrl ? (
            <ViewDocumentButton
              url={result.pdfUrl}
              title="Transfer document"
              label="View new document"
              icon={() => null}
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            />
          ) : null}
          <button
            onClick={() => router.push("/dashboard/transfers")}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
          >
            Back to transfers
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">Plot being transferred</label>
        <select
          className={FIELD_CLASS}
          value={plotChoice}
          onChange={(e) => setPlotChoice(e.target.value)}
        >
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.plotNumber} {p.streetName ? `— ${p.streetName}` : ""}
            </option>
          ))}
          <option value={OTHER}>Other / not in system (enter manually)</option>
        </select>

        {isOther ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              placeholder="Plot number"
              required
              className={FIELD_CLASS}
              value={manualPlot.number}
              onChange={(e) => setManualPlot((m) => ({ ...m, number: e.target.value }))}
            />
            <input
              placeholder="Street"
              className={FIELD_CLASS}
              value={manualPlot.street}
              onChange={(e) => setManualPlot((m) => ({ ...m, street: e.target.value }))}
            />
          </div>
        ) : null}
      </section>

      <section>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          Old allocation document
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-navy-200 px-4 py-4 text-sm text-navy-500 hover:border-navy-400">
          <Upload className="h-4 w-4 shrink-0" />
          {file ? file.name : "Upload a photo or PDF of the existing allocation"}
          <input
            type="file"
            accept="application/pdf,image/*"
            required
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </section>

      <section className="space-y-4">
        <p className="text-sm font-medium text-navy-700">New client details</p>
        <input
          placeholder="Full name"
          required
          className={FIELD_CLASS}
          value={form.name}
          onChange={update("name")}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email"
            className={FIELD_CLASS}
            value={form.email}
            onChange={update("email")}
          />
          <input
            placeholder="Phone number"
            required
            className={FIELD_CLASS}
            value={form.phone}
            onChange={update("phone")}
          />
        </div>
        <textarea
          rows={3}
          placeholder="Address"
          className={FIELD_CLASS}
          value={form.address}
          onChange={update("address")}
        />
      </section>

      <section className="space-y-4 rounded-lg bg-navy-50 p-4">
        <p className="text-sm font-medium text-navy-700">Payment</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-navy-500">Amount (GHS)</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              className={FIELD_CLASS}
              value={form.amount}
              onChange={update("amount")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-navy-500">Method</label>
            <select className={FIELD_CLASS} value={form.method} onChange={update("method")}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-navy-500">Reference (optional)</label>
          <input
            placeholder="Transaction ID, receipt no., etc."
            className={FIELD_CLASS}
            value={form.reference}
            onChange={update("reference")}
          />
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Record transfer & generate document
      </button>
    </form>
  );
}
