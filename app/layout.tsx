import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import ExitGuard from "@/components/ExitGuard";
import { STORE_URL, STORE_NAME, STORE_TITLE, STORE_DESC } from "@/lib/seo";

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
  metadataBase: new URL(STORE_URL),
  title: {
    default: STORE_TITLE,
    // Product and inner pages supply their own name; the store name is appended.
    template: `%s · ${STORE_NAME}`,
  },
  description: STORE_DESC,
  applicationName: shopName,
  // No canonical here on purpose: a root-layout canonical would make every
  // inner page (/about, /guide, /terms) point at the homepage. Pages that
  // need one declare it themselves.
  openGraph: {
    type: "website",
    siteName: STORE_NAME,
    url: STORE_URL,
    title: STORE_TITLE,
    description: STORE_DESC,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: STORE_TITLE,
    description: STORE_DESC,
  },
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
