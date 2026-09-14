/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   GET /api/portal?token=<entitlement token>&flow=update|cancel

   "Manage my subscription": opens Stripe's customer portal for the
   reader who holds this archive token. With flow=update it lands
   straight on the change-plan screen, flow=cancel on the cancel screen;
   without a flow it opens the portal home (card, receipts, everything). The token is the proof: it names the
   email Stripe charged, signed by us, so nobody can open someone else's
   billing by guessing an address.

   Returns { ok:true, url } or { ok:false, reason }.

   Env vars required (Vercel): STRIPE_SECRET_KEY, UNLOCK_SIGNING_SECRET
   ============================================================ */

const U = require("./_unlock.js");

const RETURN_URL = "https://tarot.stellarastro.app/#plans";

async function stripePost(path, params) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params).toString()
  });
  const body = await res.json().catch(function () { return null; });
  if (!res.ok) {
    const err = new Error("stripe " + res.status + " on " + path);
    err.detail = body && body.error ? body.error.message : "";
    throw err;
  }
  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return U.json(res, 405, { ok: false, reason: "method not allowed" });
  }
  if (!U.hasKeys()) {
    return U.json(res, 200, { ok: false, reason: "not configured" });
  }
  const raw = (req.query && req.query.token) || "";
  const body = U.readToken(String(Array.isArray(raw) ? raw[0] : raw));
  if (!body || !body.email) {
    return U.json(res, 200, { ok: false, reason: "no plan on this device" });
  }
  try {
    /* the customer Stripe charged for this email; the newest one if there are several */
    const found = await U.stripeGet("customers?email=" + encodeURIComponent(body.email) + "&limit=1");
    const customer = found && found.data && found.data[0];
    if (!customer) return U.json(res, 200, { ok: false, reason: "no purchase found" });
    const params = { customer: customer.id, return_url: RETURN_URL };
    const flow = String((req.query && req.query.flow) || "");
    if (flow === "update" || flow === "cancel") {
      /* the archive subscription this customer holds, if any; lifetime holders have none */
      const subs = await U.stripeGet("subscriptions?limit=10&status=active&customer=" + encodeURIComponent(customer.id));
      const sub = (subs.data || []).find(function (s) {
        return ((s.items && s.items.data) || []).some(function (it) { return it.price && it.price.product === U.PROD_SUB; });
      });
      if (sub) {
        params["flow_data[type]"] = flow === "cancel" ? "subscription_cancel" : "subscription_update";
        params["flow_data[" + (flow === "cancel" ? "subscription_cancel" : "subscription_update") + "][subscription]"] = sub.id;
        params["flow_data[after_completion][type]"] = "redirect";
        params["flow_data[after_completion][redirect][return_url]"] = RETURN_URL;
      }
    }
    const session = await stripePost("billing_portal/sessions", params);
    return U.json(res, 200, { ok: true, url: session.url });
  } catch (err) {
    console.error("portal:", (err && err.message) || err, (err && err.detail) || "");
    return U.json(res, 200, { ok: false, reason: "billing unavailable right now" });
  }
};
