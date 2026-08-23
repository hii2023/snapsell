import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { STORE_HOST, isAdminHost } from "@/lib/seo";

// One deployment serves both the storefront and the admin dashboard, so
// robots.txt has to be decided per host: the admin domain must never be
// crawled, the store domain should be.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.toLowerCase() || STORE_HOST;

  if (isAdminHost(host)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Seller/admin surfaces and API routes are of no use in search.
        disallow: ["/orders", "/sell", "/login", "/auth/", "/api/"],
      },
    ],
    sitemap: `https://${host}/sitemap.xml`,
    host: `https://${host}`,
  };
}
