"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { TransferPlotPicker } from "./TransferPlotPicker";
import { ClientPhotoField } from "./ClientPhotoField";

const FIELD_CLASS = "w-full rounded-xl border border-navy-100 px-3.5 py-3 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";
const STEPS = ["Choose plot", "New allottee", "Payment & document"];

export function TransferEditModal({ transfer, plots, onClose, onSaved }) {
  const initialPlot = plots.find((plot) => String(plot.id) === String(transfer.plot_id));
  const [step, setStep] = useState(1);
  const [plotId, setPlotId] = useState(String(transfer.plot_id || ""));
  const [form, setForm] = useState({
    name: transfer.new_client_name || "",
    email: transfer.new_client_email || "",
    phone: transfer.new_client_phone || "",
    address: transfer.new_client_address || "",
    amount: transfer.payment_amount || "",
    method: transfer.payment_method || "",
    reference: transfer.payment_reference || "",
  });
  const [file, setFile] = useState(null);
  const [clientPhoto, setClientPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedPlot = plots.find((plot) => String(plot.id) === String(plotId)) || initialPlot;

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function next() {
    setError("");
    if (step === 1 && !selectedPlot?.id) return setError("Choose a plot before continuing.");
    if (step === 2 && (!form.name.trim() || !form.phone.trim())) return setError("New allottee name and phone are required.");
    setStep((current) => Math.min(3, current + 1));
  }

  function removeFile() {
    setFile(null);
    setInputKey((current) => current + 1);
  }

  async function save(e) {
    e.preventDefault();
    if (!selectedPlot?.id) return setError("Choose a plot before saving.");
    if (!form.name.trim() || !form.phone.trim() || !form.amount || !form.method) return setError("Complete the allottee and payment details before saving.");
    setSaving(true);
    setError("");
    try {
      let oldAllocationFileUrl = transfer.old_allocation_file_url || "";
      let clientPhotoUrl = "";
      if (clientPhoto) {
        const photoUrlResponse = await fetch("/api/transfers/photo-upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: clientPhoto.type, fileSize: clientPhoto.size }) });
        const photoUrlData = await photoUrlResponse.json();
        if (!photoUrlResponse.ok) throw new Error(photoUrlData.error || "Could not prepare client photo upload");
        const photoUpload = await fetch(photoUrlData.uploadUrl, { method: "PUT", headers: { "Content-Type": clientPhoto.type }, body: clientPhoto });
        if (!photoUpload.ok) throw new Error("Could not upload the client photo");
        clientPhotoUrl = photoUrlData.fileUrl;
      }
      if (file) {
        const uploadResponse = await fetch("/api/transfers/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, fileSize: file.size }),
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Could not prepare document upload");
        const fileResponse = await fetch(uploadData.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!fileResponse.ok) throw new Error("Could not upload the updated allocation document");
        oldAllocationFileUrl = uploadData.fileUrl;
      }

      const response = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId: selectedPlot.id,
          plotNumber: selectedPlot.plotNumber || "",
          streetName: selectedPlot.streetName || "",
          oldAllocationFileUrl,
          clientPhotoUrl,
          ...form,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update transfer");
      onSaved(data.transfer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transfer");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-navy-100 p-5 sm:p-6">
          <div><h2 className="text-lg font-bold text-navy-900">Edit transfer</h2><p className="mt-1 text-sm text-navy-500">Review the full process. Saving regenerates the transfer PDF.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-3 border-b border-navy-100 bg-navy-50/60">
          {STEPS.map((label, index) => { const number = index + 1; return <div key={label} className={`border-b-2 px-2 py-3 text-center text-xs font-semibold ${step === number ? "border-amber-500 text-navy-900" : step > number ? "border-green-500 text-green-700" : "border-transparent text-navy-400"}`}>{step > number ? <CheckCircle2 className="mx-auto h-4 w-4" /> : number}<span className="mt-1 block">{label}</span></div>; })}
        </div>
        <form onSubmit={save} className="p-4 sm:p-6">
          {step === 1 ? <TransferPlotPicker plots={plots} value={plotId} onChange={(value) => { setPlotId(value); setError(""); }} /> : null}
          {step === 2 ? <section className="space-y-4"><p className="text-sm font-bold text-navy-900">New allottee details</p><input className={FIELD_CLASS} placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><input className={FIELD_CLASS} placeholder="Phone number" value={form.phone} onChange={(e) => update("phone", e.target.value)} /><input type="email" className={FIELD_CLASS} placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div><textarea rows={4} className={FIELD_CLASS} placeholder="Address" value={form.address} onChange={(e) => update("address", e.target.value)} /><ClientPhotoField file={clientPhoto} onChange={setClientPhoto} /></section> : null}
          {step === 3 ? <section className="space-y-5"><div><p className="text-sm font-bold text-navy-900">Payment & document</p><p className="mt-1 text-xs text-navy-500">Keep the existing document or upload a replacement.</p></div><div className="grid gap-4 sm:grid-cols-2"><input type="number" min="0" step="0.01" className={FIELD_CLASS} placeholder="Amount paid" value={form.amount} onChange={(e) => update("amount", e.target.value)} /><select className={FIELD_CLASS} value={form.method} onChange={(e) => update("method", e.target.value)}><option value="">Select payment method</option><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank">Bank transfer</option><option value="other">Other</option></select></div><input className={FIELD_CLASS} placeholder="Payment reference (optional)" value={form.reference} onChange={(e) => update("reference", e.target.value)} /><label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-navy-50/40 px-3.5 text-sm text-navy-600"><FileText className="h-5 w-5 text-navy-400" /><span className="min-w-0 flex-1 truncate">{file ? file.name : "Upload replacement old allocation document"}</span><Upload className="h-4 w-4" /><input key={inputKey} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} /></label>{file ? <div className="overflow-hidden rounded-xl border border-navy-100"><div className="flex items-center gap-2 border-b border-navy-100 px-3 py-2"><Eye className="h-4 w-4 text-navy-500" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{file.name}</span><button type="button" onClick={removeFile} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div>{file.type.startsWith("image/") ? <img src={previewUrl} alt={file.name} className="max-h-56 w-full object-contain p-2" /> : <iframe src={previewUrl} title={file.name} className="h-56 w-full" />}</div> : <p className="text-xs text-navy-400">Existing document will remain attached unless you upload a replacement.</p>}</section> : null}
          {error ? <p className="mt-5 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">{error}</p> : null}
          <div className="mt-6 flex gap-3"><button type="button" onClick={() => step === 1 ? onClose() : setStep((current) => current - 1)} className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-3 text-sm font-semibold text-navy-700"><ArrowLeft className="h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}</button>{step < 3 ? <button type="button" onClick={next} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={saving} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-navy-950 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving…" : "Save and regenerate PDF"}</button>}</div>
        </form>
      </div>
    </div>
  );
}
