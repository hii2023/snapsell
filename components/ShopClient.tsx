"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase";
import { T } from "@/lib/db";
import { useBackClose } from "@/lib/use-back";
import { rupees, CATEGORY_META, PICKUP_ADDRESS, SIZE_OPTIONS, GENDERS } from "@/lib/constants";
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

// Where the shopper's active filters are remembered for the length of the
// browsing session, so opening a product and pressing Back returns to the same
// category instead of resetting to "All". sessionStorage (not localStorage) so
// a brand-new visit still starts fresh.
const FILTERS_KEY = "ir_shop_filters";

export default function ShopClient({
  products: initialProducts,
  shopName,
  cfg,
  subcats,
  detail,
}: {
  products: Product[];
  shopName: string;
  cfg?: ShopCfg;
  subcats?: Record<string, string[]>;
  /** Detail mode: hides the product grid/filters and shows a full-width Add to cart button */
  detail?: boolean;
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
  const validCat = (v: unknown): v is Category | "all" | "giveaway" =>
    v === "all" || v === "giveaway" || CATEGORY_META.some((c) => c.id === v);
  const [catFilter, setCatFilter] = useState<Category | "all" | "giveaway">("all");
  const [subcatFilter, setSubcatFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(18);
  const [hydrated, setHydrated] = useState(false);

  // True once the current checkout has placed an order (payment screen shown),
  // so leaving via the phone Back button also clears the booked cart.
  const [bookedInCheckout, setBookedInCheckout] = useState(false);
  useEffect(() => {
    if (step === "shop") setBookedInCheckout(false);
  }, [step]);

  // Phone / browser Back closes the checkout and confirmation screens instead
  // of leaving the store.
  useBackClose(step !== "shop", () => {
    if (step === "done" || bookedInCheckout) setCart([]);
    setStep("shop");
  });

  // Reset subcategory / size / pagination when the category changes — but skip
  // the first run so filters restored from sessionStorage (on Back from a
  // product) are kept instead of being cleared on mount.
  const firstCatRun = useRef(true);
  useEffect(() => {
    if (firstCatRun.current) {
      firstCatRun.current = false;
      return;
    }
    setSubcatFilter("all");
    setGenderFilter("all");
    setSizeFilter("all");
    setPageSize(18);
  }, [catFilter]);

  // Picking a gender narrows the size options, so reset the size choice when the
  // gender changes (skip the first run so a restored size isn't wiped on mount).
  const firstGenderRun = useRef(true);
  useEffect(() => {
    if (firstGenderRun.current) {
      firstGenderRun.current = false;
      return;
    }
    setSizeFilter("all");
  }, [genderFilter]);

  // Restore the filters the shopper last had (this browsing session) so opening
  // a product and pressing Back returns to the same category. Runs once on
  // mount; reads storage before the save effect below can overwrite it.
  const restored = useRef(false);
  useEffect(() => {
    if (detail || restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (!raw) return;
      const f = JSON.parse(raw) as {
        cat?: unknown;
        sub?: unknown;
        gender?: unknown;
        size?: unknown;
      };
      if (!validCat(f.cat) || f.cat === "all") return;
      // Keep the just-restored sub/gender/size from being wiped by the
      // category-reset effect above (which fires because we change the category
      // here) and the gender-reset effect (which fires when gender changes).
      firstCatRun.current = true;
      firstGenderRun.current = true;
      setCatFilter(f.cat);
      if (typeof f.sub === "string") setSubcatFilter(f.sub);
      if (typeof f.gender === "string") setGenderFilter(f.gender);
      if (typeof f.size === "string") setSizeFilter(f.size);
    } catch {
      // ignore malformed storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  // Remember the active filters for the rest of the session.
  useEffect(() => {
    if (detail || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({
          cat: catFilter,
          sub: subcatFilter,
          gender: genderFilter,
          size: sizeFilter,
        })
      );
    } catch {
      // ignore (private mode / quota)
    }
  }, [detail, catFilter, subcatFilter, genderFilter, sizeFilter]);

  // Skip on-mount fetch — server already provided fresh data with force-dynamic
  // Redundant client fetch was burning egress quota unnecessarily

  // Silently auto-retry in the background while the list is empty so the
  // moment a product is added it appears without the customer doing anything.
  // Increased interval to 15s to reduce egress quota burn. Must live above any conditional return (Rules of Hooks).
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
    }, 15000);
    return () => clearInterval(interval);
  }, [products.length]);

  // Infinite scroll — reveal more products as the shopper nears the bottom.
  // A generous rootMargin loads the next batch well before the loader is
  // actually on screen, so new rows are already in place by the time they
  // scroll to them — no visible stop-and-wait, which feels much smoother.
  // A callback ref re-attaches the observer whenever the loader mounts again
  // (e.g. after switching categories), so infinite scroll never goes stale.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRefCb = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPageSize((n) => n + 18);
      },
      { rootMargin: "800px 0px", threshold: 0 }
    );
    observerRef.current.observe(node);
  }, []);

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

  // Pick up cart changes made elsewhere — RelatedProducts on the product page
  // (via the "ir-cart-updated" event) and other tabs (via "storage") — so the
  // cart bar and quantities stay in sync.
  useEffect(() => {
    function reload() {
      try {
        const raw = localStorage.getItem("ir_cart");
        setCart(raw ? JSON.parse(raw) : []);
      } catch {
        // ignore
      }
    }
    window.addEventListener("ir-cart-updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("ir-cart-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // Only show categories that actually have items in stock, so shoppers never
  // tap into an empty section. (The whole bar hides when only one category has
  // stock, e.g. a clothing-only store — gender/size filters cover that case.)
  const categoriesPresent = CATEGORY_META.filter((c) =>
    products.some((p) => p.category === c.id)
  );
  const hasGiveaway = products.some((p) => p.giveaway);

  // Sub-categories available for the currently selected category
  const subcatList: string[] =
    catFilter === "all" || catFilter === "giveaway"
      ? []
      : (subcats?.[catFilter] || []).filter((sc) =>
          products.some((p) => p.category === catFilter && p.subcategory === sc)
        );

  // Gender + size filters apply when browsing clothing: either the Clothing
  // category is selected, or the whole store is clothing-only (so "All" is
  // effectively the clothing view). Gender comes first, size narrows under it.
  const onlyClothing =
    products.length > 0 && products.every((p) => p.category === "apparel");
  const showClothingFilters =
    catFilter === "apparel" || (catFilter === "all" && onlyClothing);
  const clothingScope = products.filter((p) => p.category === "apparel");

  // Genders actually in stock (Women / Men / Unisex / Kids).
  const genderList: string[] = showClothingFilters
    ? GENDERS.filter((g) => clothingScope.some((p) => p.gender === g))
    : [];

  // Sizes in stock for the chosen gender (or all clothing when gender = all).
  const sizeList: string[] = showClothingFilters
    ? SIZE_OPTIONS.apparel.filter((sz) =>
        clothingScope.some(
          (p) =>
            p.size === sz &&
            (genderFilter === "all" || p.gender === genderFilter)
        )
      )
    : [];

  // Compact, equal-width chip for the Gender/Size rows: chips share the row
  // via flex-1 so every option fits on one line (no horizontal scroll on
  // mobile), then grow to a comfortable size on larger screens.
  const segChip = (active: boolean) =>
    `min-w-0 flex-1 rounded-full border px-1.5 py-1.5 text-center text-xs font-medium transition-colors active:scale-95 sm:px-4 sm:py-2 sm:text-sm ${
      active ? "chip-on" : "chip-off"
    }`;

  const fullyFiltered = (() => {
    let list: Product[];
    if (catFilter === "all") list = products;
    else if (catFilter === "giveaway") list = products.filter((p) => p.giveaway);
    else
      list = products.filter(
        (p) =>
          p.category === catFilter &&
          (subcatFilter === "all" || p.subcategory === subcatFilter)
      );
    if (showClothingFilters) {
      if (genderFilter !== "all")
        list = list.filter((p) => p.gender === genderFilter);
      if (sizeFilter !== "all") list = list.filter((p) => p.size === sizeFilter);
    }
    return list;
  })();

  const visible = fullyFiltered.slice(0, pageSize);
  const hasMore = fullyFiltered.length > visible.length;

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
          code: p.code,
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
    const doneView = (
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
    // Take over the whole screen so the confirmation feels like a separate page.
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-white">{doneView}</div>;
  }

  if (step === "checkout") {
    const checkoutView = (
      <Checkout
        cart={cart}
        total={total}
        shopName={shopName}
        cfg={c}
        onBack={() => setStep("shop")}
        onDone={() => setStep("done")}
        onBooked={() => setBookedInCheckout(true)}
        onRemove={(id) => setQty(id, 0)}
        onClear={() => {
          setCart([]);
          setStep("shop");
        }}
      />
    );
    // Take over the whole screen so checkout feels like a separate page — this
    // also covers the store's top announcement bar and tagline strip.
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-white">{checkoutView}</div>;
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

  // ── Detail mode: single product page — show big Add to cart button only ──
  if (detail) {
    const p = products[0] ?? initialProducts[0];
    const line = p ? cart.find((l) => l.product_id === p.id) : null;
    return (
      <div>
        {p && (
          line ? (
            <div className="flex items-center gap-4">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neutral-300 text-2xl font-light hover:bg-neutral-50 active:scale-95"
                onClick={() => setQty(p.id, line.qty - 1)}
              >
                −
              </button>
              <span className="text-xl font-semibold tabular-nums">{line.qty} in cart</span>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neutral-300 text-2xl font-light hover:bg-neutral-50 active:scale-95 disabled:opacity-40"
                disabled={line.qty >= p.stock}
                onClick={() => setQty(p.id, line.qty + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <button
              className="btn-primary w-full py-4 text-lg"
              onClick={() => add(p)}
            >
              {p.giveaway ? "Claim for free" : `Add to cart · ${rupees(p.price)}`}
            </button>
          )
        )}
        {count > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-500">{count} item(s)</p>
                <p className="text-lg font-semibold">{rupees(total)}</p>
              </div>
              <button onClick={() => setCart([])} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm text-neutral-600">
                Clear
              </button>
              <button className="btn-primary flex-1 py-3" onClick={() => setStep("checkout")}>
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      {(categoriesPresent.length > 1 || hasGiveaway) && (
        <div className="mb-3 -mx-4 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
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

      {/* Sub-category chips */}
      {subcatList.length > 0 && (
        <div className="mb-3 -mx-4 flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
          <button
            onClick={() => setSubcatFilter("all")}
            className={`chip shrink-0 text-xs ${subcatFilter === "all" ? "chip-on" : "chip-off"}`}
          >
            All
          </button>
          {subcatList.map((sc) => (
            <button
              key={sc}
              onClick={() => setSubcatFilter(sc)}
              className={`chip shrink-0 text-xs ${subcatFilter === sc ? "chip-on" : "chip-off"}`}
            >
              {sc}
            </button>
          ))}
        </div>
      )}

      {/* Clothing filters — Gender first, Size beneath, grouped in one card so
          they read as a clear, deliberate filter panel. */}
      {(genderList.length > 0 || sizeList.length > 0) && (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm sm:p-4">
          {genderList.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:w-14 sm:text-[11px]">
                Gender
              </span>
              <div className="flex flex-1 gap-1.5 sm:gap-2">
                <button onClick={() => setGenderFilter("all")} className={segChip(genderFilter === "all")}>
                  All
                </button>
                {genderList.map((g) => (
                  <button key={g} onClick={() => setGenderFilter(g)} className={segChip(genderFilter === g)}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {genderList.length > 0 && sizeList.length > 0 && (
            <div className="my-2.5 border-t border-neutral-100 sm:my-3" />
          )}

          {sizeList.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:w-14 sm:text-[11px]">
                Size
              </span>
              <div className="flex flex-1 gap-1.5 sm:gap-2">
                <button onClick={() => setSizeFilter("all")} className={segChip(sizeFilter === "all")}>
                  All
                </button>
                {sizeList.map((sz) => (
                  <button key={sz} onClick={() => setSizeFilter(sz)} className={segChip(sizeFilter === sz)}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Separator between the category filters and the products */}
      <div className="mb-4 mt-1 border-t border-neutral-200" />

      {visible.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-base font-medium text-neutral-700">Nothing here yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            No items match this filter right now. New finds are added often, so check back soon.
          </p>
          <button
            className="mt-5 chip chip-off"
            onClick={() => {
              setCatFilter("all");
              setGenderFilter("all");
              setSizeFilter("all");
            }}
          >
            Browse all items
          </button>
        </div>
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
            <div key={p.id} className="card card-in overflow-hidden">
              <Wrap className="block">
                <div className="relative aspect-[4/5] bg-neutral-100">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
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
                  {[p.gender, p.size, p.color].filter(Boolean).join(" · ") || " "}
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

      {/* Infinite scroll loader — triggers when scrolled into view */}
      {hasMore && <div ref={loaderRefCb} className="mt-6 h-px" />}

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
  onBooked,
  onRemove,
  onClear,
}: {
  cart: CartLine[];
  total: number;
  shopName: string;
  cfg: ShopCfg;
  onBack: () => void;
  onDone: () => void;
  onBooked: () => void;
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
      onBooked();
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
        <button
          onClick={onBack}
          aria-label="Back to store"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button onClick={onClear} className="text-sm text-neutral-500 underline">
          Clear cart
        </button>
      </div>
      <h2 className="mt-3 text-2xl font-semibold">Book your items</h2>

      <div className="mt-4 card divide-y divide-neutral-100">
        {cart.map((l) => (
          <div key={l.product_id} className="flex items-center gap-3 p-3 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {l.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image_url} alt={l.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <span className="flex-1">
              {l.qty} x {l.name} {l.size ? `(${l.size})` : ""}
            </span>
            <span className="font-medium">{rupees(l.price * l.qty)}</span>
            <button
              onClick={() => onRemove(l.product_id)}
              aria-label="Remove"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
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

  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    if (!cfg.upiId) return;
    const upiLink = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.upiName || "Thrift Shoppers")}&am=${amount}&cu=INR&tn=${encodeURIComponent(ref)}`;
    QRCode.toDataURL(upiLink, { width: 260, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [cfg.upiId, cfg.upiName, amount, ref]);

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
        <p className="mb-3 text-sm font-semibold text-neutral-500">Order summary</p>
        <div className="space-y-3">
          {cart.map((l) => (
            <Link
              key={l.product_id}
              href={l.code ? `/p/${l.code}` : "#"}
              className="flex gap-3 pb-3 border-b border-neutral-100 last:border-0 last:pb-0 hover:opacity-75 transition-opacity cursor-pointer"
            >
              {/* Product image */}
              {l.image_url && (
                <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-neutral-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.image_url} alt={l.name} className="h-full w-full object-cover" />
                </div>
              )}
              {/* Product details */}
              <div className="flex-1">
                <p className="text-sm font-medium text-brand underline">{l.qty}x {l.name}{l.size ? ` (${l.size})` : ""}</p>
                {l.code && <p className="text-xs text-neutral-500 mt-0.5">ID: {l.code}</p>}
                <p className="mt-1 text-sm font-semibold text-ink">₹{l.price * l.qty}</p>
              </div>
            </Link>
          ))}
        </div>
        {amount > 0 && (
          <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-sm font-semibold">
            <span>Total</span><span>₹{amount}</span>
          </div>
        )}
      </div>

      {/* Payment section */}
      {amount > 0 ? (
        <>
          {/* QR code */}
          {cfg.upiId && qrDataUrl && (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Scan to Pay ₹{amount}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="UPI QR" className="mx-auto mt-2 h-48 w-48" />
              <p className="text-[11px] text-neutral-400">Works with any UPI app</p>
            </div>
          )}

          {/* Copy UPI ID card */}
          {cfg.upiId && (
            <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Or pay to UPI ID</p>
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

          {/* Steps with integrated WhatsApp link */}
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">Next steps</p>
            <ol className="space-y-2.5 text-sm text-neutral-700">
              {cfg.upiId && <li className="flex gap-3"><span className="font-semibold text-neutral-600 min-w-5">1.</span><span>Scan the QR or copy the UPI ID and pay <strong className="text-ink">₹{amount}</strong></span></li>}
              <li className="flex gap-3"><span className="font-semibold text-neutral-600 min-w-5">{cfg.upiId ? "2." : "1."}</span><span>Take a screenshot of your payment confirmation</span></li>
              <li className="flex gap-3"><span className="font-semibold text-neutral-600 min-w-5">{cfg.upiId ? "3." : "2."}</span><span>Send the screenshot on <a href={`https://wa.me/${cfg.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I have placed an order (ID: ${ref}) for ₹${amount}. I will send the payment screenshot shortly. Thank you!`)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 hover:text-green-800 underline">WhatsApp</a> with Order ID <strong>{ref}</strong></span></li>
            </ol>
          </div>

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
