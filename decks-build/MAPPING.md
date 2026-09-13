# Mapping report: artist files to Astra card IDs

Generated 13 Sep 2026 on branch `feature/artist-decks`. Read INVENTORY.md first.

## NEEDS A DECISION: nothing maps, and it is not a filename problem

Every row in both decks is **unmatched**. Not low confidence: unmatched. The
matching strategy (exact ID, then card name including the app's renamed Majors,
then number plus suit) has nothing to grip, because these are not tarot decks.

| | Inner Wisdom Oracle | Mandala Oracle |
|---|---|---|
| Files that map to a tarot ID | 0 of 36 | 0 of 37 |
| Tarot cards left without art | 78 of 78 | 78 of 78 |

Why:

1. **Card count.** 36 and 37 cards. Tarot is 78 (22 Majors, 56 Minors). Neither
   deck is close, and neither is a clean subset like "Majors only" (22).
2. **No suits, no numbers, no Arcana.** Filenames are bare integers. The artwork
   carries an affirmation, not a card name: "My heart knows its own way." (Inner
   Wisdom 1), "I let go of the things that no longer serve me." (Mandala 1).
3. **The artist calls them oracles.** The folders, the box front ("The Barley Moon
   Mandala Oracle") and the back all say so. Oracle decks are a different kind of
   object from tarot: each card is its own message, there is no fixed structure to
   map onto.

So there is no honest way to say file 14 is the Six of Cups. Any mapping I wrote
would be invented, and the prompt says ask rather than assume.

## What the two possible next steps are

**A. These are the wrong folders.** If the two tarot decks live somewhere else,
point me at them and I will redo Parts 1 and 2 against those.

**B. These are the right decks, and Astra should carry oracle decks.** That is a
real feature, but not the one this prompt describes. It would mean a deck type with
its own card list (36 or 37 named cards, each with the affirmation as its text), its
own spreads or a simple one-to-three card pull, and no mapping onto the 78 tarot
meanings at all. The interpretive layers (base, astro) would not apply. Parts 3
through 7 still make sense in spirit (process to WebP, manifest, registry, credit
the artist) but the manifest shape, the picker and the reading screen all need a
different design. I would want to agree that design with you before building it.

Either way, the numbered files need names. For option B the natural card name is
the affirmation printed on it, which I can transcribe from the artwork.

## Deck 1: The Barley Moon Inner Wisdom Oracle

| File | Proposed card ID | Display name | Confidence |
|---|---|---|---|
| 1.png to 36.png | none | unknown, affirmation printed on art | unmatched |
| Inner wisdom Card Back 2.5X3.5 (822 × 1122 px).jpg | back | card back | high (as a back, not a card) |

## Deck 2: The Barley Moon Mandala Oracle Deck

| File | Proposed card ID | Display name | Confidence |
|---|---|---|---|
| 1.png to 37.png | none | unknown, affirmation printed on art | unmatched |
| Mandala back p 27 MMC Card Backs 2.5X3.5_ (822 × 1122 px).png | back | card back | high (as a back, not a card) |
| Mandala box front MMC Card Backs 2.5X3.5_ (822 × 1122 px).png | none | box cover, not a card | extra |

## Tarot cards with no art in either deck (all 78)

major_00_fool, major_01_magician, major_02_high_priestess, major_03_empress,
major_04_emperor, major_05_hierophant, major_06_lovers, major_07_chariot,
major_08_strength, major_09_hermit, major_10_wheel_of_fortune, major_11_justice,
major_12_hanged_man, major_13_death, major_14_temperance, major_15_devil,
major_16_tower, major_17_star, major_18_moon, major_19_sun, major_20_judgement,
major_21_world;
wands, cups, swords, pentacles: 01 to 10, page, knight, queen, king (14 each, 56).

## Note on the app's Major names

The prompt mentions The Voyager, The Hanged Star and The Cosmos as renamed Majors.
The current app uses The Fool, The Hanged Man and The World, and calls the Magician
"The Magus". Immaterial here since nothing matched, but worth knowing the prompt is
a little out of date on names.
