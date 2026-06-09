import { supabaseConfigured } from "@/lib/supabase";
import LogoLink from "@/components/LogoLink";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";

export const dynamic = "force-dynamic";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

export default async function ShopPage() {
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

      {products.length === 0 ? (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-neutral-500">
          <p className="text-lg">No products yet.</p>
          <p className="mt-1 text-sm">
            {supabaseConfigured()
              ? "Check back soon."
              : "Connect Supabase to start listing."}
          </p>
        </div>
      ) : (
        <ShopClient products={products} shopName={shopName} cfg={cfg} />
      )}
    </main>
  );
}
