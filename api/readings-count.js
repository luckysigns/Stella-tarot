/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET  /api/readings-count   how many readings have been pulled
   POST /api/readings-count   log one reading, body { deck, kind }

   Counts rows in reading_events: one row per reading pulled, by anyone,
   signed in or not. Seeded from tarot_readings so the history carries over.

   The client never touches the table. Both directions go through the service
   role here, so reading_events can have RLS on with no policies at all and
   stay unreachable from a browser. Nothing personal is stored: a deck slug,
   a kind, a timestamp.

   GET returns { ok, total, spreads, questions, decks:{...}, at }.

   Env vars required (Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ============================================================ */

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* Counted once a minute per warm instance, and the CDN holds it too, so a
   busy morning is a handful of queries rather than one per visitor. */
const TTL_MS = 60 * 1000;
let CACHE = null;

/* PostgREST returns the count in Content-Range as "0-0/1234" when asked for
   an exact count, so no rows need to travel to get a number. */
async function countWhere(query) {
  const res = await fetch(
    SB_URL + "/rest/v1/reading_events?select=id" + (query ? "&" + query : ""),
    {
      method: "HEAD",
      headers: {
        apikey: SB_SERVICE,
        Authorization: "Bearer " + SB_SERVICE,
        Prefer: "count=exact",
        Range: "0-0"
      }
    }
  );
  if (!res.ok && res.status !== 206) throw new Error("count " + res.status);
  const range = res.headers.get("content-range") || "";
  const total = parseInt(range.split("/")[1], 10);
  return Number.isFinite(total) ? total : 0;
}

/* one row per reading pulled */
async function logReading(deck, kind) {
  const res = await fetch(SB_URL + "/rest/v1/reading_events", {
    method: "POST",
    headers: {
      apikey: SB_SERVICE,
      Authorization: "Bearer " + SB_SERVICE,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ deck_slug: deck, kind: kind })
  });
  if (!res.ok) throw new Error("log " + res.status);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");
    if (!SB_URL || !SB_SERVICE) { res.status(200).send(JSON.stringify({ ok: false, reason: "not configured" })); return; }
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      /* whatever the browser sent, only these shapes reach the table */
      const deck = String(body.deck || "base").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "base";
      const kind = (body.kind === "ask") ? "ask" : "spread";
      await logReading(deck, kind);
      CACHE = null;                                   /* next GET counts afresh */
      res.status(200).send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("readings-count log:", (err && err.message) || err);
      res.status(200).send(JSON.stringify({ ok: false, reason: "not logged" }));
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send(JSON.stringify({ ok: false, reason: "method not allowed" }));
    return;
  }
  if (!SB_URL || !SB_SERVICE) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(JSON.stringify({ ok: false, reason: "not configured" }));
    return;
  }

  if (CACHE && Date.now() - CACHE.at < TTL_MS) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(JSON.stringify(CACHE.body));
    return;
  }

  try {
    const [total, spreads, questions, base] = await Promise.all([
      countWhere(""),
      countWhere("kind=eq.spread"),
      countWhere("kind=eq.ask"),
      countWhere("deck_slug=eq.base")
    ]);

    const body = {
      ok: true,
      total: total,
      spreads: spreads,
      questions: questions,
      decks: { base: base },
      at: new Date().toISOString()
    };
    CACHE = { at: Date.now(), body: body };

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(JSON.stringify(body));
  } catch (err) {
    console.error("readings-count:", (err && err.message) || err);
    /* a stale number beats no number */
    if (CACHE) {
      res.setHeader("Cache-Control", "public, s-maxage=30");
      res.status(200).send(JSON.stringify(CACHE.body));
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(JSON.stringify({ ok: false, reason: "count unavailable" }));
  }
};
