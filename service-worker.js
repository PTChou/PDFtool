// PDF保管箱 — service worker
// Bump CACHE_NAME whenever index.html or the bundled libs change, so
// visitors pick up the new version instead of a stale cached copy.
const CACHE_NAME = "pdf-vault-v1";
const SCOPE = self.registration.scope; // e.g. https://ptchou.github.io/PDFtool/
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./pdf.min.js",
  "./pdf.worker.min.js",
  "./pdf-lib.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // index.html: network-first, so a republish is picked up quickly;
  // fall back to the cached shell when offline.
  if (req.mode === "navigate" || req.url.endsWith("/index.html") || req.url === SCOPE) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // everything else (the pdf.js/pdf-lib bundles, icons, fonts): cache-first,
  // since these are large and effectively static once published.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
