#!/usr/bin/env python3
"""Make the files a licensed deck needs to go live, from the artist's originals.

    python3 scripts/publish_deck_art.py "Cards/MichaelBurk Studio" \
        --slug anthropologist-tarot --bleed 0.125 \
        --samples major_21_world,cups_king,wands_page --out <scratch dir>

Reads the slot map from api/_preview/<slug>/manifest.json (written by
prepare_deck.py) and writes, into --out (never the repo):

    deck-art/<slug>/<slot>.webp          900 px long edge, private bucket
    deck-art/<slug>/<slot>_thumb.webp    300 px long edge, private bucket
    deck-art/<slug>/back.webp            the card back, private bucket
    deck-samples/<slug>/<slot>.webp      600 px, public bucket, approved samples only
    deck_cards.json                      one row per card for the deck_cards table

The storage policies key off the first path segment being the deck slug, so the
layout is required. Metadata is stripped and checked. Originals are only read.
The upload and the database rows are done from the admin page (ARTIST-DECKS.md).
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
sys.path.insert(0, str(HERE))
from prepare_deck import load, trim_bleed  # noqa: E402


def fit(im, long_edge):
    w, h = im.size
    s = long_edge / max(w, h)
    return im if s >= 1 else im.resize((round(w * s), round(h * s)), Image.LANCZOS)


def save_webp(im, path, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    clean = Image.new("RGB", im.size)
    clean.paste(im.convert("RGB"))          # a fresh image carries no EXIF, ICC or XMP
    clean.save(path, "WEBP", quality=quality, method=6)
    with Image.open(path) as chk:
        if chk.getexif() or chk.info.get("exif") or chk.info.get("xmp"):
            sys.exit("metadata survived in " + str(path))
        return chk.size


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--bleed", type=float, default=0)
    ap.add_argument("--trim-height", type=float, default=4.75)
    ap.add_argument("--samples", default="", help="comma separated slots approved as public samples")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    src = Path(a.source)
    out = Path(a.out)
    man = json.loads((REPO / "api" / "_preview" / a.slug / "manifest.json").read_text())
    samples = [s for s in a.samples.split(",") if s]
    slots = {c["slot"] for c in man["cards"]}
    bad = [s for s in samples if s not in slots]
    if bad:
        sys.exit("not slots in this deck: " + ", ".join(bad))

    flagged, rows, total = [], [], 0
    for c in man["cards"]:
        im = trim_bleed(load(src / c["source"], flagged), a.bleed, a.trim_height)
        base = out / "deck-art" / a.slug
        w, h = save_webp(fit(im, 900), base / f"{c['slot']}.webp")
        save_webp(fit(im, 300), base / f"{c['slot']}_thumb.webp")
        sample_path = None
        if c["slot"] in samples:
            save_webp(fit(im, 600), out / "deck-samples" / a.slug / f"{c['slot']}.webp")
            sample_path = f"{a.slug}/{c['slot']}.webp"
        rows.append({"deck_slug": a.slug, "slot": c["slot"], "name": c["name"], "sort_order": c["n"],
                     "storage_path": f"{a.slug}/{c['slot']}.webp", "sample_path": sample_path,
                     "width": w, "height": h})

    backs = [p for p in src.iterdir() if "back" in p.stem.lower() and p.suffix.lower() in (".jpg", ".jpeg", ".png")]
    back_path = None
    if backs:
        im = trim_bleed(load(backs[0], flagged), a.bleed, a.trim_height)
        save_webp(fit(im, 900), out / "deck-art" / a.slug / "back.webp")
        back_path = f"{a.slug}/back.webp"

    (out / "deck_cards.json").write_text(json.dumps(
        {"slug": a.slug, "card_back_path": back_path, "sample_slots": samples, "cards": rows}, indent=1))
    files = list(out.rglob("*.webp"))
    total = sum(f.stat().st_size for f in files)
    print(f"{len(rows)} cards, back: {back_path or 'none'}, samples: {', '.join(samples) or 'none'}")
    print(f"{len(files)} webp files, {total / 1e6:.1f} MB -> {out}")
    if flagged:
        print("rotation tags: " + ", ".join(flagged))


if __name__ == "__main__":
    main()
