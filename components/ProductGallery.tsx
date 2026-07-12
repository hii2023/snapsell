"use client";

import { useEffect, useState } from "react";
import { useBackClose } from "@/lib/use-back";

// Product image gallery with thumbnail strip and a fullscreen zoom modal.
// Native pinch-zoom on mobile via `touch-action: pinch-zoom`; on desktop
// click to zoom-in (2x) and click again to reset.
export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Phone / browser Back closes the fullscreen viewer instead of leaving
  // the product page.
  useBackClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, images.length]);

  if (!images.length) {
    return <div className="aspect-square w-full rounded-2xl bg-neutral-100" />;
  }

  const current = images[active];

  return (
    <>
      {/* Main image — click to zoom */}
      <button
        type="button"
        onClick={() => { setOpen(true); setZoomed(false); }}
        className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100"
        aria-label="View full image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {/* Zoom hint */}
        <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
          </svg>
          Tap to zoom
        </span>
      </button>

      {/* Thumbnail strip — only if multiple images */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? "border-emerald-600" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {active + 1} / {images.length}
            </div>
          )}

          {/* Previous */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + images.length) % images.length); }}
              className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Previous image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image — natural-size, supports pinch-zoom on mobile, click-to-zoom on desktop */}
          <div
            className="flex h-full max-h-screen w-full items-center justify-center overflow-auto"
            style={{ touchAction: "pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={name}
              className="max-h-[90vh] w-auto cursor-zoom-in select-none object-contain transition-transform duration-200"
              style={{
                transform: zoomed ? "scale(2)" : "scale(1)",
                transformOrigin: "center center",
                cursor: zoomed ? "zoom-out" : "zoom-in",
              }}
              onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
              draggable={false}
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % images.length); }}
              className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Next image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Mobile pinch hint */}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center text-[11px] text-white/70 sm:hidden">
            Pinch to zoom
          </p>
        </div>
      )}
    </>
  );
}
