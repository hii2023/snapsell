"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import { rupees, CATEGORY_META } from "@/lib/constants";
import { CategoryIcon, CheckIcon } from "./icons";
import ProductEdit from "./ProductEdit";
import CPanel from "./CPanel";
import type { Category, Order, Product, Settings } from "@/lib/types";

type Tab = "overview" | "products" | "orders" | "insight" | "settings";
type ProdFilter = "instock" | "oos";
type CatFilter = Category | "all";
type OrderFilter = "all" | "unpaid" | "paid" | "packing" | "booked" | "delivered" | "pickup" | "return" | "cancelled";

// An order leaves the active funnel once it is cancelled or its items have
// been returned to store stock. Such orders never show under any active
// stage filter (Order Received, Paid, Packing, Booked, Pickup, Delivered).
function isInactive(o: Order): boolean {
  return Boolean(o.cancelled_at || o.restocked_at);
}
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
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);

  // Refresh local state when the server data changes (e.g. after adding a product).
  useEffect(() => setOrders(initialOrders), [initialOrders]);
  useEffect(() => setProducts(initialProducts), [initialProducts]);

  const [prodFilter, setProdFilter] = useState<ProdFilter>("instock");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
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
    { id: "orders", label: "Orders" },
    { id: "products", label: "Products" },
    { id: "insight", label: "Insight" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 grid grid-cols-5 gap-2">
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
          {tab === "insight" && (
            <Insight
              products={products}
              orders={orders}
              openProducts={openProducts}
              openCategory={openCategory}
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

function OpsCard({
  tone,
  title,
  primary,
  sub,
  onClick,
}: {
  tone: "amber" | "red" | "blue" | "green" | "purple";
  title: string;
  primary: string;
  sub: string;
  onClick?: () => void;
}) {
  const tones = {
    amber:  { card: "border-amber-200 bg-amber-50",  dot: "bg-amber-400",  text: "text-amber-700" },
    red:    { card: "border-red-200 bg-red-50",       dot: "bg-red-400",    text: "text-red-700" },
    blue:   { card: "border-blue-200 bg-blue-50",     dot: "bg-blue-400",   text: "text-blue-700" },
    green:  { card: "border-green-200 bg-green-50",   dot: "bg-green-400",  text: "text-green-700" },
    purple: { card: "border-purple-200 bg-purple-50", dot: "bg-purple-400", text: "text-purple-700" },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl border p-4 text-left transition-all duration-150 ${t.card} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : "cursor-default"}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${t.text}`}>{title}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{primary}</p>
      <p className="mt-0.5 text-sm text-neutral-600">{sub}</p>
    </button>
  );
}

type DateRange = "today" | "week" | "month" | "all";

function filterByDate(orders: Order[], range: DateRange): Order[] {
  if (range === "all") return orders;
  const now = new Date();
  const start = new Date();
  if (range === "today") { start.setHours(0, 0, 0, 0); }
  else if (range === "week") { start.setDate(now.getDate() - 7); }
  else if (range === "month") { start.setDate(now.getDate() - 30); }
  return orders.filter((o) => new Date(o.created_at) >= start);
}

function Overview({
  orders,
  openOrders,
}: {
  products: Product[];
  orders: Order[];
  openOrders: (f: OrderFilter) => void;
}) {
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const filtered = filterByDate(orders, dateRange);

  // Operational buckets (always from ALL active orders — live queue).
  // Cancelled / restocked orders are excluded so they don't appear in any
  // 'needs action' card.
  const active        = orders.filter((o) => !isInactive(o));
  const unpaidOrders  = active.filter((o) => o.payment_status === "pending");
  const toPackOrders  = active.filter((o) => o.payment_status === "paid" && o.delivery_status === "unbooked");
  const toDispatch    = active.filter((o) => o.delivery_status === "out_for_delivery" && o.fulfillment === "delivery");
  const awaitPickup   = active.filter((o) => o.delivery_status === "out_for_delivery" && o.fulfillment === "pickup");
  const unpaidTotal  = unpaidOrders.reduce((s, o) => s + o.total, 0);
  const toPackQty    = toPackOrders.reduce((s, o) => s + (o.order_items || []).reduce((q, i) => q + i.qty, 0), 0);

  // Revenue stats — filtered by date range
  const paidOrders  = filtered.filter((o) => o.payment_status === "paid");
  const cashOrders  = paidOrders.filter((o) => o.payment_method === "cash");
  const upiOrders   = paidOrders.filter((o) => o.payment_method === "upi");
  const otherPaid   = paidOrders.filter((o) => !o.payment_method);
  const cashTotal   = cashOrders.reduce((s, o) => s + o.total, 0);
  const upiTotal    = upiOrders.reduce((s, o) => s + o.total, 0);
  const totalRev    = paidOrders.reduce((s, o) => s + o.total, 0);
  const delivered   = filtered.filter((o) => o.delivery_status === "delivered" && o.return_status === "none");

  const dateLabels: { id: DateRange; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week",  label: "7 days" },
    { id: "month", label: "30 days" },
    { id: "all",   label: "All time" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Operational pulse (live queue — ignores date filter) ── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-500">Needs action now</p>
        <div className="grid grid-cols-2 gap-3">
          <OpsCard tone="red"    title="Order Received" primary={String(unpaidOrders.length)}
            sub={unpaidOrders.length === 0 ? "All clear" : `${rupees(unpaidTotal)} awaiting`}
            onClick={() => openOrders("unpaid")} />
          <OpsCard tone="amber"  title="To be packed"    primary={String(toPackOrders.length)}
            sub={toPackOrders.length === 0 ? "Nothing to pack" : `${toPackQty} item${toPackQty !== 1 ? "s" : ""} total`}
            onClick={() => openOrders("paid")} />
          <OpsCard tone="blue"   title="To dispatch"     primary={String(toDispatch.length)}
            sub={toDispatch.length === 0 ? "Nothing pending" : "Packed, awaiting dispatch"}
            onClick={() => openOrders("packing")} />
          <OpsCard tone="purple" title="Awaiting pickup" primary={String(awaitPickup.length)}
            sub={awaitPickup.length === 0 ? "None waiting" : "Customer to collect"}
            onClick={() => openOrders("pickup")} />
        </div>
      </div>

      {/* ── Date range selector ───────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-500">Revenue summary</p>
        <div className="mb-3 flex gap-2">
          {dateLabels.map((d) => (
            <button key={d.id} onClick={() => setDateRange(d.id)}
              className={`chip text-xs ${dateRange === d.id ? "chip-on" : "chip-off"}`}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Total revenue */}
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Total collected</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{rupees(totalRev)}</p>
              <p className="text-sm text-neutral-500">{paidOrders.length} paid order{paidOrders.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => openOrders("delivered")}
              className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
              {delivered.length} delivered
            </button>
          </div>
        </div>

        {/* Cash / UPI split */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">UPI</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{rupees(upiTotal)}</p>
            <p className="text-xs text-neutral-500">{upiOrders.length} order{upiOrders.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Cash</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{rupees(cashTotal)}</p>
            <p className="text-xs text-neutral-500">{cashOrders.length} order{cashOrders.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {otherPaid.length > 0 && (
          <p className="mt-1 text-xs text-neutral-400 text-right">{otherPaid.length} older order{otherPaid.length !== 1 ? "s" : ""} without method tag</p>
        )}
      </div>

    </div>
  );
}

/* ---------------- Insight ---------------- */

type InsightDrill = null | "sellers" | "customers";

function Insight({
  products,
  orders,
  openProducts,
  openCategory,
}: {
  products: Product[];
  orders: Order[];
  openProducts: (f: ProdFilter) => void;
  openCategory: (c: Category) => void;
}) {
  const [drill, setDrill] = useState<InsightDrill>(null);
  const [custQuery, setCustQuery] = useState("");

  // ── Inventory ─────────────────────────────────────────
  const inStock = products.filter((p) => p.stock > 0).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const totalInventoryUnits = products.reduce((s, p) => s + p.stock, 0);
  const totalInventoryValue = products
    .filter((p) => p.stock > 0)
    .reduce((s, p) => s + p.price * p.stock, 0);

  const perCategory = CATEGORY_META.map((c) => ({
    ...c,
    count: products.filter((p) => p.category === c.id && p.stock > 0).length,
    units: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock, 0),
    value: products
      .filter((p) => p.category === c.id && p.stock > 0)
      .reduce((s, p) => s + p.price * p.stock, 0),
  })).filter((c) => c.count > 0 || c.units > 0);

  // ── Sales totals (cheap, always computed) ─────────────
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalOrders = orders.length;
  let totalProductsSold = 0;
  let totalRevenue = 0;
  paidOrders.forEach((o) => {
    (o.order_items || []).forEach((i) => {
      totalProductsSold += i.qty;
      totalRevenue += i.qty * i.price_at_purchase;
    });
  });

  // ── Unique customers (count only — cheap) ─────────────
  const cleanPhone = (p: string) => p.replace(/\D/g, "");
  const uniquePhones = new Set<string>();
  orders.forEach((o) => {
    const k = cleanPhone(o.phone);
    if (k) uniquePhones.add(k);
  });
  const uniqueCustomerCount = uniquePhones.size;

  // ── Drill-in: top sellers (computed only on demand) ───
  function computeTopSellers() {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    paidOrders.forEach((o) =>
      (o.order_items || []).forEach((i) => {
        const cur = map.get(i.product_id) || { name: i.name_snapshot, qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += i.qty * i.price_at_purchase;
        map.set(i.product_id, cur);
      })
    );
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }

  // ── Drill-in: customers (computed only on demand) ─────
  type CustStat = {
    phone: string;
    name: string;
    orderCount: number;
    totalSpent: number;
    productsBought: number;
    lastOrderAt: string;
  };
  function computeCustomers(): CustStat[] {
    const map = new Map<string, CustStat>();
    orders.forEach((o) => {
      const key = cleanPhone(o.phone);
      if (!key) return;
      const cur = map.get(key) || {
        phone: o.phone,
        name: o.customer_name,
        orderCount: 0,
        totalSpent: 0,
        productsBought: 0,
        lastOrderAt: o.created_at,
      };
      cur.orderCount += 1;
      if (o.payment_status === "paid") cur.totalSpent += o.total;
      cur.productsBought += (o.order_items || []).reduce((s, i) => s + i.qty, 0);
      if (new Date(o.created_at) > new Date(cur.lastOrderAt)) {
        cur.lastOrderAt = o.created_at;
        cur.name = o.customer_name;
      }
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  // ── DRILL VIEWS ───────────────────────────────────────
  if (drill === "sellers") {
    const sellers = computeTopSellers();
    return (
      <div className="space-y-4">
        <button
          onClick={() => setDrill(null)}
          className="flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <span>‹</span> Back to insights
        </button>
        <div>
          <p className="text-sm font-semibold text-neutral-500">Top sellers</p>
          <p className="text-xs text-neutral-400">{sellers.length} products sold across paid orders</p>
        </div>
        {sellers.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-400">
            No paid orders yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sellers.map((s, i) => (
              <div key={s.name + i} className="card flex items-center gap-3 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium">{s.name}</span>
                <span className="text-sm text-neutral-500">{s.qty} sold</span>
                <span className="text-sm font-semibold tabular-nums">{rupees(s.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (drill === "customers") {
    const all = computeCustomers();
    const cq = custQuery.trim().toLowerCase();
    const filtered = cq
      ? all.filter((c) =>
          cleanPhone(c.phone).includes(cleanPhone(custQuery)) ||
          c.name.toLowerCase().includes(cq)
        )
      : all;
    const shown = filtered.slice(0, 50);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setDrill(null)}
          className="flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <span>‹</span> Back to insights
        </button>
        <div>
          <p className="text-sm font-semibold text-neutral-500">Customer dashboard</p>
          <p className="text-xs text-neutral-400">{all.length} unique customers</p>
        </div>

        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={custQuery}
            onChange={(e) => setCustQuery(e.target.value)}
            placeholder="Search by phone or name..."
            className="input pl-9 pr-9 text-sm"
          />
          {custQuery && (
            <button
              onClick={() => setCustQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 hover:text-neutral-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-400">
            {cq ? "No customer matched your search." : "No customers yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {shown.map((c) => (
              <div key={c.phone} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="font-mono text-xs text-neutral-500">{c.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{rupees(c.totalSpent)}</p>
                    <p className="text-xs text-neutral-400">spent</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-neutral-600">
                  <span><b className="text-ink">{c.orderCount}</b> order{c.orderCount !== 1 ? "s" : ""}</span>
                  <span><b className="text-ink">{c.productsBought}</b> product{c.productsBought !== 1 ? "s" : ""}</span>
                  <span className="ml-auto text-neutral-400">
                    Last: {new Date(c.lastOrderAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              </div>
            ))}
            {filtered.length > shown.length && (
              <p className="pt-1 text-center text-xs text-neutral-400">
                Showing 50 of {filtered.length}. Search to narrow down.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── SUMMARY VIEW (default — numbers only, no heavy lists) ──
  return (
    <div className="space-y-7">
      {/* Lifetime sales — 4 boxes */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-500">Lifetime sales</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total orders</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Products sold</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{totalProductsSold}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Revenue</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{rupees(totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Customers</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{uniqueCustomerCount}</p>
          </div>
        </div>
      </div>

      {/* Inventory summary */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-500">Inventory summary</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            onClick={() => openProducts("instock")}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">In stock</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{inStock}</p>
            <p className="text-xs text-neutral-500">{totalInventoryUnits} units total</p>
          </button>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Inventory value</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{rupees(totalInventoryValue)}</p>
            <p className="text-xs text-neutral-500">in-stock items</p>
          </div>
          <button
            onClick={() => openProducts("oos")}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Out of stock</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{outOfStock}</p>
            <p className="text-xs text-neutral-500">Needs restocking</p>
          </button>
        </div>
      </div>

      {/* Category wise products */}
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-500">Category wise products</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {perCategory.length === 0 ? (
            <p className="text-sm text-neutral-400">No stock yet.</p>
          ) : perCategory.map((c) => (
            <button
              key={c.id}
              onClick={() => openCategory(c.id)}
              className="card flex w-full items-center gap-3 p-3 text-left active:scale-[0.99]"
            >
              <span className="text-neutral-500">
                <CategoryIcon id={c.id} className="h-6 w-6" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{c.label}</span>
                <span className="block text-xs text-neutral-500">{c.units} units · {rupees(c.value)}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums">{c.count}</span>
              <span className="text-neutral-300">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drill-in entry tiles */}
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-500">Explore</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDrill("sellers")}
            className="card flex items-center justify-between gap-3 p-4 text-left active:scale-[0.99] hover:border-amber-300"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Top sellers</p>
              <p className="mt-1 text-lg font-bold">View ranking ›</p>
            </div>
            <div className="text-3xl">🏆</div>
          </button>
          <button
            onClick={() => setDrill("customers")}
            className="card flex items-center justify-between gap-3 p-4 text-left active:scale-[0.99] hover:border-indigo-300"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Customer dashboard</p>
              <p className="mt-1 text-lg font-bold">Search & view ›</p>
            </div>
            <div className="text-3xl">👥</div>
          </button>
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
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  // payPick holds the order id currently showing the Cash/UPI selector; null = none open
  const [payPick, setPayPick] = useState<string | null>(null);
  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [waMenuFor, setWaMenuFor] = useState<string | null>(null);

  const STORE_WA = "917202035700";

  // Predefined WhatsApp templates the admin can pick from per order.
  // Each template returns the message body (variables get interpolated).
  const WA_TEMPLATES: { id: string; label: string; build: (o: Order) => string }[] = [
    {
      id: "payment_reminder",
      label: "Payment reminder",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, this is a reminder for your order ${ref} of ₹${o.total}. Please complete the payment to confirm your order. Scan the QR or pay to UPI: innovativerevive@idfcbank. Once paid, please share the screenshot here. Thank you!`;
      },
    },
    {
      id: "payment_confirmed",
      label: "Payment confirmed",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, we have received your payment of ₹${o.total} for order ${ref}. We are now preparing it for ${o.fulfillment === "pickup" ? "pickup" : "dispatch"}. Will keep you posted.`;
      },
    },
    {
      id: "dispatched",
      label: "Order dispatched",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, your order ${ref} has been dispatched and is on the way. You should receive it shortly. Thank you for shopping with India Recycles!`;
      },
    },
    {
      id: "ready_for_pickup",
      label: "Ready for pickup",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, your order ${ref} is ready for pickup at our store. Address: Godown # 3, SK Estate, Nr Nagdev Mandir, LJ University Rd, Sarkhej - Gandhinagar Highway, Ahmedabad. Please bring your Order ID.`;
      },
    },
    {
      id: "delivered",
      label: "Delivered, ask for feedback",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, hope you received your order ${ref} in good condition! We would love your feedback. Please leave a review and follow us on Instagram @india.recycles. Thank you!`;
      },
    },
    {
      id: "return_received",
      label: "Return request received",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, we have received your return request for order ${ref}. Our team will reach out shortly to arrange the next steps. Thank you for your patience.`;
      },
    },
    {
      id: "cancelled",
      label: "Order cancelled / restocked",
      build: (o) => {
        const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
        return `Hi ${o.customer_name}, your order ${ref} has been cancelled. If a payment was made, the refund will be processed within 3-5 working days. Please reach out if you have any questions.`;
      },
    },
  ];

  // Pick the template that best matches the current order stage as the default
  function defaultTemplate(o: Order): string {
    if (o.cancelled_at) return "cancelled";
    if (o.return_status !== "none") return "return_received";
    if (o.delivery_status === "delivered") return "delivered";
    if (o.delivery_status === "booked") return "dispatched";
    if (o.delivery_status === "out_for_delivery" && o.fulfillment === "pickup") return "ready_for_pickup";
    if (o.payment_status === "paid") return "payment_confirmed";
    return "payment_reminder";
  }

  function buildWaUrl(o: Order, templateId: string): string {
    const tpl = WA_TEMPLATES.find((t) => t.id === templateId) || WA_TEMPLATES[0];
    const msg = tpl.build(o);
    const phone = o.phone.replace(/\D/g, "");
    const wa = phone.startsWith("91") ? phone : `91${phone}`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  // Kept for legacy export-helper / single-tap usage — same default template
  function customerWaUrl(o: Order): string {
    return buildWaUrl(o, defaultTemplate(o));
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function exportToExcel() {
    const data = shown.map((o) => ({
      "Order ID": o.id.slice(0, 8),
      "Customer": o.customer_name,
      "Phone": o.phone,
      "Address": o.fulfillment === "pickup" ? "Store Pickup" : o.address,
      "Total": `₹${o.total}`,
      "Payment": o.payment_status === "paid" ? "Received" : "Pending",
      "Payment Method": o.payment_method || "—",
      "Fulfillment": o.fulfillment === "pickup" ? "Pickup" : "Delivery",
      "Status": o.delivery_status === "delivered" ? "Delivered" : o.delivery_status === "out_for_delivery" ? "Dispatched" : "Pending",
      "Items": (o.order_items || []).map((i) => `${i.qty}x ${i.name_snapshot}`).join("; "),
      "Order Date": fmtDate(o.created_at),
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
      "Payment Method": o.payment_method || "—",
      "Fulfillment Type": o.fulfillment === "pickup" ? "Pickup" : "Delivery",
      "Delivery Status": o.delivery_status,
      "Return Status": o.return_status || "none",
      "Refund Status": o.refund_status || "none",
      "Refund Amount": o.refund_amount ? `₹${o.refund_amount}` : "—",
      "Delivery Tracking": o.delivery_tracking || "—",
      "Pickup Date": o.pickup_date || "—",
      "Pickup Time": o.pickup_time || "—",
      "Items": (o.order_items || []).map((i) => `${i.qty}x ${i.name_snapshot} @ ₹${i.price_at_purchase}`).join(" | "),
      "Order Date": fmtDate(o.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Orders");
    XLSX.writeFile(wb, `all-orders-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const q = search.trim().toLowerCase();

  const shown = orders.filter((o) => {
    // Search filter — matches order ID, phone, or name
    if (q) {
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesPhone = o.phone.toLowerCase().includes(q);
      const matchesName = o.customer_name.toLowerCase().includes(q);
      if (!matchesId && !matchesPhone && !matchesName) return false;
    }

    // Cancelled / restocked orders are excluded from every active funnel stage
    // — they only show under the dedicated 'Cancelled' filter (or 'All').
    const cancelled = isInactive(o);

    // Mutually exclusive funnel stages - order can only be in one stage
    if (filter === "unpaid") {
      // Stage 1: Waiting for payment
      if (cancelled) return false;
      if (o.payment_status !== "pending") return false;
    } else if (filter === "paid") {
      // Stage 2: Payment received, not yet in dispatch/packing
      if (cancelled) return false;
      if (o.payment_status !== "paid" || o.delivery_status !== "unbooked") return false;
    } else if (filter === "packing") {
      // Stage 3: Packing Done (delivery items being packed, not yet booked)
      if (cancelled) return false;
      if (o.delivery_status !== "out_for_delivery" || o.fulfillment !== "delivery") return false;
    } else if (filter === "booked") {
      // Stage 4: Booked (delivery items only, after packing)
      if (cancelled) return false;
      if (o.delivery_status !== "booked" || o.fulfillment !== "delivery") return false;
    } else if (filter === "pickup") {
      // Stage 4 (pickup path): Customer ready to pickup
      if (cancelled) return false;
      if (o.fulfillment !== "pickup" || o.delivery_status !== "out_for_delivery") return false;
    } else if (filter === "delivered") {
      // Stage 5: Order delivered, no returns
      if (cancelled) return false;
      if (o.delivery_status !== "delivered" || o.return_status !== "none") return false;
    } else if (filter === "return") {
      // Return initiated
      if (cancelled) return false;
      if (o.return_status === "none") return false;
    } else if (filter === "cancelled") {
      // Cancelled / restocked stage
      if (!cancelled) return false;
    }

    // Filter by fulfillment (delivery/pickup) - applied on top of stage
    if (fulfillmentFilter === "delivery" && o.fulfillment !== "delivery") return false;
    if (fulfillmentFilter === "pickup" && o.fulfillment !== "pickup") return false;

    return true;
  });

  function patch(updated: Order) {
    setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
  }

  // Optimistic update: apply the change immediately so the UI responds
  // instantly, then confirm silently with the server. On error, revert.
  async function update(id: string, body: Record<string, unknown>) {
    const original = orders.find((o) => o.id === id);
    if (!original) return;

    // Apply immediately
    patch({ ...original, ...body } as Order);
    setBusy(id);

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = await res.json();
      if (res.ok) {
        // Confirm with server's authoritative data
        patch(json.order);
        // Refresh server component data in background (keeps scroll position)
        router.refresh();
      } else {
        // Revert on failure
        patch(original);
      }
    } catch {
      patch(original);
    } finally {
      setBusy("");
    }
  }

  // Cancel order — marks cancelled_at, keeps order in DB
  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    await update(id, { action: "cancel" });
  }

  // Move back to store — restocks the items (re-adds qty to product stock)
  async function restockOrder(id: string) {
    if (!confirm("Move items back to store stock? Use only after confirming with the customer.")) return;
    await update(id, { action: "restock" });
  }

  // Bulk delete — wipes selected orders from DB
  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} order${ids.length === 1 ? "" : "s"} permanently? This cannot be undone.`)) return;
    setBusy("bulk");
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setOrders(orders.filter((o) => !selected.has(o.id)));
        setSelected(new Set());
        setSelectMode(false);
        router.refresh();
      } else {
        alert("Failed to delete selected orders.");
      }
    } finally {
      setBusy("");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
    { id: "unpaid", label: "Order Received" },
    { id: "paid", label: "Paid" },
    { id: "packing", label: "Packing Done" },
    { id: "booked", label: "Delivery Booked" },
    { id: "pickup", label: "Customer Pickup" },
    { id: "delivered", label: "Delivered" },
    { id: "return", label: "Return" },
    { id: "cancelled", label: "Cancelled" },
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


      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or order ID..."
          className="input pl-9 pr-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Bulk delete bar */}
      {selectMode && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm font-medium text-red-700">
            {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set(shown.map((o) => o.id)))}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Select all visible
            </button>
            <button
              onClick={bulkDelete}
              disabled={selected.size === 0 || busy === "bulk"}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Export + Select toggle */}
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => { setSelectMode((m) => !m); setSelected(new Set()); }}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            selectMode
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {selectMode ? "Done" : "Select"}
        </button>
        {shown.length > 0 && !selectMode && (
          <button
            onClick={exportToExcel}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Filtered
          </button>
        )}
        {orders.length > 0 && !selectMode && (
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
            const isSelected = selected.has(o.id);
            return (
              <div
                key={o.id}
                className={`card p-4 ${o.cancelled_at ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-red-400" : ""}`}
              >
                {/* Bulk select checkbox */}
                {selectMode && (
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(o.id)}
                      className="h-4 w-4 cursor-pointer accent-red-600"
                    />
                    <span className="font-medium text-neutral-700">Select for delete</span>
                  </label>
                )}
                {o.cancelled_at && (
                  <p className="mb-2 rounded bg-red-50 px-2 py-1 text-center text-xs font-semibold text-red-700">
                    Cancelled
                    {o.restocked_at ? " · Restocked" : ""}
                  </p>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{o.customer_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-neutral-500">{o.phone}</p>
                      <a
                        href={customerWaUrl(o)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp customer"
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    </div>
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
                    {o.payment_status === "paid"
                      ? o.payment_method === "upi" ? "Paid (UPI)"
                      : o.payment_method === "cash" ? "Paid (Cash)"
                      : "Paid"
                      : "Order Received"}
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
                  {/* Payment received — Cash / UPI inline selector */}
                  {o.payment_status !== "paid" && (
                    payPick === o.id ? (
                      <div className="rounded-xl border border-green-300 bg-green-50 p-3">
                        <p className="mb-2 text-center text-xs font-semibold text-green-700">How was payment received?</p>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 cursor-pointer rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            disabled={busy === o.id}
                            onClick={() => { setPayPick(null); update(o.id, { payment_status: "paid", payment_method: "upi" }); }}
                          >
                            UPI
                          </button>
                          <button
                            className="flex-1 cursor-pointer rounded-xl bg-amber-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                            disabled={busy === o.id}
                            onClick={() => { setPayPick(null); update(o.id, { payment_status: "paid", payment_method: "cash" }); }}
                          >
                            Cash
                          </button>
                          <button
                            className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
                            onClick={() => setPayPick(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn-primary w-full cursor-pointer px-4 py-2 text-sm transition-colors duration-150 disabled:opacity-50"
                        disabled={busy === o.id}
                        onClick={() => setPayPick(o.id)}
                      >
                        Mark payment received
                      </button>
                    )
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

                  {/* WhatsApp templates menu */}
                  {waMenuFor === o.id ? (
                    <div className="rounded-xl border border-green-300 bg-green-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">Send WhatsApp template</p>
                      <div className="space-y-1.5">
                        {WA_TEMPLATES.map((t) => (
                          <a
                            key={t.id}
                            href={buildWaUrl(o, t.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setWaMenuFor(null)}
                            className="block rounded-lg bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-green-100"
                          >
                            {t.label}
                          </a>
                        ))}
                      </div>
                      <button
                        onClick={() => setWaMenuFor(null)}
                        className="mt-2 w-full text-center text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setWaMenuFor(o.id)}
                      className="w-full cursor-pointer rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                    >
                      WhatsApp templates ▾
                    </button>
                  )}

                  {/* Cancel + Restock (lifecycle actions) */}
                  {!o.cancelled_at && (
                    <button
                      onClick={() => cancelOrder(o.id)}
                      disabled={busy === o.id}
                      className="w-full cursor-pointer rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel order
                    </button>
                  )}
                  {!o.restocked_at && (
                    <button
                      onClick={() => restockOrder(o.id)}
                      disabled={busy === o.id}
                      className="w-full cursor-pointer rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                    >
                      Move back to store
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
