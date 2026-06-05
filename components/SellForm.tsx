"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Stepper, Spinner } from "./ui";
import {
  CameraIcon,
  CheckIcon,
  ArrowLeftIcon,
  CategoryIcon,
} from "./icons";
import {
  SIZE_OPTIONS,
  SIZE_LABEL,
  HAS_COLOR,
  COLORS,
  CATEGORY_META,
} from "@/lib/constants";
import type { Category, VisionResult } from "@/lib/types";

// Step 0 photo, 1 category, 2 details, 3 price, then saved.
type Step = 0 | 1 | 2 | 3 | 4;
const TITLES = ["Add a photo", "What is it?", "Details", "Set a price"];

export default function SellForm({ pricePresets }: { pricePresets: number[] }) {
  const reduce = useReducedMotion();
  const [[step, dir], setStep] = useState<[Step, number]>([0, 1]);
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [units, setUnits] = useState(1);
  const [price, setPrice] = useState(0);
  const [customPrice, setCustomPrice] = useState("");
  const [aiCategory, setAiCategory] = useState<Category | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Promise<void> | null>(null);
  const effectivePrice = customPrice ? Math.round(Number(customPrice) || 0) : price;

  function go(next: Step) {
    setError("");
    setStep([next, next > step ? 1 : -1]);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    go(1);
    setReading(true);
    setUploading(true);

    const base64 = await fileToBase64(file);

    uploadRef.current = (async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setImageUrl(json.url);
    })()
      .catch((err) => setError(err instanceof Error ? err.message : "Upload failed"))
      .finally(() => setUploading(false));

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: file.type }),
      });
      const json = (await res.json()) as VisionResult & { error?: string };
      if (res.ok) {
        setName(json.name || "");
        if (json.category) setAiCategory(json.category);
        if (json.suggested_size) setSize(json.suggested_size);
        if (json.suggested_color) setColor(json.suggested_color);
      }
    } catch {
      // Vision is best-effort; the seller can fill in manually.
    } finally {
      setReading(false);
    }
  }

  function pickCategory(c: Category) {
    setCategory(c);
    if (!SIZE_OPTIONS[c].includes(size)) setSize("");
    if (!HAS_COLOR[c]) setColor("");
    go(2);
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Add a product name");
    if (effectivePrice <= 0) return setError("Pick a price");
    setSaving(true);
    try {
      if (uploadRef.current) await uploadRef.current;
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          image_url: imageUrl,
          size,
          color,
          price: effectivePrice,
          stock: units,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      go(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep([0, -1]);
    setPreview("");
    setImageUrl("");
    setName("");
    setCategory(null);
    setAiCategory(null);
    setSize("");
    setColor("");
    setUnits(1);
    setPrice(0);
    setCustomPrice("");
    setError("");
    uploadRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
  }

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -60, opacity: 0 }),
  };

  if (step === 4) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white"
        >
          <CheckIcon className="h-10 w-10" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Listed!</h2>
        <p className="mt-2 text-neutral-600">{name} is now live on your shop.</p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={reset} className="btn-primary w-full">
            Add another product
          </button>
          <Link href="/" className="btn-ghost w-full">
            View shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-md flex-col px-4 pb-6 pt-4">
      {/* Header: back + progress dots */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? null : go((step - 1) as Step))}
          disabled={step === 0}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 disabled:opacity-0"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex flex-1 items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-brand" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-semibold">{TITLES[step]}</h1>

      <div className="relative mt-4 flex-1">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduce
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 320, damping: 32 }
            }
          >
            {step === 0 && (
              <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-neutral-300 bg-white text-center transition-colors hover:border-brand">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <CameraIcon className="h-8 w-8" />
                </span>
                <span className="text-lg font-medium">Take a photo</span>
                <span className="text-sm text-neutral-500">or choose from gallery</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onPhoto}
                />
              </label>
            )}

            {step === 1 && (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Product" className="h-14 w-14 rounded-xl object-cover" />
                  )}
                  {reading ? (
                    <Spinner label="Reading photo..." />
                  ) : (
                    <p className="text-sm text-neutral-500">Tap the closest match.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_META.map((c) => {
                    const suggested = aiCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => pickCategory(c.id)}
                        className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border bg-white transition-colors active:scale-[0.98] ${
                          suggested
                            ? "border-brand ring-2 ring-brand/30"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <span className={suggested ? "text-brand" : "text-neutral-700"}>
                          <CategoryIcon id={c.id} className="h-8 w-8" />
                        </span>
                        <span className="font-medium">{c.label}</span>
                        {suggested && (
                          <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
                            AI pick
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && category && (
              <div className="space-y-5">
                <div>
                  <label className="label">Product name</label>
                  <input
                    className="input text-lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cotton T-shirt"
                  />
                </div>

                <div>
                  <label className="label">{SIZE_LABEL[category]}</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS[category].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(size === s ? "" : s)}
                        className={`chip ${size === s ? "chip-on" : "chip-off"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {HAS_COLOR[category] && (
                  <div>
                    <label className="label">Colour</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setColor(color === c.name ? "" : c.name)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition active:scale-95 ${
                            color === c.name
                              ? "border-brand bg-brand/5 font-medium"
                              : "border-neutral-300"
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">How many units?</label>
                  <Stepper value={units} onChange={setUnits} />
                </div>

                <button
                  onClick={() => (name.trim() ? go(3) : setError("Add a product name"))}
                  className="btn-primary w-full text-lg"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="label">Pick a price</label>
                  <div className="flex flex-wrap gap-2">
                    {pricePresets.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPrice(p);
                          setCustomPrice("");
                        }}
                        className={`chip ${
                          !customPrice && price === p ? "chip-on" : "chip-off"
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Or type your own price</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neutral-500">
                      ₹
                    </span>
                    <input
                      className="input pl-9 text-lg"
                      inputMode="numeric"
                      placeholder="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                  <div className="flex justify-between">
                    <span>{name || "Product"}</span>
                    <span className="font-semibold text-ink">
                      {effectivePrice > 0 ? "₹" + effectivePrice : "--"}
                    </span>
                  </div>
                  <div className="mt-1 text-neutral-500">
                    {[CATEGORY_META.find((m) => m.id === category)?.label, size, color, `${units} unit${units > 1 ? "s" : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>

                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className="btn-primary w-full text-lg disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : uploading
                      ? "Finishing photo upload..."
                      : "Save and list"}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
