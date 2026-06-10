import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";

// PWA / Install App feature is intentionally disabled for now.
// Files kept on disk so we can flip it back on later:
//   - public/manifest.json
//   - public/sw.js
//   - components/ServiceWorkerRegister.tsx
//   - components/InstallAppButton.tsx
// To re-enable: re-add the manifest <link>, the appleWebApp metadata, and
// mount <ServiceWorkerRegister /> + <InstallAppButton /> below.

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Thrift Shopper Store";

export const metadata: Metadata = {
  title: shopName,
  description: "Buy and sell thrifted items easily",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plex.variable}>
      <head>
        <meta name="theme-color" content="#0f766e" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerCleanup />
      </body>
    </html>
  );
}
