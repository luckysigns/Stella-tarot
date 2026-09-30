# Artist decks: prepare, preview, list

How a licensed artist's deck goes from "the files arrived" to a private preview
the artist can look through, and into the admin page. Follow it top to bottom
for every new deck. Written 29 Sep 2026 while adding Michael Burk's
Anthropologist Tarot; The Barley Moon's two oracle decks went through the same
steps earlier by hand.

## Where things stand

| Artist | Code | Deck(s) | Slug | Preview | Row status |
|---|---|---|---|---|---|
| The Barley Moon (Laura Metcalfe) | `barleymoon` | Inner Wisdom Oracle (35), Mandala Oracle Deck (36) | `barley-inner-wisdom`, `barley-mandala` | `/thebarleymoonpreviews` | live |
| Michael Burk | `michaelburk` | The Anthropologist Tarot (78) | `anthropologist-tarot` | `/michaelburkpreviews` | draft at $8.88, licence not signed; his back, bleed trimmed, meanings in `meanings.json`; samples he left to us: Wheel of Fortune (11), Two of Cups (24), Six of Swords (56) |

Update this table whenever an artist is added or a deck changes status.

## The rules

- **Print-resolution originals never leave this Mac** (licence clause 12.2).
  They sit untracked in `Cards/<artist folder>/` and are never committed or
  uploaded. Only the prepared copies (900 px tall) go anywhere.
- **Unsigned art is never public.** Until the licence is signed, prepared art
  lives in `api/_preview/<slug>/`, which only the password gate reads. Nothing
  under `api/` is served statically. `cards/<slug>/` is public to anyone who
  guesses the URL, so art goes there only when the deck is going live.
- `Cards/` on disk is `cards/` in git (macOS is case-insensitive). Stage
  explicit paths only, never `git add -A` or `git add Cards/`, or the
  originals go into the repo.
- Nothing is for sale until the licence is signed. The deck row stays `draft`.
- No "Astra" and no em dashes in anything the artist or a reader sees.

## 1. What to ask the artist for

The intake email (sent to Michael on 9 Sep 2026, Creatorapps mailbox in Apple
Mail) asks for:

- the card images at the highest resolution they have, any names, any format
- the card back
- card names and order, if the file names do not make them obvious
- their own card meanings, if they have them
- two or three cards they are happy to have shown publicly as samples
- a price per deck, $4.99 to $25
- a short bio, how their name should appear, a shop link and a social link

Save the files to `Cards/<Artist folder>/` exactly as they arrived.

## 2. Prepare the cards

```
python3 scripts/prepare_deck.py "Cards/<Artist folder>" --slug <slug>
python3 scripts/prepare_deck.py "Cards/<Artist folder>" --slug <slug> --oracle   # not tarot
```

The slug is lowercase with hyphens and becomes the deck's id everywhere (the
admin row, the folders, the checkout). It writes `api/_preview/<slug>/`:

- `full/1.jpg ... N.jpg`: 900 px tall, the size the app and preview show
- `thumb/1.jpg ... N.jpg`: 260 px tall
- `back.jpg`: only when the artist sent a back (a file with "back" in its name)
- `manifest.json`: card number, canonical slot (tarot), name, source file,
  and `ratio` (height / width) for the gallery

**Print files with a bleed.** Artists often export the print file, with a
bleed (usually 0.125 in) round the trimmed card, and the bleed edge can show
stray pixels. Add `--bleed 0.125` (and `--trim-height` if the card is not the
standard 4.75 in tarot height) and the script trims every card and the back.
Michael's files were 647x1080, i.e. 3 x 5 in at 216 px/in, so 27 px came off
each side. After re-preparing art the artist has already seen, bump `v` on
the deck's gallery entry so their browser drops the day-long cached images.

**Card meanings.** If the artist sends their own, keep them beside the manifest
as `api/_preview/<slug>/meanings.json`, keyed by slot, words exactly as sent.

Card numbers follow the artist's own order: the number in each file name once
the prefix every file shares is dropped. A tarot deck is also matched onto the
78 canonical slots by `../tools/card_slots.py`. If any card fails to match, or
two files claim one slot, the script stops and says which. Rename the files (or
use `../tools/ingest_deck.py` for its drag-and-drop contact sheet) and run it again.

Then read what it prints, and **open the contact sheet it writes** before
going further:

- **Upside down or sideways cards.** `cards/rws/cups_06.jpg` was stored upside
  down for weeks and every upright Six of Cups looked reversed. The
  Anthropologist Hermit arrived with a stale EXIF "rotate 90" tag on pixels that
  were already upright. The script ignores a tag like that and reports it. Check
  anything it reports.
- **Odd aspect ratio.** Reported by file. Usually one card exported at the
  wrong size. Ask the artist for a new export rather than cropping.
- **Duplicates.** iCloud leaves copies like `9 2.jpg` beside `9.jpg`. The
  script would count them as extra cards. Delete them from the source folder first.
- **The count.** 78 for tarot. Oracle decks vary, and the number must match
  what the artist says the deck holds.

## 3. The private preview for the artist

The gallery page is `api/_preview/deck-preview.html`, and one function,
`api/preview-gate.js`, serves it behind a password for each artist. Adding
an artist adds no new function (Vercel Hobby caps the project at 12).

1. **Gallery registry.** In `deck-preview.html`, add an entry to `DECKS` keyed
   by a fresh random token (`python3 -c "import secrets,string;a=string.ascii_lowercase+string.digits;print(''.join(secrets.choice(a) for _ in range(8)))"`).
   Set `slug`, `title`, `artist`, `count`, `ratio` from `manifest.json`, and
   `art: "/<code>previews/art"` so images come through the gate. With no card
   back, set `back: "/cards/back-stellar.jpg"` (the house back) and the page
   says so to the artist. Paste the names from the manifest for a tarot deck.
   Add `price` only once the artist has set one. If an artist has several decks,
   add a `SETS` entry listing their tokens, and use that token below.
2. **The gate.** In `preview-gate.js`, add an entry to `ARTISTS` keyed by the
   code used in the URL: `heading` (form title), `env`
   (`PREVIEW_PASSWORD_<CODE>`), `cookie` and `seal` (both new and unique),
   `open` (the token from step 1), and `art: ["<slug>"]`.
3. **Routes.** In `vercel.json`, add two rewrites *above* the `/:artist`
   catch-alls, or the catch-all takes the URL and serves the app:

   ```json
   { "source": "/<code>previews", "destination": "/api/preview-gate?a=<code>" },
   { "source": "/<code>previews/art/:slug/:size/:n",
     "destination": "/api/preview-gate?a=<code>&slug=:slug&size=:size&n=:n" }
   ```
4. **Password.** Make one up, and set it on the Vercel project, production only:
   `vercel env add PREVIEW_PASSWORD_<CODE> production` from this folder. Until it is
   set, the page says "The preview isn't configured yet." Preview
   deployments do not get production env vars, so test on production.
5. **Ship.** Commit on a branch, staging only `api/_preview/<slug>/`,
   `api/_preview/deck-preview.html`, `api/preview-gate.js` and `vercel.json`. Merge to main.
6. **Check production.**
   - `https://tarot.stellarastro.app/<code>previews` shows the password form
   - the password opens the gallery; swipe through every card once
   - `https://tarot.stellarastro.app/<code>previews/art/<slug>/full/1` without the
     cookie (curl) is `401`
   - `https://tarot.stellarastro.app/api/_preview/<slug>/full/1.jpg` is **not** the
     image (it returns the app shell, as `/api/_unlock.js` does)
7. **Send it.** The link, and the password in a separate line or message. The
   cookie lasts 30 days. Changing the env var signs everyone out.

Laura's preview keeps its original env var (`PREVIEW_PASSWORD`) and cookie so
her sessions survived the move to per-artist passwords.

## 4. Admin: the artist and the deck

`https://www.stellarastro.app/admin` → **Tarot** tab. In Chrome automation,
use `form_input` on element refs. Coordinate clicks do not focus its fields.

- **Add artist:** name as the app should show it, email, code (lowercase,
  becomes `stellarastro.app/?ref=<code>` and `tarot.stellarastro.app/<code>`),
  split 70 / own-ref 80 (programme standard, and clause 16.2 says a rate cannot
  be cut later), and the shop URL for their physical decks.
- **Add deck:** title, slug (the same slug as step 2), artist, price, cards,
  subtitle, the shop URL for the printed deck, blurb, status **draft**.

A draft row is invisible to readers (anon RLS only returns live rows).
The artist's name and shop link do appear in the public `artist_directory` view
from the moment they have any non-retired deck. So `tarot.stellarastro.app/<code>`
shows an empty artist page, but only if someone types the URL.

The artist gets their own decks free once they sign up with that email
(`supabase/artist-own-decks.sql` in Stellar, the signup trigger).

## 5. Going live, after the licence is signed

- **Oracle deck:** copy the prepared `full/`, `thumb/` and `back.jpg` to
  `cards/<slug>/`, add an `ORACLE_DECKS` entry in `index.html` (see the Barley
  Moon ones), then set the row to `live` in admin. The app turns the cards
  from `cards/<slug>/`.
- **Tarot deck (78 cards):** **not built yet.** The app only knows the RWS art
  (`DECK_ART={base:"/cards/rws/"}`) and has no way to show an artist's full
  tarot deck. The plan is `../DECK-INGEST-PROMPT.md`: the private `deck-art`
  bucket readable only by buyers, the `deck_cards` manifest (slot, storage path),
  and `can_read_deck_art()`. Those are set up in Supabase. The app side and
  the upload step are not. `manifest.json` from step 2 already has the
  number → slot map the `deck_cards` rows need. Build that before a tarot deck
  goes live, and do not put licensed tarot art in public `cards/` as a shortcut.
- Samples: only the two or three cards the artist approved are ever public
  before purchase.
- Once the deck is live, remove the artist's `ARTISTS` entry and rewrites (or
  leave them for the artist to keep reviewing), and delete
  `api/_preview/<slug>/` if the art now lives somewhere else.
