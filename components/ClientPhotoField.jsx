"use client";

import { Camera, Check, ImagePlus, Upload, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const VIEW_WIDTH = 240;
const VIEW_HEIGHT = 310;
const OUTPUT_WIDTH = 600;
const OUTPUT_HEIGHT = 774;

export function ClientPhotoField({ file, onChange }) {
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(null);
  const [pendingUrl, setPendingUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!pending) {
      setPendingUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(pending);
    setPendingUrl(url);
    const image = new Image();
    image.onload = () => setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  function choose(nextFile) {
    if (!nextFile || !["image/jpeg", "image/png"].includes(nextFile.type)) return;
    setPending(nextFile);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function clear() {
    setPending(null);
    onChange(null);
  }

  function beginDrag(event) {
    event.preventDefault();
    setDragging(true);
    dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  }

  function moveDrag(event) {
    if (!dragging || !dragStart.current) return;
    setOffset(clampOffset(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y, zoom, naturalSize));
  }

  function endDrag() {
    setDragging(false);
    dragStart.current = null;
  }

  async function crop() {
    if (!pendingUrl) return;
    const image = new Image();
    image.src = pendingUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const scale = Math.max(VIEW_WIDTH / image.naturalWidth, VIEW_HEIGHT / image.naturalHeight) * zoom;
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    const left = (VIEW_WIDTH - imageWidth) / 2 + offset.x;
    const top = (VIEW_HEIGHT - imageHeight) / 2 + offset.y;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    context.drawImage(
      image,
      -left / scale,
      -top / scale,
      VIEW_WIDTH / scale,
      VIEW_HEIGHT / scale,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    onChange(new File([blob], pending.name.replace(/\.[^.]+$/, "") + "-cropped.jpg", { type: "image/jpeg" }));
    setPending(null);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-medium text-navy-700">Client photo (optional)</label>
        {file ? (
          <button type="button" onClick={clear} className="text-xs font-semibold text-navy-500 hover:text-red-600">
            Remove
          </button>
        ) : null}
      </div>
      <label
        className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-navy-200 bg-navy-50/40 p-3 transition hover:border-navy-400 hover:bg-navy-50"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files?.[0]);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Client preview" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white text-navy-300">
            <ImagePlus className="h-6 w-6" />
          </span>
        )}
        <span className="min-w-0 text-sm text-navy-500">
          <span className="flex items-center gap-2 font-semibold text-navy-800">
            <Upload className="h-4 w-4" /> Choose or drag a photo
          </span>
          <span className="mt-1 block text-xs text-navy-400">JPG or PNG, up to 8 MB.</span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-white px-2 py-1 text-xs font-semibold text-navy-700">
            <Camera className="h-3.5 w-3.5" /> Take a picture
          </span>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </label>
      {file ? (
        <button type="button" onClick={() => setPending(file)} className="mt-1 text-xs font-semibold text-navy-500 hover:text-navy-900">
          Adjust crop
        </button>
      ) : null}

      {pendingUrl ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/60 p-4" onPointerUp={endDrag} onPointerMove={moveDrag}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-panel" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Crop client photo</p>
                <p className="mt-1 text-sm text-navy-500">Drag the image and zoom until the portrait is framed.</p>
              </div>
              <button type="button" onClick={() => setPending(null)} className="text-navy-300 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="mx-auto mt-4 overflow-hidden rounded-xl bg-navy-950 shadow-inner"
              style={{ width: VIEW_WIDTH, height: VIEW_HEIGHT, touchAction: "none" }}
              onPointerDown={beginDrag}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingUrl}
                alt="Crop preview"
                draggable={false}
                className="pointer-events-none select-none"
                style={{
                  width: getImageSize(naturalSize, zoom).width,
                  height: getImageSize(naturalSize, zoom).height,
                  maxWidth: "none",
                  position: "relative",
                  left: `${(VIEW_WIDTH - getImageSize(naturalSize, zoom).width) / 2 + offset.x}px`,
                  top: `${(VIEW_HEIGHT - getImageSize(naturalSize, zoom).height) / 2 + offset.y}px`,
                }}
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-navy-600">
              <ZoomIn className="h-4 w-4" />
              Zoom
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-navy-900" />
            </label>
            <button type="button" onClick={crop} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              <Check className="h-4 w-4" /> Use this crop
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getImageSize(naturalSize, zoom) {
  const scale = Math.max(VIEW_WIDTH / naturalSize.width, VIEW_HEIGHT / naturalSize.height) * zoom;
  return { width: naturalSize.width * scale, height: naturalSize.height * scale, scale };
}

function clampOffset(x, y, zoom, naturalSize) {
  const image = getImageSize(naturalSize, zoom);
  return {
    x: Math.max((VIEW_WIDTH - image.width) / 2, Math.min((image.width - VIEW_WIDTH) / 2, x)),
    y: Math.max((VIEW_HEIGHT - image.height) / 2, Math.min((image.height - VIEW_HEIGHT) / 2, y)),
  };
}
