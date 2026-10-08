/* Futura service worker.
 * - App shell (HTML/CSS/JS/fonts/icons): precached; served stale-while-revalidate so edits show up on the next visit.
 * - data/*.json: network-first, falling back to the last cached copy when offline.
 * - Cross-origin requests (TradingView widgets, CNBC live quotes) are not touched.
 * Bump VERSION whenever the shell list changes; old caches are deleted on activate. */
const VERSION = "futura-v20-2026-10-08";
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const SHELL_FILES = [
  "./", "index.html", "css/styles.css", "js/app.js", "fonts/fonts.css",
  "fonts/inter-latin.woff2", "fonts/cormorant-garamond-latin.woff2",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png",
];
const DATA_FILES = [
  "data/ipos.json", "data/growth-picks.json", "data/risk-it.json", "data/spacex.json", "data/tesla.json", "data/sentiment.json", "data/cassiopeia.json", "data/etfs.json", "data/track-record.json",
  "data/companies/index.json", "data/companies/AAPL.json", "data/companies/NVDA.json", "data/companies/MU.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await (await caches.open(SHELL)).addAll(SHELL_FILES.map((u) => new Request(u, { cache: "reload" })));
    const data = await caches.open(DATA);
    await Promise.all(DATA_FILES.map((u) => data.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("futura-") && !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const strip = (req) => { const u = new URL(req.url); u.search = ""; u.hash = ""; return u.href; };

async function networkFirst(req) {
  const cache = await caches.open(DATA);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(strip(req), res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(strip(req));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { event.waitUntil(update); return hit; }
  return (await update) || Response.error();
}

async function navigation(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put("index.html", res.clone());
    return res;
  } catch (err) {
    return (await cache.match("index.html")) || (await cache.match("./")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave TradingView & other third parties alone
  const path = url.pathname;
  const scope = new URL(self.registration.scope).pathname;
  if (req.mode === "navigate") return event.respondWith(navigation(req));
  if (path.startsWith(scope + "data/") && path.endsWith(".json")) return event.respondWith(networkFirst(req));
  event.respondWith(staleWhileRevalidate(req, event));
});
