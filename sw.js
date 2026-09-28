/*
  Service worker för Olles Dryckeslekar – sparar sidans bilder i besökarens webbläsare.

  Du behöver INTE ändra något i den här filen. Versionen styrs av VERSION
  högst upp i index.html. När du ändrar den:
    - hämtas den nya sidan och de nya bilderna direkt,
    - och den gamla cachen raderas automatiskt.

  Den här filen måste ligga i samma mapp som index.html.
*/

var VERSION = new URL(self.location.href).searchParams.get("v") || "0";
var CACHE = "dryckeslekar-" + VERSION;
var BAS = new URL("./", self.location.href).pathname;          // t.ex. "/"
var STARTSIDOR = [BAS, BAS + "index.html"];

self.addEventListener("install", function () {
  self.skipWaiting();                                           // ny version tar över direkt
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (nycklar) {
      return Promise.all(nycklar.map(function (n) {
        if (n.indexOf("dryckeslekar-") === 0 && n !== CACHE) return caches.delete(n);   // rensa gamla versioner
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Bara startsidans egna, versionsmärkta bilder (…?v=X) sparas.
   Andra lekar på samma domän påverkas inte alls. */
function arVersionsbild(url) {
  return url.origin === self.location.origin &&
         url.pathname.indexOf(BAS + "bilder/") === 0 &&
         url.searchParams.has("v");
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Startsidan: hämta alltid senaste från servern, använd sparad kopia bara om man är offline
  if (req.mode === "navigate") {
    if (STARTSIDOR.indexOf(url.pathname) !== -1) event.respondWith(natetForst(req));
    return;
  }

  // Bilder: ta från cachen om de finns (snabbt), annars hämta och spara
  if (arVersionsbild(url)) event.respondWith(cachenForst(req));
});

function natetForst(req) {
  return fetch(req, { cache: "no-cache" }).then(function (svar) {
    if (svar.ok && svar.type === "basic") {
      var kopia = svar.clone();
      caches.open(CACHE).then(function (c) { c.put(BAS, kopia); });
    }
    return svar;
  }).catch(function () {
    return caches.open(CACHE).then(function (c) { return c.match(BAS); }).then(function (sparad) {
      return sparad || Response.error();
    });
  });
}

function cachenForst(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req.url).then(function (sparad) {
      if (sparad) return sparad;
      return fetch(req).then(function (svar) {
        if (svar.ok) c.put(req.url, svar.clone());
        return svar;
      });
    });
  });
}

/* Sidan skickar en lista på alla sina bilder efter att den laddat klart,
   så att de sparas i bakgrunden och nästa besök går direkt. */
self.addEventListener("message", function (event) {
  var d = event.data;
  if (!d || d.typ !== "forladda" || d.version !== VERSION || !Array.isArray(d.urls)) return;
  event.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(d.urls.map(function (u) {
      var url = new URL(u, self.location.href);
      if (!arVersionsbild(url)) return;
      return c.match(url.href).then(function (finns) {
        if (finns) return;
        return fetch(url.href).then(function (svar) {
          if (svar.ok) return c.put(url.href, svar);
        }).catch(function () {});
      });
    }));
  }));
});
