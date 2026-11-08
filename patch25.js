// patch25 : notifications push pour AfriConnect (routes /afri/vapid et /afri/push)
const fs = require("fs");
let s = fs.readFileSync("server.js", "utf8");
if (s.includes("AFRI_PUSH")) { console.log("Deja installe."); process.exit(0); }
const re = /http\.createServer\(\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{/;
const m = s.match(re);
if (!m) { console.log("ERREUR : ligne createServer introuvable. Envoie-moi une capture."); process.exit(1); }
const code = `
  /*AFRI_PUSH*/
  if ((req.url || "").split("?")[0] === "/afri/vapid" || (req.url || "").split("?")[0] === "/afri/push") {
    const _u = (req.url || "").split("?")[0];
    res.setHeader("Access-Control-Allow-Origin", "https://diawarabala219-arch.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-afri-secret");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    const out = (c, o) => { res.writeHead(c, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(o)); };
    if (_u === "/afri/vapid") return out(200, { key: process.env.VAPID_PUBLIC || "" });
    if (req.method !== "POST") return out(405, {});
    if (!process.env.AFRI_PUSH_SECRET || req.headers["x-afri-secret"] !== process.env.AFRI_PUSH_SECRET) return out(401, { error: "non autorise" });
    let raw = "";
    for await (const ch of req) { raw += ch; if (raw.length > 100000) break; }
    try {
      const b = JSON.parse(raw || "{}"), rec = b.record || {};
      let uid, actor, text, url, tag;
      if (b.table === "messages") {
        uid = rec.receiver; actor = rec.sender; url = "#/messages/" + actor; tag = "m-" + actor;
        text = rec.body ? String(rec.body).slice(0, 90) : (String(rec.media_type || "").indexOf("audio") === 0 ? "🎤 Message vocal" : "📷 Photo");
      } else if (b.table === "notifications") {
        uid = rec.user_id; actor = rec.actor; url = "#/alertes"; tag = "n-" + rec.id;
        const T = { like: "a aimé ta publication.", comment: "a commenté ta publication.", invite: "t'a envoyé une invitation d'ami.", accept: "a accepté ton invitation." };
        text = T[rec.kind] || "a une nouvelle activité pour toi.";
      } else return out(200, { ignored: true });
      if (!uid || uid === actor) return out(200, { skipped: true });
      const SUPA = "https://edsvhqwetulvypocdjku.supabase.co", KEY = "sb_publishable_W1sRIAhFJ-83OvAVCpqjVQ_UUIeo7Bs";
      const H = { "Content-Type": "application/json", apikey: KEY };
      const r = await fetch(SUPA + "/rest/v1/rpc/push_info", { method: "POST", headers: H, body: JSON.stringify({ p_secret: process.env.AFRI_PUSH_SECRET, p_uid: uid, p_actor: actor }) });
      const subs = await r.json();
      if (!Array.isArray(subs) || !subs.length) return out(200, { sent: 0 });
      const wp = (await import("web-push")).default;
      wp.setVapidDetails("https://diawarabala219-arch.github.io/africonnect/", process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
      let sent = 0;
      for (const sb of subs) {
        const payload = JSON.stringify(b.table === "messages"
          ? { title: sb.actor_name || "AfriConnect", body: text, url: url, tag: tag }
          : { title: "AfriConnect", body: (sb.actor_name || "Quelqu'un") + " " + text, url: url, tag: tag });
        try { await wp.sendNotification({ endpoint: sb.endpoint, keys: { p256dh: sb.p256dh, auth: sb.auth } }, payload, { TTL: 86400 }); sent++; }
        catch (e) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) {
            await fetch(SUPA + "/rest/v1/rpc/push_drop", { method: "POST", headers: H, body: JSON.stringify({ p_secret: process.env.AFRI_PUSH_SECRET, p_endpoint: sb.endpoint }) });
          }
        }
      }
      return out(200, { sent: sent });
    } catch (e) { return out(500, { error: "erreur push" }); }
  }
`;
s = s.replace(re, m[0] + code);
fs.writeFileSync("server.js", s);
console.log("OK : routes push ajoutees. Clique sur Publish puis Republish.");
