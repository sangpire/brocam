self.addEventListener("install", (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
