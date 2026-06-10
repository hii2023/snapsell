"use client";

import { usePathname, useRouter } from "next/navigation";

// Admin pages use the India Recycle logo (logo.png).
// Customer shop pages use the Thrift Shoppers logo (logo-shop.png).

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
  const router = useRouter();
  const isAdmin = pathname?.startsWith("/orders") || pathname?.startsWith("/sell");
  const target = isAdmin ? "/orders" : "/";

  // Admin logo always does a hard navigation (window.location) so the
  // dashboard opens in its truly initial state — default tab, no stale
  // local component state like 'which tab am I on'. Customer logo uses
  // App Router push + refresh for a fast SPA feel.
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    // Allow new-tab / new-window / download interactions
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (isAdmin) {
      window.location.href = target;
      return;
    }
    if (pathname === target) {
      router.refresh();
      return;
    }
    router.push(target);
    router.refresh();
  }

  const linkClass =
    "inline-block cursor-pointer transition-transform hover:scale-[1.02] active:scale-95";

  return (
    <a
      href={target}
      onClick={go}
      aria-label={isAdmin ? "Go to admin dashboard" : "Go to home"}
      className={linkClass}
    >
      <LogoImg
        src={isAdmin ? "/logo.png" : "/logo-shop.png"}
        alt={isAdmin ? "India Recycle Admin" : "Thrift Shoppers"}
      />
    </a>
  );
}
