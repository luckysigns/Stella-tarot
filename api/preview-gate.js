/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   /<artist>previews  (rewritten here by vercel.json with ?a=<artist>)

   A password on the door of an artist's private deck preview. The
   gallery page (api/_preview/deck-preview.html) and any art that is not
   public yet (api/_preview/<slug>/) are bundled into this function and
   nothing serves them statically, so this is the only way in.

   GET  without a valid cookie     -> the password form
   POST password=...               -> right: set a signed cookie, 303 back
                                      wrong: the form again, with a note
   GET  with a valid cookie        -> the gallery, opened on that artist's decks
   GET  ...&slug=&size=&n= + cookie -> one card image from api/_preview

   Every artist has their own password in an env var on Vercel, so one
   artist's password never opens another's preview. Each cookie is an
   HMAC under a key derived from that password, so changing it signs
   that artist out. Adding an artist: ARTIST-DECKS.md.
   ============================================================ */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DAYS = 30;
const ARTISTS = {
  thebarleymoon: {
    heading: "The Barley Moon previews",
    env: "PREVIEW_PASSWORD",
    cookie: "bmpreview", seal: "barley-moon-preview",   /* as first set, so open sessions survive */
    open: "b7rl3ymn"                                     /* the SETS token for both decks */
  },
  michaelburk: {
    heading: "The Anthropologist Tarot preview",
    env: "PREVIEW_PASSWORD_MICHAELBURK",
    cookie: "mbpreview", seal: "michaelburk-preview",
    open: "1mco9ebl",
    art: ["anthropologist-tarot"]                        /* private art this artist may load */
  }
};

function password(A) { return String(process.env[A.env] || ""); }
function key(A) { return crypto.createHash("sha256").update("preview-cookie:" + password(A)).digest(); }
function stamp(A) { return crypto.createHmac("sha256", key(A)).update(A.seal).digest("hex"); }
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function cookieOf(req, name) {
  const m = String(req.headers.cookie || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
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

function form(A, a, note) {
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
  <h1>${esc(A.heading)}</h1>
  <p>A private preview. Enter the password you were given.</p>
  <form method="post" action="/${a}previews">
    <input type="password" name="password" autocomplete="current-password" autofocus aria-label="Password" required>
    <button type="submit">Open the preview</button>
    <div class="note">${esc(note || "")}</div>
  </form>
</div></body></html>`;
}

function gallery(A) {
  const file = path.join(process.cwd(), "api", "_preview", "deck-preview.html");
  const html = fs.readFileSync(file, "utf8");
  return html.replace("</head>", '<script>window.PREVIEW_K=' + JSON.stringify(A.open) + ';</script></head>');
}

/* one prepared card, only for a slug on this artist's list */
function art(res, A, q) {
  const slug = String(q.slug || ""), size = String(q.size || ""), n = String(q.n || "");
  if (!(A.art || []).includes(slug) || !/^(full|thumb)$/.test(size) || !/^[0-9]{1,3}$/.test(n)) {
    res.statusCode = 404; return res.end();
  }
  let buf;
  try { buf = fs.readFileSync(path.join(process.cwd(), "api", "_preview", slug, size, n + ".jpg")); }
  catch (e) { res.statusCode = 404; return res.end(); }
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noimageindex");
  return res.end(buf);
}

function query(req) {
  if (req.query && typeof req.query === "object") return req.query;
  try { return Object.fromEntries(new URL(req.url, "http://x").searchParams); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  const q = query(req);
  const a = String(q.a || (String(req.url || "").match(/^\/([a-z0-9]+)previews(?:[/?]|$)/) || [])[1] || "");
  const A = Object.prototype.hasOwnProperty.call(ARTISTS, a) ? ARTISTS[a] : null;
  if (!A) { res.statusCode = 404; return res.end(); }
  const home = "/" + a + "previews";
  if (!password(A)) return send(res, 503, form(A, a, "The preview isn't configured yet."));

  if (req.method === "POST") {
    const body = await readBody(req);
    const given = String((body && body.password) || "");
    if (given && same(given, password(A))) {
      const c = A.cookie + "=" + stamp(A) + "; Path=" + home + "; Max-Age=" + (DAYS * 86400) + "; HttpOnly; Secure; SameSite=Lax";
      res.statusCode = 303; res.setHeader("Set-Cookie", c); res.setHeader("Location", home); return res.end();
    }
    return send(res, 401, form(A, a, "That password isn't right."));
  }

  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; return res.end(); }
  const signedIn = same(cookieOf(req, A.cookie), stamp(A));
  if (q.slug) {
    if (!signedIn) { res.statusCode = 401; return res.end(); }
    return art(res, A, q);
  }
  if (signedIn) {
    try { return send(res, 200, gallery(A)); }
    catch (e) { return send(res, 500, form(A, a, "The gallery file is missing from this deployment.")); }
  }
  return send(res, 200, form(A, a, ""));
};
