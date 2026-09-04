/**
 * Build the 11 LocalSell master PNGs from code (no external art needed).
 *
 *   node scripts/build-localsell-masters.mjs
 *
 * Renders an SVG mark + "localsell" wordmark to
 *   enatega-multivendor-web/public/assets/brand/masters/localsell-*.png
 * at the exact sizes generate-brand-assets.mjs expects, then you run that
 * script to fan them out to all 5 apps.
 *
 * Uses headless Chrome (Windows path below; override with CHROME env var).
 * These are clean placeholders in the real brand colours — drop hand-drawn
 * art over the same filenames later and re-run generate-brand-assets.mjs.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = `${ROOT}/enatega-multivendor-web/public/assets/brand/masters`;
const TMP = `${ROOT}/.localsell-art-tmp`;
const CHROME =
  process.env.CHROME ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const BLUE = "#1C5BC7";
const NAVY = "#16293F";
const CREAM = "#F4F7FB";

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

/** the storefront-in-a-pin mark. `c` = pin fill, `d` = detail colour, `hole` = door/window colour */
const mark = (c, d, hole) => `
<svg viewBox="0 0 200 236" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 8C48 8 12 46 12 96c0 58 74 118 88 132 14-14 88-74 88-132 0-50-36-88-88-88Z" fill="${c}"/>
  <circle cx="100" cy="96" r="64" fill="none" stroke="${d}" stroke-width="9"/>
  <g fill="${d}">
    <path d="M60 80 100 60 140 80 140 90 60 90Z"/>
    <path d="M62 90c4 12 12 12 16 0 4 12 12 12 16 0 4 12 12 12 16 0 4 12 12 12 16 0 4 12 12 12 16 0V90Z"/>
    <rect x="70" y="106" width="60" height="36" rx="2"/>
  </g>
  <rect x="92" y="118" width="16" height="24" fill="${hole}"/>
  <rect x="75" y="111" width="11" height="11" fill="${hole}"/>
</svg>`;

/** flat single-colour silhouette (holes punched) */
const markFlat = (c) => mark(c, c, "rgba(0,0,0,0)").replace(
  'fill="none" stroke="' + c + '"',
  'fill="none" stroke="' + c + '"',
);

// Wordmark font — the brand font. Put the .ttf/.otf at scripts/<name> and set
// FONT_FILE + FONT_WEIGHT + LETTER_SPACING; it's embedded as a data: URI so the
// render is offline and deterministic. Falls back to a system stack if absent.
const FONT_FILE = "Explora.ttf";
const FONT_WEIGHT = 400;
const LETTER_SPACING = "0";
const _fp = `${ROOT}/scripts/${FONT_FILE}`;
const FONT_FACE = existsSync(_fp)
  ? `@font-face{font-family:Brand;src:url(data:font/ttf;base64,${readFileSync(_fp).toString("base64")});font-weight:${FONT_WEIGHT}}`
  : "";
const FONT_FAMILY = `Brand,'Segoe UI',system-ui,Arial,sans-serif`;
const word = (color, size) =>
  `<span style="font-weight:${FONT_WEIGHT};font-size:${size}px;line-height:1;font-family:${FONT_FAMILY};letter-spacing:${LETTER_SPACING};color:${color}">localsell</span>`;

// name -> { w, h, bg, html }
const M = {
  "localsell-icon":            { w: 2048, h: 2048, bg: "#FFFFFF", body: `<div style="width:74%">${mark(BLUE, "#fff", BLUE)}</div>` },
  "localsell-icon-transparent":{ w: 2048, h: 2048, bg: "transparent", body: `<div style="width:82%">${mark(BLUE, "#fff", BLUE)}</div>` },
  "localsell-icon-cream":      { w: 2048, h: 2048, bg: "transparent", body: `<div style="width:82%">${mark(CREAM, NAVY, "rgba(0,0,0,0)")}</div>` },
  "localsell-symbol":          { w: 2048, h: 2048, bg: "transparent", body: `<div style="width:82%">${mark(BLUE, "#fff", BLUE)}</div>` },
  "localsell-notification":    { w: 512,  h: 512,  bg: "transparent", body: `<div style="width:86%">${markFlat("#FFFFFF")}</div>` },
  "localsell-logo":            { w: 1600, h: 443,  bg: "transparent", body: `<div style="display:flex;align-items:center;gap:40px"><div style="width:300px">${mark(BLUE, "#fff", BLUE)}</div>${word(NAVY, 250)}</div>` },
  "localsell-logo-inverse":    { w: 1600, h: 443,  bg: "transparent", body: `<div style="display:flex;align-items:center;gap:40px"><div style="width:300px">${mark("#fff", NAVY, "rgba(0,0,0,0)")}</div>${word("#FFFFFF", 250)}</div>` },
  "localsell-wordmark-cream":  { w: 1844, h: 308,  bg: "transparent", body: word(CREAM, 320) },
  "localsell-wordmark-navy":   { w: 1844, h: 308,  bg: "transparent", body: word(NAVY, 320) },
  "localsell-pin":             { w: 1264, h: 1668, bg: "transparent", body: `<div style="width:92%">${markFlat(BLUE)}</div>` },
  "localsell-splash-portrait": { w: 2160, h: 3840, bg: NAVY, body: `<div style="display:flex;flex-direction:column;align-items:center;gap:110px"><div style="width:700px">${mark("#fff", NAVY, "rgba(0,0,0,0)")}</div>${word(CREAM, 300)}</div>` },
};

let n = 0;
for (const [name, s] of Object.entries(M)) {
  const html = `<!doctype html><meta charset=utf8><style>
    ${FONT_FACE}
    *{margin:0;box-sizing:border-box}
    html,body{width:${s.w}px;height:${s.h}px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;background:${s.bg}}
    svg{display:block;width:100%;height:auto}
  </style><body>${s.body}</body>`;
  const htmlPath = `${TMP}/${name}.html`;
  const pngPath = `${OUT}/${name}.png`;
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--default-background-color=00000000`,
    `--window-size=${s.w},${s.h}`,
    `--screenshot=${pngPath}`,
    "--virtual-time-budget=5000",
    `file://${htmlPath.replace(/\\/g, "/")}`,
  ], { stdio: "pipe" });
  console.log(`  ${name}.png  ${s.w}x${s.h}`);
  n++;
}
rmSync(TMP, { recursive: true, force: true });
console.log(`\n${n} masters written to ${OUT}`);
console.log(`next: node scripts/generate-brand-assets.mjs`);
