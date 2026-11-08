/* ---------- Notifications sur le telephone (Web Push) ---------- */
var AfriPush = (function () {
  function b64(u) {
    var p = "=".repeat((4 - (u.length % 4)) % 4), s = (u + p).replace(/-/g, "+").replace(/_/g, "/"), r = atob(s), a = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
    return a;
  }
  function supported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  async function sub(ask) {
    if (!supported()) return "unsupported";
    var perm = Notification.permission;
    if (perm === "default" && ask) perm = await Notification.requestPermission();
    if (perm !== "granted") return perm;
    var reg = await navigator.serviceWorker.ready;
    var s = await reg.pushManager.getSubscription();
    if (!s) {
      var k = {};
      try { k = await (await fetch(AI_URL + "/afri/vapid")).json(); } catch (e) {}
      if (!k.key) return "nokey";
      s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) });
    }
    var j = s.toJSON();
    var r = await sb.from("push_subs").upsert({ endpoint: j.endpoint, user_id: me.id, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
    return r.error ? "error:" + r.error.message : "ok";
  }
  function say(r) {
    if (r === "ok") alert("Notifications activées ✅\nTu seras prévenu quand on t'écrit.");
    else if (r === "denied") alert("Les notifications sont bloquées. Appuie sur le cadenas à côté de l'adresse du site, puis Autorisations, puis autorise les Notifications.");
    else if (r === "unsupported") alert("Ce navigateur ne permet pas les notifications. Installe l'application depuis Chrome (⋮ puis Installer l'application).");
    else if (r === "nokey") alert("Le serveur de notifications n'est pas encore prêt. Réessaie plus tard.");
    else if (r === "default") { /* refus ferme */ }
    else alert("Impossible d'activer les notifications : " + String(r).replace("error:", ""));
  }
  async function enable() { try { say(await sub(true)); } catch (e) { say("error:" + (e && e.message || e)); } removeBar(); }
  function removeBar() { var b = document.getElementById("pushbar"); if (b) b.remove(); }
  function dismissed() { try { return localStorage.getItem("afri_push_no") === "1"; } catch (e) { return false; } }
  function showBar() {
    if (document.getElementById("pushbar") || dismissed()) return;
    var bar = h("div", { id: "pushbar", style: "position:fixed;left:10px;right:10px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:80;background:#0b1b3a;color:#fff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,.35)" }, [
      h("div", { text: "🔔 Reçois une alerte quand on t'écrit", style: "flex:1;font-weight:600;font-size:15px" }),
      h("button", { type: "button", text: "Activer", style: "background:#25d366;color:#fff;border:0;border-radius:18px;padding:9px 14px;font-weight:700", onclick: enable }),
      h("button", { type: "button", text: "✖", "aria-label": "Plus tard", style: "background:none;border:0;color:#fff;font-size:18px;padding:4px 6px", onclick: function () { try { localStorage.setItem("afri_push_no", "1"); } catch (e) {} removeBar(); } })
    ]);
    document.body.appendChild(bar);
  }
  function init() {
    var menu = document.getElementById("menu");
    if (menu && !document.getElementById("mNotif")) {
      var b = h("button", { type: "button", id: "mNotif", text: "🔔 Notifications", onclick: enable });
      var ref = document.getElementById("mRules");
      if (ref) menu.insertBefore(b, ref); else menu.appendChild(b);
    }
    if (!supported()) return;
    if (Notification.permission === "granted") { sub(false).catch(function () {}); }
    else if (Notification.permission === "default") { setTimeout(showBar, 5000); }
  }
  async function stop() {
    try {
      if (!supported()) return;
      var reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription();
      if (s) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
    } catch (e) {}
  }
  return { init: init, stop: stop };
})();

var AfriPresence = (function () {
  var t = null, on = false;
  function beat() {
    if (!me || !sb) return;
    try { sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(function () {}, function () {}); } catch (e) {}
  }
  function vis() { if (document.hidden) beat(); else { beat(); } }
  function init() {
    if (on) return; on = true;
    beat();
    t = setInterval(function () { if (!document.hidden) beat(); }, 45000);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", beat);
  }
  function stop() {
    on = false; if (t) clearInterval(t); t = null;
    document.removeEventListener("visibilitychange", vis);
    window.removeEventListener("pagehide", beat);
    beat();
  }
  function isOn(ts) { return !!ts && Date.now() - new Date(ts).getTime() < 100000; }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function text(ts) {
    if (!ts) return "";
    var d = new Date(ts), n = new Date(), diff = n - d;
    if (diff < 100000) return "En ligne";
    var hm = p2(d.getHours()) + ":" + p2(d.getMinutes());
    if (diff < 3600000) return "Actif il y a " + Math.max(2, Math.round(diff / 60000)) + " min";
    var sd = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (d >= sd) return "Vu aujourd'hui à " + hm;
    if (d >= new Date(sd - 86400000)) return "Vu hier à " + hm;
    return "Vu le " + p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + " à " + hm;
  }
  function fill(el, ts) {
    var s = text(ts);
    el.textContent = s ? (isOn(ts) ? "● " + s : s) : "";
    el.className = "pst" + (isOn(ts) ? " on" : "");
  }
  function avatar(p, size) {
    var w = h("div", { cls: "avw" }, [avEl(p, size)]);
    if (p && isOn(p.last_seen)) w.appendChild(h("span", { cls: "on" }));
    return w;
  }
  return { init: init, stop: stop, fill: fill, avatar: avatar, text: text, isOn: isOn };
})();

