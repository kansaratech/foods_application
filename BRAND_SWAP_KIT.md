# Brand Swap Kit — LocalSell

The **code** rebrand (Padharo → LocalSell: name, tagline, colour theme) is **done**
— see `LOCALSELL_BRAND.md`.

**Artwork:** clean placeholder art (blue storefront-pin mark + "localsell" wordmark
in the brand colours) is already generated and live in all 5 apps —
`scripts/build-localsell-masters.mjs` builds the 11 masters from code, then
`scripts/generate-brand-assets.mjs` fans them out. To swap in real hand-drawn
artwork, replace the master PNGs (Step 1) and re-run Step 2 + 3.

---

## Step 1 — save the 11 master images

Save your logo exports into **one folder**, with the **exact filenames** below:

```
enatega-multivendor-web/public/assets/brand/masters/
```

overwriting the placeholder files already there (currently the old orange/maroon art).

| Filename (exact) | Size (or larger, same ratio) | Bg | What it is |
|---|---|---|---|
| `localsell-icon.png` | 2048 × 2048 | **opaque** | App icon — the storefront-phone mark on a filled square (your cream-square version). Becomes ~45 files: every store icon, favicon, PWA icon. |
| `localsell-icon-transparent.png` | 2048 × 2048 | transparent | The mark only, no background — Android adaptive-icon foreground. Your plain blue mark on transparent. |
| `localsell-icon-cream.png` | 2048 × 2048 | transparent | The mark in **white/cream** — shown on the dark navy splash. |
| `localsell-symbol.png` | 2048 × 2048 | transparent | The full-colour mark on its own (design source). |
| `localsell-notification.png` | 512 × 512 | transparent | **Pure-white** silhouette of the mark (Android recolours it). |
| `localsell-logo.png` | 1600 × 443 | transparent | Horizontal lockup: mark + **navy** "localsell" wordmark (for light backgrounds). |
| `localsell-logo-inverse.png` | 1600 × 443 | transparent | Same lockup, **cream/white** wordmark (for dark backgrounds). |
| `localsell-wordmark-cream.png` | 1844 × 308 | transparent | Just "localsell", cream/white — animated splash. |
| `localsell-wordmark-navy.png` | 1844 × 308 | transparent | Just "localsell", navy — animated splash, light mode. |
| `localsell-pin.png` | 1264 × 1668 | transparent | The pin/drop shape alone — animated splash element. |
| `localsell-splash-portrait.png` | 2160 × 3840 | **opaque** | Full-screen navy splash: mark + cream wordmark, centred. |

From the set you pasted: image 11 → `localsell-icon.png`, image 8 → `localsell-icon-transparent.png`,
image 6 → `localsell-symbol.png` / `localsell-pin.png`, image 5 → `localsell-notification.png`,
image 3 → `localsell-logo.png`, image 4 → `localsell-logo-inverse.png`,
image 9 → `localsell-wordmark-cream.png`, image 10 → `localsell-wordmark-navy.png`,
image 7 → `localsell-splash-portrait.png`. For `localsell-icon-cream.png` supply a white
version of the mark (or reuse the white silhouette).

## Step 2 — generate every derived file

```bash
node scripts/generate-brand-assets.mjs
#   needs Chromium once:  npx --yes playwright install chromium
```

Fans the 11 masters into 45 PNGs + 4 `favicon.ico` across all 5 apps.
`node scripts/generate-brand-assets.mjs --list` previews the plan without writing.

## Step 3 — rebuild native icons/splash for the 3 Expo apps

```bash
cd enatega-multivendor-app   && npx expo prebuild --clean && cd ..
cd enatega-multivendor-rider && npx expo prebuild --clean && cd ..
cd enatega-multivendor-store && npx expo prebuild --clean && cd ..
```

That's it — the apps then show LocalSell everywhere.

---

## Not done (deliberate — release/ops calls)

- **Bundle IDs / package names** (`com.enatega.*`, `enatega-store`) unchanged.
  Changing them = new store listings + re-issued push/Firebase creds. See `PADHARO_ASSETS.md` §2.
- **`enatega.com` / `info@enatega.com`** still in the web privacy/terms text — they're
  real, working endpoints. Swap when you have a LocalSell domain + inbox (`PADHARO_ASSETS.md` §3).
- Adaptive-icon background is set to white in all three app configs so the blue mark reads.
