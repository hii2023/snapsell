import type { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase";
import LogoLink from "@/components/LogoLink";
import { supabaseServer } from "@/lib/supabase-server";
import { currentSeller } from "@/lib/auth";
import { T } from "@/lib/db";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";
import StoreContact from "@/components/StoreContact";
import SellerBar from "@/components/SellerBar";

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
  const seller = await currentSeller();
  let products: Product[] = [];
  let subcats: Record<string, string[]> = {};

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
      if (row.subcats && typeof row.subcats === "object") {
        subcats = row.subcats as Record<string, string[]>;
      }
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Top announcement bar */}
      <div className="bg-ink text-white">
        <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-[11px] leading-relaxed sm:text-xs">
          Handpicked thrift treasures and FMCG deals.{" "}
          <span className="font-semibold text-emerald-300">Save money</span>,{" "}
          <span className="font-semibold text-emerald-300">reduce waste</span>,{" "}
          <span className="font-semibold text-emerald-300">discover daily</span>.{" "}
          <span className="font-semibold text-amber-300">Pick up or delivered.</span>
        </p>
      </div>

      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <LogoLink />
          <div className="min-w-0 flex-1">
            <p className="truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:text-[11px] sm:tracking-[0.18em]">
              Thrift Shoppers <span className="font-normal text-neutral-400">by</span> India Recycles
            </p>
            <h1 className="text-base font-bold tracking-tight text-ink sm:text-xl">
              Thrift. <span className="text-emerald-700">Discover.</span> Repeat.
            </h1>
          </div>
        </div>
      </header>

      {/* Slim tagline strip */}
      <div className="border-b border-emerald-100 bg-emerald-50">
        <p className="mx-auto max-w-4xl px-4 py-2 text-center text-xs font-medium italic text-emerald-800 sm:text-sm">
          If you love it, book it. If you wait, someone else might.
        </p>
      </div>

      {/* Always render ShopClient — it does its own live client-side fetch on mount.
          Empty-state is handled inside the client so it can refresh without a reload. */}
      <ShopClient products={products} shopName={shopName} cfg={cfg} subcats={subcats} />
      {!supabaseConfigured() && (
        <p className="mt-6 text-center text-sm text-neutral-400">Connect Supabase to start listing.</p>
      )}
      <StoreContact />
      {seller && <SellerBar subcats={subcats} />}

      {/* Footer */}
      <footer className="mt-10 border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          {/* Top row: contact + socials */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span className="font-semibold uppercase tracking-wider text-emerald-700">Delivering Pan India</span>
              <span className="text-neutral-300">·</span>
              <a href="tel:+917202035700" className="font-semibold text-ink hover:text-emerald-700">
                72020 35700
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/india.recycles"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white transition-transform hover:scale-105 active:scale-95"
                title="Follow on Instagram"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/indiarecycles"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition-transform hover:scale-105 active:scale-95"
                title="Follow on Facebook"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/india-recycles/?originalSubdomain=in"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white transition-transform hover:scale-105 active:scale-95"
                title="Follow on LinkedIn"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>

              {/* Website — glossy globe on cyan→blue gradient */}
              <a
                href="https://indiarecycles.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit indiarecycles.org"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-600 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                title="indiarecycles.org"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  {/* outer globe */}
                  <circle cx="12" cy="12" r="9" />
                  {/* equator + parallels */}
                  <path d="M3 12h18" />
                  <path d="M4.6 7.5h14.8" />
                  <path d="M4.6 16.5h14.8" />
                  {/* meridians */}
                  <path d="M12 3a13 13 0 010 18" />
                  <path d="M12 3a13 13 0 000 18" />
                  <path d="M12 3v18" />
                </svg>
              </a>

              {/* Google Maps */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=India+Recycles+Godown+3+SK+Estate+Nr+Nagdev+Mandir+LJ+University+Rd+Sarkhej+Gandhinagar+Highway+Ahmedabad+Gujarat+382210"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Find us on Google Maps"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white transition-colors hover:border-blue-500"
                title="View on Google Maps"
              >
                {/* Google G logo */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Page links */}
          <div className="mt-3 flex items-center gap-4 text-xs sm:text-sm">
            <a href="/about" className="font-medium text-neutral-600 hover:text-emerald-700">
              About Us
            </a>
            <span className="text-neutral-300">·</span>
            <a href="/guide" className="font-medium text-neutral-600 hover:text-emerald-700">
              How It Works
            </a>
            <span className="text-neutral-300">·</span>
            <a href="/terms" className="font-medium text-neutral-600 hover:text-emerald-700">
              Terms &amp; Conditions
            </a>
          </div>

          {/* Address row */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=India+Recycles+Godown+3+SK+Estate+Nr+Nagdev+Mandir+LJ+University+Rd+Sarkhej+Gandhinagar+Highway+Ahmedabad+Gujarat+382210"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
          >
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              <span className="font-semibold text-ink">India Recycles</span>
              {", "}Godown # 3, SK Estate, Nr Nagdev Mandir, LJ University Rd, Sarkhej - Gandhinagar Highway, Ahmedabad, Gujarat 382210
            </span>
          </a>
        </div>
      </footer>
    </main>
  );
}
