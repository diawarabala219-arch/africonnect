const C = "afri-v14";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  // Reseau d'abord (toujours la derniere version), cache seulement si le reseau echoue ou depasse 4 s
  e.respondWith(new Promise(res => {
    let done = false;
    const fallback = () => caches.match(e.request).then(m => { if (!done && m) { done = true; res(m); } });
    const t = setTimeout(fallback, 4000);
    fetch(e.request, { cache: "no-cache" }).then(r => { clearTimeout(t); if (done) return; done = true; if (r && r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); } res(r); })
      .catch(() => { clearTimeout(t); caches.match(e.request).then(m => { if (!done) { done = true; res(m || Response.error()); } }); });
  }));
});
