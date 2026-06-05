"use client";

import { useState } from "react";
import { Stepper } from "./ui";
import { SIZE_OPTIONS, SIZE_LABEL, HAS_COLOR, COLORS, CATEGORY_META } from "@/lib/constants";
import type { Category, Product } from "@/lib/types";

export default function ProductEdit({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<Category>(product.category);
  const [size, setSize] = useState(product.size);
  const [color, setColor] = useState(product.color);
  const [price, setPrice] = useState(product.price);
  const [mrp, setMrp] = useState(product.mrp);
  const [giveaway, setGiveaway] = useState(product.giveaway);
  const [stock, setStock] = useState(product.stock);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function chooseCategory(c: Category) {
    setCategory(c);
    if (!SIZE_OPTIONS[c].includes(size)) setSize("");
    if (!HAS_COLOR[c]) setColor("");
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (!giveaway && price <= 0) return setError("Set a price or mark Give away");
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: name.trim(),
          category,
          size,
          color,
          price,
          mrp,
          giveaway,
          stock,
        }),
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
            Edit <span className="text-neutral-400">{product.code}</span>
          </h2>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Close
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="label">Product name</label>
            <input className="input text-lg" value={name} onChange={(e) => setName(e.target.value)} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Price (₹)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={price > 0 ? String(price) : ""}
                  onChange={(e) => setPrice(Math.round(Number(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                />
              </div>
              <div>
                <label className="label">MRP (₹)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={mrp > 0 ? String(mrp) : ""}
                  onChange={(e) => setMrp(Math.round(Number(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Stock</label>
            <Stepper value={stock} onChange={setStock} min={0} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
