"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Chip, Stepper, Spinner } from "./ui";
import { SIZE_OPTIONS } from "@/lib/constants";
import type { Category, VisionResult } from "@/lib/types";

type Step = "capture" | "details" | "saved";

export default function SellForm({ pricePresets }: { pricePresets: number[] }) {
  const [step, setStep] = useState<Step>("capture");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("apparel");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [customPrice, setCustomPrice] = useState("");
  const [units, setUnits] = useState(1);

  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    setStep("details");
    setReading(true);

    // Read photo (Claude vision) and upload to storage in parallel.
    const base64 = await fileToBase64(file);

    const uploadPromise = (async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setImageUrl(json.url);
    })();

    const visionPromise = (async () => {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: file.type }),
      });
      const json = (await res.json()) as VisionResult & { error?: string };
      if (res.ok) {
        setName(json.name || "");
        setCategory(json.category || "apparel");
        setSize(json.suggested_size || "");
      }
    })();

    try {
      await Promise.all([uploadPromise, visionPromise]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReading(false);
    }
  }

  function chooseCategory(c: Category) {
    setCategory(c);
    // Keep size only if still valid for the new category.
    if (!SIZE_OPTIONS[c].includes(size)) setSize("");
  }

  const effectivePrice = customPrice ? Math.round(Number(customPrice) || 0) : price;

  async function save() {
    setError("");
    if (!name.trim()) return setError("Add a product name");
    if (effectivePrice <= 0) return setError("Pick a price");
    if (units <= 0) return setError("Set how many units");

    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          image_url: imageUrl,
          size,
          price: effectivePrice,
          stock: units,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setStep("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("capture");
    setPreview("");
    setImageUrl("");
    setName("");
    setCategory("apparel");
    setSize("");
    setPrice(0);
    setCustomPrice("");
    setUnits(1);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (step === "saved") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl">
          ✓
        </div>
        <h2 className="text-2xl font-semibold">Listed!</h2>
        <p className="mt-2 text-neutral-600">
          {name} is now live on your shop.
        </p>
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

  if (step === "capture") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-semibold">Add a product</h1>
        <p className="mt-2 text-neutral-600">
          Take a photo. We fill in the rest.
        </p>

        <label className="mt-8 flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-neutral-300 bg-white text-center active:scale-[0.99]">
          <span className="text-6xl">📷</span>
          <span className="text-xl font-medium">Take a photo</span>
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
      </div>
    );
  }

  // details
  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-28">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Product"
            className="h-24 w-24 rounded-2xl object-cover"
          />
        ) : null}
        <div className="flex-1">
          {reading ? (
            <Spinner label="Reading photo..." />
          ) : (
            <p className="text-sm text-neutral-500">Photo ready. Check details below.</p>
          )}
          <button onClick={reset} className="mt-2 text-sm text-brand underline">
            Retake
          </button>
        </div>
      </div>

      <div className="mt-6">
        <label className="label">Product name</label>
        <input
          className="input text-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cotton T-shirt"
        />
      </div>

      <div className="mt-5">
        <label className="label">Type</label>
        <div className="flex gap-2">
          <Chip active={category === "apparel"} onClick={() => chooseCategory("apparel")}>
            Clothing
          </Chip>
          <Chip active={category === "food"} onClick={() => chooseCategory("food")}>
            Food
          </Chip>
        </div>
      </div>

      <div className="mt-5">
        <label className="label">Size</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS[category].map((s) => (
            <Chip key={s} active={size === s} onClick={() => setSize(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="label">Price</label>
        <div className="flex flex-wrap gap-2">
          {pricePresets.map((p) => (
            <Chip
              key={p}
              active={!customPrice && price === p}
              onClick={() => {
                setPrice(p);
                setCustomPrice("");
              }}
            >
              ₹{p}
            </Chip>
          ))}
        </div>
        <input
          className="input mt-3"
          inputMode="numeric"
          placeholder="Or type a price"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
        />
      </div>

      <div className="mt-6">
        <label className="label">How many units?</label>
        <Stepper value={units} onChange={setUnits} />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            onClick={save}
            disabled={saving || reading}
            className="btn-primary w-full text-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save and list"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
