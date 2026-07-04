"use client";

import { useEffect, useRef, useState } from "react";

// Live camera with a shutter, an "Open gallery" option (multi-select), and a
// tray that collects photos. After each shot you can add more or Continue.
export default function CameraCapture({
  onCapture,
  onClose,
  hint,
}: {
  onCapture: (files: File[]) => void;
  onClose: () => void;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch {
        setError("Camera not available. Use Open gallery below.");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function addFiles(files: File[]) {
    setShots((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) addFiles([new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })]);
      },
      "image/jpeg",
      0.9
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    // Picking from the gallery goes straight to the next page (category), no
    // extra Continue tap. Any photos already taken with the camera come along.
    onCapture([...shots.map((s) => s.file), ...files]);
  }

  function removeShot(i: number) {
    setShots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function proceed() {
    if (shots.length) onCapture(shots.map((s) => s.file));
  }

  const count = shots.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

      <div className="flex items-center justify-between px-4 py-4 text-white">
        <span className="text-sm opacity-80">
          {count > 0 ? `${count} photo${count > 1 ? "s" : ""} ready. Add more or Continue.` : hint || "Point the camera at your product"}
        </span>
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <p>{error}</p>
          </div>
        ) : (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        )}
      </div>

      {/* Thumbnail tray */}
      {count > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {shots.map((s, i) => (
            <div key={i} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button
                onClick={() => removeShot(i)}
                aria-label="Remove"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-8 py-6">
        <button onClick={() => fileRef.current?.click()} className="flex w-20 flex-col items-center gap-1 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="m21 16-5-5L5 21" />
            </svg>
          </span>
          <span className="text-xs">Open gallery</span>
        </button>

        <button
          onClick={capture}
          disabled={!!error || !ready}
          aria-label="Take photo"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
        >
          <span className="rounded-full bg-white" style={{ height: 60, width: 60 }} />
        </button>

        {count > 0 ? (
          <button onClick={proceed} className="flex w-20 flex-col items-center gap-1 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
            <span className="text-xs font-semibold">Continue ({count})</span>
          </button>
        ) : (
          <span className="w-20" />
        )}
      </div>
    </div>
  );
}
