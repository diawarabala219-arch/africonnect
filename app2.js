/* ---------- Membres + invitations ---------- */
async function viewMembers(main) {
  var my = rid;
  var inv = h("div", {});
  var card = h("div", { cls: "card" });
  var q = h("input", { type: "text", placeholder: "Chercher un membre…" });
  var list = h("div", { style: "margin-top:8px" });
  card.appendChild(q); card.appendChild(list);
  main.appendChild(inv);
  main.appendChild(h("h3", { cls: "sec", text: "Membres d'AfriConnect" }));
  main.appendChild(card);
  await loadFr();
  var r = await sb.from("profiles").select("id,name,avatar_url,bio,verified").order("created_at", { ascending: false }).limit(200);
  if (my !== rid) return;
  if (r.error) { list.appendChild(h("div", { cls: "empty", text: frErr(r.error.message) })); return; }
  var byId = {}; r.data.forEach(function (m) { byId[m.id] = m; });
  function drawInv() {
    inv.textContent = "";
    var recv = fr.filter(function (f) { return f.addressee === me.id && f.status === "pending"; });
    if (!recv.length) return;
    inv.appendChild(h("h3", { cls: "sec", text: "Invitations reçues (" + recv.length + ")" }));
    var c = h("div", { cls: "card" });
    recv.forEach(function (f) {
      var m = byId[f.requester] || { name: "Membre" };
      c.appendChild(h("div", { cls: "mem" }, [
        h("a", { cls: "who", href: "#/profil/" + f.requester }, [avEl(m, 46)]),
        h("div", { cls: "info" }, [nm(m), friendActions(f.requester, redraw)])
      ]));
    });
    inv.appendChild(c);
  }
  function draw() {
    var t = q.value.trim().toLowerCase(); list.textContent = "";
    var rows = r.data.filter(function (m) { return m.id !== me.id && !blocked[m.id] && (!t || (m.name || "").toLowerCase().indexOf(t) >= 0); });
    if (!rows.length) { list.appendChild(h("div", { cls: "empty", text: "Aucun autre membre pour l'instant. Invite tes amis !" })); return; }
    rows.forEach(function (m) {
      list.appendChild(h("div", { cls: "mem" }, [
        h("a", { cls: "who", href: "#/profil/" + m.id }, [avEl(m, 46)]),
        h("div", { cls: "info" }, [
          h("a", { cls: "who", href: "#/profil/" + m.id }, [nm(m)]),
          h("div", { cls: "bio", text: m.bio || "" }),
          friendActions(m.id, redraw)
        ])
      ]));
    });
  }
  function redraw() { drawInv(); draw(); }
  q.oninput = draw; redraw();
}

/* ---------- Messages ---------- */
async function viewConvos(main) {
  var my = rid;
  main.appendChild(h("h3", { cls: "sec", text: "Messages" }));
  var card = h("div", { cls: "card" });
  main.appendChild(card);
  if (AI_URL) {
    var ai = h("div", { cls: "conv", onclick: function () { openAI(); } }, [
      h("div", { cls: "av", text: "IA", style: "width:48px;height:48px;font-size:18px;background:linear-gradient(135deg,#1d6ff2,#0a7d3b)" }),
      h("div", { cls: "info" }, [h("div", { cls: "name", text: "Feredou IA ✨" }), h("div", { cls: "pv", text: "Ton assistant intelligent. Pose-lui une question." })])
    ]);
    card.appendChild(ai);
  }
  var r = await sb.from("messages").select("id,sender,receiver,body,created_at,read").order("created_at", { ascending: false }).limit(300);
  if (my !== rid) return;
  if (r.error) { card.appendChild(h("div", { cls: "empty", text: frErr(r.error.message) })); return; }
  var last = {}, order = [];
  r.data.forEach(function (m) {
    var o = m.sender === me.id ? m.receiver : m.sender;
    if (!last[o] && !blocked[o]) { last[o] = m; order.push(o); }
  });
  if (!order.length) { card.appendChild(h("div", { cls: "empty", text: "Aucune conversation. Va dans « Membres » pour écrire à quelqu'un." })); return; }
  var p = await sb.from("profiles").select("id,name,avatar_url").in("id", order);
  if (my !== rid) return;
  var byId = {}; (p.data || []).forEach(function (x) { byId[x.id] = x; });
  order.forEach(function (o) {
    var m = last[o], pr = byId[o] || { name: "Membre" }, un = m.receiver === me.id && !m.read;
    card.appendChild(h("div", { cls: "conv" + (un ? " un" : ""), onclick: function () { location.hash = "#/messages/" + o; } }, [
      avEl(pr, 48),
      h("div", { cls: "info" }, [h("div", { cls: "name", text: pr.name }), h("div", { cls: "pv", text: (m.sender === me.id ? "Toi : " : "") + m.body })]),
      h("div", { cls: "time", text: ago(m.created_at) }),
      un ? h("div", { cls: "dot" }) : null
    ]));
  });
}
function openAI() {
  if (document.getElementById("aiov")) return;
  var ov = h("div", { cls: "aiov", id: "aiov" }), sheet = h("div", { cls: "sheet" });
  ov.appendChild(sheet);
  ov.onclick = function (e) { if (e.target === ov) closeAI(); };
  document.body.appendChild(ov);
  $("fab").classList.add("hide");
  viewAI(sheet, closeAI);
}
function closeAI() {
  var o = document.getElementById("aiov"); if (o) o.remove();
  var f = $("fab"); if (f) f.classList.remove("hide");
}
function viewAI(main, close) {
  var KEY = "afri_ia_" + me.id, hist = [];
  try { hist = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
  var msgs = h("div", { cls: "msgs" });
  var inp = h("input", { type: "text", maxlength: "2000", placeholder: "Pose une question à Feredou IA…" });
  var send = h("button", { type: "button", text: "Envoyer" });
  var logo = h("div", { cls: "av", text: "IA", style: "width:38px;height:38px;font-size:15px;background:linear-gradient(135deg,#0866ff,#0a7d3b)" });
  main.appendChild(h("div", { cls: "card chat" }, [
    h("div", { cls: "hd" }, [close ? h("button", { cls: "xb", type: "button", text: "×", "aria-label": "Fermer", onclick: close }) : h("a", { href: "#/messages", text: "‹" }), logo, h("div", {}, [h("div", { cls: "name", text: "Feredou IA ✨" }), h("div", { cls: "time", text: "Assistant intelligent" })])]),
    msgs, h("div", { cls: "send" }, [inp, send])
  ]));
  function save() { try { localStorage.setItem(KEY, JSON.stringify(hist.slice(-40))); } catch (e) {} }
  function draw() {
    msgs.textContent = "";
    if (!hist.length) msgs.appendChild(h("div", { cls: "empty", text: "Bonjour " + prof.name.split(" ")[0] + " 👋 Je suis Feredou IA. Pose-moi n'importe quelle question." }));
    hist.forEach(function (m) { msgs.appendChild(h("div", { cls: "m" + (m.role === "user" ? " me" : "") }, [document.createTextNode(m.text)])); });
    msgs.scrollTop = msgs.scrollHeight;
  }
  var wait = false;
  async function doSend() {
    var t = inp.value.trim(); if (!t || wait) return;
    wait = true; send.disabled = true; inp.value = "";
    hist.push({ role: "user", text: t }); draw();
    var tmp = h("div", { cls: "m" }, [document.createTextNode("Feredou IA réfléchit…")]); msgs.appendChild(tmp); msgs.scrollTop = msgs.scrollHeight;
    var out;
    try {
      var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 60000);
      var r = await fetch(AI_URL + "/afri/ia", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
        body: JSON.stringify({ device: "AC" + me.id.replace(/-/g, "").slice(0, 6).toUpperCase(), messages: hist.slice(-12).map(function (m) { return { role: m.role, text: m.text }; }) }) });
      clearTimeout(to);
      var j = await r.json().catch(function () { return {}; });
      out = j.reply || j.error || "Feredou IA n'est pas disponible pour l'instant.";
    } catch (e) { out = "Feredou IA n'est pas disponible pour l'instant. Réessaie plus tard."; }
    hist.push({ role: "model", text: out }); save(); wait = false; send.disabled = false; draw();
  }
  send.onclick = doSend;
  inp.onkeydown = function (e) { if (e.key === "Enter") doSend(); };
  draw();
}
function fmtT(iso) {
  var d = new Date(iso), n = new Date(), hh = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  if (d.toDateString() === n.toDateString()) return hh;
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + " " + hh;
}
async function viewChat(main, id) {
  var my = rid;
  if (id === "ia") { viewAI(main); return; }
  if (!UUID.test(id) || id === me.id) { main.appendChild(h("div", { cls: "empty", text: "Conversation introuvable." })); return; }
  var pr = (await profRow(id, "id,name,avatar_url,bio,verified")).data;
  await loadFr();
  if (my !== rid) return;
  if (!pr) { main.appendChild(h("div", { cls: "empty", text: "Membre introuvable." })); return; }
  var SVG = {
    cam: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="4"/><circle cx="8.5" cy="9" r="2" fill="#fff"/><path d="M3 19l6-6 4 4 3-3 5 5z" fill="#fff"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0z"/><rect x="11" y="17" width="2" height="4"/></svg>',
    like: '<svg viewBox="0 0 24 24"><path d="M2 10h4v11H2zM8 21h9.4a2 2 0 0 0 2-1.6l1.5-7A2 2 0 0 0 19 10h-5l.8-3.8A2.2 2.2 0 0 0 12.6 4L8 10z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M2 21l20-9L2 3v7l14 2-14 2z"/></svg>'
  };
  function ic(k, label, fn) { var b = h("button", { cls: "ic", type: "button", "aria-label": label }); b.innerHTML = SVG[k]; b.onclick = fn; return b; }

  var msgs = h("div", { cls: "msgs" });
  var inp = h("input", { type: "text", maxlength: "2000", placeholder: "Message" });
  var em = h("button", { cls: "em", type: "button", text: "😊", "aria-label": "Emojis" });
  var fileIn = h("input", { type: "file", accept: "image/*", cls: "hide" });
  var bCam = ic("cam", "Photo", function () { fileIn.click(); });
  var bMic = ic("mic", "Message vocal", function () { startRec(); });
  var bRight = ic("like", "J'aime", function () { if (inp.value.trim()) doSend(); else sendRow({ body: "👍" }); });
  var bar = h("div", { cls: "mbar" }, [bCam, bMic, h("div", { cls: "pin" }, [inp, em]), bRight, fileIn]);
  var emo = h("div", { cls: "emo hide" });
  "😀😂😍🥰😘😎🤩😅😭😡👍👎🙏👏💪🔥❤️💚💛🎉🙌🤝😢😮🤔😴🤗😉😇🥳😜🙈🇬🇳✨💯😁😆😊🤣😋🤤😏😬🙄😱🤯😤😥🫶".match(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*|\p{RI}\p{RI}/gu).forEach(function (e) {
    emo.appendChild(h("button", { type: "button", text: e, onclick: function () { inp.value += e; inp.focus(); upd(); } }));
  });
  var recb = h("div", { cls: "recb hide" });
  var recT = h("span", { text: "0:00", style: "font-weight:700;flex:1" });
  recb.appendChild(h("span", { cls: "dot2" })); recb.appendChild(recT);
  recb.appendChild(h("button", { cls: "no2", type: "button", text: "Annuler", onclick: function () { stopRec(false); } }));
  recb.appendChild(h("button", { cls: "go2", type: "button", text: "Envoyer ➤", onclick: function () { stopRec(true); } }));
  var back = h("a", { href: "#/messages", text: "‹", style: "font-size:34px;line-height:1;color:var(--brand);text-decoration:none;padding:0 6px" });
  var gear = h("button", { cls: "xb", type: "button", text: "⚙", "aria-label": "Réglages", style: "font-size:26px;color:var(--ink)" });
  var card = h("div", { cls: "card chat" }, [
    h("div", { cls: "hd" }, [back, h("a", { cls: "who", href: "#/profil/" + id }, [avEl(pr, 40)]), nm(pr), h("button", { cls: "xb", type: "button", text: "📞", "aria-label": "Appel vidéo", style: "margin-left:auto;font-size:24px", onclick: startCall }), gear]),
    msgs, emo, h("div", { id: "mfoot" }, [bar, recb])
  ]);
  main.appendChild(card);
  recb.parentNode.insertBefore(recb, bar);

  function upd() {
    var has = !!inp.value.trim();
    bRight.innerHTML = has ? SVG.send : SVG.like;
    bRight.setAttribute("aria-label", has ? "Envoyer" : "J'aime");
  }
  inp.oninput = upd;
  inp.onkeydown = function (e) { if (e.key === "Enter") doSend(); };
  em.onclick = function () { emo.classList.toggle("hide"); };
  gear.onclick = function () {
    sheetMenu(pr.name, [
      ["👤 Voir le profil", function () { location.hash = "#/profil/" + id; }],
      ["📞 Appel vidéo", startCall],
      pr.phone ? ["📱 Appeler sur WhatsApp", function () { window.open("https://wa.me/" + String(pr.phone).replace(/\D/g, ""), "_blank"); }] : ["📱 Pas de numéro WhatsApp", function () {}],
      ["⚠️ Signaler", async function () {
        var why = prompt("Pourquoi signaler cette personne ?"); if (!why) return;
        var x = await sb.from("reports").insert({ target_type: "user", target_id: id, reason: why.slice(0, 200) });
        alert(x.error ? frErr(x.error.message) : "Merci. Nous allons vérifier.");
      }],
      ["🚫 Bloquer " + pr.name, async function () {
        if (!confirm("Bloquer " + pr.name + " ?")) return;
        var x = await sb.from("blocks").insert({ blocked: id });
        if (x.error) { alert(frErr(x.error.message)); return; }
        blocked[id] = true; location.hash = "#/messages";
      }, true]
    ]);
  };
  function startCall() {
    var room = "AfriConnect" + [me.id, id].sort().join("").replace(/-/g, "").slice(0, 28), link = JITSI + room;
    if (!confirm("Lancer un appel vidéo avec " + pr.name + " ?")) return;
    sb.from("messages").insert({ receiver: id, body: "📞 Appel vidéo, rejoins-moi : " + link }).then(function () { window.open(link, "_blank"); load(true); });
  }
  async function sendRow(row) {
    row.receiver = id;
    var r = await sb.from("messages").insert(row);
    if (r.error) { alert(/media_/.test(r.error.message) ? "Lance d'abord le script SQL de la version 9." : frErr(r.error.message)); return false; }
    await load(true); msgs.scrollTop = msgs.scrollHeight; return true;
  }
  async function doSend() {
    var t = inp.value.trim(); if (!t) return;
    inp.value = ""; upd(); emo.classList.add("hide");
    if (!(await sendRow({ body: t }))) { inp.value = t; upd(); }
  }
  fileIn.onchange = async function () {
    var f = fileIn.files[0]; if (!f) return; fileIn.value = "";
    try {
      var url = await upload(await shrink(f, 1080, 0.8), "c-");
      await sendRow({ body: "📷 Photo", media_url: url, media_type: "image" });
    } catch (e) { alert(frErr(e.message)); }
  };
  /* message vocal */
  var mr = null, chunks = [], rt = null, t0 = 0;
  async function startRec() {
    if (!window.MediaRecorder || !navigator.mediaDevices) { alert("Les messages vocaux ne sont pas disponibles sur ce téléphone."); return; }
    var st;
    try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { alert("Autorise le micro pour envoyer un message vocal."); return; }
    var mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "");
    mr = new MediaRecorder(st, mime ? { mimeType: mime } : {}); mr._st = st; chunks = [];
    mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    mr.start(); t0 = Date.now();
    bar.classList.add("hide"); recb.classList.remove("hide"); recT.textContent = "0:00";
    rt = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      recT.textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
      if (s >= 120) stopRec(true);
    }, 500);
  }
  function stopRec(doSendIt) {
    if (!mr) return;
    clearInterval(rt);
    var m = mr; mr = null;
    bar.classList.remove("hide"); recb.classList.add("hide");
    m.onstop = async function () {
      m._st.getTracks().forEach(function (t) { t.stop(); });
      if (!doSendIt || !chunks.length || Date.now() - t0 < 600) return;
      var type = (m.mimeType || "audio/webm").split(";")[0], blob = new Blob(chunks, { type: type });
      try {
        var url = await upload(blob, "a-", /mp4/.test(type) ? "m4a" : "webm", type);
        await sendRow({ body: "🎤 Message vocal", media_url: url, media_type: "audio" });
      } catch (e) { alert(frErr(e.message)); }
    };
    m.stop();
  }

  function intro() {
    var rel = relOf(id), box = h("div", { cls: "intro" });
    box.appendChild(avEl(pr, 110)); box.appendChild(nm(pr, "inm"));
    box.appendChild(h("div", { cls: "time", text: rel.state === "friends" ? "Vous êtes amis sur AfriConnect" : "Vous n'êtes pas ami(e)s sur AfriConnect" }));
    if (pr.bio) box.appendChild(h("div", { cls: "time", text: pr.bio, style: "max-width:300px" }));
    var acts = h("div", { cls: "fa", style: "justify-content:center;margin-top:12px" });
    acts.appendChild(h("button", { type: "button", text: "👤 Voir le profil", onclick: function () { location.hash = "#/profil/" + id; } }));
    if (rel.state === "none") acts.appendChild(h("button", { cls: "p", type: "button", text: "➕ Ajouter", onclick: async function () { await sb.from("friendships").insert({ addressee: id }); await loadFr(); load(true); } }));
    else if (rel.state === "sent") acts.appendChild(h("button", { type: "button", text: "Invitation envoyée ✓", disabled: "" }));
    else if (rel.state === "received") acts.appendChild(h("button", { cls: "p", type: "button", text: "✓ Accepter", onclick: async function () { await sb.from("friendships").update({ status: "accepted" }).eq("id", rel.row.id); await loadFr(); load(true); } }));
    box.appendChild(acts);
    box.appendChild(h("div", { cls: "time", text: "Cette discussion est privée entre vous deux.", style: "margin-top:16px;max-width:280px" }));
    return box;
  }
  var key = "";
  async function fetchMsgs() {
    var pair = "and(sender.eq." + me.id + ",receiver.eq." + id + "),and(sender.eq." + id + ",receiver.eq." + me.id + ")";
    var r = await sb.from("messages").select("id,sender,body,created_at,read,media_url,media_type").or(pair).order("created_at", { ascending: true }).limit(200);
    if (r.error && /media_/.test(r.error.message)) r = await sb.from("messages").select("id,sender,body,created_at,read").or(pair).order("created_at", { ascending: true }).limit(200);
    return r;
  }
  async function load(force) {
    var r = await fetchMsgs();
    if (my !== rid || r.error) return;
    var last = r.data.length ? r.data[r.data.length - 1] : null;
    var k = r.data.length + ":" + (last ? last.id + ":" + last.read : 0) + ":" + relOf(id).state;
    if (k !== key || force) {
      var near = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 120 || !key;
      key = k; msgs.textContent = "";
      msgs.appendChild(intro());
      r.data.forEach(function (m, i) {
        var prev = r.data[i - 1];
        if (!prev || new Date(m.created_at) - new Date(prev.created_at) > 1800000) msgs.appendChild(h("div", { cls: "tm", text: fmtT(m.created_at) }));
        var mine = m.sender === me.id, b = h("div", { cls: "m" + (mine ? " me" : "") + (m.body === "👍" && !m.media_type ? " big" : "") + (m.media_type === "image" ? " media" : "") });
        if (m.media_type === "image" && m.media_url) b.appendChild(h("img", { src: m.media_url, alt: "Photo", loading: "lazy", onclick: function () { window.open(m.media_url, "_blank"); } }));
        else if (m.media_type === "audio" && m.media_url) b.appendChild(h("audio", { src: m.media_url, controls: "", preload: "metadata" }));
        else b.appendChild(linkify(m.body));
        msgs.appendChild(b);
      });
      if (last && last.sender === me.id) msgs.appendChild(h("div", { cls: "stt" }, last.read ? [avEl(pr, 16), document.createTextNode("Vu")] : [document.createTextNode("✓ Envoyé")]));
      if (near) msgs.scrollTop = msgs.scrollHeight;
    }
    if (r.data.some(function (m) { return m.sender === id && !m.read; })) {
      await sb.from("messages").update({ read: true }).eq("receiver", me.id).eq("sender", id).eq("read", false);
      refreshBadges();
    }
  }
  await load(true);
  msgs.scrollTop = msgs.scrollHeight;
  timer = setInterval(function () { if (!document.hidden) load(false); }, 4000);
}

/* ---------- Groupes et pages ---------- */
async function viewGroups(main) {
  var my = rid;
  main.appendChild(h("h3", { cls: "sec", text: "Groupes et pages" }));
  var top = h("div", { cls: "card" });
  var bNew = h("button", { cls: "btn", type: "button", text: "➕ Créer un groupe ou une page", style: "margin-top:0" });
  var q = h("input", { type: "text", placeholder: "Chercher un groupe…", style: "margin-top:10px" });
  top.appendChild(bNew); top.appendChild(q);
  var card = h("div", { cls: "card" });
  main.appendChild(top); main.appendChild(card);
  bNew.onclick = function () {
    sheetMenu("Que veux-tu créer ?", [
      ["👥 Un groupe : tous les membres peuvent publier", function () { createGroup("group"); }],
      ["📄 Une page : toi seul publies (commerce, marque, artiste…)", function () { createGroup("page"); }]
    ]);
  };
  async function createGroup(kind) {
    var name = prompt("Nom (2 à 60 lettres) :"); if (!name || name.trim().length < 2) return;
    var desc = prompt("Description courte (facultatif) :") || "";
    var x = await sb.from("groups").insert({ name: name.trim().slice(0, 60), description: desc.trim().slice(0, 200), kind: kind }).select("id").single();
    if (x.error) { alert(/groups/.test(x.error.message) ? "Lance d'abord le script SQL de la version 7." : frErr(x.error.message)); return; }
    location.hash = "#/groupe/" + x.data.id;
  }
  var g = await sb.from("groups").select("id,name,description,kind,group_members(count)").order("created_at", { ascending: false }).limit(100);
  var mm = await sb.from("group_members").select("group_id").eq("user_id", me.id);
  if (my !== rid) return;
  if (g.error) { card.appendChild(h("div", { cls: "empty", text: /groups/.test(g.error.message) ? "Lance d'abord le script SQL de la version 7." : frErr(g.error.message) })); return; }
  var mine = {}; (mm.data || []).forEach(function (x) { mine[x.group_id] = true; });
  var rows = g.data.slice().sort(function (a, b) { return (mine[b.id] ? 1 : 0) - (mine[a.id] ? 1 : 0); });
  function draw() {
    var t = q.value.trim().toLowerCase(); card.textContent = "";
    var f = rows.filter(function (x) { return !t || x.name.toLowerCase().indexOf(t) >= 0; });
    if (!f.length) { card.appendChild(h("div", { cls: "empty", text: "Aucun groupe pour l'instant. Crée le premier !" })); return; }
    f.forEach(function (x) {
      var n = x.group_members && x.group_members[0] ? x.group_members[0].count : 0;
      card.appendChild(h("div", { cls: "gcard", onclick: function () { location.hash = "#/groupe/" + x.id; } }, [
        h("div", { cls: "gic", text: ini(x.name) }),
        h("div", { cls: "info", style: "flex:1;min-width:0" }, [
          h("div", { cls: "name", text: x.name }),
          h("div", { cls: "time", text: (x.kind === "page" ? "Page" : "Groupe") + " · " + n + (x.kind === "page" ? " abonné" : " membre") + (n > 1 ? "s" : "") + (mine[x.id] ? " · ✓ Rejoint" : "") }),
          x.description ? h("div", { cls: "bio", text: x.description }) : null
        ])
      ]));
    });
  }
  q.oninput = draw; draw();
}
async function viewGroup(main, id) {
  var my = rid;
  if (!UUID.test(id)) { main.appendChild(h("div", { cls: "empty", text: "Groupe introuvable." })); return; }
  var g = (await sb.from("groups").select("id,name,description,kind,owner,group_members(count)").eq("id", id).maybeSingle()).data;
  var jm = (await sb.from("group_members").select("user_id").eq("group_id", id).eq("user_id", me.id)).data || [];
  if (my !== rid) return;
  if (!g) { main.appendChild(h("div", { cls: "empty", text: "Groupe introuvable." })); return; }
  var joined = jm.length > 0, isPage = g.kind === "page", owner = g.owner === me.id;
  var n = g.group_members && g.group_members[0] ? g.group_members[0].count : 0;
  var card = h("div", { cls: "card" });
  card.appendChild(h("div", { cls: "cover" }));
  var pf = h("div", { cls: "pf" });
  pf.appendChild(h("div", { cls: "gic", text: ini(g.name), style: "width:96px;height:96px;font-size:40px;border:4px solid #fff;border-radius:20px" }));
  pf.appendChild(h("h2", { text: g.name }));
  pf.appendChild(h("div", { cls: "time", text: (isPage ? "Page" : "Groupe public") + " · " + n + (isPage ? " abonné" : " membre") + (n > 1 ? "s" : "") }));
  if (g.description) pf.appendChild(h("p", { text: g.description }));
  var btns = h("div", { cls: "btns" });
  if (!owner) {
    var jb = h("button", { type: "button", text: joined ? (isPage ? "✓ Abonné" : "✓ Membre · Quitter") : (isPage ? "➕ S'abonner" : "➕ Rejoindre le groupe"), style: joined ? "" : "background:var(--brand);color:#fff" });
    jb.onclick = async function () {
      jb.disabled = true;
      var x = joined ? await sb.from("group_members").delete().eq("group_id", id).eq("user_id", me.id) : await sb.from("group_members").insert({ group_id: id });
      if (x.error) { alert(frErr(x.error.message)); jb.disabled = false; return; }
      route();
    };
    btns.appendChild(jb);
  }
  btns.appendChild(h("button", { type: "button", text: "📤 Inviter", onclick: function () {
    var link = location.origin + location.pathname + "#/groupe/" + id, txt = "Rejoins « " + g.name + " » sur AfriConnect : " + link;
    if (navigator.share) navigator.share({ title: g.name, text: txt }).catch(function () {}); else window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  } }));
  if (owner) btns.appendChild(h("button", { type: "button", text: "🗑 Supprimer", style: "color:var(--red)", onclick: async function () {
    if (!confirm("Supprimer définitivement « " + g.name + " » et ses publications ?")) return;
    await sb.from("groups").delete().eq("id", id); location.hash = "#/groupes";
  } }));
  pf.appendChild(btns); card.appendChild(pf); main.appendChild(card);
  var feed = h("div", {});
  if (owner || (!isPage && joined)) main.appendChild(composer(function () { loadPosts(feed, null, id); }, id));
  else main.appendChild(h("div", { cls: "card time", text: isPage ? "Seul le propriétaire publie sur cette page." : "Rejoins le groupe pour publier." }));
  main.appendChild(feed);
  loadPosts(feed, null, id);
}

/* ---------- Vidéos ---------- */
async function viewVideos(main) {
  var my = rid;
  var pubBtn = h("button", { type: "button", text: "➕ Publier", style: "background:var(--brand);color:#fff;border:0;border-radius:18px;padding:8px 16px;font-weight:700" });
  main.appendChild(h("div", { cls: "card", style: "display:flex;align-items:center;gap:10px;margin-bottom:0" }, [h("div", { cls: "name", text: "🎬 Vidéos", style: "flex:1;font-size:19px" }), pubBtn]));
  var comp = composer(function () { route(); }, null, true);
  comp.classList.add("hide"); comp.style.marginBottom = "0";
  main.appendChild(comp);
  pubBtn.onclick = function () { comp.classList.toggle("hide"); if (!comp.classList.contains("hide")) { var pl = comp.querySelector("#pill"); if (pl) pl.click(); } };
  var wrap = h("div", { cls: "reels" });
  main.appendChild(wrap);
  var r = await sb.from("posts").select(POST_SEL).not("video_url", "is", null).order("created_at", { ascending: false }).limit(30);
  if (my !== rid) return;
  if (r.error) { wrap.style.background = "var(--bg)"; wrap.appendChild(h("div", { cls: "empty", text: /video_url/.test(r.error.message) ? "Lance d'abord le script SQL de la version 7." : frErr(r.error.message) })); return; }
  var rows = r.data.filter(function (p) { return !blocked[p.user_id]; });
  if (!rows.length) {
    wrap.style.background = "var(--bg)";
    wrap.appendChild(h("div", { cls: "empty", text: "Aucune vidéo pour l'instant. Appuie sur « Publier » pour partager la première vidéo (15 Mo maximum, environ 30 secondes) !" }));
    return;
  }
  var muted = true, vids = [];
  rows.forEach(function (p) {
    var pr = p.profiles || { name: "Membre" };
    var mine = p.likes.some(function (l) { return l.user_id === me.id; });
    var n = p.likes.length;
    var v = h("video", { src: p.video_url, loop: "", muted: "", playsinline: "", preload: "metadata" });
    v.muted = true; vids.push(v);
    v.onclick = function () { if (v.paused) v.play().catch(function () {}); else v.pause(); };
    var likeB = h("button", { type: "button", text: "❤️", cls: mine ? "liked" : "", "aria-label": "J'aime" });
    var likeN = h("span", { text: String(n) });
    likeB.onclick = async function () {
      likeB.disabled = true;
      if (mine) { await sb.from("likes").delete().eq("post_id", p.id).eq("user_id", me.id); n--; mine = false; likeB.classList.remove("liked"); }
      else { await sb.from("likes").insert({ post_id: p.id, kind: "love" }); n++; mine = true; likeB.classList.add("liked"); }
      likeN.textContent = String(n); likeB.disabled = false;
    };
    var cB = h("button", { type: "button", text: "💬", "aria-label": "Commentaires", onclick: function () {
      var ov = h("div", { cls: "aiov" }), sh = h("div", { cls: "sheet", style: "display:block;overflow-y:auto;padding-bottom:20px" });
      sh.appendChild(h("div", { style: "text-align:right;position:sticky;top:0;background:#fff;z-index:2" }, [h("button", { cls: "xb", type: "button", text: "×", onclick: function () { ov.remove(); } })]));
      sh.appendChild(postCard(p, function () { ov.remove(); route(); }));
      ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
      ov.appendChild(sh); document.body.appendChild(ov);
    } });
    var shB = h("button", { type: "button", text: "↗", "aria-label": "Partager", onclick: function () {
      var txt = pr.name + " sur AfriConnect (vidéo)", link = location.origin + location.pathname;
      if (navigator.share) navigator.share({ title: "AfriConnect", text: txt, url: link }).catch(function () {}); else window.open("https://wa.me/?text=" + encodeURIComponent(txt + " " + link), "_blank");
    } });
    var mB = h("button", { type: "button", text: "🔇", "aria-label": "Son", onclick: function () {
      muted = !muted; vids.forEach(function (x) { x.muted = muted; });
      Array.prototype.forEach.call(wrap.querySelectorAll(".mb"), function (b) { b.textContent = muted ? "🔇" : "🔊"; });
    } });
    mB.classList.add("mb");
    var side = h("div", { cls: "side" }, [likeB, likeN, cB, h("span", { text: String(p.comments.length) }), shB, mB]);
    var ov = h("div", { cls: "ov" }, [
      h("div", { cls: "row" }, [h("a", { href: "#/profil/" + p.user_id }, [avEl(pr, 36)]), h("a", { href: "#/profil/" + p.user_id, style: "text-decoration:none" }, [nm(pr)])]),
      p.body ? h("div", { text: p.body, style: "margin-top:8px;white-space:pre-wrap;word-wrap:break-word;max-height:80px;overflow:hidden" }) : null
    ]);
    wrap.appendChild(h("div", { cls: "reel" }, [v, ov, side]));
  });
  var obs = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target.querySelector("video");
      if (e.isIntersecting && e.intersectionRatio > 0.7) { v.muted = muted; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else v.pause();
    });
  }, { root: wrap, threshold: [0, 0.7, 1] });
  window.__vobs = obs;
  Array.prototype.forEach.call(wrap.children, function (c) { obs.observe(c); });
}

/* ---------- Marché ---------- */
async function viewMarket(main) {
  var my = rid;
  main.appendChild(h("h3", { cls: "sec", text: "🛍️ Marché" }));
  var top = h("div", { cls: "card" });
  var bSell = h("button", { cls: "btn", type: "button", text: "➕ Vendre un article", style: "margin-top:0" });
  var form = h("div", { cls: "hide", style: "margin-top:10px" });
  var fT = h("input", { type: "text", placeholder: "Titre (ex : Téléphone Tecno)", maxlength: "80", cls: "inp2" });
  var fP = h("input", { type: "text", placeholder: "Prix (ex : 350 000 GNF)", maxlength: "30", cls: "inp2" });
  var fC = h("input", { type: "text", placeholder: "Ville / quartier", maxlength: "40", cls: "inp2" });
  var fD = h("textarea", { placeholder: "Description (état, contact WhatsApp…)", maxlength: "500", cls: "inp2" });
  var fF = h("input", { type: "file", accept: "image/*", cls: "hide" });
  var fB = h("button", { cls: "ph", type: "button", text: "📷 Ajouter une photo" });
  var fG = h("button", { cls: "go", type: "button", text: "Publier l'article" });
  var fE = h("p", { cls: "err" });
  var pic = null;
  fB.onclick = function () { fF.click(); };
  fF.onchange = async function () { var f = fF.files[0]; if (!f) return; try { pic = await shrink(f, 1000, 0.8); fB.textContent = "✓ Photo ajoutée"; } catch (e) { fE.textContent = frErr(e.message); } };
  fG.onclick = async function () {
    fE.textContent = "";
    if (fT.value.trim().length < 2) { fE.textContent = "Écris le titre de l'article."; return; }
    fG.disabled = true; fG.textContent = "Envoi…";
    try {
      var url = pic ? await upload(pic, "m-") : null;
      var x = await sb.from("listings").insert({ title: fT.value.trim(), price: fP.value.trim(), city: fC.value.trim(), description: fD.value.trim(), image_url: url });
      if (x.error) throw x.error;
      route();
    } catch (e) { fE.textContent = /listings/.test(String(e.message)) ? "Lance d'abord le script SQL de la version 7." : frErr(e.message); fG.disabled = false; fG.textContent = "Publier l'article"; }
  };
  form.appendChild(fT); form.appendChild(fP); form.appendChild(fC); form.appendChild(fD);
  form.appendChild(h("div", { cls: "tools" }, [fB, fF, fG])); form.appendChild(fE);
  bSell.onclick = function () { form.classList.toggle("hide"); };
  var q = h("input", { type: "text", placeholder: "Chercher un article…", style: "margin-top:10px" });
  top.appendChild(bSell); top.appendChild(form); top.appendChild(q);
  main.appendChild(top);
  var grid = h("div", { cls: "grid2" });
  main.appendChild(grid);
  var r = await sb.from("listings").select("id,title,price,city,description,image_url,sold,created_at,seller,profiles!listings_seller_fkey(name,avatar_url,verified)").order("created_at", { ascending: false }).limit(100);
  if (my !== rid) return;
  if (r.error) { grid.appendChild(h("div", { cls: "empty", text: /listings/.test(r.error.message) ? "Lance d'abord le script SQL de la version 7." : frErr(r.error.message), style: "grid-column:1/3" })); return; }
  var rows = r.data.filter(function (x) { return !blocked[x.seller]; });
  function draw() {
    var t = q.value.trim().toLowerCase(); grid.textContent = "";
    var f = rows.filter(function (x) { return !t || x.title.toLowerCase().indexOf(t) >= 0; });
    if (!f.length) { grid.appendChild(h("div", { cls: "empty", text: "Aucun article pour l'instant. Sois le premier à vendre !", style: "grid-column:1/3" })); return; }
    f.forEach(function (x) {
      var sp = x.profiles || { name: "Vendeur" };
      var c = h("div", { cls: "lst" }, [
        x.image_url ? h("img", { src: x.image_url, alt: x.title, loading: "lazy" }) : h("div", { cls: "noimg" }),
        h("div", { cls: "bd2" }, [
          h("div", { cls: "pr", text: (x.sold ? "VENDU · " : "") + (x.price || "Prix à discuter") }),
          h("div", { text: x.title, style: "font-weight:600" }),
          h("div", { cls: "time", text: (x.city ? x.city + " · " : "") + sp.name })
        ])
      ]);
      if (x.description) c.querySelector(".bd2").appendChild(h("div", { cls: "bio", text: x.description, style: "white-space:normal;max-height:40px" }));
      if (x.seller === me.id) {
        c.appendChild(h("button", { type: "button", text: x.sold ? "↩ Remettre en vente" : "✓ Marquer vendu", onclick: async function () { await sb.from("listings").update({ sold: !x.sold }).eq("id", x.id); route(); } }));
        c.appendChild(h("button", { type: "button", text: "🗑 Supprimer", style: "color:var(--red)", onclick: async function () { if (!confirm("Supprimer cet article ?")) return; await sb.from("listings").delete().eq("id", x.id); route(); } }));
      } else {
        c.appendChild(h("button", { type: "button", text: "💬 Contacter", onclick: function () { location.hash = "#/messages/" + x.seller; } }));
      }
      grid.appendChild(c);
    });
  }
  q.oninput = draw; draw();
}

/* ---------- Notifications ---------- */
async function viewAlerts(main) {
  var my = rid;
  main.appendChild(h("h3", { cls: "sec", text: "Notifications" }));
  var card = h("div", { cls: "card" }); main.appendChild(card);
  var r = await sb.from("notifications").select("id,kind,post_id,created_at,read,actor,profiles!notifications_actor_fkey(name,avatar_url)").order("created_at", { ascending: false }).limit(60);
  if (my !== rid) return;
  if (r.error) { card.appendChild(h("div", { cls: "empty", text: frErr(r.error.message) })); return; }
  if (!r.data.length) { card.appendChild(h("div", { cls: "empty", text: "Rien de nouveau pour l'instant. Les j'aime, commentaires et invitations apparaîtront ici." })); return; }
  var txt = { like: "a aimé ta publication.", comment: "a commenté ta publication.", invite: "t'a envoyé une invitation.", accept: "a accepté ton invitation." };
  r.data.forEach(function (n) {
    var a = n.profiles || { name: "Quelqu'un" };
    var t = h("div", { cls: "t" }, [h("b", { text: a.name }), document.createTextNode(" " + (txt[n.kind] || "")), h("div", { cls: "time", text: ago(n.created_at) })]);
    card.appendChild(h("div", { cls: "nt" + (n.read ? "" : " un"), onclick: function () {
      location.hash = n.kind === "invite" ? "#/membres" : n.kind === "accept" ? "#/profil/" + n.actor : "#/";
    } }, [avEl(a, 44), t]));
  });
  await sb.from("notifications").update({ read: true }).eq("user_id", me.id).eq("read", false);
  refreshBadges();
}

/* ---------- Démarrage ---------- */
async function start() {
  if (!SUPA_URL || !SUPA_KEY || !window.supabase) { show("setup"); return; }
  window.__log && window.__log("start");
  sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  $("authSwitch").onclick = function () { setMode(mode === "login" ? "signup" : "login"); };
  $("authGo").onclick = doAuth;
  $("fPass").onkeydown = function (e) { if (e.key === "Enter") doAuth(); };
  var menu = $("menu");
  $("bMenu").onclick = function (e) { e.stopPropagation(); menu.classList.toggle("hide"); };
  document.addEventListener("click", function () { menu.classList.add("hide"); });
  $("fab").onclick = openAI;
  var dip = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); dip = e; $("mInst").classList.remove("hide"); });
  $("mInst").onclick = async function () { if (dip) { dip.prompt(); await dip.userChoice; dip = null; $("mInst").classList.add("hide"); } };
  $("mInv").onclick = inviteFriends;
  $("mGrp").onclick = function () { location.hash = "#/groupes"; };
  $("mMkt").onclick = function () { location.hash = "#/marche"; };
  $("mRules").onclick = showRules;
  $("authRules").onclick = function (e) { e.preventDefault(); showRules(); };
  $("authForgot").onclick = async function () {
    var mail = $("fMail").value.trim();
    if (!mail) { $("authErr").textContent = "Écris d'abord ton e-mail dans la case ci-dessus."; return; }
    var r = await sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname });
    $("authErr").textContent = r.error ? frErr(r.error.message) : "E-mail envoyé ✓ Ouvre le lien reçu pour choisir un nouveau mot de passe.";
  };
  sb.auth.onAuthStateChange(function (ev) {
    if (ev === "PASSWORD_RECOVERY") {
      var p = prompt("Choisis ton nouveau mot de passe (6 caractères minimum) :");
      if (p && p.length >= 6) sb.auth.updateUser({ password: p }).then(function (r) { alert(r.error ? frErr(r.error.message) : "Mot de passe changé ✓"); });
    }
  });
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {} }
  $("mProf").onclick = function () { location.hash = "#/profil"; };
  $("mRef").onclick = function () { route(); refreshBadges(); };
  $("mOut").onclick = async function () { await sb.auth.signOut(); me = null; blocked = {}; clearInterval(timer); clearInterval(badgeTimer); clearInterval(callTimer); show("auth"); setMode("login"); };
  $("bPlus").onclick = function () {
    if (location.hash && location.hash !== "#/") location.hash = "#/";
    setTimeout(function () { var p = document.getElementById("pill"); window.scrollTo(0, 0); if (p) p.click(); }, 60);
  };
  $("bSearch").onclick = function () {
    location.hash = "#/membres";
    setTimeout(function () { var q = document.querySelector("#main input[type=text]"); if (q) q.focus(); }, 300);
  };
  window.addEventListener("hashchange", route);
  window.__log && window.__log("session");
  var s = await within(sb.auth.getSession(), 10000, "Le serveur AfriConnect (Supabase)");
  window.__log && window.__log(s.data.session ? "connecte" : "anonyme");
  if (s.data.session) await within(enter(s.data.session.user), 15000, "Le serveur AfriConnect (Supabase)"); else { show("auth"); setMode("login"); }
}
function splashFail(txt) {
  var m = document.getElementById("splashMsg"); if (!m) return;
  m.textContent = txt; document.getElementById("splashRetry").style.display = "inline-block"; document.getElementById("splashReset").style.display = "inline-block";
}
function within(p, ms, what) { return Promise.race([p, new Promise(function (_, no) { setTimeout(function () { no(new Error(what + " ne répond pas")); }, ms); })]); }
window.addEventListener("error", function (e) { splashFail("Erreur : " + (e.message || "inconnue")); });
window.addEventListener("unhandledrejection", function (e) { splashFail("Erreur : " + ((e.reason && e.reason.message) || e.reason || "inconnue")); });
window.__afriStart = function () { Promise.resolve().then(start).catch(function (e) { splashFail("Erreur : " + (e && e.message || e)); }); }; window.__afriReady();
