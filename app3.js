/* ---------- Appels integres (WebRTC via PeerJS, serveurs gratuits) ---------- */
var AfriCall = (function () {
  var LIBS = ["https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js", "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"];
  var ICE = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ];
  var peer = null, ready = false, loading = false, st = null, actx = null, ringTimer = null, ov = null;

  function pid(uid) { return "afri" + String(uid).replace(/-/g, ""); }
  function loadLib(cb) {
    if (window.Peer) return cb(true);
    var i = 0;
    (function next() {
      if (i >= LIBS.length) return cb(false);
      var sc = document.createElement("script"), t = setTimeout(function () { sc.onload = sc.onerror = null; next(); }, 10000);
      sc.src = LIBS[i++];
      sc.onload = function () { clearTimeout(t); window.Peer ? cb(true) : next(); };
      sc.onerror = function () { clearTimeout(t); next(); };
      document.head.appendChild(sc);
    })();
  }
  function init() {
    if (peer || loading || !me) return;
    loading = true;
    loadLib(function (ok) { loading = false; if (ok && me) open(); });
  }
  function open() {
    try { peer = new Peer(pid(me.id), { config: { iceServers: ICE }, debug: 0 }); } catch (e) { peer = null; return; }
    peer.on("open", function () { ready = true; });
    peer.on("connection", onConn);
    peer.on("call", onMedia);
    peer.on("disconnected", function () { ready = false; setTimeout(function () { try { if (peer && !peer.destroyed) peer.reconnect(); } catch (e) {} }, 2000); });
    peer.on("error", function (e) {
      var t = e && e.type;
      if (t === "peer-unavailable") { if (st && st.role === "out" && st.phase !== "live") finish("offline"); return; }
      if (t === "unavailable-id") { ready = false; return; }
      setTimeout(function () { try { if (peer && peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (x) {} }, 4000);
    });
  }
  function stop() {
    if (st) finish("bye", true);
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = null; ready = false;
  }

  async function getMedia(video) {
    try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user" } : false }); }
    catch (e) { if (video) { try { return await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) {} } return null; }
  }
  function send(conn, m) { try { if (conn && conn.open) conn.send(m); } catch (e) {} }

  /* ----- sonnerie ----- */
  function ringStart(inc) {
    ringStop();
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) { actx = null; }
    function beep() {
      try { if (actx) { var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = inc ? 880 : 440; g.gain.value = 0.08; o.connect(g); g.connect(actx.destination); o.start(); setTimeout(function () { try { o.stop(); } catch (e) {} }, inc ? 400 : 800); } } catch (e) {}
      if (inc) { try { if (navigator.vibrate) navigator.vibrate([400, 200, 400]); } catch (e) {} }
    }
    beep(); ringTimer = setInterval(beep, inc ? 1800 : 3000);
  }
  function ringStop() { clearInterval(ringTimer); ringTimer = null; try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {} }

  /* ----- interface ----- */
  function btn(txt, bg, fn, small) {
    return h("button", { type: "button", text: txt, onclick: fn, style: "border:0;border-radius:50%;width:" + (small ? 56 : 68) + "px;height:" + (small ? 56 : 68) + "px;font-size:" + (small ? 24 : 28) + "px;background:" + bg + ";color:#fff;display:flex;align-items:center;justify-content:center" });
  }
  function ui(msg) {
    if (ov) { ov.remove(); ov = null; }
    if (!st) return;
    ov = h("div", { style: "position:fixed;inset:0;z-index:300;background:#0b1b3a;color:#fff;display:flex;flex-direction:column;font-family:inherit" });
    var rv = document.createElement("video"); rv.autoplay = true; rv.setAttribute("playsinline", ""); rv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;display:" + (st.phase === "live" && st.video ? "block" : "none");
    if (st.remote) rv.srcObject = st.remote;
    ov.appendChild(rv);
    var lv = document.createElement("video"); lv.autoplay = true; lv.muted = true; lv.setAttribute("playsinline", ""); lv.style.cssText = "position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;width:96px;height:132px;object-fit:cover;border-radius:12px;border:2px solid #fff;background:#000;transform:scaleX(-1);display:" + (st.local && st.video && st.local.getVideoTracks().length ? "block" : "none");
    if (st.local) lv.srcObject = st.local;
    ov.appendChild(lv);
    var status = msg || (st.phase === "dial" ? "Connexion…" : st.phase === "ring" ? (st.role === "out" ? "Ça sonne…" : (st.video ? "Appel vidéo entrant…" : "Appel vocal entrant…")) : st.phase === "wait" ? "Connexion…" : "En communication");
    var showInfo = !(st.phase === "live" && st.video);
    var info = h("div", { style: "position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:20px;" + (showInfo ? "" : "visibility:hidden") }, [
      avEl(st.p, 110), h("div", { text: st.p.name, style: "font-size:26px;font-weight:800" }), h("div", { text: status, id: "callst", style: "font-size:17px;opacity:.85;max-width:280px" })
    ]);
    ov.appendChild(info);
    var bar = h("div", { style: "position:relative;display:flex;justify-content:center;gap:26px;padding:20px 20px calc(36px + env(safe-area-inset-bottom))" });
    if (msg) { /* message final : pas de boutons */ }
    else if (st.role === "in" && st.phase === "ring") {
      bar.appendChild(btn("✖", "#e03131", function () { hangup(); }));
      bar.appendChild(btn("✔", "#25d366", accept));
    } else {
      if (st.phase === "live") {
        var mic = btn(st.mic === false ? "🔇" : "🎤", "rgba(255,255,255,.25)", function () { toggle("mic"); }, true);
        bar.appendChild(mic);
        if (st.video && st.local && st.local.getVideoTracks().length) bar.appendChild(btn(st.cam === false ? "🚫" : "📷", "rgba(255,255,255,.25)", function () { toggle("cam"); }, true));
      }
      bar.appendChild(btn("📞", "#e03131", function () { hangup(); }));
    }
    ov.appendChild(bar);
    document.body.appendChild(ov);
  }
  function toggle(k) {
    if (!st || !st.local) return;
    var tr = k === "mic" ? st.local.getAudioTracks() : st.local.getVideoTracks();
    st[k] = !(st[k] !== false);
    tr.forEach(function (t) { t.enabled = st[k]; });
    ui();
  }

  /* ----- fin d'appel ----- */
  var TXT = { offline: "n'est pas connecté(e) à AfriConnect en ce moment. Réessaie plus tard ou appelle sur WhatsApp.", refused: "a refusé l'appel.", busy: "est déjà en communication.", noanswer: "n'a pas répondu.", bye: "Appel terminé.", error: "Appel interrompu. Vérifie ta connexion.", cancelled: "Appel manqué.", missed: "Appel manqué." };
  function finish(reason, silent) {
    var s = st; if (!s) return;
    st = null;
    clearTimeout(s.timer); ringStop();
    try { if (s.call) s.call.close(); } catch (e) {}
    try { if (s.conn) setTimeout(function () { try { s.conn.close(); } catch (e) {} }, 400); } catch (e) {}
    try { if (s.local) s.local.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    if (s.role === "out" && s.phase !== "live" && (reason === "offline" || reason === "noanswer" || reason === "cancelled")) {
      try { sb.from("messages").insert({ receiver: s.oid, body: "📞 Appel " + (s.video ? "vidéo" : "vocal") + " manqué" }); } catch (e) {}
    }
    if (ov) { ov.remove(); ov = null; }
    if (silent) return;
    var text = (reason === "bye" || reason === "error" || reason === "cancelled" || reason === "missed") ? TXT[reason] : s.p.name + " " + TXT[reason];
    var tmp = h("div", { style: "position:fixed;left:16px;right:16px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:310;background:#0b1b3a;color:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.4);text-align:center;font-weight:600" }, [h("div", { text: text })]);
    if (reason === "offline" && s.phone) tmp.appendChild(h("button", { type: "button", text: "📱 Appeler sur WhatsApp", style: "margin-top:10px;background:#25d366;color:#fff;border:0;border-radius:20px;padding:10px 16px;font-weight:700", onclick: function () { window.open("https://wa.me/" + String(s.phone).replace(/\D/g, ""), "_blank"); } }));
    document.body.appendChild(tmp);
    setTimeout(function () { tmp.remove(); }, reason === "offline" ? 9000 : 3000);
  }
  function hangup() {
    if (!st) return;
    if (st.phase === "live" || st.phase === "wait") send(st.conn, { t: "bye" });
    else if (st.role === "out") send(st.conn, { t: "cancel" });
    else send(st.conn, { t: "refuse" });
    finish(st.role === "out" && st.phase !== "live" ? "cancelled" : "bye", st.role === "in" && st.phase === "ring");
  }

  /* ----- signalisation ----- */
  async function onSig(m) {
    if (!st || !m) return;
    if (m.t === "accept" && st.role === "out") {
      st.phase = "wait"; clearTimeout(st.timer); ringStop(); ui();
      try { st.call = peer.call(pid(st.oid), st.local, { metadata: {} }); attach(st.call); } catch (e) { finish("error"); }
    } else if (m.t === "refuse") finish("refused");
    else if (m.t === "busy") finish("busy");
    else if (m.t === "cancel") finish("cancelled");
    else if (m.t === "bye") finish("bye");
  }
  function attach(call) {
    call.on("stream", function (rs) { if (!st) return; st.remote = rs; st.phase = "live"; clearTimeout(st.timer); ringStop(); ui(); });
    call.on("close", function () { if (st && st.call === call) finish("bye"); });
    call.on("error", function () { if (st && st.call === call) finish("error"); });
  }
  function onConn(conn) {
    conn.on("data", function (m) {
      if (m && m.t === "ring") {
        if (st || (typeof blocked !== "undefined" && false)) { send(conn, { t: "busy" }); return; }
        st = { role: "in", conn: conn, p: { name: m.name || "Un membre", avatar_url: m.avatar || null }, video: m.video !== false, phase: "ring" };
        ui(); ringStart(true);
        st.timer = setTimeout(function () { if (st && st.phase === "ring") { send(conn, { t: "refuse" }); finish("missed"); } }, 50000);
      } else if (st && st.conn === conn) onSig(m);
    });
    conn.on("close", function () { if (st && st.conn === conn && st.role === "in" && st.phase === "ring") finish("cancelled"); });
  }
  function onMedia(call) {
    if (!st || st.role !== "in" || st.phase !== "wait" || !st.local) { try { call.close(); } catch (e) {} return; }
    st.call = call; call.answer(st.local); attach(call);
  }
  async function accept() {
    if (!st || st.role !== "in") return;
    ringStop(); clearTimeout(st.timer);
    var s = st; s.phase = "wait"; ui("Connexion…");
    var ms = await getMedia(s.video);
    if (!st || st !== s) { if (ms) ms.getTracks().forEach(function (t) { t.stop(); }); return; }
    if (!ms) { send(s.conn, { t: "refuse" }); finish("error"); alert("Autorise le micro (et la caméra) pour répondre."); return; }
    s.local = ms; ui();
    send(s.conn, { t: "accept" });
    s.timer = setTimeout(function () { if (st === s && s.phase === "wait") finish("error"); }, 25000);
  }

  async function start(oid, p, video, phone) {
    if (st) return;
    if (!window.Peer) { init(); alert("Le service d'appel démarre. Réessaie dans quelques secondes."); return; }
    if (!ready) { init(); alert("Connexion au service d'appel… réessaie dans quelques secondes."); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert("Ce navigateur ne permet pas les appels. Ouvre AfriConnect dans Chrome."); return; }
    video = video !== false;
    var s = st = { role: "out", oid: oid, p: p, video: video, phase: "dial", phone: phone || (p && p.phone) || "" };
    ui();
    var ms = await getMedia(video);
    if (st !== s) { if (ms) ms.getTracks().forEach(function (t) { t.stop(); }); return; }
    if (!ms) { st = null; if (ov) { ov.remove(); ov = null; } alert("Autorise le micro" + (video ? " et la caméra" : "") + " pour appeler."); return; }
    s.local = ms; ui();
    ringStart(false);
    var conn = peer.connect(pid(oid), { reliable: true });
    s.conn = conn;
    conn.on("open", function () { if (st !== s) return; send(conn, { t: "ring", name: prof.name, avatar: prof.avatar_url, video: video }); s.phase = "ring"; ui(); });
    conn.on("data", onSig);
    conn.on("close", function () { if (st === s && s.phase !== "live" && s.phase !== "wait") finish("offline"); });
    s.timer = setTimeout(function () { if (st === s && s.phase !== "live" && s.phase !== "wait") { send(conn, { t: "cancel" }); finish("noanswer"); } }, 45000);
  }
  return { init: init, stop: stop, start: start };
})();
