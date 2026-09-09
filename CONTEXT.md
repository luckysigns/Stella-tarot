# Stellar Tarot

> ## ⚠️ The name
>
> **This app is called Stellar Tarot.** It is live at **https://tarot.stellarastro.app**
>
> **"Astra" is the OLD name and is not used anywhere a person can see it.**
> It survives only as internal plumbing, and renaming that plumbing would break
> things, so it is deliberately left alone:
>
> | Where "Astra" still appears | Why it stays |
> |---|---|
> | this folder name, `CreatorApps/Astra/` | paths in scripts, plists and notes point here |
> | `localStorage` keys: `astra.deck`, `astra.theme`, `astra.ref`, `astra.pending`, `astra.archive`, `astra.revname`, `astra.revanon` | renaming silently wipes every existing reader's deck choice, theme, held-back readings and referral attribution |
> | `astra-data/`, `astra_run.sh`, `com.lucky.astra-*.plist` | the plists are registered with launchd **by path**; renaming breaks the scheduled builds |
> | `ASTRA_*.md`, `ASTRA-STRIPE-PROMPT.md` | historical build prompts, kept as written |
>
> **One real exception:** the celestial *deck* is genuinely called **Astra**
> (`DECKS[].id "astro"`) and appears by that name in the deck shop. That is a
> deck title, not the app name, and it stays.
>
> **Never put "Astra" in user-facing copy.** Anything a reader can read says
> Stellar Tarot: the `<title>`, headings, plan copy, Stripe product names, the
> checkout page, receipts. If you find "Astra" in visible text, that is a bug.
>
> The Stripe products were renamed on 9 Sep 2026:
> `Astra Reading Archive` → **Stellar Tarot Reading Archive**,
> `Astra Lifetime` → **Stellar Tarot Lifetime**.

## Overview
Tarot app sharing one Stellar account with the astrology app (Stellar, at
stellarastro.app). Guided spreads and a free-form "ask a question" mode, both
built on the same CONTENT/deepRead system. Readings save to the reader's
account, capped by plan.

## Status
Live.

## Tech Stack
One static `index.html` (~7.7MB, most of it card art and CONTENT), no build step.
Vanilla JS. Vercel for hosting plus a few Node serverless functions in `/api`.
Supabase for auth and saved readings, shared with Stellar.

## Key Files
| File | What it is |
|---|---|
| `index.html` | the whole app |
| `api/checkout-deck.js`, `api/stripe-webhook-deck.js` | deck purchases |
| `api/_unlock.js` | shared helpers for the reading archive: Stripe REST, price→tier map, signed token |
| `api/verify.js` | a Stripe Checkout Session → a signed entitlement token |
| `api/restore.js` | an email → the same token, on any device |
| `api/check.js` | revalidates a token (signature + expiry), no Stripe call |
| `scripts/point-payment-links.js` | one-off: points the payment links back at the app |
| `vercel.json` | rewrites and security headers |

## Notes
- **Vercel Hobby caps 12 serverless functions.** Currently 5. A 13th builds fine
  then fails at "Deploying outputs". Files starting with `_` are not counted.
- **Reading archive.** Sold in-app through Stripe payment links, surfaced inside
  the saved-readings sheet (profile menu → the readings list), never as its own
  panel. Caps: free 10, Minor Arcana 100, Major Arcana 1,000, Lifetime unlimited.
- **One payment, never two.** `planCap()` returns the higher of the Stellar
  account plan and the bought archive tier, and a reader holding a Stellar plan
  is never shown a tarot plan to buy. Nobody pays twice for the same room.
- **Readings are never deleted or truncated** by any cap or expiry. A full plan
  only pauses new saves; the reading stays on screen and saves itself once room
  appears.
- Env vars live on Vercel **Production only**: `STRIPE_SECRET_KEY`,
  `UNLOCK_SIGNING_SECRET`. Preview deploys therefore report "not configured" and
  show everyone as free. That is expected; test on tarot.stellarastro.app.
- Stripe account is **Revisual Media**; checkout branding shows "Stellar".
- No em dashes in user-facing copy.
