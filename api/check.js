/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET /api/check?token=<payload>.<sig>

   Revalidates a token the app is already holding: signature first,
   then expiry. Stripe is not called, so this stays cheap enough for
   the app to ask on a schedule.

   Returns { ok:true, tier } or { ok:false, reason }.
   ============================================================ */

const U = require("./_unlock.js");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return U.json(res, 405, { ok: false, reason: "method not allowed" });
  }

  const raw = (req.query && req.query.token) || "";
  const token = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!token) {
    return U.json(res, 200, { ok: false, reason: "no token" });
  }

  let body;
  try {
    body = U.readToken(token);
  } catch (err) {
    return U.fail(res, err, "not configured");
  }
  if (!body) {
    return U.json(res, 200, { ok: false, reason: "expired or invalid" });
  }

  return U.json(res, 200, { ok: true, tier: body.tier });
};
