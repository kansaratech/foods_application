/*
 * LocalSell service worker — offline shell, safe update model.
 *
 * Design (learned from the previous Workbox precache that got stuck on stale
 * `/_next/static` chunk URLs after every rebuild):
 *   - NOTHING build-specific is precached. Only stable URLs (offline page,
 *     icons, manifest).
 *   - Navigations are NETWORK-FIRST — a new deploy's HTML is served instantly;
 *     the cached copy is only a fallback, and offline.html a last resort.
 *   - Hashed static assets are cached on demand (cache-first). They're
 *     immutable, so stale entries are harmless and get purged on version bump.
 *   - Cross-origin requests (api.localsell.in, Maps, fonts, CDNs) are never
 *     touched.
 *   - Bump CACHE_VERSION on a breaking change to wipe every old cache.
 */
const APP = "localsell-admin";
const CACHE_VERSION = "v1";
const CACHE = `${APP}-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.json", "/192.png", "/512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(`${APP}-`) && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  /\/(_next\/static|_expo\/static|assets|static)\//.test(url.pathname) ||
  /\.(js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // leave API / Maps / CDNs alone

  // App shell / pages — network first, cache fallback, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  // Immutable hashed assets — cache first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
              }
              return res;
            })
            .catch(() => cached),
      ),
    );
    return;
  }

  // Anything else same-origin — network, fall back to cache if offline.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
