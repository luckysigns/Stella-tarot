/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   /thebarleymoonpreviews  (rewritten here by vercel.json)

   A password on the door of the deck preview gallery. The gallery
   page itself lives at api/_deck-preview.html, where nothing serves
   it statically, so this is the only way in.

   GET  without a valid cookie   -> the password form
   POST password=...             -> right: set a signed cookie, 303 back here
                                    wrong: the form again, with a note
   GET  with a valid cookie      -> the gallery, opened on the Barley Moon set

   PREVIEW_PASSWORD is set on Vercel. The cookie is an HMAC of a fixed
   string under a key derived from the password, so changing the
   password signs everyone out.
   ============================================================ */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const COOKIE = "bmpreview";
const DAYS = 30;
const SET_KEY = "b7rl3ymn";        /* the token in _deck-preview.html that opens both decks */

function password() { return String(process.env.PREVIEW_PASSWORD || ""); }
function key() { return crypto.createHash("sha256").update("preview-cookie:" + password()).digest(); }
function stamp() { return crypto.createHmac("sha256", key()).update("barley-moon-preview").digest("hex"); }
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function cookieOf(req) {
  const m = String(req.headers.cookie || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function send(res, status, html, extra) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  Object.keys(extra || {}).forEach(k => res.setHeader(k, extra[k]));
  res.end(html);
}
function readBody(req) {
  return new Promise(resolve => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") return resolve(Object.fromEntries(new URLSearchParams(req.body)));
    let raw = ""; req.on("data", c => { raw += c; }); req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(raw))));
  });
}
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

function form(note) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><title>Deck preview</title>
<style>
  :root{--void:#0a0a1f;--gold:#e9c46a;--gold-soft:#c9a24b;--silver:#cdd6f4;--mist:#8b8fb5;--line:rgba(233,196,106,.22);--ink:#070612}
  @media (prefers-color-scheme: light){:root{--void:#f4efe4;--gold:#8a6a1c;--gold-soft:#a5832f;--silver:#2a2640;--mist:#6b6a80;--line:rgba(138,106,28,.28);--ink:#fbf8f1}}
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100dvh;display:grid;place-items:center;background:var(--void);color:var(--silver);
    font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;-webkit-font-smoothing:antialiased;padding:24px}
  .box{width:min(380px,100%);text-align:center}
  .eyebrow{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-soft)}
  h1{font-size:26px;font-weight:400;font-style:italic;margin:10px 0 6px}
  p{font-size:14px;color:var(--mist);line-height:1.6}
  form{margin-top:22px;display:flex;flex-direction:column;gap:10px}
  input{font:inherit;font-size:16px;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--ink);color:var(--silver);text-align:center;outline:none}
  input:focus{border-color:var(--gold-soft)}
  button{font:inherit;font-size:12px;letter-spacing:.16em;text-transform:uppercase;padding:12px;border-radius:999px;cursor:pointer;
    border:1px solid var(--gold-soft);background:transparent;color:var(--gold)}
  .note{color:#d98b9e;font-size:13px;min-height:1.2em}
</style></head><body><div class="box">
  <div class="eyebrow">Stellar Tarot</div>
  <h1>The Barley Moon previews</h1>
  <p>A private preview. Enter the password you were given.</p>
  <form method="post" action="/thebarleymoonpreviews">
    <input type="password" name="password" autocomplete="current-password" autofocus aria-label="Password" required>
    <button type="submit">Open the preview</button>
    <div class="note">${esc(note || "")}</div>
  </form>
</div></body></html>`;
}

function gallery() {
  const file = path.join(process.cwd(), "api", "_deck-preview.html");
  const html = fs.readFileSync(file, "utf8");
  return html.replace("</head>", '<script>window.PREVIEW_K=' + JSON.stringify(SET_KEY) + ';</script></head>');
}

module.exports = async function handler(req, res) {
  if (!password()) return send(res, 503, form("The preview isn't configured yet."));

  if (req.method === "POST") {
    const body = await readBody(req);
    const given = String((body && body.password) || "");
    if (given && same(given, password())) {
      const c = COOKIE + "=" + stamp() + "; Path=/thebarleymoonpreviews; Max-Age=" + (DAYS * 86400) + "; HttpOnly; Secure; SameSite=Lax";
      res.statusCode = 303; res.setHeader("Set-Cookie", c); res.setHeader("Location", "/thebarleymoonpreviews"); return res.end();
    }
    return send(res, 401, form("That password isn't right."));
  }

  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; return res.end(); }
  if (same(cookieOf(req), stamp())) {
    try { return send(res, 200, gallery()); }
    catch (e) { return send(res, 500, form("The gallery file is missing from this deployment.")); }
  }
  return send(res, 200, form(""));
};
