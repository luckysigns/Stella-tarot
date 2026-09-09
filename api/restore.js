/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET /api/restore?email=someone@example.com

   The same archive on a second device, or after clearing a browser.
   Stripe is the only source of truth: look the email up, take the best
   active subscription on the archive product, let any paid lifetime
   purchase beat it, and issue the token.

   Returns { ok:true, tier, email, token } or { ok:false, reason }.

   Note this reveals only whether a given address has a plan, and only
   to whoever already knows the address. It grants archive room; it
   grants no access to anyone's readings, which stay behind the
   account's own sign-in.
   ============================================================ */

const U = require("./_unlock.js");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return U.json(res, 405, { ok: false, reason: "method not allowed" });
  }
  if (!U.hasKeys()) {
    return U.json(res, 200, { ok: false, reason: "not configured" });
  }

  const raw = (req.query && req.query.email) || "";
  const email = U.normalizeEmail(String(Array.isArray(raw) ? raw[0] : raw));
  if (!email) {
    return U.json(res, 200, { ok: false, reason: "no purchase found" });
  }

  try {
    const tier = await U.entitlementForEmail(email);
    if (tier === "free") {
      return U.json(res, 200, { ok: false, reason: "no purchase found" });
    }
    return U.json(res, 200, { ok: true, tier: tier, email: email, token: U.issueToken(email, tier) });
  } catch (err) {
    return U.fail(res, err, "no purchase found");
  }
};
