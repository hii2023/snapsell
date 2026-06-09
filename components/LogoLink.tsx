"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Admin pages use the India Recycle logo (logo.png).
// Customer shop pages use the Thrift Shoppers logo (logo-shop.png).
// Falls back to logo.png if logo-shop.png is not found.

function LogoImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: "130px",
        height: "96px",
        backgroundImage: `url(${src})`,
        backgroundSize: "130%",
        backgroundPosition: "50% 58%",
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
    />
  );
}

export default function LogoLink() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/orders") || pathname?.startsWith("/sell");

  if (isAdmin) {
    return (
      <Link href="/orders">
        <LogoImg src="/logo.png" alt="India Recycle Admin" />
      </Link>
    );
  }

  return (
    <Link href="/">
      <LogoImg src="/logo-shop.png" alt="Thrift Shoppers" />
    </Link>
  );
}
