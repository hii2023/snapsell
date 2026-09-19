/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Vercel's image optimizer is metered (5,000 transformations/month on the
    // free tier). A ~380 product catalogue burns that in days, after which
    // /_next/image returns HTTP 402 and EVERY product image breaks on the
    // storefront. Instead we size images once at upload time (see
    // app/api/upload/route.ts) and serve those straight from Supabase
    // Storage, so there is no per-request transformation cost at all.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Belt and braces alongside app/robots.ts: the admin dashboard shares
        // this deployment with the public store, so every admin-host response
        // carries an explicit noindex. Header beats robots.txt for URLs that
        // are already known to Google.
        source: "/:path*",
        has: [{ type: "host", value: "admin.indiarecycles.org" }],
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
