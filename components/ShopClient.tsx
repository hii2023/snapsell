"use client";

import { useMemo, useState } from "react";
import { rupees } from "@/lib/constants";
import type { CartLine, Product } from "@/lib/types";

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
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl">
          ✓
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
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <div className="grid grid-cols-2 gap-4">
        {products.map((p) => {
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
                  <div className="flex h-full items-center justify-center text-4xl">
                    🛍️
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-sm text-neutral-500">
                  {p.size ? p.size + " · " : ""}
                  {rupees(p.price)}
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
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
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
  const [mode, setMode] = useState<"online" | "cod">("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = cart.map((l) => ({ product_id: l.product_id, qty: l.qty }));

  function validate(): boolean {
    if (!name.trim()) return fail("Enter your name");
    if (phone.trim().length < 8) return fail("Enter a valid phone number");
    if (!address.trim()) return fail("Enter a delivery address");
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
      body: JSON.stringify({ name, phone, address, items }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not place order");
  }

  async function placeOnline() {
    const orderRes = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
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
      if (mode === "cod") await placeCod();
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
          <label className="label">Delivery address</label>
          <textarea
            className="input min-h-24"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Payment</label>
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip flex-1 ${mode === "cod" ? "chip-on" : "chip-off"}`}
              onClick={() => setMode("cod")}
            >
              Cash on delivery
            </button>
            <button
              type="button"
              className={`chip flex-1 ${mode === "online" ? "chip-on" : "chip-off"}`}
              onClick={() => setMode("online")}
            >
              Pay online
            </button>
          </div>
        </div>
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
