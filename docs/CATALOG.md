# Catalogue

## Source

`data/catalog/miti-home-catalog.json` is the source of truth for the launch catalogue. It was built from the owner's `Mitihome` photo folder (52 supplier photos + a `branding` folder with the logo, brand board and brand deck):

- **6 categories** — the five from the brand deck (Home Décor; Lighting; Smart Storage & Organisation; Home Entertainment; *Why Didn't I Have This Before?*) plus Furniture for the executive desk.
- **37 products** — 33 visible, 4 drafts held back for trademark review (see REQUIRED-FROM-OWNER.md). Several photos show the same product in different finishes; these became colour/finish variants (e.g. Deer Family in Matte Earth and Mirror Silver).
- **5 editorial collections** — The Silver Edit, Sculptural Forms, The Hosting Table, Soft Glow, Gifts They'll Remember.
- **2 sets** ("Complete the set" pairings with a saving applied at checkout).

Names and descriptions were written from what each photo and its supplier caption show. Materials and dimensions are only stated where the caption or photo shows them. **Prices and stock are placeholders.**

## Product model

| Field | Meaning |
| --- | --- |
| `category` | slug of a row in `categories` |
| `sizes` + `sizeLabel` | primary option (e.g. Length: 20 cm / 30 cm / 40 cm; Character: Rooster / Duck / Dinosaur). `["Standard"]` means no choice and the selector is hidden |
| `colors` + `colorLabel` | secondary option (Colour / Finish) with a hex swatch and optional images per finish |
| `product_variants` | stock per (option, finish); product stock is the sum |
| `mrp` | compare-at price (shown struck through when higher than `sellingPrice`) |
| `material`, `dimensions`, `features`, `careInstructions` | shown in the PDP accordions and structured data |
| `isNew`, `isFeatured` | New Arrivals and Best Sellers merchandising |

## Imagery pipeline

```bash
npm run catalog:images                                  # default source: ~/Downloads/Mitihome
python scripts/catalog/prepare_images.py --source "D:/path/to/Mitihome"
```

For each image entry the script can `crop` (fractional box), `inpaint` (repaint an overlay by interpolating surrounding background) and `padSquare`; it writes WebP (max 1600 px, q84) to `public/products/<slug>/<n>.webp` and regenerates the brand assets (`public/brand/*`: transparent logo, on-dark logo, OG image). The seed script only references images that exist.

## Importing / updating

```bash
npm run db:seed                  # upsert categories, products, collections, sets by slug (keeps stock)
npm run db:seed -- --reset-stock # also rebuild variant stock from the JSON (placeholder 12 per product)
```

Day-to-day changes should be made in the admin (products, categories, collections, sets, stock); the JSON is for bulk loads.
