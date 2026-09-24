// Service Worker: Offline-Modus.
// Strategie "Netz zuerst": Mit Internet kommt immer die neueste Version (wichtig, damit alle
// dieselbe Wortliste haben). Ohne Internet die zuletzt gespeicherte Version vom Handy.
const CACHE = "imposter-cache";

const FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "fonts/space-grotesk-latin.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "src/main.js",
  "src/game.js",
  "src/rng.js",
  "src/words.js",
  "src/invite.js",
  "src/storage.js",
  "src/ui.js",
  "src/wakelock.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
