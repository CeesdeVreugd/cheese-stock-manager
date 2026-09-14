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

// Toont de daadwerkelijke systeemmelding zodra de server een pushbericht
// stuurt (bv. bij een nieuwe afroeporder). Werkt ook als de app niet open
// staat, zolang de browser/het besturingssysteem meldingen toestaat.
self.addEventListener("push", (event) => {
  let data = { title: "Cheese Stock Manager", body: "Er is een update.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // geen geldige JSON meegestuurd — val terug op de standaardtekst hierboven
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

// Bij een tik op de melding: open de app op de relevante pagina, of geef
// focus aan een al openstaand tabblad in plaats van een nieuwe te openen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
