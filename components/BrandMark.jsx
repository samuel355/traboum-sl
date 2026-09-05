export function BrandMark({ size = 40, className = "" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-navy-800 to-navy-950 ring-1 ring-inset ring-amber-400/25 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Trabuom Stool Lands"
    >
      <svg viewBox="0 0 40 40" width={size * 0.6} height={size * 0.6} fill="#D9A441" aria-hidden="true">
        <rect x="5" y="7" width="30" height="7" rx="3.5" />
        <polygon points="13,14 19,14 16,31 8,31" />
        <polygon points="21,14 27,14 32,31 24,31" />
        <rect x="5" y="31" width="30" height="4" rx="2" />
      </svg>
    </div>
  );
}
