"use client";

import { useEffect } from "react";

// Registers the network-first service worker (public/sw.js) so the app is
// installable. The SW caches nothing, so there is no stale content and no need
// to force a reload — installed apps always fetch the latest deploy.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        // Registration failed — the app still works as a normal website.
      });
  }, []);
  return null;
}
