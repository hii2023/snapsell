import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import ExitGuard from "@/components/ExitGuard";

// PWA / Install App is enabled. The service worker (public/sw.js) is network
// first and never caches HTML, so installed apps always show the latest deploy.
// The manifest is generated per-host at /manifest.webmanifest so the admin
// domain installs a dashboard app and the store domain installs a shop app.

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: shopName,
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
        <ServiceWorkerRegister />
        <ExitGuard />
      </body>
    </html>
  );
}
