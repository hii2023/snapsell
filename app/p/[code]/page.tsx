import type { Metadata } from "next";
import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import { rupees, categoryLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

async function getProduct(code: string): Promise<Product | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from(T.products)
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return (data as Product) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const p = await getProduct(code);
  if (!p) return { title: `${shopName}` };
  const desc = `${p.code} · ${p.giveaway ? "Give away (Free)" : rupees(p.price)} · ${categoryLabel(p.category)}`;
  return {
    title: `${p.name} · ${shopName}`,
    description: desc,
    openGraph: {
      title: `${p.name} - ${rupees(p.price)}`,
      description: desc,
      images: p.image_url ? [{ url: p.image_url }] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const p = await getProduct(code);

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <Link href="/">
            <Logo />
          </Link>
          {p?.code ? (
            <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-500">
              {p.code}
            </span>
          ) : null}
        </div>
      </header>

      {!p ? (
        <div className="mx-auto max-w-md px-4 py-24 text-center text-neutral-500">
          <p className="text-lg">Product not found.</p>
          <Link href="/" className="mt-3 inline-block text-brand underline">
            Go to shop
          </Link>
        </div>
      ) : p.stock <= 0 ? (
        <div className="mx-auto max-w-md px-4 py-10">
          <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-100">
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <h1 className="mt-4 text-2xl font-semibold">{p.name}</h1>
          <p className="mt-1 text-neutral-500">
            {[p.size, p.color].filter(Boolean).join(" · ")} ·{" "}
            {p.giveaway ? (
              <span className="font-semibold text-emerald-700">Give away · Free</span>
            ) : (
              <>
                <span className="font-semibold text-ink">{rupees(p.price)}</span>
                {p.mrp > p.price ? <span className="ml-1 line-through">{rupees(p.mrp)}</span> : null}
              </>
            )}
          </p>
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-center font-medium text-red-700">
            Sold out
          </p>
          <Link href="/" className="mt-4 block text-center text-brand underline">
            See other products
          </Link>
        </div>
      ) : (
        <ShopClient products={[p]} shopName={shopName} />
      )}
    </main>
  );
}
