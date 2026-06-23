"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoLink from "./LogoLink";

// Slim header for the product detail page: roughly half the height of the main
// store header so the product is clearly visible, with the close (X) control on
// the top right. Escape also closes. Stays sticky, so it's visible on scroll.
export default function ProductTopBar({ code }: { code?: string }) {
  const router = useRouter();

  function close() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-1.5">
        <div className="scale-90 origin-left">
          <LogoLink />
        </div>
        <div className="flex items-center gap-2">
          {code && (
            <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-500">
              {code}
            </span>
          )}
          <button
            onClick={close}
            aria-label="Close and go back"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
