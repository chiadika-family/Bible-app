/* Family Bible Study service worker.
   Network-first for the shell and lesson file so a new pack is not stuck behind an old cache.
   Cache-first only for icons. Old caches are deleted when the version changes. */
const VERSION = "2026.11.12.1";
const CACHE = `family-bible-${VERSION}`;
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./version.txt",
  "./curriculum.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./setup-qr.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("family-bible-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isShell(request, url) {
  if (request.mode === "navigate") return true;
  const path = url.pathname;
  return (
    path.endsWith("/") ||
    path.endsWith("/index.html") ||
    path.endsWith("/curriculum.json") ||
    path.endsWith("/version.txt") ||
    path.endsWith("/sw.js") ||
    path.includes("/_next/")
  );
}

const SCOPE_PATH = new URL("./", self.location.href).pathname;

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  if (isShell(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) throw new Error("bad response");
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match(new URL("./index.html", self.location.href).href)),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
