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

  // We use a real <a> with an explicit onClick that pushes the route AND
  // forces a refresh. Next.js' Link sometimes shows a stale segment from the
  // router cache when navigating from /p/[code] -> / so the page appears not
  // to change. Doing push + refresh, and falling back to a full navigation
  // if the user middle-clicks or modifier-clicks, fixes that for good.
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    // Allow new-tab / new-window / download interactions
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (pathname === target) {
      // Already there — just refresh to bust client cache
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
