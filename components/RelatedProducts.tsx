"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rupees, categoryLabel } from "@/lib/constants";
import type { Product, CartLine, Category } from "@/lib/types";
import { BagIcon } from "./icons";

const CART_KEY = "ir_cart";

export default function RelatedProducts({
  products,
  category,
}: {
  products: Product[];
  category: Category;
}) {
  // Mirror the shop cart (localStorage "ir_cart") so each related product can
  // show its current quantity and a +/- stepper instead of a transient "Added".
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    function load() {
      try {
        setCart(JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
      } catch {
        setCart([]);
      }
    }
    load();
    window.addEventListener("ir-cart-updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("ir-cart-updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  if (!products.length) return null;

  function persist(next: CartLine[]) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setCart(next);
    // Tell ShopClient (cart bar) to re-read the shared cart.
    window.dispatchEvent(new Event("ir-cart-updated"));
  }

  function addOne(e: React.MouseEvent, p: Product) {
    e.preventDefault();
    e.stopPropagation();
    const next = cart.map((l) => ({ ...l }));
    const line = next.find((l) => l.product_id === p.id);
    if (line) {
      if (line.qty >= p.stock) return; // respect available stock
      line.qty += 1;
    } else {
      next.push({
        product_id: p.id,
        name: p.name,
        price: p.giveaway ? 0 : p.price,
        qty: 1,
        size: p.size || "",
        image_url: p.image_url || "",
        stock: p.stock,
        code: p.code,
      });
    }
    persist(next);
  }

  function setQty(id: string, qty: number, stock: number) {
    const clamped = Math.max(0, Math.min(qty, stock));
    const next = cart
      .map((l) => (l.product_id === id ? { ...l, qty: clamped } : l))
      .filter((l) => l.qty > 0);
    persist(next);
  }

  return (
    <section className="mt-12 border-t border-neutral-200 pt-8">
      <h2 className="mb-4 text-lg font-semibold text-ink">
        More from {categoryLabel(category)}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {products.map((r) => {
          const line = cart.find((l) => l.product_id === r.id);
          return (
            <div
              key={r.id}
              className="card overflow-hidden transition-shadow hover:shadow-md"
            >
              <Link href={`/p/${r.code}`} className="block">
                <div className="relative aspect-[4/5] bg-neutral-100">
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt={r.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {r.code && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-white/85 px-1 py-0.5 font-mono text-[9px] font-medium text-neutral-600 backdrop-blur-sm">
                      {r.code}
                    </span>
                  )}
                </div>
                <div className="p-2 sm:p-2.5">
                  <p className="line-clamp-1 text-[13px] font-medium leading-tight">
                    {r.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {r.giveaway ? "Free" : rupees(r.price)}
                  </p>
                </div>
              </Link>

              {/* Cart control: stepper when in cart, Add otherwise */}
              {r.stock <= 0 ? (
                <button
                  disabled
                  className="mx-2 mb-2 flex w-[calc(100%-1rem)] items-center justify-center rounded-lg bg-neutral-100 py-2 text-xs font-semibold text-neutral-400"
                >
                  Sold out
                </button>
              ) : line ? (
                <div className="mx-2 mb-2 flex items-center justify-between gap-1 rounded-lg border border-neutral-300 px-1 py-1">
                  <button
                    onClick={() => setQty(r.id, line.qty - 1, r.stock)}
                    aria-label="Decrease quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-neutral-100 active:scale-95"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold tabular-nums">
                    {line.qty} in cart
                  </span>
                  <button
                    onClick={() => setQty(r.id, line.qty + 1, r.stock)}
                    disabled={line.qty >= r.stock}
                    aria-label="Increase quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-neutral-100 active:scale-95 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => addOne(e, r)}
                  className="mx-2 mb-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-xs font-semibold text-white transition-colors hover:opacity-90"
                >
                  <BagIcon className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
