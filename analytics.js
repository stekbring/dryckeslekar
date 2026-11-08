/*
  Statistik + cookie-banner för Olles Dryckeslekar.
  Laddas på varje sida med: <script src="/analytics.js" defer></script>

  Ingenting spåras förrän besökaren tryckt "Okej".
  Valet sparas i webbläsaren. Vill du visa bannern igen: cookieInstallningar()

  >>> Klistra in ditt Clarity-projekt-ID nedan (clarity.microsoft.com →
      Settings → Overview → Project ID, t.ex. "abc123xyz"). <<<
*/
var GA_ID = "G-E6WCG90MQZ";
var CLARITY_ID = "zahci44m9b";

(function () {
  var NYCKEL = "cookieval";
  var laddat = false;

  function hamta() { try { return localStorage.getItem(NYCKEL); } catch (e) { return null; } }
  function spara(v) { try { localStorage.setItem(NYCKEL, v); } catch (e) {} }

  function laddaSpårning() {
    if (laddat) return; laddat = true;

    // Google Analytics
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("js", new Date());
    gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);

    // Microsoft Clarity
    if (CLARITY_ID && CLARITY_ID.indexOf("KLISTRA") !== 0) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", CLARITY_ID);
      window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
    }

    // Klick på knappar och länkar som händelse i Google Analytics
    document.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("a, button, [onclick], [role=button]");
      if (!el || el.closest("#ck-banner")) return;
      gtag("event", "klick", {
        knapp: (el.innerText || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 80),
        sida: location.pathname
      });
    }, true);
  }

  function visaBanner() {
    if (document.getElementById("ck-banner")) return;
    var css = document.createElement("style");
    css.textContent =
      "#ck-banner{position:fixed;left:50%;bottom:16px;transform:translate(-50%,20px);opacity:0;z-index:99999;" +
      "width:calc(100% - 32px);max-width:360px;box-sizing:border-box;padding:16px 16px 14px;border-radius:14px;" +
      "background:rgba(20,20,20,.88);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);" +
      "color:#f2f2f2;font:15px/1.4 'Times New Roman',Times,serif;box-shadow:0 8px 30px rgba(0,0,0,.35);" +
      "text-align:center;transition:opacity .25s,transform .25s}" +
      "#ck-banner.v{opacity:1;transform:translate(-50%,0)}" +
      "#ck-banner p{margin:0 0 12px}" +
      "#ck-banner button{font:inherit;border:0;cursor:pointer}" +
      "#ck-ja{display:block;margin:0 auto;min-width:180px;padding:11px 28px;border-radius:999px;" +
      "background:#f2f2f2;color:#111;font-size:16px;font-weight:bold}" +
      "#ck-ja:hover{background:#fff}" +
      "#ck-nej{position:absolute;right:10px;bottom:8px;padding:4px 6px;background:none;color:#888;font-size:12px}" +
      "#ck-nej:hover{color:#ccc}" +
      "#ck-why{position:absolute;left:10px;bottom:8px;padding:4px 6px;background:none;color:#888;font-size:12px}" +
      "#ck-why:hover{color:#ccc}" +
      "#ck-info{margin:-4px 0 12px;font-size:13px;color:#bbb}#ck-info[hidden]{display:none}";
    document.head.appendChild(css);

    var b = document.createElement("div");
    b.id = "ck-banner"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Cookies");
    b.innerHTML = '<p>Denna sidan äter cookies 🍪</p>' +
      '<p id="ck-info" hidden>Jag samlar lite rolig statistik med Google Analytics och Microsoft Clarity för att kunna se vilka lekar som leks mest.</p>' +
      '<button id="ck-ja" type="button">Acceptera</button>' +
      '<button id="ck-why" type="button" aria-expanded="false">Varför?</button>' +
      '<button id="ck-nej" type="button">Avböj</button>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("v"); }); });

    function stang(val) {
      spara(val);
      b.classList.remove("v");
      setTimeout(function () { b.remove(); }, 300);
      if (val === "ja") laddaSpårning();
      else if (laddat) location.reload();
    }
    document.getElementById("ck-ja").onclick = function () { stang("ja"); };
    document.getElementById("ck-nej").onclick = function () { stang("nej"); };
    document.getElementById("ck-why").onclick = function () {
      var i = document.getElementById("ck-info"), visa = i.hidden;
      i.hidden = !visa; this.setAttribute("aria-expanded", String(visa));
    };
  }

  window.cookieInstallningar = visaBanner;

  var val = hamta();
  if (val === "ja") laddaSpårning();
  else if (val !== "nej") {
    if (document.body) visaBanner();
    else document.addEventListener("DOMContentLoaded", visaBanner);
  }
})();
