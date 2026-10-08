#!/usr/bin/env python3
"""Prepare an artist's deck for Stellar Tarot: display-size cards, a manifest,
and a contact sheet to check by eye. Runs on this Mac only and never touches
the network. The runbook is ARTIST-DECKS.md at the top of this repo.

    python3 scripts/prepare_deck.py "Cards/MichaelBurk Studio" \
        --slug anthropologist-tarot

writes, by default into the private preview folder the gate serves:

    api/_preview/<slug>/full/1.jpg ... N.jpg    900 px tall
    api/_preview/<slug>/thumb/1.jpg ... N.jpg   260 px tall
    api/_preview/<slug>/back.jpg                only if the artist sent one
    api/_preview/<slug>/manifest.json           n -> slot, name, source file

Card n is the artist's own order: the leading number in each filename once the
prefix every file shares is taken off. A tarot deck is also matched onto the
78 canonical slots with CreatorApps/tools/card_slots.py, and the script stops
rather than guess if any card fails to match or two files claim one slot.
Pass --oracle for a deck that is not tarot (no slots, any number of cards).
Pass --bleed 0.125 when the artist sent print files with a bleed round the
edge: that many inches come off every side (of the back too), measured against
--trim-height, the printed card's height (4.75 in for a standard tarot card).

Never upscales, strips metadata, and reports any EXIF rotation tag (see load()). The originals are not
modified and never copied into the repo (licence clause 12.2).
"""

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
sys.path.insert(0, str(REPO.parent / "tools"))
import card_slots  # noqa: E402  (the tested matcher; do not rewrite)

IMG_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
SMALL = {"of", "the", "and", "a", "in", "on"}


def label_words(s):
    """'TheWheelOfFortune' or 'the_wheel-of fortune' -> 'The Wheel of Fortune'."""
    s = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s)
    words = [w for w in re.split(r"[\s_\-.]+", s) if w]
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        out.append(lw if i and lw in SMALL else (w[:1].upper() + w[1:]))
    return " ".join(out)


def split_names(files):
    """Each file -> (leading number or None, cleaned label). The prefix every
    file shares ('TheAnthropologistTarot_By_MichaelBurk_Card-') is dropped
    first, trimmed back so it never eats the start of the card number."""
    stems = [Path(f).stem for f in files]
    fronts = [s for s in stems if not is_back(s)]   # 'Deck_BACK' would cut the prefix short
    prefix = os.path.commonprefix(fronts) if len(fronts) > 1 else ""
    prefix = prefix.rstrip("0123456789")
    out = []
    for s in stems:
        rest = s[len(prefix):] if s.startswith(prefix) else s
        m = re.match(r"^(\d+)[\s_\-.]*(.*)$", rest)
        n, label = (int(m.group(1)), m.group(2)) if m else (None, rest)
        if n is None:
            # "Deck Oct 4 Rich Black-07": the card number is the trailing one (Cyndera's files)
            t = re.search(r"[\s_\-.](\d+)$", s)
            if t:
                n, label = int(t.group(1)), ""
        out.append((n, label_words(label)))
    return out


def is_back(label):
    joined = " " + label.lower().replace("_", " ") + " "
    return any(" " + w.replace("_", " ") + " " in joined for w in card_slots.CARD_BACK_WORDS)


def load(path, flagged):
    """The card, upright. An EXIF rotation is applied only when it turns a
    landscape image into a portrait card: a tag on pixels that are already
    portrait is a leftover from an edit (the Anthropologist Hermit had one),
    and obeying it lays the card on its side. Either way it is reported."""
    im = Image.open(path)
    tag = im.getexif().get(274, 1)
    if tag != 1:
        turned = ImageOps.exif_transpose(im)
        if im.width > im.height and turned.height > turned.width:
            im = turned
            flagged.append(f"{path.name} (EXIF {tag}, applied)")
        else:
            flagged.append(f"{path.name} (EXIF {tag}, ignored, pixels already portrait)")
    return im.convert("RGB")


def trim_bleed(im, bleed, trim_height):
    """Take the print bleed off every side. The file is the trimmed card plus
    `bleed` inches all round, so its pixels per inch come from its height."""
    if not bleed:
        return im
    px = round(bleed * im.height / (trim_height + 2 * bleed))
    return im.crop((px, px, im.width - px, im.height - px))


def save(im, path, height, quality):
    w, h = im.size
    if h > height:
        im = im.resize((round(w * height / h), height), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return im.size, path.stat().st_size


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="folder of the artist's files (left untouched)")
    ap.add_argument("--slug", required=True, help="deck slug, same as the decks row in admin")
    ap.add_argument("--oracle", action="store_true", help="not tarot: skip slot matching")
    ap.add_argument("--out", help="output folder (default api/_preview/<slug>, private)")
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--thumb", type=int, default=260)
    ap.add_argument("--quality", type=int, default=85)
    ap.add_argument("--back", help="file name of the card back, when its name does not say 'back'")
    ap.add_argument("--bleed", type=float, default=0, help="inches of print bleed to trim from each side")
    ap.add_argument("--trim-height", type=float, default=4.75, help="printed card height in inches, for --bleed")
    a = ap.parse_args()

    src = Path(a.source).expanduser()
    out = Path(a.out) if a.out else REPO / "api" / "_preview" / a.slug
    files = sorted(p.name for p in src.iterdir()
                   if p.suffix.lower() in IMG_EXTS and not p.name.startswith("."))
    if not files:
        sys.exit("No images in " + str(src))

    parsed = dict(zip(files, split_names(files)))
    backs = [a.back] if a.back else [f for f in files if is_back(parsed[f][1])]
    if a.back and a.back not in files:
        sys.exit("--back file not found: " + a.back)
    if len(backs) > 1:
        sys.exit("More than one card back: " + ", ".join(backs))
    cards = [f for f in files if f not in backs]

    slots = {}
    if not a.oracle:
        problems = []
        for f in cards:
            n, label = parsed[f]
            got = card_slots.match_one(label + ".jpg") or card_slots.match_one(f)
            if len(got) != 1:
                problems.append(f"  no slot for {f!r} (read as {label!r})")
            else:
                slots[f] = got[0]
        dupes = {s for s in slots.values() if list(slots.values()).count(s) > 1}
        problems += [f"  two files claim {s}: " + ", ".join(f for f in slots if slots[f] == s) for s in sorted(dupes)]
        missing = sorted(card_slots.SLOT_SET - set(slots.values()) - {"__back__"})
        if missing:
            problems.append("  missing slots: " + ", ".join(missing))
        if problems:
            sys.exit("Stopped, the mapping needs a human:\n" + "\n".join(problems) +
                     "\nRename the files, or run tools/ingest_deck.py for the drag-and-drop contact sheet.")

    # the artist's order when every file is numbered, else canon order (tarot) or name order
    if all(parsed[f][0] is not None for f in cards):
        cards.sort(key=lambda f: parsed[f][0])
    elif slots:
        order = {s: o for s, _, o in card_slots.RWS_SLOTS}
        cards.sort(key=lambda f: order[slots[f]])

    manifest = {"slug": a.slug, "count": len(cards), "kind": "oracle" if a.oracle else "tarot",
                "back": bool(backs), "cards": []}
    total, sizes, flagged = 0, [], []
    for n, f in enumerate(cards, 1):
        im = trim_bleed(load(src / f, flagged), a.bleed, a.trim_height)
        sizes.append(im.size)
        (fw, fh), b1 = save(im, out / "full" / f"{n}.jpg", a.height, a.quality)
        _, b2 = save(im, out / "thumb" / f"{n}.jpg", a.thumb, a.quality - 7)
        total += b1 + b2
        label = parsed[f][1]
        manifest["cards"].append({
            "n": n,
            "slot": slots.get(f),
            "name": label if label and not label.isdigit() else None,
            "source": f,
        })
    if backs:
        im = trim_bleed(load(src / backs[0], flagged), a.bleed, a.trim_height)
        _, b = save(im, out / "back.jpg", a.height, a.quality)
        total += b

    ratios = sorted(h / w for w, h in sizes)
    mid = ratios[len(ratios) // 2]
    odd = [cards[i] for i, (w, h) in enumerate(sizes) if abs(h / w - mid) / mid > 0.02]
    manifest["ratio"] = round(mid, 4)
    if a.bleed:
        manifest["bleed_trimmed_in"] = a.bleed
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")

    # contact sheet: every card small, in order, to catch an upside-down or wrong scan
    tw = 120
    th = round(tw * mid)
    cols = 13
    rows = -(-len(cards) // cols)
    sheet = Image.new("RGB", (cols * (tw + 6) + 6, rows * (th + 6) + 6), (24, 24, 32))
    for i in range(len(cards)):
        t = Image.open(out / "thumb" / f"{i + 1}.jpg").resize((tw, th))
        sheet.paste(t, (6 + (i % cols) * (tw + 6), 6 + (i // cols) * (th + 6)))
    sheet_path = Path(tempfile.gettempdir()) / f"{a.slug}-contact.jpg"
    sheet.save(sheet_path, quality=82)

    print(f"{len(cards)} cards -> {out.relative_to(REPO) if out.is_relative_to(REPO) else out}")
    print(f"  source {sizes[0][0]}x{sizes[0][1]}, full {fw}x{fh}, ratio {mid:.4f} (height / width)")
    print(f"  card back: {backs[0] if backs else 'none sent'}")
    if a.bleed:
        print(f"  bleed: {a.bleed} in trimmed from every side")
    print(f"  weight {total / 1e6:.1f} MB (full + thumbs)")
    if odd:
        print("  odd aspect ratio, check these: " + ", ".join(odd))
    if flagged:
        print("  rotation tags, check these on the sheet: " + ", ".join(flagged))
    print(f"  contact sheet: {sheet_path}")


if __name__ == "__main__":
    main()
