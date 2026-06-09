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
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4">
          <LogoLink />
        </div>
      </header>

      {/* Always render ShopClient — it does its own live client-side fetch on mount.
          Empty-state is handled inside the client so it can refresh without a reload. */}
      <ShopClient products={products} shopName={shopName} cfg={cfg} />
      {!supabaseConfigured() && (
        <p className="mt-6 text-center text-sm text-neutral-400">Connect Supabase to start listing.</p>
      )}
      <StoreContact />
    </main>
  );
}
