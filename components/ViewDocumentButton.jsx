"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { DocumentViewerModal } from "./DocumentViewerModal";

// Drop-in replacement for `<a href={url} target="_blank">` — opens the
// document inside the app instead of a new browser tab.
export function ViewDocumentButton({
  url,
  title = "Document",
  label = "View",
  icon: Icon = FileText,
  className = "inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:underline",
}) {
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </button>
      {open ? <DocumentViewerModal url={url} title={title} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
