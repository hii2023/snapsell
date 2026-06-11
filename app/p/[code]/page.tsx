import type { Metadata } from "next";
import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { T } from "@/lib/db";
import { rupees, categoryLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";
import ShopClient from "@/components/ShopClient";
import LogoLink from "@/components/LogoLink";
import ProductGallery from "@/components/ProductGallery";
import { Footer } from "@/components/Footer";

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

async function getRelated(currentId: string, category: string): Promise<Product[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from(T.products)
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .gt("stock", 0)
    .neq("id", currentId)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data as Product[]) || [];
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
  const related = p ? await getRelated(p.id, p.category) : [];

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <LogoLink />
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
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-6">
          <ProductGallery images={p.images?.length ? p.images : p.image_url ? [p.image_url] : []} name={p.name} />
          <h1 className="mt-4 text-2xl font-semibold">{p.name}</h1>
          <p className="mt-1 text-neutral-500">
            {[p.size, p.color, p.subcategory].filter(Boolean).join(" · ")}
            {p.size || p.color || p.subcategory ? " · " : ""}
            {p.giveaway ? (
              <span className="font-semibold text-emerald-700">Give away · Free</span>
            ) : (
              <>
                <span className="font-semibold text-ink">{rupees(p.price)}</span>
                {p.mrp > p.price ? <span className="ml-1 line-through">{rupees(p.mrp)}</span> : null}
              </>
            )}
          </p>
          {p.description ? (
            <p className="mt-3 whitespace-pre-wrap text-neutral-700">{p.description}</p>
          ) : null}

          {p.stock <= 0 ? (
            <>
              <p className="mt-5 rounded-xl bg-red-50 p-4 text-center font-medium text-red-700">Sold out</p>
              <Link href="/" className="mt-4 block text-center text-brand underline">
                See other products
              </Link>
            </>
          ) : (
            <div className="mt-6">
              <ShopClient products={[p]} shopName={shopName} />
            </div>
          )}

          {related.length > 0 && (
            <section className="mt-12 border-t border-neutral-200 pt-8">
              <h2 className="mb-4 text-lg font-semibold text-ink">
                More from {categoryLabel(p.category)}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/p/${r.code}`}
                    className="card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-[4/5] bg-neutral-100">
                      {r.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt={r.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                      {r.code && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-white/85 px-1 py-0.5 font-mono text-[9px] font-medium text-neutral-600 backdrop-blur-sm">
                          {r.code}
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-2.5">
                      <p className="line-clamp-1 text-[13px] font-medium leading-tight">{r.name}</p>
                      <p className="mt-1 text-sm font-bold text-ink">
                        {r.giveaway ? "Free" : rupees(r.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="mx-auto mt-12 max-w-2xl px-4">
        <Footer />
      </div>
    </main>
  );
}

