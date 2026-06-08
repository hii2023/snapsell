import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";

export const dynamic = "force-dynamic";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

export default async function ShopPage() {
  let products: Product[] = [];

  if (supabaseConfigured()) {
    const supabase = await supabaseServer();
    // RLS already restricts to in-stock, active products, but we filter too.
    const { data } = await supabase
      .from(T.products)
      .select("*")
      .gt("stock", 0)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    products = (data as Product[]) || [];
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4">
          <Link href="/" className="text-xl font-semibold">
            {shopName}
          </Link>
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
        <ShopClient
          products={products}
          razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""}
          shopName={shopName}
        />
      )}
    </main>
  );
}
