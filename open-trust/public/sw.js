/* 3GGA minimal service worker: cache-first ONLY for immutable build assets.
   API calls, pages and everything else pass straight through to the network
   (never cached) so runs, sessions and verification stay live. */
const STATIC_CACHE = "3gga-static-v1";
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.pathname.includes("/_next/static/")) return;
  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        });
      })
    )
  );
});
