// Network-first service worker. Its only job is to make the app installable
// (PWA) — it never caches HTML or app code, so an installed app always shows
// the latest deployed version, exactly like the website. No stale content.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge any caches left behind by older service workers.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// Fetch handler is required for installability. It is a pure network
// passthrough for same-origin GET requests — nothing is cached.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(req).catch(() => Response.error()));
});
