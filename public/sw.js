// PWA disabled. This service worker exists only to unregister itself and
// purge caches if any older client still tries to load it. When the PWA is
// re-enabled later, replace this file with the real network-first SW.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});

self.addEventListener("fetch", () => {
  // no-op: fall back to default network behavior
});
