"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
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
  products,
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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<Step>("shop");
  const [catFilter, setCatFilter] = useState<Category | "all" | "giveaway">("all");
  const [hydrated, setHydrated] = useState(false);

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => {
          const line = cart.find((l) => l.product_id === p.id);
          return (
            <div key={p.id} className="card overflow-hidden">
              <div className="aspect-square bg-neutral-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300">
                    <BagIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{p.name}</p>
                  {p.code ? (
                    <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      {p.code}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-neutral-500">
                  {[p.size, p.color].filter(Boolean).join(" · ")}
                  {(p.size || p.color) ? " · " : ""}
                  {p.giveaway ? (
                    <span className="font-semibold text-emerald-700">Give away · Free</span>
                  ) : (
                    <>
                      <span className="font-semibold text-ink">{rupees(p.price)}</span>
                      {p.mrp > p.price ? (
                        <span className="ml-1 text-neutral-400 line-through">{rupees(p.mrp)}</span>
                      ) : null}
                    </>
                  )}
                </p>
                {line ? (
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      className="h-9 w-9 rounded-full border border-neutral-300 text-xl"
                      onClick={() => setQty(p.id, line.qty - 1)}
                    >
                      -
                    </button>
                    <span className="font-semibold tabular-nums">{line.qty}</span>
                    <button
                      className="h-9 w-9 rounded-full border border-neutral-300 text-xl disabled:opacity-40"
                      disabled={line.qty >= p.stock}
                      onClick={() => setQty(p.id, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-primary mt-2 w-full py-2 text-sm"
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
    if (fulfillment === "pickup" && !pickupDate) return fail("Select a pickup date");
    if (fulfillment === "pickup" && !pickupTime) return fail("Select a pickup time");
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
              <label className="label">Pickup date</label>
              <input
                type="date"
                className="input"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Pickup time</label>
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
  const [qr, setQr] = useState("");

  const upi = cfg.upiId;
  const upiName = cfg.upiName || shopName;
  const wa = cfg.whatsapp;
  const upiUrl =
    upi && amount > 0
      ? `upi://pay?pa=${upi}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(ref)}`
      : "";
  // GPay-specific scheme (falls back to the generic upi: link on the QR / button).
  const gpayUrl = upiUrl ? upiUrl.replace("upi://pay", "tez://upi/pay") : "";

  useEffect(() => {
    if (!upiUrl) return;
    QRCode.toDataURL(upiUrl, { width: 240, margin: 1 }).then(setQr).catch(() => {});
  }, [upiUrl]);

  const items = cart.map((l) => `${l.qty} x ${l.name}${l.size ? ` (${l.size})` : ""}`).join(", ");
  const msg = `${shopName} booking ${ref}\nName: ${name} (${phone})\nItems: ${items}\nFulfilment: ${fulfillment}\nAmount: ${amount > 0 ? "₹" + amount : "Free"}\nI have paid by UPI. My payment reference: `;
  const waUrl = (wa ? `https://wa.me/${wa}` : "https://wa.me/") + `?text=${encodeURIComponent(msg)}`;

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
        <CheckIcon className="h-9 w-9" />
      </div>
      <h2 className="text-2xl font-semibold">Booking confirmed</h2>
      <p className="mt-1 text-neutral-600">
        Your booking ID is <span className="font-semibold text-ink">{ref}</span>
      </p>

      {amount > 0 ? (
        <div className="mt-6 card p-5">
          <p className="text-lg font-semibold">Pay {rupees(amount)} by UPI</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="UPI QR" className="mx-auto mt-3 h-56 w-56" />
          ) : upi ? (
            <p className="mt-3 text-sm text-neutral-500">Generating QR...</p>
          ) : (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Payment QR is being set up. Tap the WhatsApp button below and the team will
              share UPI details.
            </p>
          )}
          {upi ? <p className="mt-2 text-sm text-neutral-500">UPI: {upi}</p> : null}
          <p className="mt-3 text-sm text-neutral-600">
            Scan the QR, or on your phone tap below to open your UPI app with the amount
            filled in. After paying, send proof to the team.
          </p>
          {upiUrl && (
            <div className="mt-3 space-y-2">
              <a href={gpayUrl} className="flex w-full items-center justify-center rounded-2xl bg-brand py-3 text-base font-semibold text-white">
                Pay {rupees(amount)} in GPay
              </a>
              <a href={upiUrl} className="flex w-full items-center justify-center rounded-2xl border border-brand py-3 text-base font-semibold text-brand">
                Pay in other UPI app
              </a>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          This is a free item. {fulfillment === "pickup" ? "Collect it from the store." : "Arrange transport with the team."}
        </p>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-lg font-semibold text-white"
      >
        Send payment proof on WhatsApp
      </a>
      <button onClick={onDone} className="btn-ghost mt-3 w-full py-3">
        Done
      </button>
    </div>
  );
}
