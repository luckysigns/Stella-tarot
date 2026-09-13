# Artist decks: what was added

Branch `feature/artist-decks`, 13 Sep 2026. Not merged, not deployed.

## What changed from the prompt, and why

The prompt assumed two tarot decks mapping onto the 78 canonical cards. The two
decks supplied are affirmation oracle decks (see MAPPING.md), so on your say-so
the work became: bring oracle decks in as a separate kind of deck, and add a
**drawer** under a tarot reading that can pull from them to finish. The tarot deck
picker, the base and astro layers, and the 78-card art path are untouched.

## Decks added

| | Inner Wisdom Oracle | Mandala Oracle |
|---|---|---|
| id | `barley-inner-wisdom` | `barley-mandala` |
| Playable cards | **35** | **36** |
| Left out | card 36, the artist's credit card | card 37, the intro card; the box front |
| Artist | The Barley Moon (Laura Phillips), makeplayingcards.com/sell/thebarleymoon, @thebarleymoon | same |
| Card back | yes | yes |
| Source size | 34 MB | 34 MB |
| Shipped size | **4.1 MB** (fronts 3.5, thumbs 0.6) | **6.4 MB** (fronts 5.6, thumbs 0.7) |
| Front size | 659 x 900 JPEG q82 | same |
| Thumb size | 190 x 260 JPEG q75 | same |

Files live at `cards/<id>/full/<n>.jpg`, `cards/<id>/thumb/<n>.jpg`,
`cards/<id>/back.jpg` and `cards/<id>/deck.json`. That is the same `cards/` path
the app already serves the Rider Waite art from, rather than the `/public/decks/`
in the prompt, which nothing serves today.

Format is JPEG via macOS `sips`, not WebP: no WebP encoder is installed and the
prompt said to ask rather than install. Both decks are well under the 15 MB target
as they are. If you want WebP later: `brew install webp`, then one pass.

## How it works in the app

- `ORACLE_DECKS` in index.html is the registry: one line per deck. The card list
  and any meanings live in `deck.json` beside the art, fetched on first use.
  Deck three is one line plus a folder.
- Every guided reading now ends with **Finish with a card from another deck**: a
  dropdown of every deck the reader can use (their tarot decks first, then the
  oracle and affirmation decks, each with its artist) and one Pull button. The
  choice is remembered for the session. A tarot pull draws from the same
  shuffled order the clarifiers use, so nothing repeats, can land reversed if
  reversals are on, and shows the face plus its full reading. An oracle pull flips
  in with the same card markup, shows the affirmation as the card's text, and a
  meaning under it if the deck carries one. No repeats within a reading, Put it
  back to remove one, no reversals for oracle decks (these are not tarot).
- Pulls save with the reading (`extras` in the payload, with `reversed` for tarot)
  and come back with it. A fresh draw empties the drawer.
- The drawer sits inside `#capture`, so PNG and PDF exports include the pulled
  cards. On export the picker and buttons hide and a credit line stays.
- **Each oracle deck has its own page** at `/<artist>/<deck>` (same route the
  tarot decks use): title, two sample cards either side of the back, the blurb,
  card count, a Pull button (pulls straight into an open reading, otherwise says
  to draw first) and a link to the artist's profile. Reached from the artist
  page rows, the "About this deck" link under the drawer picker, and the deck
  name under any pulled card. `samples` and `blurb` per deck live in
  `ORACLE_DECKS`.

## Artist credit (Part 6)

- Under each deck name in the drawer.
- Under each pulled card ("Mandala Oracle · art by The Barley Moon").
- A credit line inside the export area and appended to the export footer.
- A standing line in the page footer beside the Tarot Guide credit, linking to
  her MPC shop space (thebarleymoon.ie was down when this was built). Her bio and
  both deck descriptions are her own words from that shop, taken 13 Sep 2026; the
  printed-deck buttons go to each deck's MPC listing with the price shown there.

## QA

- Every manifest card resolves to a full and a thumb file, zero 404s, both backs
  present (checked by script against the local server).
- `node --check` clean on the app script.
- Exercised in a real browser: three-card reading, pull from each deck, put one
  back, restore from a saved payload, fresh draw clears, export prep hides the
  picker and keeps the credit. No page console errors.
- Card text read by Vision OCR and spot-checked against the art (Mandala 8, 14,
  29 read by eye).

## Unresolved, needs you

1. **Licence.** `deck.json` says "TO CONFIRM". I have not invented terms. Before
   this leaves the branch, the artist's permission and terms need to be recorded.
2. **Three wordings to verify against the print:** Inner Wisdom 19 ("to unfold"),
   Mandala 4 ("fears" not "tears"), and Mandala 2 and 32 carry the same affirmation
   in the supplied files. I kept both cards.
3. **Mandala card 1 has no coloured border** where the back and box do. Possibly an
   export slip on the artist's side.
4. **Ask mode does not have the drawer yet.** It is on guided readings only for this
   test. Adding it per question is a small follow-up once the look is agreed.
5. **The library grid does not list oracle cards.** They are not tarot, so they
   stay out of the 78-card library for now.

## Preview and safety

    cd "…/CreatorApps/Astra" && python3 -m http.server 8777
    open http://localhost:8777/index.html
    (pick a spread, draw, scroll to "Finish with a card from another deck")

Back to safety: `git checkout main`. The pre-change file is
`index.backup-artdecks-20260913-112222.html`.
