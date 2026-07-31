"use client";

import { useEffect, useRef, useState } from "react";

// Confirm-before-leaving guard. Armed only when the visitor arrived from
// OFF-site (cross-origin or empty referrer — ads, WhatsApp, Instagram links),
// never for same-origin referrers, so in-site browsing is not interrupted.
//
// On load one trap history entry is pushed ("hold") above the landing entry
// ("base"). When a Back press lands on "base" — the site boundary — we push
// "hold" again to keep the page in place and show a "Leave this site?"
// dialog. Stay closes the dialog; Leave sets a flag and calls history.go(-2)
// to jump past the trap and actually exit.
//
// Plays nicely with useBackClose (lib/use-back.ts): in-page views spread the
// current state into their own entries, so popping an overlay never lands on
// "base" and the guard stays silent. Only guards the Back button — browsers
// do not allow custom UI on tab close.
export default function ExitGuard() {
  const [show, setShow] = useState(false);
  const leaving = useRef(false);
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let external = true;
    if (document.referrer) {
      try {
        external = new URL(document.referrer).host !== location.host;
      } catch {
        external = true;
      }
    }
    if (!external) return;
    if (window.history.state?.__guard) return; // already armed

    window.history.replaceState({ ...window.history.state, __guard: "base" }, "");
    window.history.pushState({ ...window.history.state, __guard: "hold" }, "");

    function onPop() {
      if (leaving.current) return;
      // Only react at the trap boundary. Pops of overlay / in-site route
      // entries land on states without the "base" marker and are ignored.
      if (window.history.state?.__guard !== "base") return;
      window.history.pushState({ ...window.history.state, __guard: "hold" }, "");
      setShow(true);
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Escape dismisses; focus lands on Stay when the dialog opens.
  useEffect(() => {
    if (!show) return;
    stayRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShow(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  function leave() {
    leaving.current = true;
    setShow(false);
    window.history.go(-2);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => setShow(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-guard-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl motion-safe:animate-[exit-guard-in_.18s_ease-out]"
      >
        <style>{`@keyframes exit-guard-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
        <h2 id="exit-guard-title" className="text-lg font-semibold text-ink">
          Leave this site?
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          New thrift finds are added daily. Sure you want to go?
        </p>
        <div className="mt-5 flex gap-2">
          <button
            ref={stayRef}
            onClick={() => setShow(false)}
            className="btn-primary flex-1 py-2.5"
          >
            Stay
          </button>
          <button
            onClick={leave}
            className="flex-1 rounded-2xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 active:scale-95"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
