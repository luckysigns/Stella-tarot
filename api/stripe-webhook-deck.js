/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   POST /api/stripe-webhook-deck
   Stripe calls this; nothing else should. Verifies the Stripe
   signature, then records deck sales and grants ownership with the
   service-role key. Mirrors Stellar/api/stripe-webhook.js for the
   mechanics and the affiliate conversion webhook for how refunds
   are recorded.

   The Stripe account is shared with Stellar, so this endpoint sees
   subscription events too. It acts ONLY on sessions carrying
   metadata.kind = "deck" and ignores everything else.

   Events handled:
     checkout.session.completed   (deck purchase)
     charge.refunded              (negative deck_sales row; ownership
                                   is NOT revoked, by instruction)

   Money rules, from the artist licence:
     - artist_royalty_cents comes from artist_royalty_rate(artist,
       referring) in the database. One source of truth for the rate,
       never hardcoded here. (clause 8.3)
     - affiliate_commission_cents is zero when referring_code is null
       or equals artist_code. Otherwise a third party sent the buyer:
       10% of the sale, paid from the platform share, and the artist
       still keeps their full royalty. (clause 8.4)
     - deck_sales.stripe_event_id is UNIQUE. A duplicate insert
       raising 23505 is Stripe retrying, so it returns 200 and stops.
       A retry never double-pays an artist.

   Env vars required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ============================================================ */

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Stripe signs the raw request body; Vercel must not parse it first.
module.exports.config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const sbHeaders = {
  apikey: SB_SERVICE,
  Authorization: "Bearer " + SB_SERVICE,
  "Content-Type": "application/json"
};

/* Insert one deck_sales row. Returns "duplicate" when the event id has
   been recorded before, which callers treat as success. */
async function insertSale(row) {
  const res = await fetch(SB_URL + "/rest/v1/deck_sales", {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(row)
  });
  if (res.ok) return "inserted";
  const text = await res.text();
  if (res.status === 409 || text.includes("23505")) return "duplicate";
  throw new Error("deck_sales insert failed: " + res.status + " " + text);
}

async function grantOwnership(userId, slug) {
  const res = await fetch(
    SB_URL + "/rest/v1/deck_ownership?on_conflict=user_id,deck_slug",
    {
      method: "POST",
      headers: Object.assign({}, sbHeaders, { Prefer: "resolution=ignore-duplicates" }),
      body: JSON.stringify({ user_id: userId, deck_slug: slug, source: "purchase" })
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error("deck_ownership insert failed: " + res.status + " " + text);
  }
}

/* The royalty rate lives in the database, clause 8.3. */
async function royaltyRate(artistCode, referringCode) {
  const res = await fetch(SB_URL + "/rest/v1/rpc/artist_royalty_rate", {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify({ p_artist_code: artistCode, p_referring_code: referringCode })
  });
  if (!res.ok) throw new Error("artist_royalty_rate failed: " + res.status);
  const rate = await res.json();
  return typeof rate === "number" ? rate : Number(rate) || 0;
}

/* Clause 8.4: a third-party referrer earns 10% from the platform share. */
function commissionCents(amountCents, artistCode, referringCode) {
  if (!referringCode || referringCode === artistCode) return 0;
  return Math.round(amountCents * 0.10);
}

function customerIdOf(obj) {
  return typeof obj.customer === "string" ? obj.customer : (obj.customer && obj.customer.id) || null;
}

async function applyDeckPurchase(session, eventId) {
  const md = session.metadata || {};
  if (md.kind !== "deck") return; // a Stellar session; not ours

  const userId = md.user_id;
  const slug = md.deck_slug;
  if (!userId || !slug) {
    console.error("deck webhook: session missing metadata", session.id);
    return;
  }
  const artistCode = md.artist_code || null;
  const referringCode = md.referring_code || null;
  const amount = session.amount_total || 0;

  const rate = artistCode ? await royaltyRate(artistCode, referringCode) : 0;

  const outcome = await insertSale({
    deck_id: md.deck_id || null,
    deck_slug: slug,
    artist_code: artistCode,
    referring_code: referringCode,
    stripe_event_id: eventId,
    stripe_customer_id: customerIdOf(session),
    email: (session.customer_details && session.customer_details.email) || null,
    amount_cents: amount,
    currency: session.currency || "usd",
    artist_royalty_cents: Math.round(amount * rate),
    affiliate_commission_cents: commissionCents(amount, artistCode, referringCode),
    kind: "sale"
  });
  if (outcome === "duplicate") return; // Stripe retry; the first delivery did the work

  await grantOwnership(userId, slug);
}

/* A refund arrives as charge.refunded with no session attached. Walk
   charge -> payment_intent -> checkout session to find out whether the
   charge was a deck sale at all; anything else is ignored. */
async function applyRefund(charge, eventId) {
  const pi = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent && charge.payment_intent.id;
  if (!pi) return;

  const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
  const session = sessions.data && sessions.data[0];
  if (!session || !session.metadata || session.metadata.kind !== "deck") return;

  const md = session.metadata;
  const refunded = charge.amount_refunded || 0;
  if (refunded <= 0) return;

  const artistCode = md.artist_code || null;
  const referringCode = md.referring_code || null;
  const rate = artistCode ? await royaltyRate(artistCode, referringCode) : 0;

  await insertSale({
    deck_id: md.deck_id || null,
    deck_slug: md.deck_slug || null,
    artist_code: artistCode,
    referring_code: referringCode,
    stripe_event_id: eventId,
    stripe_customer_id: customerIdOf(charge),
    email: charge.billing_details ? charge.billing_details.email : null,
    amount_cents: -refunded,
    currency: charge.currency || "usd",
    artist_royalty_cents: -Math.round(refunded * rate),
    affiliate_commission_cents: -commissionCents(refunded, artistCode, referringCode),
    kind: "refund"
  });
  /* deck_ownership is deliberately NOT revoked here. */
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let event;
  try {
    const body = await rawBody(req);
    event = stripe.webhooks.constructEvent(
      body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("deck webhook signature failed:", err.message);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await applyDeckPurchase(event.data.object, event.id);
        break;
      case "charge.refunded":
        await applyRefund(event.data.object, event.id);
        break;
      default:
        break; // ignore everything else
    }
    res.status(200).json({ received: true });
  } catch (err) {
    // Non-2xx makes Stripe retry, which is what we want on transient failures.
    console.error("deck webhook handler error:", err);
    res.status(500).json({ error: "Handler failed" });
  }
};
