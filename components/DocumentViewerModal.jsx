"use client";

import { useRef } from "react";
import { Printer, X } from "lucide-react";

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|heic|bmp)(\?|#|$)/i.test(url ?? "");
}

export function DocumentViewerModal({ url, title = "Document", onClose }) {
  const image = isImageUrl(url);
  const iframeRef = useRef(null);
  const printFrameRef = useRef(null);

  function handlePrint() {
    if (!url) return;

    if (!image) {
      // Browser PDF viewers do not consistently expose print() through an
      // embedded cross-origin iframe, so open the file in a printable tab.
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.focus();
        window.setTimeout(() => printWindow.print(), 800);
      } else {
        iframeRef.current?.contentWindow?.print();
      }
      return;
    }

    // <img> has no print command of its own, so build a same-origin,
    // print-only document in a hidden iframe containing just the image.
    const frame = printFrameRef.current;
    const doc = frame.contentDocument;
    doc.open();
    doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
    doc.close();

    const titleEl = doc.createElement("title");
    titleEl.textContent = title;
    doc.head.appendChild(titleEl);

    const style = doc.createElement("style");
    style.textContent = "html,body{margin:0;padding:0;}img{max-width:100%;display:block;margin:0 auto;}";
    doc.head.appendChild(style);

    const img = doc.createElement("img");
    img.onload = () => frame.contentWindow.print();
    img.src = url;
    doc.body.appendChild(img);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
          <p className="truncate text-sm font-semibold text-navy-900">{title}</p>
          <div className="flex shrink-0 items-center gap-1">
            {url ? (
              <button
                onClick={handlePrint}
                title="Print"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-md p-1 text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-navy-50">
          {url ? (
            image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={title} className="mx-auto h-full max-w-full object-contain" />
            ) : (
              <iframe ref={iframeRef} src={url} title={title} className="h-full w-full border-0" />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-navy-400">
              No file to show.
            </div>
          )}
        </div>

        {/* Hidden print-only frame, used solely for the image print path. */}
        <iframe ref={printFrameRef} className="hidden" title="print-frame" />
      </div>
    </div>
  );
}
