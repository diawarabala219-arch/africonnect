var SUPA_URL = "https://edsvhqwetulvypocdjku.supabase.co";
var SUPA_KEY = "sb_publishable_W1sRIAhFJ-83OvAVCpqjVQ_UUIeo7Bs";
var AI_URL = "https://feredou-ia--diawarabala219.replit.app";
var JITSI = "https://meet.ffmuc.net/";

var $ = function (id) { return document.getElementById(id); };
var callTimer = null, seenCalls = {}, blocked = {}, rid = 0, sb = null, me = null, prof = { name: "", avatar_url: null, bio: "" }, mode = "login", busy = false, open = {}, timer = null, badgeTimer = null, fr = [];
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var POST_SEL = "id,body,image_url,video_url,group_id,shared_name,shared_body,shared_image,created_at,user_id,profiles!posts_user_id_fkey(name,avatar_url,verified),likes(user_id,kind),comments(id,body,created_at,user_id,profiles!comments_user_id_fkey(name,avatar_url,verified))";
var RX = { like: ["👍", "J'aime"], love: ["❤️", "J'adore"], haha: ["😂", "Haha"], wow: ["😮", "Wouah"], sad: ["😢", "Triste"], angry: ["😡", "Grr"] };

function h(tag, props, kids) {
  var e = document.createElement(tag);
  for (var k in (props || {})) {
    if (k === "text") e.textContent = props[k];
    else if (k === "cls") e.className = props[k];
    else if (k.slice(0, 2) === "on") e[k] = props[k];
    else e.setAttribute(k, props[k]);
  }
  (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
  return e;
}
function ago(iso) {
  var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  if (s < 604800) return Math.floor(s / 86400) + " j";
  return new Date(iso).toLocaleDateString("fr-FR");
}
function ini(n) { return (n || "?").trim().charAt(0).toUpperCase() || "?"; }
function nm(p, extra) {
  var d = h("div", { cls: "name" + (extra ? " " + extra : ""), text: (p && p.name) || "Membre" });
  if (p && p.verified) d.appendChild(h("span", { cls: "vf", text: " ✔", title: "Compte vérifié" }));
  return d;
}
function linkify(txt) {
  var f = document.createDocumentFragment(), re = /(https?:\/\/[^\s]+)/g, last = 0, m;
  while ((m = re.exec(txt))) {
    if (m.index > last) f.appendChild(document.createTextNode(txt.slice(last, m.index)));
    f.appendChild(h("a", { href: m[1], target: "_blank", rel: "noopener", text: m[1], style: "color:inherit;text-decoration:underline;word-break:break-all" }));
    last = m.index + m[1].length;
  }
  if (last < txt.length) f.appendChild(document.createTextNode(txt.slice(last)));
  return f;
}
function sheetMenu(title, items) {
  var ov = h("div", { cls: "aiov" }), sh = h("div", { cls: "sheet", style: "height:auto;padding:8px 0 calc(12px + env(safe-area-inset-bottom))" });
  if (title) sh.appendChild(h("div", { cls: "time", text: title, style: "text-align:center;padding:8px" }));
  items.forEach(function (it) {
    sh.appendChild(h("button", { type: "button", text: it[0], style: "display:block;width:100%;text-align:left;background:none;border:0;padding:15px 20px;font-size:17px;font-weight:600" + (it[2] ? ";color:var(--red)" : ""), onclick: function () { ov.remove(); if (it[1]) it[1](); } }));
  });
  sh.appendChild(h("button", { type: "button", text: "Annuler", style: "display:block;width:100%;background:none;border:0;padding:15px 20px;font-size:17px;color:var(--mut)", onclick: function () { ov.remove(); } }));
  ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
  ov.appendChild(sh); document.body.appendChild(ov);
}
function showRules() {
  var ov = h("div", { cls: "rules" });
  ov.appendChild(h("h2", { text: "📜 Règles de la communauté" }));
  var ul = h("ul", { style: "padding-left:20px" });
  ["Respecte les autres : pas d'insultes, de haine, de harcèlement ni de menaces.",
   "Pas de nudité, de violence choquante ni de contenu qui touche aux enfants.",
   "Pas d'arnaques, de faux comptes, de faux produits ni de spam.",
   "Ne publie pas les photos ou informations privées d'une personne sans son accord.",
   "Sur le Marché, rencontre les vendeurs dans un lieu public et ne paie jamais à l'avance à un inconnu.",
   "Tu peux signaler (⚠️) ou bloquer (🚫) toute personne ou publication qui ne respecte pas ces règles.",
   "Les comptes qui ne respectent pas ces règles peuvent être suspendus."].forEach(function (t) { ul.appendChild(h("li", { text: t })); });
  ov.appendChild(ul);
  ov.appendChild(h("h2", { text: "🔒 Confidentialité", style: "margin-top:20px" }));
  ov.appendChild(h("p", { text: "Ton e-mail reste privé. Ton nom, ta photo, tes publications, tes stories et ton profil sont visibles par les membres d'AfriConnect. Tes messages privés ne sont visibles que par toi et la personne concernée. Tu peux supprimer tes publications à tout moment." }));
  ov.appendChild(h("button", { cls: "btn", type: "button", text: "J'ai compris", onclick: function () { ov.remove(); } }));
  document.body.appendChild(ov);
}
function avEl(p, size) {
  var st = "width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.42) + "px";
  if (p && p.avatar_url) return h("img", { cls: "av", src: p.avatar_url, alt: "", style: st });
  return h("div", { cls: "av", text: ini(p && p.name), style: st });
}
function frErr(m) {
  m = String(m || "");
  if (/Invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(m)) return "Cet e-mail a déjà un compte. Connecte-toi.";
  if (/Password should be/i.test(m)) return "Mot de passe trop court (6 caractères minimum).";
  if (/valid email|invalid format|Unable to validate email/i.test(m)) return "Adresse e-mail invalide.";
  if (/rate limit|too many/i.test(m)) return "Trop d'essais. Réessaie dans quelques minutes.";
  if (/Email not confirmed/i.test(m)) return "E-mail non confirmé : désactive « Confirm email » dans Supabase.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Pas de connexion. Réessaie.";
  if (/relation .* does not exist|schema cache/i.test(m)) return "La base n'est pas à jour : lance le script SQL de la version 3.";
  return m || "Une erreur est survenue.";
}
function show(which) {
  var sp = document.getElementById("splash"); if (sp) sp.remove();
  ["auth", "app", "setup"].forEach(function (k) { $(k).classList.toggle("hide", k !== which); });
}

/* ---------- Connexion / inscription ---------- */
function setMode(m) {
  mode = m;
  var su = m === "signup";
  $("nameBox").classList.toggle("hide", !su);
  $("authGo").textContent = su ? "Créer mon compte" : "Se connecter";
  $("authSwitch").textContent = su ? "J'ai déjà un compte" : "Pas de compte ? Créer un compte";
  $("authSub").textContent = su ? "Crée ton compte gratuit en 30 secondes." : "Connecte-toi pour retrouver tes amis.";
  $("fPass").autocomplete = su ? "new-password" : "current-password";
  $("authErr").textContent = "";
}
async function doAuth() {
  var mail = $("fMail").value.trim(), pass = $("fPass").value, nm = $("fName").value.trim();
  $("authErr").textContent = "";
  if (!mail || !pass) { $("authErr").textContent = "Remplis l'e-mail et le mot de passe."; return; }
  if (mode === "signup" && nm.length < 2) { $("authErr").textContent = "Écris ton nom (2 lettres minimum)."; return; }
  $("authGo").disabled = true;
  try {
    var r;
    if (mode === "signup") r = await sb.auth.signUp({ email: mail, password: pass, options: { data: { name: nm } } });
    else r = await sb.auth.signInWithPassword({ email: mail, password: pass });
    if (r.error) throw r.error;
    if (!r.data.session) { $("authErr").textContent = "Compte créé. Si rien ne se passe, désactive « Confirm email » dans Supabase."; return; }
    await enter(r.data.session.user);
  } catch (e) { $("authErr").textContent = frErr(e.message); }
  finally { $("authGo").disabled = false; }
}
async function enter(user) {
  me = user;
  var r = await profRow(user.id, "name,avatar_url,bio,verified");
  var d = r.data || {};
  prof = { name: d.name || (user.user_metadata && user.user_metadata.name) || "Membre", avatar_url: d.avatar_url || null, bio: d.bio || "", verified: !!d.verified, phone: d.phone || "" };
  await loadBlocks();
  show("app");
  route();
  refreshBadges();
  clearInterval(badgeTimer);
  badgeTimer = setInterval(refreshBadges, 30000);
  clearInterval(callTimer); callTimer = setInterval(checkCalls, 10000); checkCalls();
  try { AfriCall.init(); } catch (e) {}
}

/* ---------- Photos ---------- */
function shrink(file, max, q) {
  return new Promise(function (ok, ko) {
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var w = im.width, hh = im.height, k = Math.min(1, max / Math.max(w, hh));
      var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(hh * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? ok(b) : ko(new Error("Photo illisible.")); }, "image/jpeg", q);
    };
    im.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Photo illisible.")); };
    im.src = url;
  });
}
async function upload(blob, tag, ext, ctype) {
  var path = me.id + "/" + tag + Date.now() + "." + (ext || "jpg");
  var up = await sb.storage.from("photos").upload(path, blob, { contentType: ctype || "image/jpeg" });
  if (up.error) throw up.error;
  return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
}
async function profRow(id, base) {
  var r = await sb.from("profiles").select(base + ",phone").eq("id", id).maybeSingle();
  if (r.error) r = await sb.from("profiles").select(base).eq("id", id).maybeSingle();
  return r;
}
async function checkCalls() {
  if (!me || document.hidden) return;
  try {
    var since = new Date(Date.now() - 120000).toISOString();
    var r = await sb.from("messages").select("id,sender,body,created_at").eq("receiver", me.id).eq("read", false).gte("created_at", since).like("body", "📞 Appel vidéo%").order("created_at", { ascending: false }).limit(1);
    if (r.error || !r.data || !r.data.length) return;
    var m = r.data[0]; if (seenCalls[m.id] || blocked[m.sender]) return;
    seenCalls[m.id] = true;
    var link = (m.body.match(/https?:\/\/\S+/) || [""])[0]; if (!link) return;
    var p = (await sb.from("profiles").select("name,avatar_url").eq("id", m.sender).maybeSingle()).data || { name: "Un membre" };
    showCall(m, link, p);
  } catch (e) {}
}
function showCall(m, link, p) {
  var old = document.getElementById("callbar"); if (old) old.remove();
  var bar = h("div", { id: "callbar", style: "position:fixed;top:0;left:0;right:0;z-index:90;background:#0b1b3a;color:#fff;padding:calc(12px + env(safe-area-inset-top)) 14px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.45)" });
  bar.appendChild(avEl(p, 46));
  bar.appendChild(h("div", { style: "flex:1;min-width:0" }, [h("div", { text: p.name, style: "font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }), h("div", { text: "📞 Appel vidéo entrant…", style: "font-size:14px;opacity:.85" })]));
  bar.appendChild(h("button", { type: "button", text: "Ignorer", style: "background:#d6336c;color:#fff;border:0;border-radius:20px;padding:10px 14px;font-weight:700", onclick: function () { bar.remove(); } }));
  bar.appendChild(h("button", { type: "button", text: "Répondre", style: "background:#25d366;color:#fff;border:0;border-radius:20px;padding:10px 14px;font-weight:700", onclick: async function () {
    bar.remove(); await sb.from("messages").update({ read: true }).eq("id", m.id); window.open(link, "_blank"); refreshBadges();
  } }));
  document.body.appendChild(bar);
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) {}
  setTimeout(function () { if (bar.isConnected) bar.remove(); }, 45000);
}
async function loadBlocks() {
  var b = await sb.from("blocks").select("blocked");
  blocked = {}; (b.data || []).forEach(function (x) { blocked[x.blocked] = true; });
}

/* ---------- Amis, badges ---------- */
async function loadFr() {
  var r = await sb.from("friendships").select("id,requester,addressee,status");
  fr = r.data || [];
}
function relOf(id) {
  for (var i = 0; i < fr.length; i++) {
    var f = fr[i];
    if (f.requester === me.id && f.addressee === id) return { row: f, state: f.status === "accepted" ? "friends" : "sent" };
    if (f.requester === id && f.addressee === me.id) return { row: f, state: f.status === "accepted" ? "friends" : "received" };
  }
  return { row: null, state: "none" };
}
function friendActions(id, done) {
  var rel = relOf(id), box = h("div", { cls: "fa" });
  function act(label, cls, fn) {
    var b = h("button", { type: "button", text: label, cls: cls || "" });
    b.onclick = async function () {
      b.disabled = true;
      try { var r = await fn(); if (r && r.error) throw r.error; } catch (e) { alert(frErr(e.message)); }
      await loadFr(); refreshBadges(); done();
    };
    box.appendChild(b);
  }
  var msg = function () { act("✉️ Message", "", async function () { location.hash = "#/messages/" + id; }); };
  if (rel.state === "none") { act("➕ Ajouter", "p", function () { return sb.from("friendships").insert({ addressee: id }); }); msg(); }
  else if (rel.state === "sent") { act("Invitation envoyée · Annuler", "g", function () { return sb.from("friendships").delete().eq("id", rel.row.id); }); msg(); }
  else if (rel.state === "received") {
    act("✓ Accepter", "p", function () { return sb.from("friendships").update({ status: "accepted" }).eq("id", rel.row.id); });
    act("Refuser", "g", function () { return sb.from("friendships").delete().eq("id", rel.row.id); });
  } else { msg(); act("Retirer", "g", function () { if (!confirm("Retirer cet ami ?")) return { error: null }; return sb.from("friendships").delete().eq("id", rel.row.id); }); }
  return box;
}
function setBadge(key, n) {
  var b = $("bd-" + key); if (!b) return;
  b.textContent = n > 99 ? "99+" : String(n);
  b.classList.toggle("hide", !n);
}
async function refreshBadges() {
  if (!me) return;
  try {
    var a = await sb.from("messages").select("id", { count: "exact", head: true }).eq("receiver", me.id).eq("read", false);
    var b = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("read", false);
    setBadge("msgs", a.count || 0); setBadge("alerts", b.count || 0);
    var tot = (a.count || 0) + (b.count || 0); document.title = (tot ? "(" + tot + ") " : "") + "AfriConnect";
  } catch (e) {}
}

/* ---------- Navigation ---------- */
function route() {
  if (!me) return;
  clearInterval(timer); rid++;
  if (window.__vobs) { window.__vobs.disconnect(); window.__vobs = null; }
  var hs = location.hash || "#/", parts = hs.replace(/^#\/?/, "").split("/");
  var main = $("main"); main.textContent = "";
  var r = "home";
  if (parts[0] === "membres") { r = "members"; viewMembers(main); }
  else if (parts[0] === "messages") { r = "msgs"; if (parts[1]) viewChat(main, parts[1]); else viewConvos(main); }
  else if (parts[0] === "alertes") { r = "alerts"; viewAlerts(main); }
  else if (parts[0] === "profil") { r = "profile"; viewProfile(main, parts[1] || me.id); }
  else if (parts[0] === "groupes") { r = ""; viewGroups(main); }
  else if (parts[0] === "groupe" && parts[1]) { r = ""; viewGroup(main, parts[1]); }
  else if (parts[0] === "marche") { r = "shop"; viewMarket(main); }
  else if (parts[0] === "videos") { r = "videos"; viewVideos(main); }
  else { viewFeed(main); }
  Array.prototype.forEach.call(document.querySelectorAll(".nav a"), function (a) {
    a.classList.toggle("on", a.getAttribute("data-r") === r && !(r === "profile" && parts[1] && parts[1] !== me.id));
  });
  window.scrollTo(0, 0);
  var inchat = parts[0] === "messages" && !!parts[1] && parts[1] !== "ia";
  document.body.classList.toggle("inchat", inchat);
  var fb = $("fab"); if (fb && !document.getElementById("aiov")) fb.classList.toggle("hide", r === "videos" || inchat);
}

/* ---------- Inviter ---------- */
function inviteFriends() {
  var link = "https://diawarabala219-arch.github.io/africonnect/";
  var txt = "Rejoins-moi sur AfriConnect, le réseau social africain 🌍 : " + link;
  if (navigator.share) { navigator.share({ title: "AfriConnect", text: txt }).catch(function () {}); }
  else window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
}
function inviteCard() {
  var b = h("button", { type: "button", text: "Inviter sur WhatsApp / partager", style: "background:#25d366;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700;margin-top:8px" });
  b.onclick = inviteFriends;
  return h("div", { cls: "card" }, [h("div", { cls: "name", text: "💚 Invite tes amis sur AfriConnect" }), h("div", { cls: "time", text: "Plus il y a de monde, plus c'est vivant." }), b]);
}
async function loadSuggest(box) {
  await loadFr();
  var r = await sb.from("profiles").select("id,name,avatar_url").order("created_at", { ascending: false }).limit(30);
  if (r.error || !box.isConnected) return;
  var rows = r.data.filter(function (m) { return m.id !== me.id && relOf(m.id).state === "none" && !blocked[m.id]; }).slice(0, 10);
  if (!rows.length) return;
  box.appendChild(h("div", { cls: "name", text: "Personnes que vous pouvez connaître", style: "margin-bottom:8px" }));
  var strip = h("div", { cls: "stories", style: "padding:0;margin:0" });
  rows.forEach(function (m) {
    var c = h("div", { cls: "card", style: "flex:none;width:150px;margin:0;border:1px solid var(--line);border-radius:12px;text-align:center" });
    c.appendChild(h("a", { cls: "who", href: "#/profil/" + m.id }, [h("div", { style: "display:flex;justify-content:center" }, [avEl(m, 76)]), h("div", { cls: "name", text: m.name, style: "margin:6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" })]));
    var b = h("button", { type: "button", text: "➕ Ajouter", style: "width:100%;background:var(--brand);color:#fff;border:0;border-radius:9px;padding:8px;font-weight:700" });
    b.onclick = async function () { b.disabled = true; var x = await sb.from("friendships").insert({ addressee: m.id }); b.textContent = x.error ? "Erreur" : "Invitation envoyée ✓"; };
    c.appendChild(b); strip.appendChild(c);
  });
  box.appendChild(strip);
}

/* ---------- Accueil ---------- */
function chips() {
  var b1 = h("button", { type: "button", text: "👥 Groupes et pages", onclick: function () { location.hash = "#/groupes"; } });
  var b2 = h("button", { type: "button", text: "🛍️ Marché", onclick: function () { location.hash = "#/marche"; } });
  return h("div", { cls: "chips" }, [b1, b2]);
}
function viewFeed(main) {
  main.appendChild(composer(function () { loadPosts(feed, null); }));
  main.appendChild(chips());
  var sr = h("div", { cls: "stories" }); main.appendChild(sr); loadStories(sr);
  var sg = h("div", { cls: "card" }); main.appendChild(sg); loadSuggest(sg);
  main.appendChild(inviteCard());
  var feed = h("div", {}); main.appendChild(feed);
  loadPosts(feed, null);
  timer = setInterval(function () {
    var a = document.activeElement;
    if (!document.hidden && !(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA"))) loadPosts(feed, null);
  }, 45000);
}
function composer(done, groupId, vidOnly) {
  var picked = null, isVid = false, pickedFile = null;
  var card = h("div", { cls: "card" });
  var ta = h("textarea", { maxlength: "2000", placeholder: "À quoi pensez-vous, " + prof.name.split(" ")[0] + " ?" });
  var err = h("p", { cls: "err" });
  var prevImg = h("img", { alt: "" });
  var prevVid = h("video", { controls: "", playsinline: "", style: "width:100%;border-radius:12px;max-height:260px;display:block" });
  var prevX = h("button", { type: "button", text: "×", "aria-label": "Retirer" });
  var prev = h("div", { cls: "prev hide" }, [prevImg, prevVid, prevX]);
  var file = h("input", { type: "file", accept: vidOnly ? "video/*" : "image/*,video/*", cls: "hide" });
  var pick = h("button", { cls: "ph", type: "button", text: vidOnly ? "🎬 Choisir une vidéo" : "📷 Photo / vidéo" });
  var go = h("button", { cls: "go", type: "button", text: "Publier" });
  var pill = h("button", { cls: "pill", id: "pill", type: "button", text: vidOnly ? "🎬 Publier une vidéo…" : groupId ? "Écrire dans ce groupe…" : "À quoi pensez-vous ?" });
  var phb = h("button", { cls: "phb", type: "button", "aria-label": "Photo" });
  phb.innerHTML = '<svg viewBox="0 0 24 24" fill="#2eb85c"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="8.5" cy="9" r="2" fill="#fff"/><path d="M3 19l6-6 4 4 3-3 5 5z" fill="#fff"/></svg>Photo';
  var top = h("div", { cls: "cmp" }, [avEl(prof, 44), pill, phb]);
  var exp = h("div", { cls: "exp hide" }, [ta, prev, h("div", { cls: "tools" }, [pick, go])]);
  card.appendChild(top); card.appendChild(exp); card.appendChild(file); card.appendChild(err);
  function expand() { exp.classList.remove("hide"); pill.classList.add("hide"); phb.classList.add("hide"); ta.focus(); }
  function clear() { picked = null; pickedFile = null; isVid = false; file.value = ""; prev.classList.add("hide"); prevImg.classList.remove("hide"); prevVid.classList.add("hide"); prevVid.removeAttribute("src"); }
  pill.onclick = expand;
  phb.onclick = function () { expand(); file.click(); };
  pick.onclick = function () { file.click(); };
  prevX.onclick = clear;
  file.onchange = async function () {
    var f = file.files[0]; if (!f) return;
    err.textContent = "";
    try {
      if (/^video\//.test(f.type)) {
        if (f.size > 15 * 1024 * 1024) { err.textContent = "Vidéo trop lourde (15 Mo maximum, ~30 secondes)."; clear(); return; }
        isVid = true; pickedFile = f; picked = f;
        prevVid.src = URL.createObjectURL(f); prevVid.classList.remove("hide"); prevImg.classList.add("hide");
      } else {
        isVid = false; picked = await shrink(f, 1080, 0.8);
        prevImg.src = URL.createObjectURL(picked); prevImg.classList.remove("hide"); prevVid.classList.add("hide");
      }
      prev.classList.remove("hide");
    } catch (e) { err.textContent = frErr(e.message); clear(); }
  };
  go.onclick = async function () {
    var body = ta.value.trim(); err.textContent = "";
    if (!body && !picked) { err.textContent = "Écris quelque chose ou ajoute une photo."; return; }
    go.disabled = true; go.textContent = "Envoi…";
    try {
      var row = { body: body || null, group_id: groupId || null };
      if (picked && isVid) { var ex = (/mp4|webm|quicktime/.exec(pickedFile.type) || ["mp4"])[0]; row.video_url = await upload(picked, "v-", ex === "quicktime" ? "mov" : ex, pickedFile.type || "video/mp4"); }
      else if (picked) row.image_url = await upload(picked, "");
      var ins = await sb.from("posts").insert(row);
      if (ins.error) throw ins.error;
      ta.value = ""; clear(); exp.classList.add("hide"); pill.classList.remove("hide"); phb.classList.remove("hide"); done();
    } catch (e) { err.textContent = frErr(e.message); }
    finally { go.disabled = false; go.textContent = "Publier"; }
  };
  return card;
}
/* ---------- Stories ---------- */
async function loadStories(box) {
  var since = new Date(Date.now() - 86400000).toISOString();
  var mk = h("div", { cls: "st mk" }, [
    h("div", { cls: "top2", style: prof.avatar_url ? "background-image:url('" + prof.avatar_url + "')" : "display:grid;place-items:center;font-size:40px;font-weight:800;color:var(--brand)", text: prof.avatar_url ? "" : ini(prof.name) }),
    h("div", { cls: "plus", text: "+" }),
    h("div", { cls: "nm", text: "Créer une story" })
  ]);
  var f = h("input", { type: "file", accept: "image/*", cls: "hide" });
  mk.onclick = function () { f.click(); };
  f.onchange = async function () {
    var x = f.files[0]; if (!x) return;
    try {
      mk.querySelector(".nm").textContent = "Envoi…";
      var u = await upload(await shrink(x, 1080, 0.8), "story-");
      var r = await sb.from("stories").insert({ image_url: u });
      if (r.error) throw r.error;
      route();
    } catch (e) { alert(/stories/.test(String(e.message)) ? "Lance d'abord le script SQL de la version 4." : frErr(e.message)); mk.querySelector(".nm").textContent = "Créer une story"; }
  };
  box.appendChild(mk); box.appendChild(f);
  var r = await sb.from("stories").select("id,image_url,created_at,user_id,profiles!stories_user_id_fkey(name,avatar_url)").gte("created_at", since).order("created_at", { ascending: false }).limit(60);
  if (r.error || !box.isConnected) return;
  var by = {}, order = [];
  r.data.forEach(function (x) { if (!by[x.user_id]) { by[x.user_id] = []; order.push(x.user_id); } by[x.user_id].unshift(x); });
  order.forEach(function (uid) {
    var list = by[uid], pr = list[0].profiles || { name: "Membre" };
    var c = h("div", { cls: "st", style: "background-image:url('" + list[list.length - 1].image_url + "')" }, [
      h("div", { cls: "ring" }, [avEl(pr, 34)]),
      h("div", { cls: "nm", text: uid === me.id ? "Ta story" : pr.name })
    ]);
    c.onclick = function () { viewStory(list, 0, pr); };
    box.appendChild(c);
  });
}
function viewStory(list, i, pr) {
  var s0 = list[i];
  var ov = h("div", { cls: "sv" });
  var bar = h("div", { cls: "bar" });
  list.forEach(function (_, k) { bar.appendChild(h("i", { cls: k <= i ? "on" : "" })); });
  var x = h("button", { type: "button", text: "×", "aria-label": "Fermer" });
  var hd = h("div", { cls: "hd" }, [avEl(pr, 38), h("div", {}, [h("div", { cls: "name", text: pr.name }), h("div", { cls: "time", text: ago(s0.created_at), style: "color:#ddd" })])]);
  if (s0.user_id === me.id) hd.appendChild(h("button", { type: "button", text: "🗑", style: "font-size:20px", onclick: async function (e) {
    e.stopPropagation();
    if (!confirm("Supprimer cette story ?")) return;
    await sb.from("stories").delete().eq("id", s0.id); ov.remove(); route();
  } }));
  hd.appendChild(x);
  ov.appendChild(h("img", { src: s0.image_url, alt: "Story" }));
  ov.appendChild(bar); ov.appendChild(hd);
  x.onclick = function (e) { e.stopPropagation(); ov.remove(); };
  ov.onclick = function () { ov.remove(); if (i + 1 < list.length) viewStory(list, i + 1, pr); };
  document.body.appendChild(ov);
}
async function loadPosts(container, userId, groupId) {
  if (busy) return; busy = true;
  var q = sb.from("posts").select(POST_SEL);
  if (userId) q = q.eq("user_id", userId);
  if (groupId) q = q.eq("group_id", groupId); else if (!userId) q = q.is("group_id", null);
  var r = await q.order("created_at", { ascending: false }).limit(50);
  busy = false;
  if (!container.isConnected) return;
  container.textContent = "";
  if (r.error) { container.appendChild(h("div", { cls: "empty", text: frErr(r.error.message) })); return; }
  var rows = r.data.filter(function (p) { return !blocked[p.user_id]; });
  if (!rows.length) { container.appendChild(h("div", { cls: "empty", text: (userId || groupId) ? "Aucune publication pour l'instant." : "Aucune publication pour l'instant. Sois le premier !" })); return; }
  rows.forEach(function (p) { container.appendChild(postCard(p, function () { loadPosts(container, userId, groupId); })); });
}
function postCard(p, reload) {
  var pr = p.profiles || { name: "Membre" };
  var mine = null;
  p.likes.forEach(function (l) { if (l.user_id === me.id) mine = l; });
  var cms = p.comments.slice().sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
  var card = h("div", { cls: "card pc" });
  var who = h("a", { cls: "who", href: "#/profil/" + p.user_id }, [nm(pr)]);
  var head = h("div", { cls: "row" }, [
    h("a", { cls: "who", href: "#/profil/" + p.user_id }, [avEl(pr, 42)]),
    h("div", { style: "flex:1;min-width:0" }, [who, h("div", { cls: "time", text: ago(p.created_at) + " · " + (p.group_id ? "👥" : "🌍") })])
  ]);
  head.appendChild(h("button", { cls: "more", text: "•••", "aria-label": "Options", onclick: function () {
    if (p.user_id === me.id) sheetMenu("Ta publication", [["🗑 Supprimer la publication", async function () {
      if (!confirm("Supprimer cette publication ?")) return;
      await sb.from("posts").delete().eq("id", p.id); reload();
    }, true]]);
    else sheetMenu(pr.name, [
      ["⚠️ Signaler cette publication", async function () {
        var why = prompt("Pourquoi la signaler ? (spam, nudité, haine, arnaque…)"); if (!why) return;
        var x = await sb.from("reports").insert({ target_type: "post", target_id: String(p.id), reason: why.slice(0, 200) });
        alert(x.error ? frErr(x.error.message) : "Merci. Nous allons vérifier cette publication.");
      }],
      ["🚫 Bloquer " + pr.name, async function () {
        if (!confirm("Bloquer " + pr.name + " ? Vous ne verrez plus vos publications ni vos messages.")) return;
        var x = await sb.from("blocks").insert({ blocked: p.user_id });
        if (x.error) { alert(frErr(x.error.message)); return; }
        blocked[p.user_id] = true; reload();
      }, true]
    ]);
  } }));
  card.appendChild(head);
  if (p.body) card.appendChild(h("div", { cls: "body", text: p.body }));
  if (p.shared_name) {
    var sh = h("div", { cls: "sh" }, [h("div", { cls: "time", text: "↗ Publication de " + p.shared_name })]);
    if (p.shared_body) sh.appendChild(h("div", { text: p.shared_body, style: "white-space:pre-wrap;word-wrap:break-word" }));
    if (p.shared_image) sh.appendChild(h("img", { src: p.shared_image, alt: "Photo", loading: "lazy", style: "width:100%;border-radius:8px;margin-top:8px;display:block" }));
    card.appendChild(sh);
  }
  if (p.image_url) card.appendChild(h("img", { cls: "img", src: p.image_url, alt: "Photo", loading: "lazy" }));
  if (p.video_url) card.appendChild(h("video", { cls: "img", src: p.video_url, controls: "", playsinline: "", preload: "metadata" }));
  var cnt = {}, tot = p.likes.length;
  p.likes.forEach(function (l) { var k = RX[l.kind] ? l.kind : "like"; cnt[k] = (cnt[k] || 0) + 1; });
  var top3 = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 3).map(function (k) { return RX[k][0]; }).join("");
  card.appendChild(h("div", { cls: "stats" }, [
    h("span", { text: tot ? top3 + " " + tot : "" }),
    h("span", { text: cms.length ? cms.length + " commentaire" + (cms.length > 1 ? "s" : "") : "" })
  ]));
  var mk = mine ? (RX[mine.kind] || RX.like) : null;
  var likeBtn = h("button", { cls: mine ? "on" : "", text: mk ? mk[0] + " " + mk[1] : "👍 J'aime" });
  var rp = h("div", { cls: "rp hide" });
  async function react(kind) {
    likeBtn.disabled = true;
    if (mine && mine.kind === kind) await sb.from("likes").delete().eq("post_id", p.id).eq("user_id", me.id);
    else if (mine) await sb.from("likes").update({ kind: kind }).eq("post_id", p.id).eq("user_id", me.id);
    else await sb.from("likes").insert({ post_id: p.id, kind: kind });
    reload();
  }
  Object.keys(RX).forEach(function (k) {
    rp.appendChild(h("button", { type: "button", text: RX[k][0], "aria-label": RX[k][1], onclick: function (e) { e.stopPropagation(); rp.classList.add("hide"); react(k); } }));
  });
  var pt = null, lp = false;
  likeBtn.addEventListener("pointerdown", function () { lp = false; clearTimeout(pt); pt = setTimeout(function () { lp = true; rp.classList.remove("hide"); }, 420); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { likeBtn.addEventListener(ev, function () { clearTimeout(pt); }); });
  likeBtn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  likeBtn.onclick = function () {
    if (lp) { lp = false; return; }
    if (!rp.classList.contains("hide")) { rp.classList.add("hide"); return; }
    react(mine ? mine.kind : "like");
  };
  var cmBtn = h("button", { text: "💬 Commenter" });
  var shBtn = h("button", { text: "↗ Partager", onclick: function () {
    var txt = (pr.name + " sur AfriConnect : " + (p.body || "")).slice(0, 200), link = location.origin + location.pathname;
    sheetMenu("Partager", [
      ["🔁 Partager sur mon profil", async function () {
        var x = await sb.from("posts").insert({ shared_name: pr.name, shared_body: p.body || p.shared_body || null, shared_image: p.image_url || p.shared_image || null });
        alert(x.error ? frErr(x.error.message) : "Partagé sur ton profil ✓");
      }],
      ["📤 Envoyer à des amis (WhatsApp…)", async function () {
        try { if (navigator.share) await navigator.share({ title: "AfriConnect", text: txt, url: link }); else window.open("https://wa.me/?text=" + encodeURIComponent(txt + " " + link), "_blank"); } catch (e) {}
      }]
    ]);
  } });
  card.appendChild(h("div", { cls: "acts" }, [likeBtn, cmBtn, shBtn]));
  card.appendChild(rp);
  var box = h("div", { cls: "cm" + (open[p.id] ? "" : " hide") });
  cms.forEach(function (c) {
    var cp = c.profiles || { name: "Membre" };
    var bub = h("div", { cls: "bub" }, [nm(cp, "nb"), h("span", { text: c.body })]);
    if (c.user_id === me.id) bub.appendChild(h("button", { cls: "del", text: "Supprimer", onclick: async function () {
      await sb.from("comments").delete().eq("id", c.id); reload();
    } }));
    box.appendChild(h("div", { cls: "c" }, [avEl(cp, 32), bub]));
  });
  var inp = h("input", { type: "text", maxlength: "500", placeholder: "Écrire un commentaire…" });
  var send = h("button", { text: "Envoyer" });
  async function sendC() {
    var t = inp.value.trim(); if (!t) return;
    send.disabled = true;
    var r = await sb.from("comments").insert({ post_id: p.id, body: t });
    if (r.error) { send.disabled = false; alert(frErr(r.error.message)); return; }
    open[p.id] = true; reload();
  }
  send.onclick = sendC;
  inp.onkeydown = function (e) { if (e.key === "Enter") sendC(); };
  box.appendChild(h("div", { cls: "cin" }, [inp, send]));
  card.appendChild(box);
  cmBtn.onclick = function () { open[p.id] = box.classList.contains("hide"); box.classList.toggle("hide"); if (open[p.id]) inp.focus(); };
  return card;
}

/* ---------- Profil ---------- */
async function viewProfile(main, id) {
  var my = rid;
  if (id !== me.id && !UUID.test(id)) { main.appendChild(h("div", { cls: "empty", text: "Profil introuvable." })); return; }
  var own = id === me.id;
  var d = own ? prof : null;
  if (!own) {
    var r = await profRow(id, "name,avatar_url,bio,verified");
    d = r.data;
    await loadFr();
    if (my !== rid) return;
    if (!d) { main.appendChild(h("div", { cls: "empty", text: "Profil introuvable." })); return; }
  }
  var card = h("div", { cls: "card" });
  card.appendChild(h("div", { cls: "cover" }));
  var pf = h("div", { cls: "pf" });
  pf.appendChild(h("div", {}, [avEl(d, 104)]));
  var h2 = h("h2", { text: d.name }); if (d.verified) h2.appendChild(h("span", { cls: "vf", text: " ✔" })); pf.appendChild(h2);
  pf.appendChild(h("p", { text: d.bio || (own ? "Ajoute une courte présentation de toi." : "") }));
  if (own) {
    var file = h("input", { type: "file", accept: "image/*", cls: "hide" });
    var msg = h("p", { cls: "err" });
    var bPhoto = h("button", { type: "button", text: "📷 Changer la photo" });
    var bBio = h("button", { type: "button", text: "✏️ Modifier la présentation" });
    bPhoto.onclick = function () { file.click(); };
    file.onchange = async function () {
      var f = file.files[0]; if (!f) return;
      bPhoto.disabled = true; bPhoto.textContent = "Envoi…"; msg.textContent = "";
      try {
        var url = await upload(await shrink(f, 480, 0.85), "avatar-");
        var u = await sb.from("profiles").update({ avatar_url: url }).eq("id", me.id);
        if (u.error) throw u.error;
        prof.avatar_url = url; route();
      } catch (e) { msg.textContent = frErr(e.message); bPhoto.disabled = false; bPhoto.textContent = "📷 Changer la photo"; }
    };
    bBio.onclick = async function () {
      var t = prompt("Ta présentation (150 caractères max) :", prof.bio || "");
      if (t === null) return;
      t = t.trim().slice(0, 150);
      var u = await sb.from("profiles").update({ bio: t }).eq("id", me.id);
      if (u.error) { msg.textContent = frErr(u.error.message); return; }
      prof.bio = t; route();
    };
    var bPhone = h("button", { type: "button", text: prof.phone ? "📱 WhatsApp : +" + prof.phone : "📱 Ajouter mon numéro WhatsApp" });
    bPhone.onclick = async function () {
      var t = prompt("Ton numéro WhatsApp avec l'indicatif, sans + ni espaces (ex : 224613754349).\nLes membres pourront t'appeler. Laisse vide pour l'effacer.", prof.phone || "");
      if (t === null) return;
      t = t.replace(/\D/g, "").slice(0, 15);
      var u = await sb.from("profiles").update({ phone: t || null }).eq("id", me.id);
      if (u.error) { msg.textContent = /phone/.test(u.error.message) ? "Lance d'abord le script SQL de la version 10." : frErr(u.error.message); return; }
      prof.phone = t; route();
    };
    pf.appendChild(h("div", { cls: "btns" }, [bPhoto, bBio, bPhone, file]));
    pf.appendChild(msg);
  } else {
    var fa = friendActions(id, function () { route(); });
    fa.style.justifyContent = "center";
    pf.appendChild(fa);
    if (d.phone) pf.appendChild(h("div", { cls: "fa", style: "justify-content:center;margin-top:4px" }, [h("button", { type: "button", text: "📱 Appeler sur WhatsApp", style: "background:#25d366;color:#fff", onclick: function () { window.open("https://wa.me/" + String(d.phone).replace(/\D/g, ""), "_blank"); } })]));
    var isB = !!blocked[id], br = h("div", { cls: "fa", style: "justify-content:center;margin-top:4px" });
    var bb = h("button", { cls: "g", type: "button", text: isB ? "✅ Débloquer" : "🚫 Bloquer" });
    bb.onclick = async function () {
      if (!isB && !confirm("Bloquer " + d.name + " ?")) return;
      var x = isB ? await sb.from("blocks").delete().eq("blocked", id).eq("blocker", me.id) : await sb.from("blocks").insert({ blocked: id });
      if (x.error) { alert(frErr(x.error.message)); return; }
      await loadBlocks(); route();
    };
    var rb = h("button", { cls: "g", type: "button", text: "⚠️ Signaler" });
    rb.onclick = async function () {
      var why = prompt("Pourquoi signaler ce profil ?"); if (!why) return;
      var x = await sb.from("reports").insert({ target_type: "user", target_id: id, reason: why.slice(0, 200) });
      alert(x.error ? frErr(x.error.message) : "Merci. Nous allons vérifier ce profil.");
    };
    br.appendChild(bb); br.appendChild(rb); pf.appendChild(br);
  }
  card.appendChild(pf);
  main.appendChild(card);
  main.appendChild(h("h3", { cls: "sec", text: own ? "Mes publications" : "Publications de " + d.name.split(" ")[0] }));
  var feed = h("div", {}); main.appendChild(feed);
  loadPosts(feed, id);
}

