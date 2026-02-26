const CACHE_NAME = "web-cam-shell-v1";
const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
