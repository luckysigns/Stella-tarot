# Artist deck inventory

Generated 13 Sep 2026 on branch `feature/artist-decks`. Source folders are under
`Cards/`. Nothing has been processed or edited yet; this is the survey only.

## Deck 1: The Barley Moon Inner Wisdom Oracle

| | |
|---|---|
| Folder | `Cards/The Barley Moon Inner Wisdom Oracle/` |
| Card files | **36** (`1.png` to `36.png`) |
| Formats | 36 x PNG, 1 x JPG (the back) |
| Dimensions | every file **822 x 1122 px** |
| Aspect ratio | 0.73 (2.5 x 3.5 in card, all identical) |
| Size on disk | 34 MB (cards ~950 KB each, back 72 KB) |
| Card back | **yes**: `Inner wisdom Card Back 2.5X3.5 (822 × 1122 px).jpg` |
| Extras (not cards) | none |

## Deck 2: The Barley Moon Mandala Oracle Deck

| | |
|---|---|
| Folder | `Cards/The Barley Moon Mandala Oracle Deck/` |
| Card files | **37** (`1.png` to `37.png`) |
| Formats | 39 x PNG |
| Dimensions | every file **822 x 1122 px** |
| Aspect ratio | 0.73, all identical |
| Size on disk | 34 MB (cards 650 KB to 1.4 MB, back and box 1.5 MB each) |
| Card back | **yes**: ` Mandala back p 27 MMC Card Backs 2.5X3.5_ (822 × 1122 px).png` (note the leading space in the filename) |
| Extras (not cards) | ` Mandala box front MMC Card Backs 2.5X3.5_ (822 × 1122 px).png`, the box cover art (title, mandala, `@thebarleymoon`). Not a card. |

## Consistency

Nothing inconsistent within either deck: one size, one ratio, no duplicates by
name, sequential numbering with no gaps.

## Flags

1. **Neither deck is a tarot deck.** Both are oracle decks: 36 and 37 cards, not 78,
   and the sample cards are affirmations with no suit, number or Major Arcana
   identity. Deck 1 card 1 reads "My heart knows its own way." Deck 2 card 1 reads
   "I let go of the things that no longer serve me." The box front says "Mandala
   Oracle" in the artist's own hand. See MAPPING.md for what this means.
2. **Filenames carry no card identity.** They are bare numbers. Whatever a card is
   called can only be read off the artwork itself.
3. **Two filenames start with a space** (the Mandala back and box front). Harmless
   here, but they will need quoting or renaming when processed.
4. **Card 1 of the Mandala deck is missing the coloured border** the box front and
   back show. Worth a glance from the artist in case it is an export slip, but it
   may be intentional.
5. **No image tooling installed** apart from macOS `sips`, which cannot write WebP.
   Part 3 will need `cwebp` (Homebrew: `brew install webp`) or ImageMagick
   (`brew install imagemagick`) before any processing.
