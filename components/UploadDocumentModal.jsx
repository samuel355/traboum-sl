"use client";

import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { DOC_TYPE_LABELS, DOC_TYPES } from "@/lib/clients";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function UploadDocumentModal({ clientId, document, defaultDocType, onClose, onSaved }) {
  const isEdit = Boolean(document);
  const [docType, setDocType] = useState(document?.doc_type ?? defaultDocType ?? DOC_TYPES[0]);
  const [label, setLabel] = useState(document?.label ?? "");
  const [plotNumber, setPlotNumber] = useState(document?.plot_number ?? "");
  const [file, setFile] = useState(null);
  const [state, setState] = useState("idle"); // idle | submitting | error
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isEdit && !file) {
      setError("Choose a file to upload");
      setState("error");
      return;
    }
    setState("submitting");
    setError(null);

    const fd = new FormData();
    if (!isEdit) fd.set("clientId", clientId);
    fd.set("docType", docType);
    fd.set("label", label);
    fd.set("plotNumber", plotNumber);
    if (file) fd.set("file", file);

    try {
      const res = await fetch(isEdit ? `/api/documents/${document.id}` : "/api/documents", {
        method: isEdit ? "PATCH" : "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save document");
      onSaved(data.document);
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
              {isEdit ? "Edit Document" : "Upload Document"}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">
              {isEdit ? document.file_name : "New document"}
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
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={FIELD_CLASS}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Label (optional)</label>
            <input
              placeholder="e.g. Cadastral plan — Plot 12"
              className={FIELD_CLASS}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Plot number (optional)</label>
            <input className={FIELD_CLASS} value={plotNumber} onChange={(e) => setPlotNumber(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">
              {isEdit ? "Replace file (optional)" : "File"}
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-navy-200 px-4 py-4 text-sm text-navy-500 hover:border-navy-400">
              <Upload className="h-4 w-4 shrink-0" />
              {file ? file.name : isEdit ? "Keep existing file" : "Choose a PDF or image"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
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
              {isEdit ? "Save" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
