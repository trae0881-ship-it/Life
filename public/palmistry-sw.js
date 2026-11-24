const CACHE_NAME = "life-palmistry-assets-v2";
const STATIC_PREFIX = "/_next/static/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("life-palmistry-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith((async () => {
      const client = await self.clients.get(event.clientId);
      if (!client || new URL(client.url).pathname !== "/palmistry") return fetch(request);
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response("This Palmistry app asset is not available offline yet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
    })());
  }
});
