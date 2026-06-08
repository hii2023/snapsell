"use client";

import { useState } from "react";
import { CATEGORY_META } from "@/lib/constants";
import type { ExtraCategory, Settings } from "@/lib/types";

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
}

export default function CPanel({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function addCategory() {
    const label = newCat.trim();
    if (!label) return;
    const id = slug(label) + "-" + Math.random().toString(36).slice(2, 6);
    set("extra_categories", [...s.extra_categories, { id, label, subs: [] }]);
    setNewCat("");
  }
  function removeCategory(id: string) {
    set("extra_categories", s.extra_categories.filter((c) => c.id !== id));
  }
  function addSub(cat: ExtraCategory) {
    const label = (newSub[cat.id] || "").trim();
    if (!label) return;
    set(
      "extra_categories",
      s.extra_categories.map((c) =>
        c.id === cat.id ? { ...c, subs: [...c.subs, label] } : c
      )
    );
    setNewSub((p) => ({ ...p, [cat.id]: "" }));
  }
  function removeSub(cat: ExtraCategory, sub: string) {
    set(
      "extra_categories",
      s.extra_categories.map((c) =>
        c.id === cat.id ? { ...c, subs: c.subs.filter((x) => x !== sub) } : c
      )
    );
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7 pb-24">
      <section>
        <h3 className="mb-3 text-lg font-semibold">Payment (UPI QR)</h3>
        <div className="space-y-3">
          <div>
            <label className="label">UPI ID</label>
            <input className="input" value={s.upi_id} onChange={(e) => set("upi_id", e.target.value)} placeholder="name@bank" />
          </div>
          <div>
            <label className="label">UPI display name</label>
            <input className="input" value={s.upi_name} onChange={(e) => set("upi_name", e.target.value)} />
          </div>
          <div>
            <label className="label">Team WhatsApp number (digits, with country code)</label>
            <input className="input" inputMode="tel" value={s.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="9198xxxxxxxx" />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Delivery & pickup</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Delivery fee (₹)</label>
            <input className="input" inputMode="numeric" value={String(s.delivery_fee_amount)} onChange={(e) => set("delivery_fee_amount", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} />
          </div>
          <div>
            <label className="label">Free delivery at/above (₹)</label>
            <input className="input" inputMode="numeric" value={String(s.delivery_free_above)} onChange={(e) => set("delivery_free_above", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Pickup address</label>
          <textarea className="input min-h-20" value={s.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-lg font-semibold">Categories</h3>
        <p className="mb-3 text-sm text-neutral-500">
          Built-in: {CATEGORY_META.map((c) => c.label).join(", ")}. Add your own below.
        </p>

        <div className="space-y-3">
          {s.extra_categories.map((c) => (
            <div key={c.id} className="card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.label}</span>
                <button onClick={() => removeCategory(c.id)} className="text-sm text-red-600">
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.subs.map((sub) => (
                  <span key={sub} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm">
                    {sub}
                    <button onClick={() => removeSub(c, sub)} className="text-neutral-400">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1 py-2 text-sm"
                  placeholder="Add subcategory"
                  value={newSub[c.id] || ""}
                  onChange={(e) => setNewSub((p) => ({ ...p, [c.id]: e.target.value }))}
                />
                <button onClick={() => addSub(c)} className="btn-ghost px-4 py-2 text-sm">
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input className="input flex-1" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button onClick={addCategory} className="btn-primary px-5">
            Add
          </button>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3">
          {msg && <span className={`text-sm ${msg === "Saved" ? "text-green-600" : "text-red-600"}`}>{msg}</span>}
          <button onClick={save} disabled={saving} className="btn-primary ml-auto px-8 disabled:opacity-50">
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
