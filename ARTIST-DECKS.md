# Artist decks: from first email to on sale

The whole process for adding a licensed artist's deck to Stellar Tarot. Read it
top to bottom before touching a new deck, and follow the steps in order. Every
step says whether it differs for a **tarot** deck (78 cards) or an **oracle,
affirmation or other** deck (any number of cards, no suits).

Written 29 Sep 2026 for Michael Burk's Anthropologist Tarot and rewritten 1 Oct
2026 after it went live, the first tarot deck released end to end. The Barley
Moon's two oracle decks went through the oracle path earlier.

## Where things stand

| Artist | Code | Deck(s) | Kind | Slug | Preview | Status |
|---|---|---|---|---|---|---|
| The Barley Moon (Laura Metcalfe) | `barleymoon` | Inner Wisdom Oracle (35), Mandala Oracle (36) | oracle | `barley-inner-wisdom`, `barley-mandala` | `/thebarleymoonpreviews` | live at $4.99 each |
| Michael Burk | `michaelburk` | The Anthropologist Tarot (78) | tarot | `anthropologist-tarot` | `/michaelburkpreviews` | **live 1 Oct 2026 at $8.88**; his back, bleed trimmed, samples The World, King of Cups, Page of Wands; guidebook keywords in `api/_preview/anthropologist-tarot/meanings.json` |

Update this table whenever an artist is added or a deck changes status.

## The two kinds at a glance

| | Tarot (78 cards) | Oracle, affirmation, other |
|---|---|---|
| Card mapping | Each file is matched to one of the 78 slots (`major_00_fool`, `cups_06`, `wands_page`...) by `../tools/card_slots.py` | No slots. Cards are numbered 1..N in the artist's order |
| `prepare_deck.py` | no flag | `--oracle` |
| How a reader uses it | Picks it as their deck; every card in every reading wears the artist's art, readings use the app's own meanings | Draws a card from it as an extra card inside a reading; the image is the reading |
| Where the live art sits | Private `deck-art` bucket in Supabase, served as one-hour signed links to owners only | Public folder `cards/<slug>/` in this repo |
| App code to add | None. The `decks` row (`art_source = storage`) is enough | An `ORACLE_DECKS` entry in `index.html` |
| Samples shown before purchase | 2 or 3 the artist approves, in the public `deck-samples` bucket | 2 the artist approves, the `samples` list in `ORACLE_DECKS` |

The oracle path is older and its art is public to anyone who guesses the URL.
That was acceptable for affirmation cards at 900 px. If an oracle artist wants
the same protection as tarot, the storage path needs extending to oracle draws
first (`deck_cards` already supports any slot names).

## The rules

- **Print-resolution originals never leave this Mac** (licence clause 12.2).
  They sit untracked in `Cards/<artist folder>/` and are never committed or
  uploaded. Only prepared copies (900 px on the long edge) go anywhere.
- **Unsigned art is never public.** Before the licence is signed, prepared art
  lives only in `api/_preview/<slug>/`, which only the password gate reads.
- **Nothing is on sale until the licence is signed.** The `decks` row stays
  `draft` until then. Going live is a decision made in admin, never a side
  effect of an upload.
- `Cards/` on disk is `cards/` in git (macOS is case-insensitive). Stage
  explicit paths only, never `git add -A` or `git add Cards/`.
- No "Astra" and no em dashes in anything the artist or a reader sees.
- Artists earn deck royalties only: **0% on Stellar astrology signups**
  (decided 1 Oct 2026). Their dashboard is `www.stellarastro.app/artist`.

---

## 1. Intake: what to ask the artist for

Send the intake email from the Creatorapps mailbox in Apple Mail (the one sent
to Michael on 9 Sep 2026 is the model). Ask for:

- the card images at the highest resolution they have, any names, any format
- the card back
- card names and order, if the file names do not make them obvious
- their own card meanings, if they have them
- two or three cards they are happy to show publicly before purchase
- a price per deck, **$4.99 to $25**
- a short bio, how their name should appear, a shop link and social links

Send the licence for signature in parallel. The preview (step 3) can happen
before it is signed; going live (step 6) cannot.

Never send partner email by scripting Mail's `save`: it once landed in Sent.
Write the text in the scratchpad, or open a visible unsent window and say so.

## 2. Prepare the cards

Save the files to `Cards/<Artist folder>/` exactly as they arrived. Delete
iCloud duplicates first (`9 2.jpg` beside `9.jpg`), or they count as extra cards.
Put the card back in the same folder with "back" in its file name.

```
# tarot
python3 scripts/prepare_deck.py "Cards/<Artist folder>" --slug <slug>
# oracle, affirmation or anything not 78 tarot cards
python3 scripts/prepare_deck.py "Cards/<Artist folder>" --slug <slug> --oracle
# add this when the files are print exports with a bleed (stray edge pixels)
  --bleed 0.125            # and --trim-height if the card is not 4.75 in tall
```

The slug is lowercase with hyphens and becomes the deck's id everywhere.
It writes `api/_preview/<slug>/`: `full/1..N.jpg` (900 px tall), `thumb/`,
`back.jpg` if sent, and `manifest.json` (number, slot for tarot, name, source
file, `ratio`).

Tarot only: every file must match exactly one of the 78 slots. If any card fails
to match or two files claim one slot, the script stops and says which. Rename the
files, or use `../tools/ingest_deck.py` for its drag-and-drop contact sheet.

**Open the contact sheet it writes and look at every card**:

- **Upside down or sideways.** Check EXIF before rotating anything:
  `Image.open(f).getexif().get(274)`. PIL ignores the tag and browsers obey it,
  so a contact sheet can look right while phones show the card flipped. That is
  what happened to `cards/rws/cups_06.jpg` twice. The Anthropologist Hermit had a
  stale rotate tag on upright pixels; the script ignores those and reports them.
- **Odd aspect ratio.** Reported by file. Ask the artist for a new export.
- **Edges.** Zoom on a corner. A thin light or dark strip is print bleed:
  re-run with `--bleed`.
- **The count.** 78 for tarot; for oracle, what the artist says the deck holds.

If the artist sent meanings, keep them beside the manifest as
`api/_preview/<slug>/meanings.json`, keyed by slot (tarot) or number (oracle),
words exactly as sent.

## 3. The private preview for the artist

One function, `api/preview-gate.js`, serves every artist's gallery behind their
own password. The gallery page is `api/_preview/deck-preview.html`. Adding an
artist adds no Vercel function (Hobby caps the project at 12).

1. **Gallery registry.** In `deck-preview.html`, add a `DECKS` entry keyed by a
   fresh random token
   (`python3 -c "import secrets,string;a=string.ascii_lowercase+string.digits;print(''.join(secrets.choice(a) for _ in range(8)))"`).
   Set `slug`, `title`, `artist`, `count`, `ratio` (from `manifest.json`), and
   `art: "/<code>previews/art"`. Tarot: paste the 78 names from the manifest.
   No back yet: `back: "/cards/back-stellar.jpg"`, and the page tells the artist
   it is the house back. Once their back arrives, drop `back` and the gate
   serves `<slug>/back.jpg`. Add `price` once they set one. When art is
   re-prepared after they have seen it, bump `v` so their browser drops the
   day-long cached images. Several decks for one artist: add a `SETS` entry and
   use that token below.
2. **Gate.** In `api/preview-gate.js`, add an `ARTISTS` entry keyed by the code:
   `heading`, `env` (`PREVIEW_PASSWORD_<CODE>`), `cookie` and `seal` (new and
   unique), `open` (the token from step 1), `art: ["<slug>"]`.
3. **Routes.** In `vercel.json`, two rewrites **above** the `/:artist`
   catch-alls:
   ```json
   { "source": "/<code>previews", "destination": "/api/preview-gate?a=<code>" },
   { "source": "/<code>previews/art/:slug/:size/:n",
     "destination": "/api/preview-gate?a=<code>&slug=:slug&size=:size&n=:n" }
   ```
4. **Password.** Make one up and set it, production only:
   `vercel env add PREVIEW_PASSWORD_<CODE> production` from this folder.
5. **Ship.** Commit staging only `api/_preview/<slug>/`,
   `api/_preview/deck-preview.html`, `api/preview-gate.js`, `vercel.json`.
   Push to main.
6. **Check production.** `/<code>previews` shows the form; the password opens the
   gallery; `/<code>previews/art/<slug>/full/1` without the cookie is `401`;
   `/api/_preview/<slug>/full/1.jpg` is **not** the image.
7. **Send it.** The link and the password, and the list of what you still need
   from step 1. The cookie lasts 30 days.

## 4. Admin: the artist and the deck row

`https://www.stellarastro.app/admin` → **Tarot** tab. In Chrome automation use
`form_input` on element refs; coordinate clicks do not focus its fields.

- **Add artist:** name as the app shows it, email, code (lowercase; becomes
  `tarot.stellarastro.app/<code>`), split 70 / own-ref 80 (programme standard;
  clause 16.2 says a rate cannot be cut later), shop URL. The form sets their
  Stellar astrology commission to 0% and they sign in at `/artist`.
- **Add deck:** title, slug (same as step 2), artist, price, cards, subtitle,
  shop URL for the printed deck, blurb, status **draft**.

A draft row is invisible to readers. The artist's name and shop link appear in
the public artist directory as soon as they have any non-retired deck, so
`tarot.stellarastro.app/<code>` exists early but only if someone types it.

Admin has no edit form for an existing row's price, blurb or bio. Change those
from the admin page's own client in the browser console (`sb` is signed in as
admin):
```js
await sb.from("decks").update({price_cents: 888}).eq("slug", "<slug>")
await sb.from("affiliates").update({artist_bio: "..."}).eq("code", "<code>")
```

## 5. Put the artist's answers where they belong

| They sent | Where it goes |
|---|---|
| Price | `decks.price_cents`, and `price` in the preview gallery entry |
| Card back | the source folder, then re-run step 2 (and drop `back` from the gallery entry) |
| Sample cards | tarot: `--samples` in step 6A; oracle: `samples` in `ORACLE_DECKS` |
| Bio | `affiliates.artist_bio` (the directory, wins on the artist page) |
| Name as shown, shop link, socials | `ORACLE_ARTISTS.<code>` in `index.html` (`name`, `by`, `shop`, `social`, `bio`); the social pills only come from here. Tarot artists use it too, despite the name |
| Meanings | `api/_preview/<slug>/meanings.json` while private; at launch, the public `meanings/<slug>.json` (step 6A.4b) |

## 6. Going live (licence signed)

### 6A. Tarot deck: private storage

The Supabase side is built (`../Stellar/supabase/deck-art-setup.sql`): the private
`deck-art` bucket (owners, the artist, or a free deck), the public `deck-samples`
bucket, the `deck_cards` table, the `decks` columns `art_source`,
`card_back_path`, `sample_slots`, and `can_read_deck_art()`. The app reads any
deck whose row says `art_source = storage`: no code change per deck.

1. **Make the files** (into the scratchpad, never the repo):
   ```
   python3 scripts/publish_deck_art.py "Cards/<Artist folder>" --slug <slug> \
       --bleed 0.125 --samples <slot>,<slot>,<slot> --out <scratch>/deckart
   ```
   It writes `deck-art/<slug>/<slot>.webp` (900 px), `<slot>_thumb.webp`
   (300 px), `back.webp`, `deck-samples/<slug>/<slot>.webp` (600 px, samples
   only), and `deck_cards.json`. WebP q82, metadata stripped and checked.
   Michael's deck: 160 files, 11 MB.
2. **Serve them to the admin page.** There is no service key on this Mac; the
   admin page uploads with its own admin session (the storage policies let
   admin write both buckets). In the scratchpad:
   ```
   cd <scratch>/deckart && find . -name "*.webp" | sed 's|^\./||' | sort > files.txt
   python3 scripts/cors_server.py <scratch>/deckart     # 127.0.0.1:8899, run from this folder
   ```
   `scripts/cors_server.py` is a `SimpleHTTPRequestHandler` that adds
   `Access-Control-Allow-Origin: https://www.stellarastro.app` and
   `Access-Control-Allow-Private-Network: true` and answers `OPTIONS` with 204.
3. **Upload** from the admin page console (signed in as admin):
   ```js
   const list=(await fetch('http://127.0.0.1:8899/files.txt').then(r=>r.text())).split('\n').filter(Boolean);
   let ok=0, fails=[];
   for(let i=0;i<list.length;i+=8){ await Promise.all(list.slice(i,i+8).map(async f=>{
     const bucket=f.split('/')[0], path=f.slice(bucket.length+1);
     const blob=await fetch('http://127.0.0.1:8899/'+f).then(r=>r.blob());
     const {error}=await sb.storage.from(bucket).upload(path,blob,{contentType:'image/webp',upsert:true});
     error?fails.push(f+': '+error.message):ok++; })); }
   ({ok, fails})
   ```
   Paths must stay `<slug>/<slot>.webp`: the storage policies read the first
   path segment as the deck slug.
4. **Write the manifest and the row**, same console:
   ```js
   const m=await fetch('http://127.0.0.1:8899/deck_cards.json').then(r=>r.json());
   await sb.from('deck_cards').upsert(m.cards,{onConflict:'deck_slug,slot'});
   await sb.from('decks').update({art_source:'storage', card_back_path:m.card_back_path,
     sample_slots:m.sample_slots, card_count:78, blurb:'...'}).eq('slug','<slug>');
   ```
   Stop the local server when done (`pkill -f cors_server.py`).

   **4b. The artist's own card meanings** (if they sent any). Readers see them
   first on every card, headed "Card meanings by <artist>", then the app's own
   reading; the Card Library shows upright and reversed. Write
   `meanings/<slug>.json` in this repo, keyed by slot, words exactly as sent:
   ```json
   {"deck":"<slug>","by":"Michael Burk","source":"...",
    "cards":{"major_07_chariot":{"up":["Determination","Control","Victory"],
                                 "rev":["Lack of control","Stagnation","Directionless; aimless"]}}}
   ```
   Michael's was built from his PDF (`pypdf` text, "Upright:" / "Reversed:" lines,
   split on " · ") into `api/_preview/anthropologist-tarot/meanings.json`, then
   reshaped. Commit and push it; the app fetches it when the deck is in use and
   shows nothing extra for a deck without one. Mention it in the deck's blurb.
5. **Check it is private** (all from a shell, no session):
   - `.../sb/storage/v1/object/public/deck-art/<slug>/<slot>.webp` → not 200
   - the same with the publishable key as bearer at `/authenticated/` → not 200
   - `.../public/deck-samples/<slug>/<sample>.webp` → 200 `image/webp`
   - a non-sample slot under `deck-samples` → not 200
6. **Test the art in a real reading before going live.** Easiest: give your own
   account the deck first (step 9 below; it works on a draft too), then on
   `tarot.stellarastro.app` pick it in the deck sheet and draw. If you would
   rather not own it yet, admin alone is not an owner, so `can_read_deck_art`
   says false for you; sign by hand in the console instead, then draw:
   ```js
   const c=STELLAR._sb();
   DECKS.push({id:'<slug>',name:'test',sub:'',blurb:'',ready:true,samples:[],storage:true,back:'<slug>/back.webp'});
   const man=await c.from('deck_cards').select('slot,storage_path').eq('deck_slug','<slug>');
   const sig=await c.storage.from('deck-art').createSignedUrls(man.data.map(r=>r.storage_path).concat(['<slug>/back.webp']),600);
   const by={}; sig.data.forEach(x=>by[x.path]=x.signedUrl);
   const urls={}; man.data.forEach(r=>urls[r.slot]=by[r.storage_path]);
   DECK_SIGNED['<slug>']={exp:Date.now()+600e3,urls,back:by['<slug>/back.webp']};
   state.deck='<slug>'; renderDeckPicker();
   selectSpread('three',document.querySelector('.spread[data-key="three"]'));
   state.drawn=['major_21_world','cups_02','wands_page'].map((id,i)=>({card:DECK[DECK_BY_ID[id]],reversed:i===1}));
   reveal();
   ```
   The cards should wear the artist's art (give the images a second to load),
   the reversed one turned over. Reload the tab afterwards.
7. **Go live** in the admin console:
   `await sb.from('decks').update({status:'live'}).eq('slug','<slug>')`.
8. **Check what a buyer sees.** `tarot.stellarastro.app/<code>/<slug>?view=artist`
   shows the samples and "Buy this deck · $X". Confirm checkout without paying:
   from that page's console, POST `/api/checkout-deck` with the session's access
   token and `{deck_slug:'<slug>'}`; it should return a `checkout.stripe.com` URL.
   Do not complete it. The artist gets their own deck free when they sign in
   with their registered email (`Stellar/supabase/artist-own-decks.sql`).
9. **Add it to your own decks** (and to anyone else's as a gift). An ownership
   row is all "owning a deck" means. Admin may write `deck_ownership`; the user
   id is whoever is signed in on `tarot.stellarastro.app`, so run this there:
   ```js
   const c=STELLAR._sb();
   await c.from('deck_ownership').upsert(
     {user_id: STELLAR.user.id, deck_slug: '<slug>', source: 'gift'},
     {onConflict: 'user_id,deck_slug', ignoreDuplicates: true});
   (await c.rpc('can_read_deck_art', {p_deck_slug: '<slug>'})).data   // true
   ```
   For someone else, look up their `user_id` and insert the same row from the
   admin page. `source` is `purchase` (webhook), `gift` (by hand), `artist`
   (signup trigger) or `included`. Admin sees every user's rows in that table,
   so filter by `user_id` when reading it back. Reload the app and the deck
   shows as owned in the deck sheet with "Use this deck". Done for Lachlan's
   account (lachlan.sforcina@gmail.com) on 1 Oct 2026, which is also how the
   owner path was proven: 78 cards and the back signed, art in a reading.
   Test readings drawn from the console do not save to the account.

### 6B. Oracle, affirmation or other deck: public folder

1. Copy the prepared `full/`, `thumb/` and `back.jpg` from
   `api/_preview/<slug>/` to `cards/<slug>/`.
2. Add an `ORACLE_DECKS` entry in `index.html`, modelled on the Barley Moon ones:
   `id` (the slug), `name`, `sub` ("Affirmations · 35 cards"), `artist`,
   `artist_code`, `count`, `samples` (the approved card numbers as strings),
   `price` (display), `shop` (printed deck), `artistUrl`, `blurb`,
   `ready:false`. The `decks` row then dresses it at runtime: price, on sale,
   live. Oracle rows never join the tarot deck list.
3. Commit the `cards/<slug>/` files and `index.html`, push to main.
4. Set the row `live` in admin, then open
   `tarot.stellarastro.app/<code>/<slug>?view=artist` and check the deck page,
   and draw it as an extra card in a reading (deck menu beside "Draw a
   clarifier").

## 7. After launch

- **Add it to your own decks** if step 6A.9 was skipped (oracle decks too: the
  same `deck_ownership` row, with the oracle slug).
- **Tell the artist.** It is live, the deck link, the price, that their dashboard
  is `www.stellarastro.app/artist` (sign in with their registered email: royalties,
  link clicks, shop clicks, payouts, and View buttons that open their pages
  without counting as clicks), and that signing in there gives them their own
  deck free in the app.
- **Feature images to share.** `python3 ../stellar-social/artist_features.py <code>`
  after adding the artist to its `ARTISTS` table (only their approved samples;
  dark ground uses an existing `BG-*`, a light ground needs a background from
  PoYo). Output, captions and a zip land in
  `../Stellar/docs/social/assets/artists/<code>/`. Say "coming soon" until the
  row is live.
- **Preview.** Keep `/<code>previews` while the artist still wants it. When it
  goes, remove the `ARTISTS` entry and the two rewrites. For tarot the preview
  art in `api/_preview/<slug>/` is then redundant (the live art is in storage).
- Update the table at the top of this file and the memory notes.

## Gotchas met so far

- A file re-save can add an EXIF rotate tag to upright pixels; browsers then flip
  the card. Check tag 274 before "fixing" pixels (Six of Cups, Sep 2026).
- Print exports carry a 0.125 in bleed with stray pixels at the edges
  (Michael's Two of Cups). `--bleed` trims it; 647x1080 at 3 x 5 in is
  216 px/in, 27 px a side.
- The gate caches images for a day: bump `v` in the gallery entry after
  re-preparing art.
- `tarot.stellarastro.app/<code>` only opened the artist page for tarot decks
  until 1 Oct 2026; `openArtistFromLink()` now counts oracle decks too.
- A tarot card never shows the bare sigil face (1 Oct 2026, Lachlan's rule).
  `cardArtSrc()` returns the deck's own art when signed, otherwise the RWS card,
  and starts signing a licensed deck the first time one of its cards is drawn
  (a saved reading used to open before signing ever began). `artFallback()`
  drops a failed image to RWS; art swaps in only once loaded; CSS hides the
  sigil on any card that has an image. Keep all three if you touch card art.
- Vercel `cleanUrls` is on in the Stellar project: a rewrite destination must
  be `/affiliate`, not `/affiliate.html`.
