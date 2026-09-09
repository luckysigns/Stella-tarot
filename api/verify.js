/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET /api/verify?session_id=cs_...

   The reader has just come back from a Stripe payment link. Read the
   Checkout Session, confirm it is paid, work out which archive tier it
   bought, and hand back a signed token bound to the paying email.

   Returns { ok:true, tier, email, token } or { ok:false, reason }.
   ============================================================ */

const U = require("./_unlock.js");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return U.json(res, 405, { ok: false, reason: "method not allowed" });
  }
  if (!U.hasKeys()) {
    return U.json(res, 200, { ok: false, reason: "not configured" });
  }

  const raw = (req.query && req.query.session_id) || "";
  const id = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return U.json(res, 200, { ok: false, reason: "bad session id" });
  }

  try {
    const session = await U.stripeGet(
      "checkout/sessions/" + encodeURIComponent(id) + "?expand[]=line_items"
    );

    if (session.payment_status !== "paid") {
      return U.json(res, 200, { ok: false, reason: "not paid" });
    }

    const email = U.normalizeEmail(
      (session.customer_details && session.customer_details.email) || session.customer_email || ""
    );

    /* the tier comes from what was actually bought, never from the query string */
    let tier = "free";
    for (const item of ((session.line_items && session.line_items.data) || [])) {
      const price = item.price || {};
      const t = await U.tierForPrice(price.id, price.product, price.unit_amount);
      if (t) tier = U.better(tier, t);
    }

    /* a lifetime purchase made under a customer record wins over anything
       the line items resolved to */
    if (tier !== "lifetime" && session.customer) {
      try {
        if (await U.lifetimeForCustomer(session.customer)) tier = "lifetime";
      } catch (e) { /* the line-item answer stands */ }
    }

    if (tier === "free") {
      return U.json(res, 200, { ok: false, reason: "no archive plan on that purchase" });
    }
    if (!email) {
      return U.json(res, 200, { ok: false, reason: "no email on that purchase" });
    }

    return U.json(res, 200, { ok: true, tier: tier, email: email, token: U.issueToken(email, tier) });
  } catch (err) {
    return U.fail(res, err, "could not read that purchase");
  }
};
