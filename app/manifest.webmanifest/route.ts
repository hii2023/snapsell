import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Host-aware manifest: installing from the admin domain gives a dashboard app
// (opens /orders); installing from the store gives the shop app (opens /).
export async function GET() {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  const isAdmin = host.startsWith("admin.");

  const manifest = {
    name: isAdmin ? "India Recycles Admin" : "India Recycles Store",
    short_name: isAdmin ? "IR Admin" : "IR Store",
    description: isAdmin
      ? "Manage products and orders"
      : "Shop pre-loved clothes and accessories in Ahmedabad",
    start_url: isAdmin ? "/orders" : "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
