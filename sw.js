const C = "afri-v11";
const LIB = "supabase-js";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "./index.html", "./manifest.json", "./icon.svg"]).catch(() => {}))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin, lib = u.href.includes(LIB);
  if (!mine && !lib) return;
  // Cache d'abord (rapide meme avec mauvais reseau), mise a jour en arriere-plan
  e.respondWith(caches.match(e.request).then(m => {
    const net = fetch(e.request).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); } return r; }).catch(() => m || caches.match("./index.html"));
    return m || net;
  }));
});

