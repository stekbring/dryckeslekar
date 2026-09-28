/*
  Service worker för Olles Dryckeslekar – gör att sidorna laddar snabbare
  genom att spara bilderna i besökarens webbläsare.

  Du behöver normalt INTE ändra något här. Varje sida har en egen
  VERSION högst upp i sin index.html – höj den när du byter en bild
  i den leken, så hämtas de nya bilderna direkt.

  Så här funkar det:
   - Själva sidorna (index.html) hämtas alltid färska från servern när man
     är online. Den sparade kopian används bara om nätet saknas.
   - Bilder med ?v=… i adressen (sätts automatiskt av sidorna) tas direkt från
     cachen. Ny VERSION = ny adress = hämtas på nytt, och den gamla raderas.
   - Mapparna i HOPPA_OVER nedan rörs inte alls.

  Filen måste ligga i roten (samma mapp som startsidans index.html).
*/

var CACHE = "dryckeslekar-filer";

var HOPPA_OVER = [
  "newyear", "newyearhunt", "nattasbday",
  "midsummer", "midsummerhunt", "midsummerhuntsofiaedition",
  "tiotusen", "bilderochtexter"
];

function forstaMapp(url) {
  return url.pathname.split("/")[1] || "";
}

function hanteras(url) {
  return url.origin === self.location.origin && HOPPA_OVER.indexOf(forstaMapp(url)) === -1;
}

/* Samma nyckel för /bengt/ och /bengt/index.html */
function sidNyckel(url) {
  return url.origin + url.pathname.replace(/index\.html$/, "");
}

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (nycklar) {
      return Promise.all(nycklar.map(function (n) {
        if (n.indexOf("dryckeslekar-") === 0 && n !== CACHE) return caches.delete(n);  // gamla cacher
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (!hanteras(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(natetForst(req, url));
    return;
  }
  if (url.searchParams.has("v")) {
    event.respondWith(cachenForst(req));
  }
});

/* Sidor: alltid senaste från servern, sparad kopia bara när man är offline */
function natetForst(req, url) {
  return fetch(req, { cache: "no-cache" }).then(function (svar) {
    if (svar.ok && svar.type === "basic") {
      var kopia = svar.clone();
      caches.open(CACHE).then(function (c) { c.put(sidNyckel(url), kopia); });
    }
    return svar;
  }).catch(function () {
    return caches.open(CACHE)
      .then(function (c) { return c.match(sidNyckel(url)); })
      .then(function (sparad) { return sparad || Response.error(); });
  });
}

/* Versionsmärkta filer: från cachen om de finns, annars hämta och spara */
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

/* Sidorna skickar en lista med sina bilder när de laddat klart.
   Bilderna sparas i bakgrunden (så nästa besök går direkt), och äldre
   versioner av samma filer raderas. */
self.addEventListener("message", function (event) {
  var d = event.data;
  if (!d || d.typ !== "forladda" || !Array.isArray(d.urls)) return;

  var aktuella = d.urls.map(function (u) { return new URL(u, self.location.href); })
    .filter(function (u) { return hanteras(u) && u.searchParams.has("v"); });
  var sokvagar = {};
  aktuella.forEach(function (u) { sokvagar[u.origin + u.pathname] = u.href; });

  event.waitUntil(caches.open(CACHE).then(function (c) {
    var stada = c.keys().then(function (reqs) {
      return Promise.all(reqs.map(function (r) {
        var u = new URL(r.url);
        var nu = sokvagar[u.origin + u.pathname];
        if (nu && nu !== u.href) return c.delete(r);          // gammal version av samma fil
      }));
    });
    var hamta = Promise.all(aktuella.map(function (u) {
      return c.match(u.href).then(function (finns) {
        if (finns) return;
        return fetch(u.href).then(function (svar) {
          if (svar.ok) return c.put(u.href, svar);
        }).catch(function () {});
      });
    }));
    return Promise.all([stada, hamta]);
  }));
});
