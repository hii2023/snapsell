/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
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
