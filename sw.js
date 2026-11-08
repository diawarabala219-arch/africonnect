const C = "afri-v20";
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
// Notifications push
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "AfriConnect", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    if (cs.some(c => c.visibilityState === "visible")) return; // l'app est ouverte : pas besoin
    return self.registration.showNotification(d.title || "AfriConnect", { body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, vibrate: [200, 100, 200], data: { url: d.url || "" } });
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = self.registration.scope + ((e.notification.data && e.notification.data.url) || "");
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) { try { if (c.navigate) c.navigate(url).catch(() => {}); } catch (x) {} return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

