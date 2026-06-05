import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "India Recycle";

export const metadata: Metadata = {
  title: shopName,
  description: "Snap a photo, list it, sell it.",
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
