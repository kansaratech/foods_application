# Padharo — Brand & Rebrand Reference

Rebrand of the Enatega multivendor platform to **Padharo**.

- **Name:** Padharo
- **Tagline:** `Jo Chahiye, Padharo Par Mile.`
- **Old name being replaced:** Enatega

## Palette

| Token | Hex | Role |
|---|---|---|
| Orange (PRIMARY / CTA) | `#F5820A` | primary buttons, active tabs, links, selected states, focus rings, app-icon background |
| Orange hover | `#E8760A` | primary hover |
| Orange pressed | `#C96400` | primary pressed |
| Orange dark | `#D96D00` | primary dark variant |
| Orange light | `#FFF3E7` | primary tint background, selected-row background |
| Orange disabled | `#F8CFA0` | disabled CTA |
| Maroon (BRAND / SECONDARY) | `#8C1D40` | logo letterform, headings, brand text, secondary buttons, footer, wordmark |
| Maroon dark | `#6E1732` | maroon hover/pressed |
| Cream | `#FAF0E6` | page tint, cards on maroon surfaces, logo dome/pin fill |
| Teal (ACCENT) | `#1B9E9E` | minor highlights, badges, the logo "puddle" |
| Ink | `#2A2A2A` | body text (largely unchanged) |

**CTA color decision:** orange is primary (closest swap from the old green `#75d04b`, works with dark text). Maroon is the brand/header/text color. Teal is a sparing accent.

### Old green values being replaced (search-and-replace targets)
`#75d04b` `#75D04B` `#5ac12f` `#5AC12F` `#68c73e` `#56b02f` `#b9e8a3` `#f3ffee` `#94e5ab` `#68C73E`
→ map to the orange token of the equivalent role.

## Per-app theme entry points

| App | Primary theme file(s) |
|---|---|
| enatega-multivendor-web | `app/(localized)/global.css` `:root` vars; `tailwind.config.ts` |
| enatega-multivendor-admin | `lib/utils/constants` + tailwind config + global css |
| enatega-multivendor-app (customer, Expo) | `src/utils/themeColors.js` / theme context |
| enatega-multivendor-rider (Expo) | `lib/` theme / nativewind `tailwind.config.js` |
| enatega-multivendor-store (Expo) | `lib/` theme / nativewind `tailwind.config.js` |

## Logo assets (user-supplied, place under each app's public/asset dir)

- `logo-horizontal` — mark + "Padharo" wordmark + tagline (maroon on light; cream on maroon)
- `logo-mark` — icon only (the ornate P/dome/pin/puddle)
- `favicon` 512px PNG
- `app-icon` 1024px PNG (orange rounded-square background)
- In-code SVG `<Logo>` components are recreated as theme-able SVG approximations of the mark.

## Rebrand progress

Legend: ✅ done in code · 🖼️ needs user-supplied image file · ⚠️ deliberately left

### enatega-multivendor-web
- ✅ Palette: `app/(localized)/global.css` `:root` vars → orange/maroon/teal/cream + `--brand-*` tokens
- ✅ PrimeReact theme `lara-light-green` → `lara-light-amber`
- ✅ Hardcoded greens (`#75D04B`, `#5AC12F`, `#94e469`, `#5ab633`, `bg-green-*`) → tokens
- ✅ `APP_NAME` "Enatega" → "Padharo"; `layout.tsx` title/description/theme-color; `manifest.json`
- ✅ Home hero → maroon (`bg-secondary-color`)
- ✅ `Logo.tsx` → `<img>` of `/public/assets/brand/padharo-logo{,-inverse}.svg` (placeholder SVGs I built)
- ✅ `favicon.svg` added; `favicon.png`/`.ico` still old 🖼️
- ✅ "Enatega" → "Padharo" in 25 locale JSON files (values only, keys kept)
- ⚠️ `enatega.com` / `info@enatega.com` URLs+emails in privacy/terms locale text — real endpoints, left for user
- 🖼️ `/512.png /192.png /144.png` PWA icons, `splash-screen.png`

### enatega-multivendor-admin
- ✅ Palette: `global.css` `:root` (`#b1c748`→orange etc.); PrimeReact `lara-light-blue` → `lara-light-amber`
- ✅ stray `#5ac12f`, `#CED111` → tokens
- ✅ `APP_NAME` 'Yalla' → 'Padharo'; `layout.tsx` title/description/icon
- ✅ `AppLogo` → `<img>` of brand SVGs (copied into admin `/public/assets/brand/`)
- ✅ "Enatega" → "Padharo" in 29 locale JSON files
- ⚠️ login button stays dark (`bg-[#18181B]`) — admin design language
- 🖼️ `public/favicon.png`, `favsicons.png`, `/logo.png` (support-chat avatar)

### enatega-multivendor-app (customer, Expo)
- ✅ `src/utils/themeColors.js` — all `#90E36D`/`#94e469`/`#61d921`/`#6fcf97` → `#F5820A`
- ✅ `app.config.js` name "Enatega Multi" → "Padharo", `brandName`, `primaryColor`, location strings, splash bg
- ✅ `AnimatedSplash.js` accent colors → orange
- ✅ UA strings `EnategaApp` → `PadharoApp`; `liveActivityService` brandName
- ✅ `translations/*.js` — "Enatega" AND "Yalla" → "Padharo" (all 34 langs)
- ⚠️ `scheme` / `bundleIdentifier` / `package` (`com.enatega.multivendor`) unchanged — changing breaks installs/store/push/Firebase; deployment decision
- 🖼️ `icon.png`, `adaptive-icon`, `splash`, `notification-icon`, splash `wordmarkWhite/Navy.png`, `pin.png`, `glow.png`

### enatega-multivendor-rider (Expo)
- ✅ `lib/utils/constants/colors.ts` — greens (`#90E36D`, `#AAC810`, `#A5C616`, `#8CA30D`) → orange (light `#F5820A` / dark `#D96D00`)
- ✅ `app.config.js` name → "Padharo Rider", splash bg
- ✅ `AnimatedSplash.tsx` accents → orange; UA `Yalla-Rider-App` → `Padharo-Rider-App`
- ✅ stray `#90E36D` in wallet component
- ⚠️ `scheme`/`bundleIdentifier`/`package` (`com.enatega.multirider`) unchanged
- 🖼️ app icon / splash / adaptive-icon / splash wordmark PNGs

### enatega-multivendor-store (Expo)
- ✅ `lib/utils/constants/colors.ts` — same green→orange mapping as rider
- ✅ `app.json` name → "Padharo Store", description
- ✅ stray `#90E36D` in wallet component + `time-left.tsx` svg
- ⚠️ `scheme` (`enatega-store`), slug unchanged
- 🖼️ app icon / splash / adaptive-icon PNGs

## Assets — DONE (placeholder) + pipeline

- SVG sources: `enatega-multivendor-web/public/assets/brand/` (one place, all apps).
- `scripts/generate-brand-assets.mjs` rasterises them → **41 PNGs** across all 5 apps
  (icons, adaptive-icon, splash, notification, animated-splash pieces, PWA icons, favicons).
- Ran once — every raster the apps reference is now a Padharo placeholder, not the old Enatega/Yalla art.
- **To swap in the real design + the bundle-ID / domain decisions: see `PADHARO_ASSETS.md`.**

## Still TODO (needs user)
1. Replace the SVG (or drop same-named PNG) masters in `.../public/assets/brand/`, re-run the
   generator, then `npx expo prebuild --clean` in the 3 Expo apps. Full steps in `PADHARO_ASSETS.md` §1.
2. Bundle IDs / URL schemes (`com.enatega.*`, `enatega-store`) — `PADHARO_ASSETS.md` §2. Release/ops call.
3. `enatega.com` / `info@enatega.com` in web legal copy — `PADHARO_ASSETS.md` §3 has the one-liner.
4. The 3 Expo apps' changes are code-verified only — not run on a device (Android SDK on this machine is stripped).
