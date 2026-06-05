"use client";

import { useState } from "react";
import { rupees } from "@/lib/constants";
import type { Order, Product } from "@/lib/types";

type Tab = "orders" | "stock";

export default function OrdersClient({
  initialOrders,
  initialProducts,
}: {
  initialOrders: Order[];
  initialProducts: Product[];
}) {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-5 flex gap-2">
        <button
          className={`chip flex-1 ${tab === "orders" ? "chip-on" : "chip-off"}`}
          onClick={() => setTab("orders")}
        >
          Orders ({orders.length})
        </button>
        <button
          className={`chip flex-1 ${tab === "stock" ? "chip-on" : "chip-off"}`}
          onClick={() => setTab("stock")}
        >
          Stock ({products.length})
        </button>
      </div>

      {tab === "orders" ? (
        <OrdersList orders={orders} setOrders={setOrders} />
      ) : (
        <StockList products={products} setProducts={setProducts} />
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "gray" | "red"; children: React.ReactNode }) {
  const map = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    gray: "bg-neutral-100 text-neutral-600",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function OrdersList({
  orders,
  setOrders,
}: {
  orders: Order[];
  setOrders: (o: Order[]) => void;
}) {
  const [busy, setBusy] = useState<string>("");

  function patch(updated: Order) {
    setOrders(orders.map((o) => (o.id === updated.id ? updated : o)));
  }

  async function updateOrder(id: string, body: Record<string, unknown>) {
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
        const order = orders.find((o) => o.id === id);
        if (order) patch({ ...order, delivery_status: "booked" });
        if (json.link) window.open(json.link, "_blank");
      } else {
        alert(json.error || "Could not book");
      }
    } finally {
      setBusy("");
    }
  }

  if (orders.length === 0) {
    return <p className="py-16 text-center text-neutral-500">No orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{o.customer_name}</p>
              <p className="text-sm text-neutral-500">{o.phone}</p>
            </div>
            <p className="text-lg font-semibold">{rupees(o.total)}</p>
          </div>

          <p className="mt-2 text-sm text-neutral-600">{o.address}</p>

          <ul className="mt-2 text-sm text-neutral-700">
            {(o.order_items || []).map((i) => (
              <li key={i.id}>
                {i.qty} x {i.name_snapshot}
                {i.size_snapshot ? ` (${i.size_snapshot})` : ""}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            {o.payment_mode === "online" ? (
              <Badge tone={o.payment_status === "paid" ? "green" : "amber"}>
                {o.payment_status === "paid" ? "Paid online" : "Online pending"}
              </Badge>
            ) : (
              <Badge tone={o.payment_status === "paid" ? "green" : "amber"}>
                {o.payment_status === "paid" ? "COD collected" : "COD pending"}
              </Badge>
            )}
            <Badge tone={o.delivery_status === "delivered" ? "green" : "gray"}>
              {o.delivery_status.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {o.delivery_status === "unbooked" ? (
              <button
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                disabled={busy === o.id}
                onClick={() => bookDelivery(o.id)}
              >
                Book delivery
              </button>
            ) : o.delivery_status !== "delivered" ? (
              <button
                className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
                disabled={busy === o.id}
                onClick={() => updateOrder(o.id, { delivery_status: "delivered" })}
              >
                Mark delivered
              </button>
            ) : null}

            {o.payment_mode === "cod" && o.payment_status !== "paid" ? (
              <button
                className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
                disabled={busy === o.id}
                onClick={() => updateOrder(o.id, { payment_status: "paid" })}
              >
                Cash collected
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function StockList({
  products,
  setProducts,
}: {
  products: Product[];
  setProducts: (p: Product[]) => void;
}) {
  const [busy, setBusy] = useState<string>("");

  async function addStock(p: Product, delta: number) {
    setBusy(p.id);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, stock: Math.max(0, p.stock + delta) }),
      });
      const json = await res.json();
      if (res.ok) {
        setProducts(products.map((x) => (x.id === p.id ? json.product : x)));
      }
    } finally {
      setBusy("");
    }
  }

  if (products.length === 0) {
    return <p className="py-16 text-center text-neutral-500">No products yet.</p>;
  }

  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id} className="card flex items-center gap-3 p-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{p.name}</p>
            <p className="text-sm text-neutral-500">
              {p.size ? p.size + " · " : ""}
              {rupees(p.price)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`min-w-10 text-center font-semibold tabular-nums ${
                p.stock === 0 ? "text-red-600" : ""
              }`}
            >
              {p.stock}
            </span>
            <button
              className="h-9 w-9 rounded-full border border-neutral-300 text-xl disabled:opacity-40"
              disabled={busy === p.id || p.stock === 0}
              onClick={() => addStock(p, -1)}
            >
              -
            </button>
            <button
              className="h-9 w-9 rounded-full border border-neutral-300 text-xl disabled:opacity-40"
              disabled={busy === p.id}
              onClick={() => addStock(p, 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
