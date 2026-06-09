"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import { rupees, CATEGORY_META } from "@/lib/constants";
import { CategoryIcon, CheckIcon } from "./icons";
import ProductEdit from "./ProductEdit";
import CPanel from "./CPanel";
import type { Category, Order, Product, Settings } from "@/lib/types";

type Tab = "overview" | "products" | "orders" | "settings";
type ProdFilter = "instock" | "oos";
type CatFilter = Category | "all";
type OrderFilter = "all" | "unpaid" | "paid" | "packing" | "booked" | "delivered" | "pickup" | "return";
type FulfillmentFilter = "all" | "delivery" | "pickup";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

const isPendingDispatch = (o: Order) =>
  o.delivery_status === "unbooked" || o.delivery_status === "booked";

export default function OrdersClient({
  initialOrders,
  initialProducts,
  settings,
}: {
  initialOrders: Order[];
  initialProducts: Product[];
  settings: Settings;
}) {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);

  // Refresh local state when the server data changes (e.g. after adding a product).
  useEffect(() => setOrders(initialOrders), [initialOrders]);
  useEffect(() => setProducts(initialProducts), [initialProducts]);

  const [prodFilter, setProdFilter] = useState<ProdFilter>("instock");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("unpaid");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");

  function openProducts(f: ProdFilter) {
    setProdFilter(f);
    setCatFilter("all");
    setTab("products");
  }
  function openCategory(cat: Category) {
    setCatFilter(cat);
    setProdFilter("instock");
    setTab("products");
  }
  function openOrders(f: OrderFilter) {
    setOrderFilter(f);
    setTab("orders");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 grid grid-cols-4 gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-2 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand text-white" : "border border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {tab === "overview" && (
            <Overview
              products={products}
              orders={orders}
              openProducts={openProducts}
              openCategory={openCategory}
              openOrders={openOrders}
            />
          )}
          {tab === "products" && (
            <ProductsTab
              products={products}
              setProducts={setProducts}
              filter={prodFilter}
              setFilter={setProdFilter}
              catFilter={catFilter}
              setCatFilter={setCatFilter}
              subcats={settings.subcats}
            />
          )}
          {tab === "orders" && (
            <OrdersTab
              orders={orders}
              setOrders={setOrders}
              filter={orderFilter}
              setFilter={setOrderFilter}
              fulfillmentFilter={fulfillmentFilter}
              setFulfillmentFilter={setFulfillmentFilter}
            />
          )}
          {tab === "settings" && <CPanel initial={settings} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "blue" | "gray" | "red"; children: React.ReactNode }) {
  const map = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-neutral-100 text-neutral-600",
    red: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

/* ---------------- Overview ---------------- */

function StatCard({ label, value, onClick, tone = "default" }: { label: string; value: number; onClick?: () => void; tone?: "default" | "amber" | "red" | "green" }) {
  const tones = {
    default: "bg-white border-neutral-200",
    amber: "bg-amber-50 border-amber-200",
    red: "bg-red-50 border-red-200",
    green: "bg-green-50 border-green-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl border p-4 text-left transition-shadow duration-150 ${tones[tone]} ${onClick ? "cursor-pointer active:scale-[0.98] hover:shadow-md" : "cursor-default"}`}
    >
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-neutral-600">{label}</p>
    </button>
  );
}

function Overview({
  products,
  orders,
  openProducts,
  openCategory,
  openOrders,
}: {
  products: Product[];
  orders: Order[];
  openProducts: (f: ProdFilter) => void;
  openCategory: (c: Category) => void;
  openOrders: (f: OrderFilter) => void;
}) {
  const inStock = products.filter((p) => p.stock > 0).length;
  const oos = products.filter((p) => p.stock === 0).length;
  const readyToShip = orders.filter(isPendingDispatch).length;
  const paid = orders.filter((o) => o.payment_status === "paid").length;
  const unpaid = orders.filter((o) => o.payment_status === "pending").length;
  const revenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + o.total, 0);

  const perCategory = CATEGORY_META.map((c) => ({
    ...c,
    count: products.filter((p) => p.category === c.id && p.stock > 0).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="In stock" value={inStock} tone="green" onClick={() => openProducts("instock")} />
        <StatCard label="Out of stock" value={oos} tone="red" onClick={() => openProducts("oos")} />
        <StatCard label="Packing done" value={readyToShip} tone="amber" onClick={() => openOrders("packing")} />
        <StatCard label="Total orders" value={orders.length} onClick={() => openOrders("all")} />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-500">Payments</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Payment received" value={paid} tone="green" onClick={() => openOrders("paid")} />
          <StatCard label="Payment pending" value={unpaid} tone="amber" onClick={() => openOrders("unpaid")} />
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          Revenue collected: <span className="font-semibold text-ink">{rupees(revenue)}</span>
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-500">In stock by category</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {perCategory.map((c) => (
            <button
              key={c.id}
              onClick={() => openCategory(c.id)}
              className="card flex w-full items-center gap-3 p-3 text-left active:scale-[0.99]"
            >
              <span className="text-neutral-500">
                <CategoryIcon id={c.id} className="h-6 w-6" />
              </span>
              <span className="flex-1 font-medium">{c.label}</span>
              <span className="text-lg font-semibold tabular-nums">{c.count}</span>
              <span className="text-neutral-300">›</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-500">Quick filters</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openProducts("instock")} className="chip chip-off">In stock</button>
          <button onClick={() => openProducts("oos")} className="chip chip-off">Out of stock</button>
          <button onClick={() => openOrders("packing")} className="chip chip-off">Packing done</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Products ---------------- */

function itemDetails(p: Product): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines = [`*${p.name}* (${p.code})`];
  lines.push(
    `Price: ${rupees(p.price)}` + (p.mrp > p.price ? `  (MRP ${rupees(p.mrp)})` : "")
  );
  lines.push(`${origin}/p/${p.code}`);
  return lines.join("\n");
}

function productMessage(p: Product): string {
  return `${shopName}\n${itemDetails(p)}`;
}

async function fetchImageFile(p: Product): Promise<File | null> {
  if (!p.image_url) return null;
  // Same-origin proxy avoids cross-origin fetch failures when grabbing the blob.
  const proxied = `/api/image?url=${encodeURIComponent(p.image_url)}`;
  for (const src of [proxied, p.image_url]) {
    try {
      const blob = await (await fetch(src)).blob();
      if (blob.size > 0) {
        return new File([blob], `${p.code || "product"}.jpg`, {
          type: blob.type || "image/jpeg",
        });
      }
    } catch {
      // try next source
    }
  }
  return null;
}

// One product, its own message, with the actual photo attached.
async function sendOne(p: Product) {
  const text = productMessage(p);
  if (typeof navigator !== "undefined" && navigator.canShare) {
    const file = await fetchImageFile(p);
    if (file && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}

// All selected products in a single message, every photo attached. Browsers only
// allow one image-share per tap, so multiple separate image messages can't be
// auto-fired; sharing them together keeps every image.
async function sendAll(items: Product[]) {
  const text = `${shopName}\n\n` + items.map(itemDetails).join("\n\n");
  if (typeof navigator !== "undefined" && navigator.canShare) {
    const files: File[] = [];
    for (const p of items) {
      const f = await fetchImageFile(p);
      if (f) files.push(f);
    }
    if (files.length > 0 && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}

function ProductsTab({
  products,
  setProducts,
  filter,
  setFilter,
  catFilter,
  setCatFilter,
  subcats,
}: {
  products: Product[];
  setProducts: (p: Product[]) => void;
  filter: ProdFilter;
  setFilter: (f: ProdFilter) => void;
  catFilter: CatFilter;
  setCatFilter: (c: CatFilter) => void;
  subcats: Record<string, string[]>;
}) {
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [sendIndex, setSendIndex] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const selectMode = selected.size > 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (filter === "oos" ? p.stock === 0 : p.stock > 0))
      .filter((p) => catFilter === "all" || p.category === catFilter)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.code || "").toLowerCase().includes(q)
      );
  }, [products, filter, catFilter, query]);

  const categoriesPresent = CATEGORY_META.filter((c) =>
    products.some((p) => p.category === c.id)
  );
  const chosen = products.filter((p) => selected.has(p.id));

  async function addStock(p: Product, delta: number) {
    setBusy(p.id);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, stock: Math.max(0, p.stock + delta) }),
      });
      const json = await res.json();
      if (res.ok) setProducts(products.map((x) => (x.id === p.id ? json.product : x)));
    } finally {
      setBusy("");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Press-and-hold a product to start selecting; then tap others to add/remove.
  function startPress(id: string) {
    fired.current = false;
    pressTimer.current = setTimeout(() => {
      fired.current = true;
      toggleSelect(id);
    }, 450);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }
  function rowClick(p: Product) {
    if (fired.current) {
      fired.current = false;
      return;
    }
    if (selectMode) toggleSelect(p.id);
    else setEditing(p);
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} product(s) permanently?`)) return;
    const ids = [...selected];
    setBusy("bulk");
    try {
      for (const id of ids) {
        await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      }
      setProducts(products.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="pb-24">
      <input
        className="input mb-3"
        placeholder="Search by name or code (e.g. DR001)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mb-3 flex gap-2">
        <button onClick={() => setFilter("instock")} className={`chip flex-1 ${filter === "instock" ? "chip-on" : "chip-off"}`}>
          In stock ({products.filter((p) => p.stock > 0).length})
        </button>
        <button onClick={() => setFilter("oos")} className={`chip flex-1 ${filter === "oos" ? "chip-on" : "chip-off"}`}>
          Out of stock ({products.filter((p) => p.stock === 0).length})
        </button>
      </div>

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setCatFilter("all")}
          className={`chip shrink-0 ${catFilter === "all" ? "chip-on" : "chip-off"}`}
        >
          All
        </button>
        {categoriesPresent.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatFilter(c.id)}
            className={`chip shrink-0 ${catFilter === c.id ? "chip-on" : "chip-off"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-neutral-400">
          {selectMode ? `${selected.size} selected · tap to add/remove` : "Tap to edit · hold to select"}
        </span>
        <div className="flex gap-1">
        <button
          onClick={() => setView("list")}
          className={`rounded-lg px-3 py-1 text-sm ${view === "list" ? "bg-brand text-white" : "border border-neutral-300 text-neutral-600"}`}
        >
          List
        </button>
        <button
          onClick={() => setView("grid")}
          className={`rounded-lg px-3 py-1 text-sm ${view === "grid" ? "bg-brand text-white" : "border border-neutral-300 text-neutral-600"}`}
        >
          Grid
        </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No matching products.</p>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-2 gap-3 lg:grid-cols-3" : "grid grid-cols-1 gap-2"}>
          {shown.map((p) => (
            <div
              key={p.id}
              onPointerDown={() => startPress(p.id)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onClick={() => rowClick(p)}
              className={`card flex cursor-pointer select-none items-center gap-3 p-3 ${
                p.stock === 0 ? "border-red-200 bg-red-50/40" : ""
              } ${selected.has(p.id) ? "ring-2 ring-brand" : ""}`}
            >
              {selectMode && (
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected.has(p.id) ? "border-brand bg-brand text-white" : "border-neutral-300"
                  }`}
                >
                  {selected.has(p.id) && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
              )}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate font-medium">
                  <span className="truncate">{p.name}</span>
                  {!selectMode && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  )}
                </p>
                <p className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-600">{p.code}</span>
                  {p.size ? " · " + p.size : ""} ·{" "}
                  {p.giveaway ? (
                    <span className="font-medium text-emerald-700">Free</span>
                  ) : (
                    <>
                      {rupees(p.price)}
                      {p.mrp > p.price ? (
                        <span className="ml-1 text-neutral-400 line-through">{rupees(p.mrp)}</span>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
              <div
                className="flex items-center gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <span className={`min-w-7 text-center font-semibold tabular-nums ${p.stock === 0 ? "text-red-600" : ""}`}>
                  {p.stock}
                </span>
                <button
                  className="h-8 w-8 rounded-full border border-neutral-300 text-lg disabled:opacity-40"
                  disabled={busy === p.id || p.stock === 0}
                  onClick={() => addStock(p, -1)}
                >
                  -
                </button>
                <button
                  className="h-8 w-8 rounded-full border border-neutral-300 text-lg disabled:opacity-40"
                  disabled={busy === p.id}
                  onClick={() => addStock(p, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-sm text-neutral-500 underline">
              Clear
            </button>
            <button
              onClick={deleteSelected}
              disabled={busy === "bulk"}
              className="rounded-2xl border border-red-300 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-50"
            >
              {busy === "bulk" ? "..." : `Delete ${selected.size}`}
            </button>
            <button
              onClick={() => {
                setSendIndex(0);
                setShareOpen(true);
              }}
              className="flex-1 rounded-2xl bg-green-600 py-3 text-base font-semibold text-white active:scale-[0.98]"
            >
              Share {selected.size} on WhatsApp
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {shareOpen && (
        <motion.div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setShareOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 sm:max-w-lg sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share on WhatsApp</h3>
              <button onClick={() => setShareOpen(false)} className="text-sm text-neutral-500">
                Close
              </button>
            </div>

            {sendIndex < chosen.length ? (
              <div>
                <p className="mb-3 text-sm text-neutral-500">
                  Product {sendIndex + 1} of {chosen.length}. Each one sends as its own
                  message with its photo. Pick WhatsApp and the contact when it opens.
                </p>
                <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                    {chosen[sendIndex].image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={chosen[sendIndex].image_url} alt={chosen[sendIndex].name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{chosen[sendIndex].name}</p>
                    <p className="text-sm text-neutral-500">
                      {chosen[sendIndex].code} · {rupees(chosen[sendIndex].price)}
                      {chosen[sendIndex].mrp > chosen[sendIndex].price
                        ? ` (MRP ${rupees(chosen[sendIndex].mrp)})`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await sendOne(chosen[sendIndex]);
                    setSendIndex((i) => i + 1);
                  }}
                  className="mt-4 w-full rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white active:scale-[0.98]"
                >
                  Send this on WhatsApp
                </button>
                <button
                  onClick={() => setSendIndex((i) => i + 1)}
                  className="mt-2 w-full py-2 text-sm text-neutral-500 underline"
                >
                  Skip this one
                </button>
                <div className="mt-4 flex justify-center gap-1.5">
                  {chosen.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < sendIndex ? "bg-green-600" : i === sendIndex ? "bg-green-400" : "bg-neutral-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white">
                  <CheckIcon className="h-8 w-8" />
                </div>
                <p className="font-semibold">All {chosen.length} sent</p>
                <button onClick={() => setShareOpen(false)} className="btn-primary mt-4 w-full py-3">
                  Done
                </button>
              </div>
            )}

            <div className="mt-5 border-t border-neutral-100 pt-4">
              <button
                onClick={() => sendAll(chosen)}
                className="w-full rounded-2xl border border-green-600 py-3 text-base font-semibold text-green-700"
              >
                Or send all in one message
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {editing && (
        <ProductEdit
          product={editing}
          subcats={subcats}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setProducts(products.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
          }}
          onDeleted={(id) => {
            setProducts(products.filter((x) => x.id !== id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Orders ---------------- */

function OrdersTab({
  orders,
  setOrders,
  filter,
  setFilter,
  fulfillmentFilter,
  setFulfillmentFilter,
}: {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  filter: OrderFilter;
  setFilter: (f: OrderFilter) => void;
  fulfillmentFilter: FulfillmentFilter;
  setFulfillmentFilter: (f: FulfillmentFilter) => void;
}) {
  const [busy, setBusy] = useState("");

  function exportToExcel() {
    const data = shown.map((o) => ({
      "Order ID": o.id.slice(0, 8),
      "Customer": o.customer_name,
      "Phone": o.phone,
      "Address": o.fulfillment === "pickup" ? "Store Pickup" : o.address,
      "Total": `₹${o.total}`,
      "Payment": o.payment_status === "paid" ? "Received" : "Pending",
      "Fulfillment": o.fulfillment === "pickup" ? "Pickup" : "Delivery",
      "Status": o.delivery_status === "delivered" ? "Delivered" : o.delivery_status === "out_for_delivery" ? "Dispatched" : "Pending",
      "Items": (o.order_items || []).map((i) => `${i.qty}x ${i.name_snapshot}`).join("; "),
      "Date": new Date(o.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-filtered-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  function exportAllToExcel() {
    const data = orders.map((o) => ({
      "Order ID": o.id,
      "Short ID": o.id.slice(0, 8),
      "Customer Name": o.customer_name,
      "Phone": o.phone,
      "Address": o.fulfillment === "pickup" ? "Store Pickup" : o.address,
      "Total Amount": `₹${o.total}`,
      "Delivery Fee": `₹${o.delivery_fee || 0}`,
      "Payment Status": o.payment_status === "paid" ? "Received" : "Pending",
      "Fulfillment Type": o.fulfillment === "pickup" ? "Pickup" : "Delivery",
      "Delivery Status": o.delivery_status,
      "Return Status": o.return_status || "none",
      "Refund Status": o.refund_status || "none",
      "Refund Amount": o.refund_amount ? `₹${o.refund_amount}` : "—",
      "Delivery Tracking": o.delivery_tracking || "—",
      "Pickup Date": o.pickup_date || "—",
      "Pickup Time": o.pickup_time || "—",
      "Items": (o.order_items || []).map((i) => `${i.qty}x ${i.name_snapshot} @ ₹${i.price_at_purchase}`).join(" | "),
      "Created Date": new Date(o.created_at).toLocaleDateString(),
      "Created Time": new Date(o.created_at).toLocaleTimeString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Orders");
    XLSX.writeFile(wb, `all-orders-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const shown = orders.filter((o) => {
    // Mutually exclusive funnel stages - order can only be in one stage
    if (filter === "unpaid") {
      // Stage 1: Waiting for payment
      if (o.payment_status !== "pending") return false;
    } else if (filter === "paid") {
      // Stage 2: Payment received, not yet in dispatch/packing
      if (o.payment_status !== "paid" || o.delivery_status !== "unbooked") return false;
    } else if (filter === "packing") {
      // Stage 3: Packing Done (delivery items being packed, not yet booked)
      if (o.delivery_status !== "out_for_delivery" || o.fulfillment !== "delivery") return false;
    } else if (filter === "booked") {
      // Stage 4: Booked (delivery items only, after packing)
      if (o.delivery_status !== "booked" || o.fulfillment !== "delivery") return false;
    } else if (filter === "pickup") {
      // Stage 4 (pickup path): Customer ready to pickup
      if (o.fulfillment !== "pickup" || o.delivery_status !== "out_for_delivery") return false;
    } else if (filter === "delivered") {
      // Stage 5: Order delivered, no returns
      if (o.delivery_status !== "delivered" || o.return_status !== "none") return false;
    } else if (filter === "return") {
      // Return initiated
      if (o.return_status === "none") return false;
    }

    // Filter by fulfillment (delivery/pickup) - applied on top of stage
    if (fulfillmentFilter === "delivery" && o.fulfillment !== "delivery") return false;
    if (fulfillmentFilter === "pickup" && o.fulfillment !== "pickup") return false;

    return true;
  });

  function patch(updated: Order) {
    setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
  }

  async function update(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (res.ok) patch(json.order);
    } finally {
      setBusy("");
    }
  }

  async function bookDelivery(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/delivery/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: id }),
      });
      const json = await res.json();
      if (res.ok) {
        const o = orders.find((x) => x.id === id);
        if (o) patch({ ...o, delivery_status: "booked" });
        if (json.link) window.open(json.link, "_blank");
      } else alert(json.error || "Could not book");
    } finally {
      setBusy("");
    }
  }


  const filters: { id: OrderFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unpaid", label: "Unpaid" },
    { id: "paid", label: "Paid" },
    { id: "packing", label: "Packing Done" },
    { id: "booked", label: "Delivery Booked" },
    { id: "pickup", label: "Customer Pickup" },
    { id: "delivered", label: "Delivered" },
    { id: "return", label: "Return" },
  ];

  const fulfillmentFilters: { id: FulfillmentFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "delivery", label: "Delivery" },
    { id: "pickup", label: "Pickup" },
  ];

  return (
    <div>
      {/* Stage filter — horizontally scrollable on mobile */}
      <p className="mb-2 text-sm font-semibold text-neutral-700">Order Status</p>
      <div className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`chip cursor-pointer whitespace-nowrap ${filter === f.id ? "chip-on" : "chip-off"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fulfillment filter */}
      <p className="mb-2 text-sm font-semibold text-neutral-700">Fulfillment Type</p>
      <div className="mb-4 flex gap-2">
        {fulfillmentFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFulfillmentFilter(f.id)}
            className={`chip cursor-pointer ${fulfillmentFilter === f.id ? "chip-on" : "chip-off"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Export buttons */}
      <div className="mb-4 flex justify-end gap-2">
        {shown.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Filtered
          </button>
        )}
        {orders.length > 0 && (
          <button
            onClick={exportAllToExcel}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition-colors duration-150 hover:bg-brand/10 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export All
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No orders here.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((o) => {
            const dispatched = o.delivery_status === "out_for_delivery";
            const delivered = o.delivery_status === "delivered";
            return (
              <div key={o.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-sm text-neutral-500">{o.phone}</p>
                    <p className="mt-0.5 font-mono text-xs text-neutral-400">#{o.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <p className="text-lg font-semibold">{rupees(o.total)}</p>
                </div>

                <div className="mt-1 text-sm text-neutral-600">
                  {o.fulfillment === "pickup" ? "Store pickup" : o.address}
                </div>

                <ul className="mt-2 text-sm text-neutral-700">
                  {(o.order_items || []).map((i) => (
                    <li key={i.id}>
                      {i.qty} x {i.name_snapshot}
                      {i.size_snapshot ? ` (${i.size_snapshot})` : ""}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={o.fulfillment === "pickup" ? "gray" : "blue"}>
                    {o.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                  </Badge>
                  <Badge tone={o.payment_status === "paid" ? "green" : "amber"}>
                    {o.payment_status === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                  <Badge
                    tone={
                      delivered ? "green"
                      : o.delivery_status === "booked" ? "blue"
                      : dispatched ? "blue"
                      : "gray"
                    }
                  >
                    {delivered ? "Delivered"
                      : o.delivery_status === "booked" ? "Delivery Booked"
                      : dispatched
                        ? (o.fulfillment === "pickup" ? "Ready for Pickup" : "Packing Done")
                        : "Awaiting Packing"}
                  </Badge>
                  {o.return_status !== "none" && (
                    <Badge tone={o.return_status === "accepted" ? "green" : "amber"}>
                      {o.return_status === "requested" ? "Return Requested"
                        : o.return_status === "accepted" ? "Return Accepted"
                        : "Returned"}
                    </Badge>
                  )}
                  {o.refund_status !== "none" && (
                    <Badge tone={o.refund_status === "completed" ? "green" : "amber"}>
                      {o.refund_status === "requested" ? "Refund Pending"
                        : `Refunded ₹${o.refund_amount || o.total}`}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {/* Payment received */}
                  {o.payment_status !== "paid" && (
                    <button
                      className="btn-primary w-full cursor-pointer px-4 py-2 text-sm transition-colors duration-150 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { payment_status: "paid" })}
                    >
                      Mark payment received
                    </button>
                  )}

                  {/* Packing done — shows for any unbooked order, no payment required */}
                  {o.delivery_status === "unbooked" && (
                    <button
                      className="w-full cursor-pointer rounded-xl border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors duration-150 hover:bg-purple-100 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { delivery_status: "out_for_delivery" })}
                    >
                      Mark packing done
                    </button>
                  )}

                  {/* Delivery booked — only for delivery orders, after packing done */}
                  {o.fulfillment === "delivery" && o.delivery_status === "out_for_delivery" && (
                    <button
                      className="w-full cursor-pointer rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors duration-150 hover:bg-blue-100 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { delivery_status: "booked" })}
                    >
                      Mark delivery booked
                    </button>
                  )}

                  {/* Mark delivered — delivery orders after booked, pickup orders after packing done */}
                  {!delivered && (
                    (o.fulfillment === "delivery" && o.delivery_status === "booked") ||
                    (o.fulfillment === "pickup" && o.delivery_status === "out_for_delivery")
                  ) && (
                    <button
                      className="btn-primary w-full cursor-pointer px-4 py-2 text-sm transition-colors duration-150 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { delivery_status: "delivered" })}
                    >
                      Mark delivered
                    </button>
                  )}

                  {/* Return requested — only after delivered */}
                  {delivered && o.return_status === "none" && (
                    <button
                      className="w-full cursor-pointer rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors duration-150 hover:bg-orange-100 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { return_status: "requested" })}
                    >
                      Mark return requested
                    </button>
                  )}

                  {/* Accept return */}
                  {o.return_status === "requested" && (
                    <button
                      className="w-full cursor-pointer rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors duration-150 hover:bg-green-100 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { return_status: "accepted" })}
                    >
                      Accept return
                    </button>
                  )}

                  {/* Mark refund requested */}
                  {o.return_status === "accepted" && o.refund_status === "none" && (
                    <button
                      className="w-full cursor-pointer rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors duration-150 hover:bg-blue-100 disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { refund_status: "requested" })}
                    >
                      Mark refund requested
                    </button>
                  )}

                  {/* Mark refunded */}
                  {o.refund_status === "requested" && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        defaultValue={o.refund_amount || o.total}
                        onBlur={(e) => {
                          const amount = Number(e.target.value);
                          if (amount > 0) update(o.id, { refund_amount: amount });
                        }}
                        className="input w-28 px-3 py-2 text-sm"
                        min="1"
                        placeholder="₹ Amount"
                      />
                      <button
                        className="flex-1 cursor-pointer rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors duration-150 hover:bg-green-100 disabled:opacity-50"
                        disabled={busy === o.id}
                        onClick={() => update(o.id, { refund_status: "completed" })}
                      >
                        Mark refunded
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
