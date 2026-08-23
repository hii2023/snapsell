import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { T } from "@/lib/db";
import { STORE_HOST, isAdminHost } from "@/lib/seo";

// Product listings change constantly, so the sitemap is generated per request
// rather than baked at build time.
export const dynamic = "force-dynamic";

type Row = { code: string; created_at: string | null };

async function liveProductCodes(): Promise<Row[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  try {
    // Plain anon client: the sitemap is public data and needs no session.
    const supabase = createClient(url, anon, { auth: { persistSession: false } });
    const { data } = await supabase
      .from(T.products)
      .select("code, created_at")
      // Same filter the shop grid uses, so the sitemap only lists buyable items.
      .gt("stock", 0)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5000);
    return (data as Row[]) || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host")?.toLowerCase() || STORE_HOST;

  // The admin dashboard is not a public site; give crawlers nothing.
  if (isAdminHost(host)) return [];

  const base = `https://${host}`;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const products = await liveProductCodes();
  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/p/${encodeURIComponent(p.code)}`,
    lastModified: p.created_at ? new Date(p.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}
