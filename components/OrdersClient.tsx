"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rupees, CATEGORY_META } from "@/lib/constants";
import { CategoryIcon, CheckIcon } from "./icons";
import ProductEdit from "./ProductEdit";
import CPanel from "./CPanel";
import type { Category, Order, Product, Settings } from "@/lib/types";

type Tab = "overview" | "products" | "orders" | "settings";
type ProdFilter = "instock" | "oos";
type CatFilter = Category | "all";
type OrderFilter = "all" | "dispatch" | "paid" | "unpaid";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);

  // Refresh local state when the server data changes (e.g. after adding a product).
  useEffect(() => setOrders(initialOrders), [initialOrders]);
  useEffect(() => setProducts(initialProducts), [initialProducts]);

  const [prodFilter, setProdFilter] = useState<ProdFilter>("instock");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

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
      className={`rounded-2xl border p-4 text-left ${tones[tone]} ${onClick ? "active:scale-[0.98]" : "cursor-default"}`}
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
        <StatCard label="Ready to ship" value={readyToShip} tone="amber" onClick={() => openOrders("dispatch")} />
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
          <button onClick={() => openOrders("dispatch")} className="chip chip-off">Ready for delivery</button>
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

      <div className="mb-3 flex justify-end gap-1">
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

      {shown.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No matching products.</p>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-2 gap-3 lg:grid-cols-3" : "grid grid-cols-1 gap-2"}>
          {shown.map((p) => (
            <div
              key={p.id}
              className={`card flex items-center gap-3 p-3 ${p.stock === 0 ? "border-red-200 bg-red-50/40" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleSelect(p.id)}
                className="h-5 w-5 shrink-0"
                style={{ accentColor: "#0f766e" }}
              />
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <button onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-1 truncate font-medium">
                  <span className="truncate">{p.name}</span>
                  <svg className="h-3.5 w-3.5 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
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
              </button>
              <div className="flex items-center gap-1.5">
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
}: {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  filter: OrderFilter;
  setFilter: (f: OrderFilter) => void;
}) {
  const [busy, setBusy] = useState("");

  const shown = orders.filter((o) => {
    if (filter === "dispatch") return isPendingDispatch(o);
    if (filter === "paid") return o.payment_status === "paid";
    if (filter === "unpaid") return o.payment_status === "pending";
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
    { id: "dispatch", label: "To dispatch" },
    { id: "paid", label: "Paid" },
    { id: "unpaid", label: "Unpaid" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip ${filter === f.id ? "chip-on" : "chip-off"}`}
          >
            {f.label}
          </button>
        ))}
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
                    {o.payment_status === "paid" ? "Payment received" : "Payment pending"}
                  </Badge>
                  <Badge
                    tone={
                      delivered ? "green" : dispatched ? "blue" : o.payment_status === "paid" ? "blue" : "amber"
                    }
                  >
                    {delivered
                      ? "Delivered"
                      : dispatched
                        ? "Dispatched"
                        : o.payment_status === "paid"
                          ? "Ready to dispatch"
                          : "Awaiting payment"}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {o.fulfillment === "delivery" && isPendingDispatch(o) && (
                    <button
                      className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => bookDelivery(o.id)}
                    >
                      Book delivery
                    </button>
                  )}
                  {!dispatched && !delivered && (
                    <button
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                      disabled={busy === o.id || o.payment_status !== "paid"}
                      title={o.payment_status !== "paid" ? "Mark payment received first" : ""}
                      onClick={() => update(o.id, { delivery_status: "out_for_delivery" })}
                    >
                      {o.payment_status !== "paid" ? "Payment first" : "Mark dispatched"}
                    </button>
                  )}
                  {dispatched && (
                    <button
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { delivery_status: "delivered" })}
                    >
                      Mark delivered
                    </button>
                  )}
                  {o.payment_status !== "paid" && (
                    <button
                      className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
                      disabled={busy === o.id}
                      onClick={() => update(o.id, { payment_status: "paid" })}
                    >
                      Payment received
                    </button>
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
