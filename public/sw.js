const CACHE_NAAM = "csm-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Eenvoudige "network first, val terug op cache"-strategie. Dit is bewust
// minimaal gehouden — genoeg om de app installeerbaar te maken op pc en
// telefoon; uitgebreide offline-ondersteuning kan later toegevoegd worden.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAAM).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
