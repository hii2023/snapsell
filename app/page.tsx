import type { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase";
import LogoLink from "@/components/LogoLink";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";
import StoreContact from "@/components/StoreContact";

// Never cache this page — always fetch live products from Supabase
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const metadata: Metadata = { title: "Thrift Shoppers" };

const shopName = "Thrift Shoppers";

export default async function ShopPage() {
  noStore();
  // Force browsers and CDN to never cache this page
  const h = await headers();
  void h; // accessed to mark dynamic; Next.js sees headers() and forces no-cache
  let products: Product[] = [];

  let cfg = {
    upiId: process.env.NEXT_PUBLIC_UPI_ID || "",
    upiName: process.env.NEXT_PUBLIC_UPI_NAME || shopName,
    whatsapp: process.env.NEXT_PUBLIC_SELLER_WHATSAPP || "",
    pickupAddress: "",
    deliveryFee: 100,
    freeAbove: 1000,
  };

  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    const [{ data }, { data: row }] = await Promise.all([
      supabase
        .from(T.products)
        .select("*")
        .gt("stock", 0)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase.from(T.settings).select("*").eq("id", 1).single(),
    ]);
    products = (data as Product[]) || [];
    if (row) {
      cfg = {
        upiId: row.upi_id || cfg.upiId,
        upiName: row.upi_name || cfg.upiName,
        whatsapp: row.whatsapp_number || cfg.whatsapp,
        pickupAddress: row.pickup_address || "",
        deliveryFee: row.delivery_fee_amount ?? 100,
        freeAbove: row.delivery_free_above ?? 1000,
      };
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4">
          <LogoLink />
        </div>
      </header>

      {/* Hero banner */}
      <section className="border-b border-neutral-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center sm:py-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm">
            Thrift Shoppers <span className="font-normal text-neutral-500">by</span> India Recycles
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Thrift. <span className="text-emerald-700">Discover.</span> Repeat.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Browse handpicked thrift treasures and FMCG deals. Save money, reduce waste, and discover new
            treasures everyday. Book online, pick up or get it delivered.
          </p>
          <p className="mx-auto mt-5 max-w-xl rounded-full bg-white/70 px-5 py-2 text-xs font-medium italic text-emerald-800 ring-1 ring-emerald-200 sm:text-sm">
            If you love it, book it. If you wait, someone else might.
          </p>
        </div>
      </section>

      {/* Always render ShopClient — it does its own live client-side fetch on mount.
          Empty-state is handled inside the client so it can refresh without a reload. */}
      <ShopClient products={products} shopName={shopName} cfg={cfg} />
      {!supabaseConfigured() && (
        <p className="mt-6 text-center text-sm text-neutral-400">Connect Supabase to start listing.</p>
      )}
      <StoreContact />

      {/* Footer */}
      <footer className="mt-16 border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Now delivering in Ahmedabad
          </p>

          <p className="mt-5 text-sm text-neutral-600">For any queries, call us at</p>
          <a
            href="tel:+917202035700"
            className="mt-1 inline-block text-xl font-bold tracking-wide text-ink hover:text-emerald-700"
          >
            72020 35700
          </a>

          <div className="mt-7 flex items-center justify-center gap-3">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/indiarecycles"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            {/* indiarecycles.org */}
            <a
              href="https://indiarecycles.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
              </svg>
              indiarecycles.org
            </a>
          </div>

          <p className="mt-8 text-xs text-neutral-400">
            Thrift Shoppers, a project by India Recycle
          </p>
        </div>
      </footer>
    </main>
  );
}
