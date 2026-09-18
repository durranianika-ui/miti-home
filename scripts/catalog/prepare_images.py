"""
Builds storefront product imagery from the owner's Miti Home photo folder.

    npm run catalog:images                       # uses ~/Downloads/Mitihome
    python scripts/catalog/prepare_images.py --source "D:/Photos/Mitihome"

For every product image in data/catalog/miti-home-catalog.json it:
  * crops away supplier text banners  ("crop": [left, top, right, bottom] as fractions)
  * repaints an overlay that cannot be cropped ("inpaint": [l, t, r, b]) by
    interpolating the surrounding background vertically
  * pads diagram shots onto a square canvas ("padSquare": "#FFFFFF")
  * resizes to at most 1600 px on the long edge and writes WebP (q=84) to
    public/products/<slug>/<n>.webp

It also writes brand assets (logo, icon, OG image) from the branding folder.
Requires Pillow:  pip install pillow
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data" / "catalog" / "miti-home-catalog.json"
PUBLIC = ROOT / "public"
MAX_EDGE = 1600
QUALITY = 84


def fraction_box(image: Image.Image, box: list[float]) -> tuple[int, int, int, int]:
    w, h = image.size
    left, top, right, bottom = box
    return (round(left * w), round(top * h), round(right * w), round(bottom * h))


def inpaint_vertical(image: Image.Image, box: list[float]) -> Image.Image:
    """Fill a rectangle by blending the rows just above and below it."""
    image = image.copy()
    left, top, right, bottom = fraction_box(image, box)
    pixels = image.load()
    height = bottom - top
    for x in range(left, right):
        above = pixels[x, max(top - 2, 0)]
        below = pixels[x, min(bottom + 2, image.size[1] - 1)]
        for y in range(top, bottom):
            t = (y - top) / max(height, 1)
            pixels[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(above, below))
    region = image.crop((left - 6, top - 6, right + 6, bottom + 6)).filter(ImageFilter.GaussianBlur(3))
    image.paste(region, (left - 6, top - 6))
    return image


def pad_square(image: Image.Image, color: str) -> Image.Image:
    w, h = image.size
    edge = max(w, h)
    canvas = Image.new("RGB", (edge, edge), color)
    canvas.paste(image, ((edge - w) // 2, (edge - h) // 2))
    return canvas


def process(source: Path, spec: dict) -> Image.Image:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    if "inpaint" in spec:
        image = inpaint_vertical(image, spec["inpaint"])
    if "crop" in spec:
        image = image.crop(fraction_box(image, spec["crop"]))
    if "padSquare" in spec:
        image = pad_square(image, spec["padSquare"])
    image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    return image


def build_brand_assets(source_folder: Path) -> None:
    branding = source_folder / "branding"
    out = PUBLIC / "brand"
    out.mkdir(parents=True, exist_ok=True)
    logo_candidates = sorted(branding.glob("*.jpeg"), key=lambda p: p.stat().st_size)
    if not logo_candidates:
        print("! no branding folder found — brand assets skipped")
        return

    # The primary logo is the smallest file in the branding folder (square, white ground).
    logo = Image.open(logo_candidates[0]).convert("RGB")
    w, h = logo.size
    # Trim the generous white margin around the stacked logo.
    logo = logo.crop((round(w * 0.18), round(h * 0.28), round(w * 0.82), round(h * 0.74)))

    # Transparent PNG: knock out the near-white ground.
    rgba = logo.convert("RGBA")
    data = [
        (r, g, b, 0) if r > 238 and g > 236 and b > 232 else (r, g, b, 255)
        for (r, g, b, _a) in rgba.getdata()
    ]
    rgba.putdata(data)
    rgba.thumbnail((900, 900), Image.Resampling.LANCZOS)
    rgba.save(out / "miti-home-logo.png", optimize=True)

    # On-dark variant: charcoal ink becomes ivory, gold stays gold.
    dark = rgba.copy()
    dark.putdata([
        (247, 245, 240, a) if (a and r < 90 and g < 90 and b < 90) else (r, g, b, a)
        for (r, g, b, a) in dark.getdata()
    ])
    dark.save(out / "miti-home-logo-dark.png", optimize=True)

    # Open Graph image 1200x630 on ivory.
    og = Image.new("RGB", (1200, 630), "#F7F5F0")
    mark = rgba.copy()
    mark.thumbnail((620, 400), Image.Resampling.LANCZOS)
    og.paste(mark, ((1200 - mark.size[0]) // 2, (630 - mark.size[1]) // 2), mark)
    og.save(out / "og-image.jpg", quality=90)
    print("OK brand assets")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=str(Path.home() / "Downloads" / "Mitihome"))
    args = parser.parse_args()
    source_folder = Path(args.source)
    if not source_folder.exists():
        print(f"Source folder not found: {source_folder}", file=sys.stderr)
        return 1

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    written = 0
    for product in catalog["products"]:
        target_dir = PUBLIC / "products" / product["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        for index, spec in enumerate(product["images"], start=1):
            source = source_folder / spec["source"]
            if not source.exists():
                print(f"! missing {source.name} for {product['slug']}", file=sys.stderr)
                continue
            image = process(source, spec)
            image.save(target_dir / f"{index}.webp", "WEBP", quality=QUALITY, method=6)
            written += 1
    print(f"OK {written} product images -> public/products/")

    build_brand_assets(source_folder)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
