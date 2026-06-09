// Bump version when shipping a new SW so old clients pick up the new strategy.
const CACHE_VERSION = "thrift-shopper-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Only cache fully static assets here. Pages are always network-first
// so the installed PWA never shows stale HTML / stale product lists.
const STATIC_ASSETS = ["/manifest.json", "/logo.png", "/logo-shop.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept API routes, auth callbacks, Next.js data, or Supabase
  // — let them go straight to the network so live data stays live.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.hostname.includes("supabase.co")
  ) {
    return; // default browser behavior
  }

  // Network-first for HTML navigations (the actual pages).
  // Falls back to a cached copy only when offline so the installed app
  // doesn't show a blank screen with no internet.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }
      })()
    );
    return;
  }

  // Cache-first for hashed build assets — they never go stale.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Default: network-first with cache fallback.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Allow the page to ask the SW to update immediately when a new version ships.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
