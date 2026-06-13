"use client";

import { useRef, useState } from "react";
import { Stepper } from "./ui";
import { SIZE_OPTIONS, SIZE_LABEL, HAS_COLOR, COLORS, CATEGORY_META } from "@/lib/constants";
import type { Category, Product } from "@/lib/types";

export default function ProductEdit({
  product,
  subcats,
  onClose,
  onSaved,
  onDeleted,
}: {
  product?: Product;
  subcats: Record<string, string[]>;
  onClose: () => void;
  onSaved: (p: Product) => void;
  onDeleted: (id: string) => void;
}) {
  const isNew = !product;
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<Category>(product?.category ?? "apparel");
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState<string[]>(
    product?.images?.length ? product.images : product?.image_url ? [product.image_url] : []
  );
  const [size, setSize] = useState(product?.size ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [mrp, setMrp] = useState(product?.mrp ?? 0);
  const [half, setHalf] = useState(false);
  const [giveaway, setGiveaway] = useState(product?.giveaway ?? false);
  const [stock, setStock] = useState(product?.stock ?? 1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const subOptions = subcats[category] || [];

  async function addImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error || "Upload failed");
        if (json.url) setImages((prev) => [...prev, json.url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function del() {
    if (!product) return;
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${product.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      onDeleted(product.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function chooseCategory(c: Category) {
    setCategory(c);
    if (!SIZE_OPTIONS[c].includes(size)) setSize("");
    if (!HAS_COLOR[c]) setColor("");
    if (!(subcats[c] || []).includes(subcategory)) setSubcategory("");
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (!giveaway && price <= 0) return setError("Set a price or mark Give away");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        category,
        subcategory,
        description,
        images,
        size,
        color,
        price,
        mrp,
        giveaway,
        stock,
        ...(!isNew && { id: product!.id }),
      };
      const res = await fetch("/api/products", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSaved(json.product as Product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 sm:flex sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="relative h-full w-full overflow-y-auto bg-white p-5 sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isNew ? "Add product" : <>Edit <span className="text-neutral-400">{product!.code}</span></>}
          </h2>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Close
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="label">Photos</label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(url)}
                    aria-label="Remove photo"
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-xs text-neutral-500 disabled:opacity-50"
              >
                {uploading ? "..." : "+ Add"}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Product name</label>
            <input className="input text-lg" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, details, what's included..."
            />
          </div>

          <div>
            <label className="label">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_META.map((c) => (
                <button
                  key={c.id}
                  onClick={() => chooseCategory(c.id)}
                  className={`chip ${category === c.id ? "chip-on" : "chip-off"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {subOptions.length > 0 && (
            <div>
              <label className="label">Subcategory</label>
              <div className="flex flex-wrap gap-2">
                {subOptions.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSubcategory(subcategory === sub ? "" : sub)}
                    className={`chip ${subcategory === sub ? "chip-on" : "chip-off"}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                      color === c.name ? "border-brand bg-brand/5 font-medium" : "border-neutral-300"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Pricing</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGiveaway(false)}
                className={`chip flex-1 ${!giveaway ? "chip-on" : "chip-off"}`}
              >
                For sale
              </button>
              <button
                onClick={() => setGiveaway(true)}
                className={`chip flex-1 ${
                  giveaway ? "border-emerald-600 bg-emerald-600 text-white" : "chip-off"
                }`}
              >
                Give away (free)
              </button>
            </div>
          </div>

          {!giveaway && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (₹)</label>
                  <input
                    className={`input ${half ? "bg-neutral-100 text-neutral-500" : ""}`}
                    inputMode="numeric"
                    readOnly={half}
                    value={price > 0 ? String(price) : ""}
                    onChange={(e) =>
                      !half && setPrice(Math.round(Number(e.target.value.replace(/[^0-9]/g, "")) || 0))
                    }
                  />
                </div>
                <div>
                  <label className="label">MRP (₹)</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={mrp > 0 ? String(mrp) : ""}
                    onChange={(e) => {
                      const v = Math.round(Number(e.target.value.replace(/[^0-9]/g, "")) || 0);
                      setMrp(v);
                      if (half) setPrice(Math.round(v / 2));
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={half}
                  onChange={(e) => {
                    setHalf(e.target.checked);
                    if (e.target.checked && mrp > 0) setPrice(Math.round(mrp / 2));
                  }}
                  className="h-5 w-5"
                  style={{ accentColor: "#0f766e" }}
                />
                Set price at 50% of MRP
              </label>
            </div>
          )}

          <div>
            <label className="label">Stock</label>
            <Stepper value={stock} onChange={setStock} min={0} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={save}
            disabled={saving || deleting}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Add product" : "Save changes"}
          </button>

          {!isNew && (
            <button
              onClick={del}
              disabled={saving || deleting}
              className="w-full rounded-2xl border border-red-300 py-3 text-base font-medium text-red-600 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete product"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
