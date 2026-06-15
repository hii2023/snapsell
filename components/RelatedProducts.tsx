"use client";

import { useState } from "react";
import Link from "next/link";
import { rupees, categoryLabel } from "@/lib/constants";
import type { Product, CartLine } from "@/lib/types";
import { BagIcon } from "./icons";

export default function RelatedProducts({
  products,
  category,
}: {
  products: Product[];
  category: string;
}) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  if (!products.length) return null;

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    setAddingId(product.id);

    // Add to cart (same logic as ShopClient)
    const cart: CartLine[] = JSON.parse(
      localStorage.getItem("cart") || "[]"
    );
    const existing = cart.find((l) => l.product_id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.giveaway ? 0 : product.price,
        qty: 1,
        size: product.size || "",
        category: product.category,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));

    setAddedId(product.id);
    setTimeout(() => {
      setAddingId(null);
      setAddedId(null);
    }, 1500);
  };

  return (
    <section className="mt-12 border-t border-neutral-200 pt-8">
      <h2 className="mb-4 text-lg font-semibold text-ink">
        More from {categoryLabel(category)}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {products.map((r) => (
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

            {/* Add to cart button */}
            <button
              onClick={(e) => handleAddToCart(e, r)}
              disabled={addingId === r.id || r.stock <= 0}
              className={`mx-2 mb-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                addedId === r.id
                  ? "bg-emerald-600 text-white"
                  : r.stock <= 0
                    ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    : "bg-brand text-white hover:opacity-90"
              }`}
            >
              {addedId === r.id ? (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Added
                </>
              ) : r.stock <= 0 ? (
                "Sold out"
              ) : addingId === r.id ? (
                "Adding..."
              ) : (
                <>
                  <BagIcon className="h-4 w-4" />
                  Add
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
