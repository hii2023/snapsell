"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import { T } from "@/lib/db";
import { rupees, CATEGORY_META, PICKUP_ADDRESS } from "@/lib/constants";
import { BagIcon, CheckIcon } from "./icons";
import type { Category, CartLine, Product } from "@/lib/types";

type Step = "shop" | "checkout" | "done";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type ShopCfg = {
  upiId: string;
  upiName: string;
  whatsapp: string;
  pickupAddress: string;
  deliveryFee: number;
  freeAbove: number;
};

export default function ShopClient({
  products: initialProducts,
  shopName,
  cfg,
}: {
  products: Product[];
  shopName: string;
  cfg?: ShopCfg;
}) {
  const c: ShopCfg = cfg ?? {
    upiId: process.env.NEXT_PUBLIC_UPI_ID || "",
    upiName: process.env.NEXT_PUBLIC_UPI_NAME || shopName,
    whatsapp: process.env.NEXT_PUBLIC_SELLER_WHATSAPP || "",
    pickupAddress: "",
    deliveryFee: 100,
    freeAbove: 1000,
  };

  // Start with server-rendered data, then immediately refresh client-side.
  // This bypasses all Next.js / Vercel CDN caching — always shows live products.
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<Step>("shop");
  const [catFilter, setCatFilter] = useState<Category | "all" | "giveaway">("all");
  const [hydrated, setHydrated] = useState(false);

  // Live fetch on mount — guarantees fresh products regardless of server cache
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from(T.products)
      .select("*")
      .gt("stock", 0)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[shop] product fetch error:", error.message);
        if (data) setProducts(data as Product[]);
      });
  }, []);

  // Silently auto-retry in the background while the list is empty so the
  // moment a product is added it appears without the customer doing anything.
  // Must live above any conditional return (Rules of Hooks).
  useEffect(() => {
    if (products.length > 0) return;
    const interval = setInterval(() => {
      supabaseBrowser()
        .from(T.products)
        .select("*")
        .gt("stock", 0)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data && data.length > 0) setProducts(data as Product[]); });
    }, 5000);
    return () => clearInterval(interval);
  }, [products.length]);

  // Refresh products whenever the tab regains focus (covers offline → online,
  // app switching, returning from background) so it always shows live state.
  useEffect(() => {
    function refresh() {
      const sb = supabaseBrowser();
      sb.from(T.products)
        .select("*")
        .gt("stock", 0)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setProducts(data as Product[]); });
    }
    function onVis() { if (document.visibilityState === "visible") refresh(); }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Persist the cart so it survives page switches (shop <-> product pages).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ir_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("ir_cart", JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, hydrated]);

  const categoriesPresent = CATEGORY_META.filter((c) =>
    products.some((p) => p.category === c.id)
  );
  const hasGiveaway = products.some((p) => p.giveaway);
  const visible =
    catFilter === "all"
      ? products
      : catFilter === "giveaway"
        ? products.filter((p) => p.giveaway)
        : products.filter((p) => p.category === catFilter);

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.price * l.qty, 0),
    [cart]
  );
  const count = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  function add(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        if (existing.qty >= p.stock) return prev;
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          size: p.size,
          price: p.price,
          qty: 1,
          image_url: p.image_url,
          stock: p.stock,
        },
      ];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product_id === id
            ? { ...l, qty: Math.max(0, Math.min(qty, l.stock)) }
            : l
        )
        .filter((l) => l.qty > 0)
    );
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-semibold">Order placed</h2>
        <p className="mt-2 text-neutral-600">
          {shopName} has your order and will arrange delivery. Thank you.
        </p>
        <button
          className="btn-primary mt-8"
          onClick={() => {
            setCart([]);
            setStep("shop");
          }}
        >
          Back to shop
        </button>
      </div>
    );
  }

  if (step === "checkout") {
    return (
      <Checkout
        cart={cart}
        total={total}
        shopName={shopName}
        cfg={c}
        onBack={() => setStep("shop")}
        onDone={() => setStep("done")}
        onRemove={(id) => setQty(id, 0)}
        onClear={() => {
          setCart([]);
          setStep("shop");
        }}
      />
    );
  }

  // Empty / loading state — soft, branded, no asks of the customer.
  // (The auto-retry polling for empty lists lives in a useEffect at the top
  //  of this component, before any conditional returns — Rules of Hooks.)
  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
        <p className="text-lg font-medium text-neutral-700">Fresh arrivals on the way</p>
        <p className="mt-1 text-sm text-neutral-500">New thrift finds are added daily. Check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      {(categoriesPresent.length > 1 || hasGiveaway) && (
        <div className="mb-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            onClick={() => setCatFilter("all")}
            className={`chip shrink-0 ${catFilter === "all" ? "chip-on" : "chip-off"}`}
          >
            All
          </button>
          {hasGiveaway && (
            <button
              onClick={() => setCatFilter("giveaway")}
              className={`chip shrink-0 ${
                catFilter === "giveaway"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-emerald-300 bg-white text-emerald-700"
              }`}
            >
              Give away
            </button>
          )}
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
      )}

      {catFilter === "giveaway" && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
          These items are free. Transportation should be arranged by the buyer.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((p) => {
          const line = cart.find((l) => l.product_id === p.id);
          const hasDiscount = p.mrp > p.price && !p.giveaway;
          const discountPct = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
          const detailHref = p.code ? `/p/${p.code}` : null;
          const Wrap = ({ children, className = "" }: { children: React.ReactNode; className?: string }) =>
            detailHref ? (
              <Link href={detailHref} className={className}>{children}</Link>
            ) : (
              <div className={className}>{children}</div>
            );
          return (
            <div key={p.id} className="card overflow-hidden">
              <Wrap className="block">
                <div className="relative aspect-[4/5] bg-neutral-100">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-300">
                      <BagIcon className="h-8 w-8" />
                    </div>
                  )}
                  {p.giveaway && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      FREE
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      {discountPct}% OFF
                    </span>
                  )}
                  {p.code && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-white/85 px-1 py-0.5 font-mono text-[9px] font-medium text-neutral-600 backdrop-blur-sm">
                      {p.code}
                    </span>
                  )}
                </div>
              </Wrap>
              <div className="p-2 sm:p-2.5">
                <Wrap className="block hover:text-emerald-700">
                  <p className="line-clamp-1 text-[13px] font-medium leading-tight">{p.name}</p>
                </Wrap>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-500">
                  {[p.size, p.color].filter(Boolean).join(" · ") || " "}
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  {p.giveaway ? (
                    <span className="text-sm font-bold text-emerald-700">Free</span>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-ink">{rupees(p.price)}</span>
                      {hasDiscount && (
                        <span className="text-[11px] text-neutral-400 line-through">{rupees(p.mrp)}</span>
                      )}
                    </>
                  )}
                </div>
                {line ? (
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-base leading-none hover:bg-neutral-50 active:scale-95"
                      onClick={() => setQty(p.id, line.qty - 1)}
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold tabular-nums">{line.qty}</span>
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-base leading-none hover:bg-neutral-50 active:scale-95 disabled:opacity-40"
                      disabled={line.qty >= p.stock}
                      onClick={() => setQty(p.id, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-primary mt-2 w-full py-1.5 text-xs"
                    onClick={() => add(p)}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">{count} item(s)</p>
              <p className="text-lg font-semibold">{rupees(total)}</p>
            </div>
            <button
              onClick={() => setCart([])}
              className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm text-neutral-600"
            >
              Clear
            </button>
            <button className="btn-primary flex-1" onClick={() => setStep("checkout")}>
              Checkout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Checkout({
  cart,
  total,
  shopName,
  cfg,
  onBack,
  onDone,
  onRemove,
  onClear,
}: {
  cart: CartLine[];
  total: number;
  shopName: string;
  cfg: ShopCfg;
  onBack: () => void;
  onDone: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<{ id: string; amount: number } | null>(null);

  const items = cart.map((l) => ({ product_id: l.product_id, qty: l.qty }));
  const deliveryFee =
    fulfillment === "pickup" || total <= 0 ? 0 : total >= cfg.freeAbove ? 0 : cfg.deliveryFee;
  const grandTotal = total + deliveryFee;
  const pickupAddress = cfg.pickupAddress || PICKUP_ADDRESS;
  const directionsUrl =
    "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(pickupAddress);

  function validate(): boolean {
    if (!name.trim()) return fail("Enter your name");
    if (phone.trim().length < 8) return fail("Enter a valid phone number");
    if (fulfillment === "delivery" && !address.trim()) return fail("Enter a delivery address");
    return true;
  }
  function fail(m: string) {
    setError(m);
    return false;
  }

  async function submit() {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          fulfillment,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          payment_mode: "qr",
          items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not book");
      setBooked({ id: json.order_id, amount: grandTotal });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (booked) {
    return (
      <BookingConfirm
        bookingId={booked.id}
        amount={booked.amount}
        name={name}
        phone={phone}
        fulfillment={fulfillment}
        cart={cart}
        shopName={shopName}
        cfg={cfg}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-28">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-brand underline">
          Back
        </button>
        <button onClick={onClear} className="text-sm text-neutral-500 underline">
          Clear cart
        </button>
      </div>
      <h2 className="mt-3 text-2xl font-semibold">Book your items</h2>

      <div className="mt-4 card divide-y divide-neutral-100">
        {cart.map((l) => (
          <div key={l.product_id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <span className="flex-1">
              {l.qty} x {l.name} {l.size ? `(${l.size})` : ""}
            </span>
            <span className="font-medium">{rupees(l.price * l.qty)}</span>
            <button
              onClick={() => onRemove(l.product_id)}
              aria-label="Remove"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
            >
              ×
            </button>
          </div>
        ))}
        {deliveryFee > 0 && (
          <div className="flex justify-between p-3 text-sm">
            <span>Delivery (free over {rupees(cfg.freeAbove)})</span>
            <span className="font-medium">{rupees(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between p-3 font-semibold">
          <span>Total</span>
          <span>{rupees(grandTotal)}</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label">Your name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">How do you want it?</label>
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip flex-1 ${fulfillment === "delivery" ? "chip-on" : "chip-off"}`}
              onClick={() => setFulfillment("delivery")}
            >
              Delivery
            </button>
            <button
              type="button"
              className={`chip flex-1 ${fulfillment === "pickup" ? "chip-on" : "chip-off"}`}
              onClick={() => setFulfillment("pickup")}
            >
              Pickup
            </button>
          </div>
        </div>
        {fulfillment === "delivery" ? (
          <div>
            <label className="label">Delivery address</label>
            <textarea
              className="input min-h-24"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / shop, street, area, city, pincode"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Pickup date <span className="font-normal text-neutral-400">(optional)</span></label>
              <input
                type="date"
                className="input"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Pickup time <span className="font-normal text-neutral-400">(optional)</span></label>
              <input
                type="time"
                className="input"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
            <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
              <p className="font-medium text-ink">Collect from store:</p>
              <p className="mt-1 whitespace-pre-wrap">{pickupAddress}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pickupAddress);
                    alert("Address copied!");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 active:scale-[0.98]"
                >
                  📋 Copy
                </button>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand underline"
                >
                  Get directions
                </a>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Important:</p>
              <p className="mt-1">
                You must collect your item within 2 weeks of purchase. Items not collected within this period will be re-sold without any refund.
              </p>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button onClick={submit} disabled={loading} className="btn-primary w-full text-lg disabled:opacity-50">
            {loading
              ? "Booking..."
              : grandTotal === 0
                ? "Book (Free)"
                : `Book · pay ${rupees(grandTotal)} by QR`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingConfirm({
  bookingId,
  amount,
  name,
  phone,
  fulfillment,
  cart,
  shopName,
  cfg,
  onDone,
}: {
  bookingId: string;
  amount: number;
  name: string;
  phone: string;
  fulfillment: "delivery" | "pickup";
  cart: CartLine[];
  shopName: string;
  cfg: ShopCfg;
  onDone: () => void;
}) {
  const ref = "IR-" + bookingId.slice(0, 8).toUpperCase();
  const storeWa = cfg.whatsapp || "917202035700";
  const items = cart.map((l) => `${l.qty}x ${l.name}${l.size ? ` (${l.size})` : ""}`).join(", ");
  const waMsg = `Hi, I have made the payment for my order.\n\nOrder ID: ${ref}\nName: ${name}\nItems: ${items}\nAmount: ${amount > 0 ? "₹" + amount : "Free"}\n\nPlease find my payment screenshot attached.`;
  const waUrl = `https://wa.me/${storeWa}?text=${encodeURIComponent(waMsg)}`;

  const [copied, setCopied] = useState(false);
  async function copyUpi() {
    if (!cfg.upiId) return;
    try {
      await navigator.clipboard.writeText(cfg.upiId);
    } catch {
      // Older browsers — fall back to a hidden textarea
      const ta = document.createElement("textarea");
      ta.value = cfg.upiId;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      {/* Confirmation tick */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
        <CheckIcon className="h-9 w-9" />
      </div>
      <h2 className="text-2xl font-semibold">Order placed!</h2>
      <p className="mt-1 text-neutral-500">Your order has been received.</p>

      {/* Order ID */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm text-neutral-500">Your Order ID</p>
        <p className="mt-1 text-2xl font-bold tracking-wider text-ink">{ref}</p>
        <p className="mt-1 text-xs text-neutral-400">Save this for reference</p>
      </div>

      {/* Items summary */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left">
        <p className="mb-2 text-sm font-semibold text-neutral-500">Order summary</p>
        {cart.map((l) => (
          <div key={l.product_id} className="flex justify-between py-1 text-sm">
            <span className="text-neutral-700">{l.qty}x {l.name}{l.size ? ` (${l.size})` : ""}</span>
            <span className="font-medium">₹{l.price * l.qty}</span>
          </div>
        ))}
        {amount > 0 && (
          <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 text-sm font-semibold">
            <span>Total</span><span>₹{amount}</span>
          </div>
        )}
      </div>

      {/* Payment section */}
      {amount > 0 ? (
        <>
          {/* Copy UPI ID card */}
          {cfg.upiId && (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Pay to UPI ID</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="flex-1 truncate font-mono text-sm font-bold text-ink sm:text-base">{cfg.upiId}</p>
                <button
                  type="button"
                  onClick={copyUpi}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Amount payable: <strong className="text-ink">₹{amount}</strong>
              </p>
            </div>
          )}

          {/* Steps */}
          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left">
            <ol className="space-y-1.5 text-sm text-neutral-600">
              {cfg.upiId && <li>1. Copy the UPI ID above and pay <strong>₹{amount}</strong> from any UPI app</li>}
              <li>{cfg.upiId ? "2." : "1."} Take a screenshot of your payment confirmation</li>
              <li>{cfg.upiId ? "3." : "2."} Send the screenshot on WhatsApp with Order ID <strong>{ref}</strong></li>
            </ol>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-semibold text-white active:scale-[0.98] hover:bg-green-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send payment screenshot on WhatsApp
          </a>
        </>
      ) : (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {fulfillment === "pickup" ? "Come collect your item from the store." : "Our team will be in touch."}
        </p>
      )}

      <button onClick={onDone} className="btn-ghost mt-3 w-full py-3">
        Back to shop
      </button>
    </div>
  );
}
