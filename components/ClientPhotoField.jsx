"use client";

import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ClientPhotoField({ file, onChange }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(nextFile) {
    if (nextFile && ["image/jpeg", "image/png"].includes(nextFile.type)) onChange(nextFile);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-medium text-navy-700">Client photo (optional)</label>
        {file ? (
          <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-navy-500 hover:text-red-600">
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
          <span className="mt-1 block text-xs text-navy-400">
            JPG or PNG, up to 8 MB. On mobile, use the camera option.
          </span>
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
        <button type="button" onClick={() => onChange(null)} className="mt-1 inline-flex items-center gap-1 text-xs text-navy-400 hover:text-red-600">
          <X className="h-3 w-3" /> {file.name}
        </button>
      ) : null}
    </div>
  );
}
