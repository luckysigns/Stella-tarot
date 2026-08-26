/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   POST /api/checkout-deck
   Body: { "deck_slug": "<slug>", "ref": "<code from astra.ref, optional>" }
   Auth: Authorization: Bearer <Supabase access token>
   Returns: { "url": "<Stripe Checkout URL>" }

   Creates the Checkout Session server side so the deck, the artist
   and the attribution travel as trusted metadata, never as a
   client-supplied price or query parameter. Mirrors the structure of
   Stellar/api/checkout.js.

   IMPORTANT, shared Stripe account: Stellar's own webhook treats any
   mode=payment session with client_reference_id or
   metadata.supabase_user_id as a LIFETIME purchase, and the affiliate
   conversion webhook reads client_reference_id as an affiliate code.
   Deck sessions therefore set NEITHER. The buyer travels only as
   metadata.user_id, and metadata.kind="deck" is what our own webhook
   keys on. Do not "fix" this by adding those fields back.

   Env vars required (Vercel): STRIPE_SECRET_KEY, SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY
   ============================================================ */

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sbHeaders = {
  apikey: SB_SERVICE,
  Authorization: "Bearer " + SB_SERVICE,
  "Content-Type": "application/json"
};

/* Verify the Supabase JWT by asking Supabase who it belongs to.
   Returns { id, email } or null. */
async function getUserFromToken(token) {
  if (!token) return null;
  const res = await fetch(SB_URL + "/auth/v1/user", {
    headers: { apikey: SB_SERVICE, Authorization: "Bearer " + token }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.id ? user : null;
}

async function getDeck(slug) {
  const res = await fetch(
    SB_URL + "/rest/v1/decks?slug=eq." + encodeURIComponent(slug) + "&select=*",
    { headers: sbHeaders }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

async function alreadyOwns(userId, slug) {
  const res = await fetch(
    SB_URL + "/rest/v1/deck_ownership?user_id=eq." + encodeURIComponent(userId)
      + "&deck_slug=eq." + encodeURIComponent(slug) + "&select=id",
    { headers: sbHeaders }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

/* The permanent account binding, clause 8.3. Null when unbound. */
async function boundCodeFor(userId) {
  const res = await fetch(SB_URL + "/rest/v1/rpc/referral_code_for_user", {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify({ p_user_id: userId })
  });
  if (!res.ok) return null;
  const code = await res.json();
  return typeof code === "string" && code ? code : null;
}

/* A client-supplied ref only counts if it names a real partner. */
async function codeExists(code) {
  const res = await fetch(
    SB_URL + "/rest/v1/affiliates?code=eq." + encodeURIComponent(code) + "&select=code",
    { headers: sbHeaders }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

function sanitizeRef(raw) {
  if (typeof raw !== "string") return null;
  const code = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return code || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: "Please sign in first." });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const slug = typeof body.deck_slug === "string" ? body.deck_slug.trim() : "";
    if (!slug) {
      res.status(400).json({ error: "Missing deck." });
      return;
    }

    const deck = await getDeck(slug);
    if (!deck) {
      res.status(404).json({ error: "Unknown deck." });
      return;
    }
    if (deck.status !== "live") {
      res.status(400).json({ error: "This deck is not on sale." });
      return;
    }
    if (deck.is_free) {
      res.status(400).json({ error: "This deck is free. Nothing to buy." });
      return;
    }
    /* the artist sets the price, $5 to $25; anything outside that is a
       misconfigured row and must not reach Stripe */
    if (!Number.isInteger(deck.price_cents) || deck.price_cents < 500 || deck.price_cents > 2500) {
      res.status(500).json({ error: "Deck price is not configured correctly." });
      return;
    }
    if (await alreadyOwns(user.id, slug)) {
      res.status(400).json({ error: "You already own this deck." });
      return;
    }

    /* Referring code, clause 8.3.1:
       1. the permanent account binding wins,
       2. else the live ?ref code from the browser,
       3. except when they differ and one of them IS the deck's artist,
          in which case the artist's own code wins. Deliberate tie-break
          in the artist's favour, not a bug. */
    const bound = await boundCodeFor(user.id);
    let clientRef = sanitizeRef(body.ref);
    if (clientRef && !(await codeExists(clientRef))) clientRef = null;

    let referring = bound || clientRef || null;
    if (bound && clientRef && bound !== clientRef && clientRef === deck.artist_code) {
      referring = clientRef;
    }

    const origin = req.headers.origin || "https://tarot.stellarastro.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: deck.currency || "usd",
          unit_amount: deck.price_cents,
          product_data: { name: deck.title + " deck · Stellar Tarot" }
        },
        quantity: 1
      }],
      customer_email: user.email,
      success_url: origin + "/?deck=success&slug=" + encodeURIComponent(slug),
      cancel_url: origin + "/?deck=cancelled",
      metadata: {
        kind: "deck",
        deck_slug: deck.slug,
        deck_id: deck.id,
        artist_code: deck.artist_code || "",
        referring_code: referring || "",
        user_id: user.id
      }
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout-deck error:", err);
    res.status(500).json({ error: "Couldn't start checkout. Please try again." });
  }
};
