/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET /api/readings-count

   How many readings this app is holding, for everyone to see. Runs with the
   service role so a signed-out visitor gets a real number, and returns only
   counts, never a row.

   WHAT IT COUNTS: rows in tarot_readings, which is every reading a signed-in
   reader saved, all the way back to the first one. A reading drawn while
   signed out was never stored and cannot be counted here.

   Returns { ok, total, spreads, questions, decks:{...}, at }.

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
    SB_URL + "/rest/v1/tarot_readings?select=id" + (query ? "&" + query : ""),
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

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

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
