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
| `deep/<cardId>.json`, `deep/identity/<cardId>.json` | the in-depth astrology readings, fetched by the wing when a card is shown (never inlined) |
| `astra-data/deep/` | the tooling that writes them (gitignored): `DEEP_SPEC.md`, `facts.js`, `validate.js`, `deep_run.sh`, `publish.sh` |

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
- **Deep astrology readings.** Each card has one file in `/deep/` holding its reading
  against every sign as Sun, Moon and Rising (both orientations) and in every house;
  `/deep/identity/` holds the long-form "Your Cards" sections. The wing shows them under
  the short position text and falls back to the old one-line clause for any file not
  written yet, so partial progress is always safe to ship. Year Ahead reads each month
  for the whole-sign house the Sun lights that month (from the Rising, or the Sun when
  there's no birth time), reusing the card x house readings.
  Write more: `bash astra-data/deep/deep_run.sh` (night window 21:00-07:00, `FORCE=1`
  to run now, `touch astra-data/deep/HALT` to stop). Progress:
  `node astra-data/deep/validate.js --status`. Ship: `bash astra-data/deep/publish.sh`.
- The Magician is **The Magician**. "The Magus" (and The Voyager, The Hanged Star, The
  Cosmos) were names from the unreleased celestial deck and must not appear under
  Rider-Waite art.
- **Oracle decks (The Barley Moon).** Not tarot; they live in `ORACLE_DECKS`, art in
  `cards/barley-inner-wisdom` (35) and `cards/barley-mandala` (36). Their `decks` rows (slug =
  the art folder) dress the local entry in `refreshDecks` (price, on sale, live) and never
  join the tarot `DECKS` list. Shop row and artist page show Buy at the row's price; the
  checkout floor is $4.99 (`api/checkout-deck.js`). Both rows were created 23 Sep 2026 at
  499 cents as `draft`; flip them to `live` in the admin Tarot tab once the client that
  understands oracle rows is on main. Laura Metcalfe (was Phillips) = artist code `barleymoon`.
- **Extra cards from any deck.** A menu (`.deck-pick`, `EXTRA_DECK`) beside every "Draw a
  clarifier" / "Draw another card" / "Add a card" button lists the tarot decks the account can
  use plus the oracle decks it holds; it only appears when there is a choice. `drawExtra()` is
  the one way an extra card is drawn. An oracle card is `{oracle, n}` (no orientation, the
  picture is the reading); a tarot card from another deck carries `deck`. Every extra card
  has a Remove button; the ask payload carries `base` (the pull size) so only cards added
  afterwards can be removed. Counts in the reading header include extras. The old oracle
  pop-up reader is gone.
- **Ask mode labels.** No label means the card is read straight (no "Card 2" tag, no lens
  sentence); a label the deck knows gets its position text; a label ending in "?" or longer
  than five words is a follow-up question and is quoted above the card. Textareas with
  `.autogrow` size themselves to their text.
- `cards/rws/cups_06.jpg` was stored upside down until 23 Sep 2026, so every upright Six of
  Cups looked reversed. If a card ever looks flipped while the reading says upright, check
  the scan before the code.
- **Writing voice.** Reading content must read like an astrologer talking across a
  table, not essay prose. The rules and a before/after are in
  `astra-data/deep/DEEP_SPEC.md` under "Sounding like a person, not a model".
