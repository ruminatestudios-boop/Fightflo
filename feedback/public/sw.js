const CACHE = "fightflo-feedback-v3";

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

  // Never intercept cross-origin — MediaPipe WASM/models, Cloudinary, etc.
  if (url.origin !== self.location.origin) return;

  const isNavigate =
    event.request.mode === "navigate" ||
    event.request.destination === "document";

  if (isNavigate) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(
          (cached) => cached || Response.error()
        )
      )
    );
    return;
  }

  // Network-only for Next bundles, API, and dynamic app routes
  if (
    url.pathname.includes("/_next/") ||
    url.pathname.includes("/api/") ||
    url.pathname.includes("/report/")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => Response.error())
    );
    return;
  }

  const isCacheable =
    url.pathname.includes("/images/") ||
    event.request.destination === "image" ||
    event.request.destination === "font";

  if (!isCacheable) {
    event.respondWith(
      fetch(event.request).catch(() => Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return network.then((response) => response || cached || Response.error());
    })
  );
});
