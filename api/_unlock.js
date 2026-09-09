/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   Shared helpers for the reading-archive unlock: the Stripe REST
   calls, the price -> tier map, and the stateless token.

   No dependencies. Node's built-in fetch and crypto only. This file
   starts with an underscore so Vercel does not publish it as its own
   function; it is required by verify/restore/check.

   Env vars required (Vercel): STRIPE_SECRET_KEY, UNLOCK_SIGNING_SECRET
   Neither is ever logged or returned.
   ============================================================ */

const crypto = require("crypto");

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SIGNING_SECRET = process.env.UNLOCK_SIGNING_SECRET;

/* The live Stripe products behind the archive. */
const PROD_SUB = "prod_VEDNZiUEF36Y83";   // Astra Reading Archive (subscriptions)
const PROD_LIFE = "prod_VEDPEYV3UdFUpJ";  // Astra Lifetime (one-time)

/* Subscription tiers are told apart by amount, in cents. */
const MINOR_CENTS = 299;
const MAJOR_CENTS = 999;

const TIER_RANK = { free: 0, minor: 1, major: 2, lifetime: 3 };
const SUB_TTL_DAYS = 35;

/* ── Stripe REST ────────────────────────────────────────────── */

async function stripeGet(path) {
  if (!STRIPE_KEY) throw new Error("stripe key missing");
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    headers: { Authorization: "Bearer " + STRIPE_KEY }
  });
  if (!res.ok) {
    const body = await res.text().catch(function () { return ""; });
    const err = new Error("stripe " + res.status + " on " + path.split("?")[0]);
    err.detail = body.slice(0, 300);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* Every price on our two products, fetched once per warm instance and
   kept in module scope so a burst of returns from Checkout costs one
   round trip, not one per visitor. */
let PRICE_MAP = null;
async function priceMap() {
  if (PRICE_MAP) return PRICE_MAP;
  const map = {};
  for (const product of [PROD_SUB, PROD_LIFE]) {
    const list = await stripeGet("prices?limit=100&product=" + encodeURIComponent(product));
    for (const price of (list.data || [])) {
      map[price.id] = { product: product, amount: price.unit_amount, recurring: !!price.recurring };
    }
  }
  PRICE_MAP = map;
  return map;
}

/* A price id, or an amount on our subscription product, becomes a tier. */
function tierFromAmount(product, amount) {
  if (product === PROD_LIFE) return "lifetime";
  if (product !== PROD_SUB) return null;
  if (amount === MAJOR_CENTS) return "major";
  if (amount === MINOR_CENTS) return "minor";
  /* an amount we do not recognise still counts as the smaller tier rather
     than as nothing, so a price edit in the dashboard never locks a paying
     reader out of the archive they bought */
  return amount >= MAJOR_CENTS ? "major" : "minor";
}

async function tierForPrice(priceId, fallbackProduct, fallbackAmount) {
  if (priceId) {
    const map = await priceMap();
    const hit = map[priceId];
    if (hit) return tierFromAmount(hit.product, hit.amount);
  }
  if (fallbackProduct) return tierFromAmount(fallbackProduct, fallbackAmount);
  return null;
}

function better(a, b) {
  return (TIER_RANK[b] || 0) > (TIER_RANK[a] || 0) ? b : a;
}

/* ── the token ──────────────────────────────────────────────── */

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
}
function sign(payload) {
  if (!SIGNING_SECRET) throw new Error("signing secret missing");
  return crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");
}

/* Lifetime tokens carry no exp. Subscription tokens expire well after the
   longest billing period, and the app revalidates long before that. */
function issueToken(email, tier) {
  const now = Math.floor(Date.now() / 1000);
  const body = { email: (email || "").toLowerCase(), tier: tier, iat: now };
  if (tier !== "lifetime") body.exp = now + SUB_TTL_DAYS * 24 * 60 * 60;
  const payload = b64url(JSON.stringify(body));
  return payload + "." + sign(payload);
}

function readToken(token) {
  if (typeof token !== "string" || token.indexOf(".") < 1) return null;
  const cut = token.lastIndexOf(".");
  const payload = token.slice(0, cut), sig = token.slice(cut + 1);
  let expected;
  try { expected = sign(payload); } catch (e) { return null; }
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let body;
  try { body = JSON.parse(unb64url(payload)); } catch (e) { return null; }
  if (!body || !TIER_RANK[body.tier]) return null;
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}

/* ── entitlement lookup, Stripe as the only source of truth ──── */

function normalizeEmail(raw) {
  if (typeof raw !== "string") return "";
  const e = raw.trim().toLowerCase();
  return (e.length > 3 && e.length < 320 && e.indexOf("@") > 0) ? e : "";
}

/* Active subscriptions on the archive product. */
async function subTierForCustomer(customerId) {
  let tier = "free";
  const subs = await stripeGet("subscriptions?limit=100&status=active&customer=" + encodeURIComponent(customerId));
  for (const sub of (subs.data || [])) {
    for (const item of ((sub.items && sub.items.data) || [])) {
      const price = item.price || {};
      if (price.product && price.product !== PROD_SUB) continue;
      const t = await tierForPrice(price.id, price.product || PROD_SUB, price.unit_amount);
      if (t) tier = better(tier, t);
    }
  }
  return tier;
}

/* A paid one-time session on the lifetime product. Lifetime always wins. */
async function lifetimeForCustomer(customerId) {
  const sessions = await stripeGet(
    "checkout/sessions?limit=100&customer=" + encodeURIComponent(customerId) + "&expand[]=data.line_items"
  );
  for (const session of (sessions.data || [])) {
    if (session.payment_status !== "paid") continue;
    const items = (session.line_items && session.line_items.data) || [];
    for (const item of items) {
      const price = item.price || {};
      if (price.product === PROD_LIFE) return true;
      const map = await priceMap();
      const hit = map[price.id];
      if (hit && hit.product === PROD_LIFE) return true;
    }
  }
  return false;
}

async function entitlementForEmail(email) {
  const customers = await stripeGet("customers?limit=100&email=" + encodeURIComponent(email));
  let tier = "free";
  for (const customer of (customers.data || [])) {
    tier = better(tier, await subTierForCustomer(customer.id));
    if (await lifetimeForCustomer(customer.id)) tier = "lifetime";
  }
  return tier;
}

function json(res, code, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(code).send(JSON.stringify(body));
}

/* A thrown Stripe error must never carry the key or its detail to the browser. */
function fail(res, err, reason) {
  console.error("archive unlock:", (err && err.message) || err);
  json(res, 200, { ok: false, reason: reason || "lookup failed" });
}

module.exports = {
  PROD_SUB, PROD_LIFE, TIER_RANK,
  stripeGet, priceMap, tierFromAmount, tierForPrice, better,
  issueToken, readToken, normalizeEmail,
  subTierForCustomer, lifetimeForCustomer, entitlementForEmail,
  json, fail,
  hasKeys: function () { return !!STRIPE_KEY && !!SIGNING_SECRET; }
};
