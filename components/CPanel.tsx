"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_META } from "@/lib/constants";
import { supabaseBrowser } from "@/lib/supabase";
import type { Settings } from "@/lib/types";

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function CPanel({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>({ ...initial, subcats: initial.subcats || {} });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const router = useRouter();

  // Install-as-app (PWA) state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent || ""));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  // Every category: built-in plus custom.
  const allCats = [
    ...CATEGORY_META.map((c) => ({ id: c.id as string, label: c.label, custom: false })),
    ...s.extra_categories.map((c) => ({ id: c.id, label: c.label, custom: true })),
  ];

  function addCategory() {
    const label = newCat.trim();
    if (!label) return;
    const id = slug(label) + "-" + Math.random().toString(36).slice(2, 6);
    set("extra_categories", [...s.extra_categories, { id, label, subs: [] }]);
    setNewCat("");
  }
  function removeCategory(id: string) {
    set("extra_categories", s.extra_categories.filter((c) => c.id !== id));
    const next = { ...s.subcats };
    delete next[id];
    set("subcats", next);
  }
  function addSub(catId: string) {
    const label = (newSub[catId] || "").trim();
    if (!label) return;
    const cur = s.subcats[catId] || [];
    if (!cur.includes(label)) set("subcats", { ...s.subcats, [catId]: [...cur, label] });
    setNewSub((p) => ({ ...p, [catId]: "" }));
  }
  function removeSub(catId: string, sub: string) {
    set("subcats", { ...s.subcats, [catId]: (s.subcats[catId] || []).filter((x) => x !== sub) });
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
        <h3 className="mb-1 text-lg font-semibold">Categories & subcategories</h3>
        <p className="mb-3 text-sm text-neutral-500">Add subcategories under any category. Built-in categories can't be removed.</p>

        <div className="space-y-3">
          {allCats.map((cat) => (
            <div key={cat.id} className="card p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {cat.label}
                  {!cat.custom && <span className="ml-2 text-xs text-neutral-400">built-in</span>}
                </span>
                {cat.custom && (
                  <button onClick={() => removeCategory(cat.id)} className="text-sm text-red-600">
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(s.subcats[cat.id] || []).map((sub) => (
                  <span key={sub} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm">
                    {sub}
                    <button onClick={() => removeSub(cat.id, sub)} className="text-neutral-400">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1 py-2 text-sm"
                  placeholder="Add subcategory"
                  value={newSub[cat.id] || ""}
                  onChange={(e) => setNewSub((p) => ({ ...p, [cat.id]: e.target.value }))}
                />
                <button onClick={() => addSub(cat.id)} className="btn-ghost px-4 py-2 text-sm">
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="label">Add a new category</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. Books" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button onClick={addCategory} className="btn-primary px-5">
              Add
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">WhatsApp Templates</h3>
        <p className="mb-3 text-sm text-neutral-500">Configure custom WhatsApp message templates. Use these placeholders: {`{orderid}`}, {`{customername}`}, {`{amount}`}</p>
        <div className="space-y-3">
          {(s.wa_templates || []).map((t, i) => (
            <div key={t.id} className="card p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <input
                  className="input flex-1 py-1 text-sm font-medium"
                  placeholder="Template name"
                  value={t.label}
                  onChange={(e) => {
                    const next = [...(s.wa_templates || [])];
                    next[i].label = e.target.value;
                    set("wa_templates", next);
                  }}
                />
                <button
                  onClick={() => set("wa_templates", (s.wa_templates || []).filter((_, idx) => idx !== i))}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <textarea
                className="input w-full py-2 text-sm"
                placeholder="Template message. Use {orderid}, {customername}, {amount} as variables"
                value={t.message}
                onChange={(e) => {
                  const next = [...(s.wa_templates || [])];
                  next[i].message = e.target.value;
                  set("wa_templates", next);
                }}
                rows={3}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <button
            onClick={() => {
              const id = "tpl-" + Math.random().toString(36).slice(2, 6);
              set("wa_templates", [...(s.wa_templates || []), { id, label: "New template", message: "" }]);
            }}
            className="btn-ghost px-4 py-2 text-sm"
          >
            + Add template
          </button>
        </div>
      </section>

      <section className="border-t border-neutral-200 pt-6">
        <h3 className="mb-1 text-lg font-semibold">Install as app</h3>
        <p className="mb-3 text-sm text-neutral-500">
          Add this dashboard to your home screen for one-tap access. It stays up to date
          automatically — every update goes live without a reinstall.
        </p>
        {installed ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            App is installed on this device.
          </div>
        ) : installPrompt ? (
          <button
            onClick={installApp}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <rect x="4" y="17" width="16" height="4" rx="1" />
            </svg>
            Install app
          </button>
        ) : isIOS ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            On iPhone or iPad: tap the <span className="font-semibold">Share</span> icon in Safari,
            then choose <span className="font-semibold">Add to Home Screen</span>.
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Open your browser menu and choose <span className="font-semibold">Install app</span> or{" "}
            <span className="font-semibold">Add to Home Screen</span>. If you don&apos;t see it yet,
            reload this page once and try again.
          </div>
        )}
      </section>

      <section className="border-t border-neutral-200 pt-6">
        <h3 className="mb-1 text-lg font-semibold">Account</h3>
        <p className="mb-3 text-sm text-neutral-500">Sign out of the admin dashboard on this device.</p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Sign out
        </button>
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
