"use client";

import { useEffect } from "react";

// PWA is disabled. This component runs on every page load and:
//  1. Unregisters any service worker the user installed previously, so their
//     installed app instantly returns to plain web behavior.
//  2. Clears all SW-managed Cache Storage so no stale assets are served.
//
// Safe to leave mounted permanently — once everything is cleaned up it just
// no-ops on subsequent visits.
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);
  return null;
}
