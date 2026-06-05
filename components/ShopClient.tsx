"use client";

import { useEffect, useMemo, useState } from "react";
import { rupees, CATEGORY_META } from "@/lib/constants";
import { BagIcon, CheckIcon } from "./icons";
import type { Category, CartLine, Product } from "@/lib/types";

type Step = "shop" | "checkout" | "done";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function ShopClient({
  products,
  razorpayKeyId,
  shopName,
}: {
  products: Product[];
  razorpayKeyId: string;
  shopName: string;
}) {
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
        razorpayKeyId={razorpayKeyId}
        shopName={shopName}
        onBack={() => setStep("shop")}
        onDone={() => setStep("done")}
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
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-500">{count} item(s)</p>
              <p className="text-lg font-semibold">{rupees(total)}</p>
            </div>
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
  razorpayKeyId,
  shopName,
  onBack,
  onDone,
}: {
  cart: CartLine[];
  total: number;
  razorpayKeyId: string;
  shopName: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  // Pay online is the primary option; default to it when Razorpay is configured.
  const [mode, setMode] = useState<"online" | "cod">(razorpayKeyId ? "online" : "cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = cart.map((l) => ({ product_id: l.product_id, qty: l.qty }));

  function validate(): boolean {
    if (!name.trim()) return fail("Enter your name");
    if (phone.trim().length < 8) return fail("Enter a valid phone number");
    if (fulfillment === "delivery" && !address.trim())
      return fail("Enter a delivery address");
    return true;
  }
  function fail(m: string) {
    setError(m);
    return false;
  }

  async function placeCod() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, fulfillment, items }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not place order");
  }

  async function placeOnline() {
    const orderRes = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, name, phone, address, fulfillment }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.error || "Payment setup failed");

    await loadRazorpay();
    if (!window.Razorpay) throw new Error("Payment library failed to load");

    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: razorpayKeyId,
        amount: order.amount,
        currency: "INR",
        name: shopName,
        order_id: order.razorpay_order_id,
        prefill: { name, contact: phone },
        theme: { color: "#0f766e" },
        handler: async (resp: Record<string, string>) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                name,
                phone,
                address,
                fulfillment,
                items,
              }),
            });
            const vj = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vj.error || "Verification failed");
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      rzp.open();
    });
  }

  async function submit() {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "cod" || total === 0) await placeCod();
      else await placeOnline();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-28">
      <button onClick={onBack} className="text-sm text-brand underline">
        Back
      </button>
      <h2 className="mt-3 text-2xl font-semibold">Checkout</h2>

      <div className="mt-4 card divide-y divide-neutral-100">
        {cart.map((l) => (
          <div key={l.product_id} className="flex justify-between p-3 text-sm">
            <span>
              {l.qty} x {l.name} {l.size ? `(${l.size})` : ""}
            </span>
            <span className="font-medium">{rupees(l.price * l.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between p-3 font-semibold">
          <span>Total</span>
          <span>{rupees(total)}</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="label">Your name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
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
          <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
            You will collect this order from the store. No address needed.
          </p>
        )}
        {total === 0 ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
            Free item. No payment needed. Please arrange transport / pickup yourself.
          </p>
        ) : (
          <div>
            <label className="label">Payment</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`chip flex-1 ${mode === "online" ? "chip-on" : "chip-off"}`}
                onClick={() => setMode("online")}
              >
                Pay online
              </button>
              <button
                type="button"
                className={`chip flex-1 ${mode === "cod" ? "chip-on" : "chip-off"}`}
                onClick={() => setMode("cod")}
              >
                {fulfillment === "pickup" ? "Cash on pickup" : "Cash on delivery"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            onClick={submit}
            disabled={loading}
            className="btn-primary w-full text-lg disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : total === 0
                ? "Place order (Free)"
                : mode === "cod"
                  ? `Place order · ${rupees(total)}`
                  : `Pay ${rupees(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment library"));
    document.body.appendChild(script);
  });
}
