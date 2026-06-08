"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Stepper } from "./ui";
import { CheckIcon, ArrowLeftIcon, CategoryIcon } from "./icons";
import {
  SIZE_OPTIONS,
  SIZE_LABEL,
  HAS_COLOR,
  COLORS,
  CATEGORY_META,
  ACCENT,
  rupees,
} from "@/lib/constants";
import type { Category, VisionResult } from "@/lib/types";

type Screen = "wizard" | "saved";
type Step = 0 | 1 | 2; // category, details, price
const TITLES = ["What is it?", "Details", "Set a price"];

const ACCENT_HEX: Record<Category, string> = {
  apparel: "#2563eb",
  food: "#ea580c",
  electronics: "#7c3aed",
  furniture: "#d97706",
  cleaning: "#059669",
  jewellery: "#e11d48",
  cosmetics: "#c026d3",
};

export default function SellForm({
  pricePresets,
  initialFile,
  onReshoot,
  onClose,
  onSaved,
  onAdvance,
  addedTotal,
  batch = false,
  onBatchChange,
  subcats = {},
}: {
  pricePresets: number[];
  initialFile: File;
  onReshoot?: () => void;
  onClose?: () => void;
  onSaved?: () => void;
  onAdvance?: () => boolean;
  addedTotal?: number;
  batch?: boolean;
  onBatchChange?: (b: boolean) => void;
  subcats?: Record<string, string[]>;
}) {
  const reduce = useReducedMotion();
  const [screen, setScreen] = useState<Screen>("wizard");
  const [[step, dir], setStep] = useState<[Step, number]>([0, 1]);
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(0);

  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [aiCategory, setAiCategory] = useState<Category | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [units, setUnits] = useState(1);
  const [price, setPrice] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [giveaway, setGiveaway] = useState(false);
  const [half, setHalf] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Promise<void> | null>(null);

  // Process the captured photo on mount.
  useEffect(() => {
    processFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the details card appears, put the cursor in the product name field.
  useEffect(() => {
    if (screen === "wizard" && step === 1) {
      const t = setTimeout(() => nameRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [screen, step]);

  const accent = category ? ACCENT[category] : ACCENT.apparel;
  const accentHex = category ? ACCENT_HEX[category] : "#0f766e";

  async function processFile(file: File) {
    setPreview(URL.createObjectURL(file));
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
      // best effort
    } finally {
      setReading(false);
    }
  }

  function go(next: Step) {
    setError("");
    setStep([next, next > step ? 1 : -1]);
  }

  function pickCategory(c: Category) {
    setCategory(c);
    if (!SIZE_OPTIONS[c].includes(size)) setSize("");
    if (!HAS_COLOR[c]) setColor("");
    if (!(subcats[c] || []).includes(subcategory)) setSubcategory("");
    go(1);
  }

  async function save() {
    setError("");
    if (!name.trim()) {
      go(1);
      return setError("Add a product name");
    }
    if (!giveaway && price <= 0) return setError("Pick a price");
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
          subcategory,
          description,
          size,
          color,
          price: giveaway ? 0 : price,
          mrp: giveaway ? 0 : mrp,
          giveaway,
          stock: units,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setAdded((n) => n + 1);
      onSaved?.();
      // If more photos are queued (multi-select), jump straight to the next one.
      if (onAdvance?.()) return;
      if (batch) onReshoot?.();
      else setScreen("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -60, opacity: 0 }),
  };

  // ---- Saved ----
  if (screen === "saved") {
    return (
      <div className="mx-auto max-w-md px-5 py-14 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white"
        >
          <CheckIcon className="h-10 w-10" />
        </motion.div>
        <h2 className="text-2xl font-semibold">Listed!</h2>
        <p className="mt-2 text-neutral-600">
          {(addedTotal ?? added)} product{(addedTotal ?? added) === 1 ? "" : "s"} added.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => onReshoot?.()} className="btn-primary w-full py-4 text-lg">
            Add another product
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-ghost w-full py-4 text-lg">
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- Wizard ----
  const lastIdx = CATEGORY_META.length - 1;
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 pb-6 pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? onReshoot?.() : go((step - 1) as Step))}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex flex-1 items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-brand" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-5 text-3xl font-bold">{TITLES[step]}</h1>

      <div className="relative mt-5">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduce ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 32 }
            }
          >
            {step === 0 && (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Product" className="h-16 w-16 rounded-xl object-cover" />
                  )}
                  <p className="text-base text-neutral-500">
                    {reading ? "Reading photo..." : "Tap the closest match."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_META.map((c, idx) => {
                    const a = ACCENT[c.id];
                    const suggested = aiCategory === c.id;
                    const spanFull = idx === lastIdx && CATEGORY_META.length % 2 === 1;
                    return (
                      <button
                        key={c.id}
                        onClick={() => pickCategory(c.id)}
                        className={`relative flex ${
                          spanFull ? "col-span-2 aspect-[5/2]" : "aspect-[4/3]"
                        } flex-col items-center justify-center gap-2 rounded-2xl border-2 ${a.bg} ${
                          suggested ? `${a.border} ring-2 ${a.ring}` : "border-transparent"
                        } transition active:scale-[0.97]`}
                      >
                        <span className={a.text}>
                          <CategoryIcon id={c.id} className="h-9 w-9" />
                        </span>
                        <span className="text-base font-semibold text-neutral-800">{c.label}</span>
                        {suggested && (
                          <span className={`absolute right-2 top-2 rounded-full ${a.solid} px-2 py-0.5 text-[10px] font-semibold text-white`}>
                            AI pick
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && category && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-lg font-semibold">Product name</label>
                  <input
                    ref={nameRef}
                    autoFocus
                    enterKeyHint="next"
                    className="input text-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (name.trim()) go(2);
                        else setError("Add a product name");
                      }
                    }}
                    placeholder="e.g. Cotton T-shirt"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-lg font-semibold">{SIZE_LABEL[category]}</label>
                  <div className="flex flex-wrap gap-2.5">
                    {SIZE_OPTIONS[category].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(size === s ? "" : s)}
                        className={`rounded-full border-2 px-5 py-2.5 text-lg font-medium transition active:scale-95 ${
                          size === s
                            ? `${accent.solid} ${accent.solidText} border-transparent`
                            : "border-neutral-300 bg-white text-neutral-700"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {(subcats[category] || []).length > 0 && (
                  <div>
                    <label className="mb-2 block text-lg font-semibold">Subcategory</label>
                    <div className="flex flex-wrap gap-2.5">
                      {(subcats[category] || []).map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setSubcategory(subcategory === sub ? "" : sub)}
                          className={`rounded-full border-2 px-5 py-2.5 text-lg font-medium transition active:scale-95 ${
                            subcategory === sub
                              ? `${accent.solid} ${accent.solidText} border-transparent`
                              : "border-neutral-300 bg-white text-neutral-700"
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {HAS_COLOR[category] && (
                  <div>
                    <label className="mb-2 block text-lg font-semibold">Colour</label>
                    <div className="flex flex-wrap gap-2.5">
                      {COLORS.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setColor(color === c.name ? "" : c.name)}
                          className={`flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-base transition active:scale-95 ${
                            color === c.name
                              ? `${accent.border} ${accent.bg} font-semibold`
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-lg font-semibold">How many units?</label>
                  <Stepper value={units} onChange={setUnits} />
                </div>

                <div>
                  <label className="mb-2 block text-lg font-semibold">
                    Description <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <textarea
                    className="input min-h-20"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Condition, details, what's included..."
                  />
                </div>

                <button
                  onClick={() => (name.trim() ? go(2) : setError("Add a product name"))}
                  className={`w-full rounded-2xl ${accent.solid} ${accent.solidText} py-4 text-xl font-semibold transition active:scale-[0.98]`}
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGiveaway(false)}
                    className={`flex-1 rounded-full border-2 py-2.5 text-base font-medium transition ${
                      !giveaway ? `${accent.solid} ${accent.solidText} border-transparent` : "border-neutral-300 bg-white"
                    }`}
                  >
                    For sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiveaway(true)}
                    className={`flex-1 rounded-full border-2 py-2.5 text-base font-medium transition ${
                      giveaway ? "border-transparent bg-emerald-600 text-white" : "border-neutral-300 bg-white"
                    }`}
                  >
                    Give away (free)
                  </button>
                </div>

                {giveaway ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-base text-emerald-800">
                    Given away for free. The buyer arranges transport / pickup.
                  </div>
                ) : (
                  <>
                <div>
                  <label className="mb-3 block text-lg font-semibold">Pick a price</label>
                  <div className="grid grid-cols-3 gap-3">
                    {pricePresets.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPrice(p)}
                        className={`rounded-2xl border-2 py-4 text-2xl font-bold transition active:scale-95 ${
                          price === p
                            ? `${accent.solid} ${accent.solidText} border-transparent`
                            : "border-neutral-300 bg-white text-neutral-800"
                        }`}
                      >
                        ₹{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-semibold">Or slide to set a price</label>
                  <div className="rounded-2xl border-2 border-neutral-200 bg-white p-5">
                    <div className="text-center text-5xl font-bold tabular-nums">
                      {price > 0 ? rupees(price) : "₹0"}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        aria-label="Decrease price"
                        onClick={() => setPrice((p) => Math.max(0, p - 10))}
                        className="h-12 w-12 shrink-0 rounded-full border-2 border-neutral-300 text-3xl font-semibold active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(2000, Math.ceil((price + 200) / 100) * 100)}
                        step={10}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="h-2 flex-1 cursor-pointer"
                        style={{ accentColor: accentHex }}
                      />
                      <button
                        aria-label="Increase price"
                        onClick={() => setPrice((p) => p + 10)}
                        className="h-12 w-12 shrink-0 rounded-full border-2 border-neutral-300 text-3xl font-semibold active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-lg font-semibold">
                    MRP <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neutral-500">
                      ₹
                    </span>
                    <input
                      className="input pl-9 text-lg"
                      inputMode="numeric"
                      placeholder="Original price (shown crossed out)"
                      value={mrp > 0 ? String(mrp) : ""}
                      onChange={(e) => {
                        const v = Math.round(Number(e.target.value.replace(/[^0-9]/g, "")) || 0);
                        setMrp(v);
                        if (half) setPrice(Math.round(v / 2));
                      }}
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={half}
                      onChange={(e) => {
                        setHalf(e.target.checked);
                        if (e.target.checked && mrp > 0) setPrice(Math.round(mrp / 2));
                      }}
                      className="h-5 w-5"
                      style={{ accentColor: accentHex }}
                    />
                    Set price at 50% of MRP
                  </label>
                  {mrp > 0 && mrp <= price && (
                    <p className="mt-1 text-sm text-amber-600">
                      MRP should be higher than the selling price to show a discount.
                    </p>
                  )}
                </div>
                  </>
                )}

                <div className="rounded-2xl bg-neutral-50 p-4 text-base text-neutral-600">
                  <span className="font-semibold text-ink">{name || "Product"}</span>
                  <span className="text-neutral-500">
                    {"  "}
                    {[CATEGORY_META.find((m) => m.id === category)?.label, size, color, `${units} unit${units > 1 ? "s" : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>

                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className={`w-full rounded-2xl ${accent.solid} ${accent.solidText} py-5 text-xl font-bold transition active:scale-[0.98] disabled:opacity-50`}
                >
                  {saving ? "Saving..." : uploading ? "Finishing photo..." : "Save to the list"}
                </button>

                <label className="flex items-center justify-center gap-3 text-base text-neutral-700">
                  <input
                    type="checkbox"
                    checked={batch}
                    onChange={(e) => onBatchChange?.(e.target.checked)}
                    className="h-6 w-6 rounded"
                    style={{ accentColor: accentHex }}
                  />
                  Batch mode: jump straight to the camera after saving
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mt-3 text-base font-medium text-red-600">{error}</p>}
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
