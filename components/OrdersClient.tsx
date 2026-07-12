"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import { rupees, CATEGORY_META } from "@/lib/constants";
import { CategoryIcon, CheckIcon } from "./icons";
import ProductEdit from "./ProductEdit";
import CPanel from "./CPanel";
import { Footer } from "./Footer";
import { useBackClose } from "@/lib/use-back";
import type { Category, Order, Product, Settings, WaTemplate } from "@/lib/types";

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

// Public storefront base URL. Product links shared with customers must point at
// the store, never the admin domain the seller is browsing from.
const STORE_URL = (
  process.env.NEXT_PUBLIC_STORE_URL || "https://store.indiarecycles.org"
).replace(/\/+$/, "");

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

  // Phone / browser Back returns to the Overview tab instead of leaving the
  // admin panel.
  useBackClose(tab !== "overview", () => setTab("overview"));

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
          {tab !== "overview" && (
            <button
              onClick={() => setTab("overview")}
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to overview
            </button>
          )}
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
              settings={settings}
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

  // Revenue stats — filtered by date range. Refunds are subtracted so the
  // numbers reflect actual cash on hand, not gross collections.
  const paidOrders  = filtered.filter((o) => o.payment_status === "paid");
  const cashOrders  = paidOrders.filter((o) => o.payment_method === "cash");
  const upiOrders   = paidOrders.filter((o) => o.payment_method === "upi");
  const otherPaid   = paidOrders.filter((o) => !o.payment_method);
  const refundedInRange = filtered.filter((o) => o.refund_status === "completed");
  const cashRefund  = refundedInRange.filter((o) => o.refund_method === "cash").reduce((s, o) => s + (o.refund_amount || o.total), 0);
  const upiRefund   = refundedInRange.filter((o) => o.refund_method === "upi").reduce((s, o) => s + (o.refund_amount || o.total), 0);
  const totalRefund = cashRefund + upiRefund;
  const cashGross   = cashOrders.reduce((s, o) => s + o.total, 0);
  const upiGross    = upiOrders.reduce((s, o) => s + o.total, 0);
  const cashTotal   = cashGross - cashRefund;
  const upiTotal    = upiGross - upiRefund;
  const totalRev    = paidOrders.reduce((s, o) => s + o.total, 0) - totalRefund;
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
        {totalRefund > 0 && (
          <p className="mt-1 text-right text-xs text-red-500">
            Refunds in range: {rupees(totalRefund)} ({refundedInRange.length})
          </p>
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

  // Phone / browser Back leaves a drill-down view instead of the admin.
  useBackClose(drill !== null, () => setDrill(null));

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
  // Refunded orders are netted out of revenue so lifetime totals match
  // actual cash on hand.
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalOrders = orders.length;
  let totalProductsSold = 0;
  let grossRevenue = 0;
  paidOrders.forEach((o) => {
    (o.order_items || []).forEach((i) => {
      totalProductsSold += i.qty;
      grossRevenue += i.qty * i.price_at_purchase;
    });
  });
  const totalRefunded = orders
    .filter((o) => o.refund_status === "completed")
    .reduce((s, o) => s + (o.refund_amount || o.total), 0);
  const totalRevenue = grossRevenue - totalRefunded;

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
  const lines = [`*${p.name}* (${p.code})`];
  lines.push(
    `Price: ${rupees(p.price)}` + (p.mrp > p.price ? `  (MRP ${rupees(p.mrp)})` : "")
  );
  lines.push(`${STORE_URL}/p/${p.code}`);
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

// Share the photo(s) via the phone's native share sheet, which lists Instagram
// (Story + Post), WhatsApp, and every other installed app. Instagram ignores any
// caption passed through the share sheet, so we copy the price+link text to the
// clipboard first and let the seller paste it. Returns false if the device has
// no native share support (desktop), so the caller can show a fallback.
async function shareToApps(items: Product[]): Promise<boolean> {
  const text = `${shopName}\n\n` + items.map(itemDetails).join("\n\n");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard may be blocked; sharing still proceeds
  }
  if (typeof navigator !== "undefined" && navigator.canShare) {
    const files: File[] = [];
    for (const p of items) {
      const f = await fetchImageFile(p);
      if (f) files.push(f);
    }
    if (files.length > 0 && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, text });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return true;
        return false;
      }
    }
  }
  return false;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
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
  const [shareChannel, setShareChannel] = useState<"pick" | "wa">("pick");
  const [shareNote, setShareNote] = useState("");
  const [sendIndex, setSendIndex] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");

  // Phone / browser Back closes the edit modal / share sheet instead of
  // leaving the admin.
  useBackClose(!!editing, () => setEditing(null));
  useBackClose(shareOpen, () => setShareOpen(false));
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

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
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

      <a
        href="/api/products/export"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 active:scale-[0.99]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
        Download all products (Excel)
      </a>

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
                  {p.gender ? " · " + p.gender : ""}
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
                setShareChannel("pick");
                setShareNote("");
                setShareOpen(true);
              }}
              className="flex-1 rounded-2xl bg-green-600 py-3 text-base font-semibold text-white active:scale-[0.98]"
            >
              Share {selected.size}
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
              <h3 className="text-lg font-semibold">
                {shareChannel === "wa"
                  ? "Share on WhatsApp"
                  : `Share ${chosen.length} product${chosen.length === 1 ? "" : "s"}`}
              </h3>
              <button onClick={() => setShareOpen(false)} className="text-sm text-neutral-500">
                Close
              </button>
            </div>

            {shareChannel === "pick" ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-500">
                  Every share includes the product photo, price and store link.
                </p>
                <button
                  onClick={() => {
                    setSendIndex(0);
                    setShareChannel("wa");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-green-600 px-4 py-4 text-left text-white active:scale-[0.98]"
                >
                  <WhatsAppGlyph className="h-7 w-7 shrink-0" />
                  <span>
                    <span className="block text-base font-semibold">WhatsApp</span>
                    <span className="block text-xs text-green-100">Send to a chat or group</span>
                  </span>
                </button>
                <button
                  onClick={async () => {
                    const ok = await shareToApps(chosen);
                    setShareNote(
                      ok
                        ? "Caption copied. When Instagram opens, tap Stories, then paste the caption if you want text."
                        : "Instagram sharing works from a phone. Caption copied to your clipboard so you can paste it into Instagram."
                    );
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 px-4 py-4 text-left text-white active:scale-[0.98]"
                >
                  <InstagramGlyph className="h-7 w-7 shrink-0" />
                  <span>
                    <span className="block text-base font-semibold">Instagram Story</span>
                    <span className="block text-xs text-pink-100">Opens Instagram, tap Stories</span>
                  </span>
                </button>
                <button
                  onClick={async () => {
                    const ok = await shareToApps(chosen);
                    if (!ok) setShareNote("No share sheet on this device. Caption copied to your clipboard.");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-neutral-300 px-4 py-4 text-left text-neutral-700 active:scale-[0.98]"
                >
                  <ShareGlyph className="h-6 w-6 shrink-0" />
                  <span>
                    <span className="block text-base font-semibold">More apps</span>
                    <span className="block text-xs text-neutral-400">Facebook, Telegram, email…</span>
                  </span>
                </button>
                {shareNote && (
                  <p className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">{shareNote}</p>
                )}
              </div>
            ) : sendIndex < chosen.length ? (
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

            {shareChannel === "wa" && (
              <div className="mt-5 space-y-3 border-t border-neutral-100 pt-4">
                <button
                  onClick={() => sendAll(chosen)}
                  className="w-full rounded-2xl border border-green-600 py-3 text-base font-semibold text-green-700"
                >
                  Or send all in one message
                </button>
                <button
                  onClick={() => setShareChannel("pick")}
                  className="w-full py-1 text-sm text-neutral-500 underline"
                >
                  Back to share options
                </button>
              </div>
            )}
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
  settings,
}: {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  filter: OrderFilter;
  setFilter: (f: OrderFilter) => void;
  fulfillmentFilter: FulfillmentFilter;
  setFulfillmentFilter: (f: FulfillmentFilter) => void;
  settings?: { wa_templates: { id: string; label: string; message: string }[] };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "compact">("list");
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  // payPick holds the order id currently showing the Cash/UPI selector; null = none open
  const [payPick, setPayPick] = useState<string | null>(null);
  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Cancel picker: Move Back to Store or Not Available
  const [cancelPickerFor, setCancelPickerFor] = useState<string | null>(null);
  // Share menu state
  const [shareMenuFor, setShareMenuFor] = useState<string | null>(null);
  // Image viewer state
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  // Phone / browser Back closes the image viewer instead of leaving the admin.
  useBackClose(!!viewImageUrl, () => setViewImageUrl(null));

  // Handle ESC key to close image modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && viewImageUrl) {
        setViewImageUrl(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewImageUrl]);

  // Hard-coded stage-based WhatsApp messages
  function buildWaUrl(o: Order): string {
    const ref = "IR-" + o.id.slice(0, 8).toUpperCase();
    const amt = `₹${o.total}`;
    const upiId = process.env.NEXT_PUBLIC_UPI_ID || "";
    let msg = "";

    if (o.cancelled_at) {
      msg = `Hi ${o.customer_name}, your order ${ref} has been cancelled. If a payment was made, the refund will be processed within 3-5 working days. Please reach out if you have any questions.`;
    } else if (o.return_status !== "none") {
      msg = `Hi ${o.customer_name}, we have received your return request for order ${ref}. Our team will reach out shortly to arrange the next steps. Thank you for your patience.`;
    } else if (o.delivery_status === "delivered") {
      msg = `Hi ${o.customer_name}, your order ${ref} has been delivered. Thank you for shopping with India Recycles!`;
    } else if (o.delivery_status === "booked") {
      msg = `Hi ${o.customer_name}, your order ${ref} has been dispatched and is on the way!`;
    } else if (o.delivery_status === "out_for_delivery" && o.fulfillment === "pickup") {
      msg = `Hi ${o.customer_name}, your order ${ref} is ready for pickup. Please collect it at your convenience.`;
    } else if (o.delivery_status === "out_for_delivery") {
      msg = `Hi ${o.customer_name}, your order ${ref} has been packed and will be dispatched soon.`;
    } else if (o.payment_status === "paid") {
      msg = `Hi ${o.customer_name}, we have received your payment for order ${ref}. We are now processing your order.`;
    } else {
      msg = `Hi ${o.customer_name}, your order ${ref} is awaiting payment of ${amt}.${upiId ? ` Please pay to UPI: ${upiId}` : ""} Please complete the payment to confirm your order.`;
    }

    const phone = o.phone.replace(/\D/g, "");
    const wa = phone.startsWith("91") ? phone : `91${phone}`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  // Alias for compatibility
  function customerWaUrl(o: Order): string {
    return buildWaUrl(o);
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

  // Cancel order — marks cancelled_at. After cancel, ask: Move Back to Store or Not Available?
  async function cancelOrder(
    id: string,
    refund?: { method: "cash" | "upi" | null; amount: number },
    handleStock?: "restock" | "not_available"
  ) {
    if (!confirm("Cancel this order? This cannot be undone.")) return;

    // First, mark as cancelled + handle refund if applicable
    const patch: Record<string, unknown> = { action: "cancel" };
    if (refund && refund.method) {
      patch.refund_status = "completed";
      patch.refund_method = refund.method;
      patch.refund_amount = refund.amount;
    }
    await update(id, patch);

    // Then, if stock handling was specified, apply it
    if (handleStock === "restock") {
      await restockOrder(id);
    }
    // "not_available" does nothing extra — items are just gone

    setCancelPickerFor(null);
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

  function toggleAddressExpanded(id: string) {
    setExpandedAddresses((prev) => {
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
      <div className="mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
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
              onClick={bulkDelete}
              disabled={selected.size === 0 || busy === "bulk"}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Export + Select toggle + View modes */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-brand text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-brand text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("compact")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === "compact"
                ? "bg-brand text-white"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Compact
          </button>
        </div>
        <div className="flex gap-2">
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
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No orders here.</p>
      ) : (
        <div className={`gap-3 ${
          viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3" :
          viewMode === "compact" ? "space-y-1" :
          "grid gap-3 sm:grid-cols-2"
        }`}>
          {shown.map((o) => {
            const dispatched = o.delivery_status === "out_for_delivery";
            const delivered = o.delivery_status === "delivered";
            const isSelected = selected.has(o.id);
            const addressExpanded = expandedAddresses.has(o.id);
            return (
              <div
                key={o.id}
                className={`${viewMode === "compact" ? "border border-neutral-200 rounded-lg p-2" : "card p-4"} ${o.cancelled_at ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-red-400" : ""}`}
              >
                {/* Bulk select checkbox */}
                {selectMode && (
                  <label className={`flex cursor-pointer items-center gap-2 ${viewMode === "compact" ? "mb-1 text-xs" : "mb-3 text-sm"}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(o.id)}
                      className="h-4 w-4 cursor-pointer accent-red-600"
                    />
                    <span className="font-medium text-neutral-700">Select</span>
                  </label>
                )}
                {o.cancelled_at && (
                  <p className={`rounded bg-red-50 text-center text-xs font-semibold text-red-700 ${viewMode === "compact" ? "mb-1 px-1.5 py-0.5" : "mb-2 px-2 py-1"}`}>
                    Cancelled{o.restocked_at ? " · Restocked" : ""}{o.refund_status === "completed" && o.refund_method ? ` · Refunded ${o.refund_method.toUpperCase()} ₹${o.refund_amount || o.total}` : o.payment_status === "paid" && o.refund_status !== "completed" ? " · No refund" : ""}
                  </p>
                )}
                <div className={`flex items-start justify-between ${viewMode === "compact" ? "gap-1.5" : ""}`}>
                  <div className="flex-1 min-w-0">
                    {viewMode === "compact" ? (
                      <div className="text-xs">
                        <div className="flex items-center gap-1 truncate">
                          <span className="font-semibold text-ink truncate">{o.customer_name}</span>
                          <a
                            href={customerWaUrl(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            <svg className="h-2 w-2" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        </div>
                        <p className="text-neutral-500">{o.phone} · {(o.order_items || []).length} items</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{o.customer_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-neutral-500">{o.phone}</p>
                          <a
                            href={customerWaUrl(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send WhatsApp message"
                            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>

                          {/* Share menu button */}
                          <div className="relative">
                            <button
                              onClick={() => setShareMenuFor(shareMenuFor === o.id ? null : o.id)}
                              title="Share order"
                              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M4 12a8 8 0 008-8V0C5.373 0 0 5.373 0 12s5.373 12 12 12v-4a8 8 0 01-8-8zm16-8v4a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12s-5.373-12-12-12v4a8 8 0 018 8z"/>
                              </svg>
                            </button>

                            {/* Share menu */}
                            {shareMenuFor === o.id && (
                              <div className="absolute right-0 top-full mt-1 rounded-xl border border-blue-300 bg-white p-2 shadow-lg z-20">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${STORE_URL}/p/${o.id.slice(0, 8).toLowerCase()}`);
                                    setShareMenuFor(null);
                                  }}
                                  className="block w-full text-left rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  Copy order link
                                </button>
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(`Order #${o.id.slice(0, 8).toUpperCase()} - ${rupees(o.total)}\n\nCustomer: ${o.customer_name}\n\nStatus: Pending\n\nReply to this message for order details.`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                                  onClick={() => setShareMenuFor(null)}
                                >
                                  Share on WhatsApp
                                </a>
                                <button
                                  onClick={() => {
                                    const subject = `Order #${o.id.slice(0, 8).toUpperCase()} - ₹${o.total}`;
                                    const body = `Customer: ${o.customer_name}\nPhone: ${o.phone}\nTotal: ₹${o.total}`;
                                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    setShareMenuFor(null);
                                  }}
                                  className="block w-full text-left rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                                >
                                  Share via email
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-neutral-400">#{o.id.slice(0, 8).toUpperCase()}</p>
                      </>
                    )}
                  </div>
                  <div className={`${viewMode === "compact" ? "text-xs text-right" : "text-right"}`}>
                    <p className={`font-semibold ${viewMode === "compact" ? "text-sm" : "text-lg"}`}>{rupees(o.total)}</p>
                    <p className={`text-neutral-500 ${viewMode === "compact" ? "text-[10px]" : "text-xs mt-1"}`}>
                      {new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                    </p>
                    {viewMode !== "compact" && (
                      <p className="text-xs text-neutral-400">
                        {new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    )}
                  </div>
                </div>

                {viewMode !== "compact" && (
                  <>
                    <div className="mt-2 rounded-lg bg-neutral-50 p-2.5">
                      <p className="text-xs font-semibold text-neutral-600 mb-1.5">Items:</p>
                      <div className="space-y-2">
                        {(o.order_items || []).map((i) => (
                          <div key={i.id} className="flex gap-2 items-start">
                            {/* Product image */}
                            {i.image_url_snapshot && (
                              <button
                                onClick={() => setViewImageUrl(i.image_url_snapshot!)}
                                className="h-12 w-12 flex-shrink-0 rounded bg-white overflow-hidden border border-neutral-200 cursor-pointer hover:opacity-75 transition-opacity"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={i.image_url_snapshot} alt={i.name_snapshot} className="h-full w-full object-cover" />
                              </button>
                            )}
                            {/* Product details */}
                            <div className="flex-1 text-sm">
                              <p className="text-neutral-700 font-medium">{i.qty}x {i.name_snapshot}</p>
                              {i.size_snapshot && <p className="text-neutral-500 text-xs">Size: {i.size_snapshot}</p>}
                              {i.code_snapshot && <p className="text-neutral-500 text-xs">ID: {i.code_snapshot}</p>}
                              <p className="text-neutral-600 text-xs mt-0.5">₹{i.price_at_purchase}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Collapsible Address */}
                    <button
                      onClick={() => toggleAddressExpanded(o.id)}
                      className="mt-2 w-full flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="text-xs flex-1 text-left">Address</span>
                      <svg className={`h-4 w-4 shrink-0 transition-transform ${addressExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </button>

                    {addressExpanded && !o.cancelled_at && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <p className="font-semibold mb-1">Delivery Address</p>
                        <p>{o.fulfillment === "pickup" ? "Store Pickup" : o.address}</p>
                      </div>
                    )}
                  </>
                )}

                <div className={`flex flex-wrap gap-1 ${viewMode === "compact" ? "mt-1" : "mt-2.5 gap-1.5"}`}>
                  {viewMode === "compact" && (
                    <span className="text-[10px] font-mono text-neutral-400">#{o.id.slice(0, 6).toUpperCase()}</span>
                  )}
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

                {viewMode !== "compact" && (
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

                  {/* Cancel order: ask Move Back to Store or Not Available */}
                  {!o.cancelled_at && (
                    cancelPickerFor === o.id ? (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                        <p className="mb-2 text-center text-xs font-semibold text-amber-700">
                          What about the items?
                        </p>
                        <div className="flex gap-2">
                          <button
                            disabled={busy === o.id}
                            onClick={() => {
                              update(o.id, { action: "cancel" }).then(() => restockOrder(o.id));
                              setCancelPickerFor(null);
                            }}
                            className="flex-1 cursor-pointer rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Move Back to Store
                          </button>
                          <button
                            disabled={busy === o.id}
                            onClick={() => {
                              update(o.id, { action: "cancel" });
                              setCancelPickerFor(null);
                            }}
                            className="flex-1 cursor-pointer rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Not Available
                          </button>
                        </div>
                        <button
                          onClick={() => setCancelPickerFor(null)}
                          className="mt-2 w-full text-center text-xs text-neutral-500 hover:text-neutral-700"
                        >
                          Back
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelPickerFor(o.id)}
                        disabled={busy === o.id}
                        className="w-full cursor-pointer rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Cancel order
                      </button>
                    )
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-12">
        <Footer />
      </div>

      {/* Image Viewer Modal */}
      {viewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setViewImageUrl(null)}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewImageUrl(null);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            title="Close (ESC)"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image container */}
          <div
            className="max-w-2xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewImageUrl}
              alt="Product"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>

          {/* Hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-white/60 text-sm">
            Click to close or press ESC
          </div>
        </div>
      )}
    </div>
  );
}
