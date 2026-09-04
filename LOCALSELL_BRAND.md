# LocalSell — Brand Reference

Rebrand of the platform from **Padharo** → **LocalSell** (2026-09-04).
Supersedes `PADHARO_BRAND.md` (kept for history + the per-app theme-entry-point map,
which is still accurate).

- **Name:** LocalSell
- **Home-screen label:** LocalSell
- **Tagline:** `Shop Local. Find More.`
- **Rider app:** LocalSell Rider   ·   **Store app:** LocalSell Store   ·   **Admin:** LocalSell Admin

## Palette

| Token role | Old (Padharo) | New (LocalSell) |
|---|---|---|
| Primary / CTA | `#F5820A` orange | **`#1C5BC7`** blue |
| Primary hover | `#E8760A` | `#1A52B4` |
| Primary pressed | `#C96400` | `#154695` |
| Primary dark | `#D96D00` | `#17499E` |
| Primary light / tint | `#FFF3E7` | `#E8F0FC` |
| Primary disabled | `#F8CFA0` | `#A7C1EA` |
| Primary focus ring | `rgba(245,130,10,.32)` | `rgba(28,91,199,.32)` |
| Secondary / brand / headings / text | `#8C1D40` maroon | **`#16293F`** navy |
| Secondary dark | `#6E1732` | `#0E1B2B` |
| Surface tint ("cream") | `#FAF0E6` | `#F4F7FB` mist |
| Accent ("teal") | `#1B9E9E` | `#3E93DB` sky |

Also folded in leftover Enatega greens that the Padharo pass missed
(`#F3FFEE`, `#63C43B`, `#90E36D` → blue).

## What changed in code (done, verified)

- **Name + tagline:** `Padharo` → `LocalSell` and `Jo Chahiye, Padharo Par Mile.` →
  `Shop Local. Find More.` across 193 files — all 5 apps, every locale/translation file,
  `APP_NAME` constants, `app.config.js` / `app.json` (`name`, `androidCollapsedTitle`,
  `brandName`, splash/location strings), `layout.tsx` titles, `manifest.json`, UA strings,
  API seed data. Stale "Enatega starter-kit" app descriptions replaced too.
- **Theme:** every hex above remapped in all theme files — web/admin `global.css` `:root`
  vars (+ new `--brand-navy/-blue/-mist/-sky` aliases; old `--brand-*` names kept for
  back-compat), `themeColors.js` (customer), `colors.ts` (rider + store),
  `liveActivityService.js`, ~60 component files with inline hex.
- **PrimeReact theme:** `lara-light-amber` / `lara-light-cyan` → `lara-light-blue` (web + admin).
- **Adaptive-icon background:** → `#FFFFFF` in all 3 Expo configs (blue mark needs a light tile).
- **Asset pipeline:** masters + `scripts/generate-brand-assets.mjs` renamed `padharo-*` →
  `localsell-*` (and `wordmark-maroon` → `wordmark-navy`); `<Logo>` / `AppLogo` / footer
  `<img>` src updated.
- tsc clean on web + admin; all changed JS/JSON syntax-checked.

## What's left — artwork + release calls

See **`BRAND_SWAP_KIT.md`**: drop 11 master PNGs, run the generator, `expo prebuild --clean`.
Bundle IDs and the `enatega.com` legal-copy endpoints are deliberately unchanged
(`PADHARO_ASSETS.md` §2–3).
