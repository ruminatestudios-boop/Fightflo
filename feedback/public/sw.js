const CACHE = "fightflo-feedback-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only handle same-origin static feed images — everything else uses the network directly.
  if (url.origin !== self.location.origin) return;

  const isCacheableImage =
    url.pathname.includes("/images/") &&
    (event.request.destination === "image" ||
      /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(url.pathname));

  if (!isCacheableImage) return;

  event.respondWith(
    caches.match(event.request).then((cached) =>
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached ?? fetch(event.request))
    )
  );
});
