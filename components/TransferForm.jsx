"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { TransferPlotPicker } from "./TransferPlotPicker";
import { ViewDocumentButton } from "./ViewDocumentButton";

const FIELD_CLASS = "w-full rounded-xl border border-navy-100 px-3.5 py-3 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const STEPS = ["Choose plot", "New allottee", "Payment & document"];

export function TransferForm({ plots, defaultFee, preselectedPlotId }) {
  const router = useRouter();
  const initialPlot = preselectedPlotId && plots.some((plot) => String(plot.id) === String(preselectedPlotId)) ? String(preselectedPlotId) : "";
  const [step, setStep] = useState(initialPlot ? 2 : 1);
  const [plotId, setPlotId] = useState(initialPlot);
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", amount: defaultFee, method: "", reference: "" });
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const selectedPlot = plots.find((plot) => String(plot.id) === String(plotId));
  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function removeFile() {
    setFile(null);
    setFileInputKey((current) => current + 1);
    setError(null);
  }

  function next() {
    setError(null);
    if (step === 1 && !plotId) return setError("Choose a sold plot before continuing.");
    if (step === 2 && (!form.name.trim() || !form.phone.trim())) return setError("New allottee name and phone are required.");
    setStep((current) => Math.min(3, current + 1));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return setError("Upload the old allocation document before continuing.");
    if (!form.method) return setError("Select a payment method before continuing.");
    setState("submitting");
    setError(null);
    const fd = new FormData();
    fd.set("plotId", selectedPlot.id);
    fd.set("plotNumber", selectedPlot.plotNumber || "");
    fd.set("streetName", selectedPlot.streetName || "");
    fd.set("newClientName", form.name);
    fd.set("newClientEmail", form.email);
    fd.set("newClientPhone", form.phone);
    fd.set("newClientAddress", form.address);
    fd.set("paymentAmount", form.amount);
    fd.set("paymentMethod", form.method);
    fd.set("paymentReference", form.reference);
    fd.set("oldAllocationFile", file);
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

  if (state === "done" && result) return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-8 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
      <h2 className="mt-3 text-lg font-bold text-navy-900">Transfer recorded</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-navy-500">The allocation is now recorded under {form.name}. Notifications have been sent.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {result.pdfUrl ? <ViewDocumentButton url={result.pdfUrl} title="Transfer document" label="View new document" icon={() => null} className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800" /> : null}
        <button onClick={() => router.push("/dashboard/transfers")} className="rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-white">Back to transfers</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
      <div className="grid grid-cols-3 border-b border-navy-100 bg-navy-50/60">
        {STEPS.map((label, index) => { const number = index + 1; return <div key={label} className={`border-b-2 px-3 py-4 text-center text-xs font-semibold sm:px-5 ${step === number ? "border-amber-500 text-navy-900" : step > number ? "border-green-500 text-green-700" : "border-transparent text-navy-400"}`}><span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/10">{step > number ? "✓" : number}</span>{label}</div>; })}
      </div>
      <div className="p-4 sm:p-6">
        {step === 1 ? <TransferPlotPicker plots={plots} value={plotId} onChange={setPlotId} /> : null}
        {step === 2 ? <section className="space-y-4"><div><p className="text-sm font-bold text-navy-900">New allottee details</p><p className="mt-1 text-xs text-navy-500">These details will appear on the new transfer document.</p></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Full name</label><input required className={FIELD_CLASS} value={form.name} onChange={update("name")} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label><input required className={FIELD_CLASS} value={form.phone} onChange={update("phone")} /></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Email</label><input type="email" className={FIELD_CLASS} value={form.email} onChange={update("email")} /></div></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label><textarea rows={4} className={FIELD_CLASS} value={form.address} onChange={update("address")} /></div></section> : null}
        {step === 3 ? <section className="space-y-5"><div><p className="text-sm font-bold text-navy-900">Payment & old document</p><p className="mt-1 text-xs text-navy-500">Attach the previous allocation and record the transfer payment.</p></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Old allocation document <span className="text-red-600">*</span></label><label className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 text-sm transition ${file ? "border-green-300 bg-green-50 text-green-800" : "border-navy-200 bg-navy-50/40 text-navy-600 hover:border-navy-400"}`}><FileText className="h-5 w-5 shrink-0 text-navy-400" /><span className="min-w-0 flex-1 truncate">{file ? file.name : "Upload old allocation document (PDF or image)"}</span><Upload className="h-4 w-4 shrink-0" /><input key={fileInputKey} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(null); }} /></label>{file ? <div className="mt-3 overflow-hidden rounded-xl border border-navy-100 bg-navy-50/40"><div className="flex items-center gap-2 border-b border-navy-100 bg-white px-3 py-2.5"><Eye className="h-4 w-4 text-navy-500" /><p className="min-w-0 flex-1 truncate text-xs font-semibold text-navy-700">Preview: {file.name}</p><button type="button" onClick={removeFile} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" aria-label="Remove uploaded document"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div>{file.type.startsWith("image/") ? <img src={filePreviewUrl} alt={`Preview of ${file.name}`} className="max-h-72 w-full object-contain p-3" /> : <iframe src={filePreviewUrl} title={`Preview of ${file.name}`} className="h-72 w-full bg-white" />}</div> : null}<p className="mt-1.5 text-xs text-navy-400">This document is required to complete the transfer. You can preview or remove it before recording the transfer.</p></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Amount paid (GHS)</label><input type="number" min="0" step="0.01" required className={FIELD_CLASS} value={form.amount} onChange={update("amount")} /></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Payment method <span className="text-red-600">*</span></label><select className={`${FIELD_CLASS} h-12 py-0`} value={form.method} onChange={(e) => { update("method")(e); setError(null); }}><option value="">Select payment method</option><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank">Bank transfer</option><option value="other">Other</option></select></div></div><div><label className="mb-1.5 block text-sm font-medium text-navy-700">Reference (optional)</label><input className={FIELD_CLASS} placeholder="Transaction ID or receipt number" value={form.reference} onChange={update("reference")} /></div></section> : null}
        {error ? <p className="mt-5 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex gap-3"><button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || state === "submitting"} className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50 disabled:invisible"><ArrowLeft className="h-4 w-4" /> Back</button>{step < 3 ? <button type="button" onClick={next} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800">Continue <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={state === "submitting"} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-navy-950 hover:bg-amber-300 disabled:opacity-60">{state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Record transfer</button>}</div>
      </div>
    </form>
  );
}
