/**
 * LocalSell brand raster generator.
 *
 * Masters (PNG, high-res) live in:
 *   enatega-multivendor-web/public/assets/brand/masters/
 * This script downscales/fits them into every PNG + ICO the 5 apps reference
 * (app icons, adaptive-icon, splash, notification icons, animated-splash pieces,
 * horizontal logo, web PWA icons + favicons).
 *
 *   node scripts/generate-brand-assets.mjs           # generate everything
 *   node scripts/generate-brand-assets.mjs --list    # just print the plan
 *
 * To update the brand: replace the master PNG(s) in masters/ (keep the same
 * filename + aspect ratio; use the largest artwork you have — the script only
 * downscales) and re-run.
 *
 * Needs Playwright's Chromium. If "Playwright not found", run once:
 *   npx --yes playwright install chromium
 * or set NODE_PATH to a node_modules that already has playwright.
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

async function loadChromium() {
  const req = createRequire(import.meta.url);
  const candidates = ["playwright", "playwright-core"];
  try {
    const { readdirSync } = await import("node:fs");
    const la = process.env.LOCALAPPDATA || `${process.env.HOME}/AppData/Local`;
    const npx = `${la}/npm-cache/_npx`;
    for (const dir of readdirSync(npx)) {
      candidates.push(`${npx}/${dir}/node_modules/playwright`);
      candidates.push(`${npx}/${dir}/node_modules/playwright-core`);
    }
  } catch {}
  for (const c of candidates) {
    try {
      const mod = req(c); // playwright ships CJS; require gets the real namespace
      const chromium = mod.chromium || (mod.default && mod.default.chromium);
      if (chromium) return chromium;
    } catch {}
  }
  throw new Error(
    "Playwright not found. Set NODE_PATH to a node_modules that has it, or run\n" +
      "`npx --yes playwright install chromium` once, then retry.",
  );
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MASTERS = `${ROOT}/enatega-multivendor-web/public/assets/brand/masters`;

/** master (basename, no ext) -> list of { out, w, h, transparent? } targets */
const MANIFEST = [
  // ---- Native store icons — MUST stay opaque (iOS rejects alpha) ----------
  {
    src: "localsell-icon",
    targets: [
      { out: "enatega-multivendor-app/assets/icon.png", w: 1024, h: 1024 },
      { out: "enatega-multivendor-app/assets/appIcon.png", w: 1024, h: 1024 },
      { out: "enatega-multivendor-rider/lib/assets/images/icon.png", w: 1024, h: 1024 },
      { out: "enatega-multivendor-rider/lib/assets/images/appIcon.png", w: 1024, h: 1024 },
      { out: "enatega-multivendor-store/lib/assets/images/icon.png", w: 1024, h: 1024 },
      { out: "enatega-multivendor-store/lib/assets/images/appIcon.png", w: 1024, h: 1024 },
    ],
  },
  // ---- Favicons / PWA icons / in-app logos — transparent -----------------
  {
    src: "localsell-symbol",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-web/public/512.png", w: 512, h: 512 },
      { out: "enatega-multivendor-web/public/192.png", w: 192, h: 192 },
      { out: "enatega-multivendor-web/public/144.png", w: 144, h: 144 },
      { out: "enatega-multivendor-web/public/favicon.png", w: 128, h: 128 },
      { out: "enatega-multivendor-web/public/favsicon.png", w: 128, h: 128 },
      { out: "enatega-multivendor-web/public/apple-touch-icon.png", w: 180, h: 180 },
      { out: "enatega-multivendor-web/lib/assets/enatega-logo.png", w: 512, h: 512 },
      { out: "enatega-multivendor-admin/public/favicon.png", w: 64, h: 64 },
      { out: "enatega-multivendor-admin/public/favsicons.png", w: 128, h: 128 },
      { out: "enatega-multivendor-admin/public/assets/images/png/logo.png", w: 512, h: 512 },
      { out: "enatega-multivendor-store/lib/assets/images/favicon.png", w: 128, h: 128 },
      { out: "enatega-multivendor-app/src/assets/images/logo.png", w: 512, h: 512 },
      { out: "enatega-multivendor-app/src/assets/images/defaultLogo.png", w: 512, h: 512 },
      { out: "enatega-multivendor-app/src/assets/images/masterIcon.png", w: 512, h: 512 },
    ],
  },
  // ---- Transparent symbol, dark P — Android adaptive foreground (bg is orange)
  {
    src: "localsell-icon-transparent",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/assets/adaptive-icon.png", w: 1024, h: 1024 },
    ],
  },
  // ---- Transparent symbol, cream P — splash logo (splash bg is maroon) -----
  {
    src: "localsell-icon-cream",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/assets/splashTransparent.png", w: 512, h: 512 },
      { out: "enatega-multivendor-rider/lib/assets/images/splashTransparent.png", w: 512, h: 512 },
    ],
  },
  // ---- Notification icon (white silhouette, transparent) -----------------
  {
    src: "localsell-notification",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/assets/not-icon.png", w: 96, h: 96 },
      { out: "enatega-multivendor-app/src/assets/images/defaultNotification.png", w: 96, h: 96 },
      { out: "enatega-multivendor-app/src/assets/images/notificationDefault.png", w: 96, h: 96 },
    ],
  },
  // ---- Animated-splash pieces -------------------------------------------
  {
    src: "localsell-wordmark-cream",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/src/components/Splash/assets/wordmarkWhite.png", w: 922, h: 154 },
      { out: "enatega-multivendor-app/splash_claud_assets/enatega-animated-splash/assets/wordmarkWhite.png", w: 922, h: 154 },
      { out: "enatega-multivendor-rider/lib/ui/useable-components/splash/assets/wordmarkWhite.png", w: 922, h: 154 },
      { out: "enatega-multivendor-rider/splash_claud_assets/enatega-animated-splash/assets/wordmarkWhite.png", w: 922, h: 154 },
      { out: "enatega-multivendor-store/lib/ui/useable-components/splash/assets/wordmarkWhite.png", w: 922, h: 154 },
    ],
  },
  {
    src: "localsell-wordmark-navy",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/src/components/Splash/assets/wordmarkNavy.png", w: 922, h: 154 },
      { out: "enatega-multivendor-app/splash_claud_assets/enatega-animated-splash/assets/wordmarkNavy.png", w: 922, h: 154 },
      { out: "enatega-multivendor-rider/lib/ui/useable-components/splash/assets/wordmarkNavy.png", w: 922, h: 154 },
      { out: "enatega-multivendor-rider/splash_claud_assets/enatega-animated-splash/assets/wordmarkNavy.png", w: 922, h: 154 },
      { out: "enatega-multivendor-store/lib/ui/useable-components/splash/assets/wordmarkNavy.png", w: 922, h: 154 },
    ],
  },
  {
    src: "localsell-pin",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-app/src/components/Splash/assets/pin.png", w: 632, h: 834 },
      { out: "enatega-multivendor-app/splash_claud_assets/enatega-animated-splash/assets/pin.png", w: 632, h: 834 },
      { out: "enatega-multivendor-rider/lib/ui/useable-components/splash/assets/pin.png", w: 632, h: 834 },
      { out: "enatega-multivendor-rider/splash_claud_assets/enatega-animated-splash/assets/pin.png", w: 632, h: 834 },
      { out: "enatega-multivendor-store/lib/ui/useable-components/splash/assets/pin.png", w: 632, h: 834 },
    ],
  },
  // ---- Horizontal lockup (mark + "LocalSell") for in-app headers/footers --
  {
    src: "localsell-logo",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-web/public/assets/brand/localsell-logo.png", w: 800, h: 222 },
      { out: "enatega-multivendor-admin/public/assets/brand/localsell-logo.png", w: 800, h: 222 },
      { out: "enatega-multivendor-store/lib/assets/images/brand-logo.png", w: 800, h: 222 },
    ],
  },
  {
    src: "localsell-logo-inverse",
    transparent: true,
    targets: [
      { out: "enatega-multivendor-web/public/assets/brand/localsell-logo-inverse.png", w: 800, h: 222 },
      { out: "enatega-multivendor-admin/public/assets/brand/localsell-logo-inverse.png", w: 800, h: 222 },
      { out: "enatega-multivendor-store/lib/assets/images/brand-logo-inverse.png", w: 800, h: 222 },
    ],
  },
  // ---- Full-bleed splash images ---------------------------------------
  {
    src: "localsell-splash-portrait",
    targets: [
      { out: "enatega-multivendor-store/lib/assets/images/black.png", w: 1080, h: 1920 },
      { out: "enatega-multivendor-web/public/splash-screen.png", w: 1080, h: 1920 },
      { out: "enatega-multivendor-app/assets/splash.png", w: 1080, h: 1920 },
      { out: "enatega-multivendor-app/assets/_splash.png", w: 1080, h: 1920 },
    ],
  },
];

const args = process.argv.slice(2);
const listOnly = args.includes("--list");

const plan = MANIFEST.flatMap((g) =>
  g.targets.map((t) => ({ ...t, src: g.src, transparent: !!g.transparent })),
);

function masterPath(base) {
  const p = `${MASTERS}/${base}.png`;
  return existsSync(p) ? p : null;
}

if (listOnly) {
  for (const p of plan) {
    const ok = masterPath(p.src);
    console.log(`${(ok ? "ok " : "MISS").padEnd(4)} ${p.src.padEnd(26)} -> ${p.out}  (${p.w}x${p.h})`);
  }
  console.log(`\n${plan.length} files from ${MANIFEST.length} masters in ${MASTERS}`);
  process.exit(0);
}

const chromium = await loadChromium();
const browser = await chromium.launch();
let done = 0,
  failed = 0;
for (const p of plan) {
  const src = masterPath(p.src);
  if (!src) {
    console.error(`\n  MISSING MASTER  masters/${p.src}.png  (skipping ${p.out})`);
    failed++;
    continue;
  }
  const page = await browser.newPage({
    viewport: { width: p.w, height: p.h },
    deviceScaleFactor: 1,
  });
  const b64 = readFileSync(src).toString("base64");
  const html = `<!doctype html><meta charset=utf8><style>
    *{margin:0;padding:0}html,body{width:${p.w}px;height:${p.h}px;overflow:hidden}
    img{width:${p.w}px;height:${p.h}px;display:block;object-fit:contain}
  </style><img src="data:image/png;base64,${b64}">`;
  await page.setContent(html, { waitUntil: "networkidle" });
  const outPath = `${ROOT}/${p.out}`;
  mkdirSync(dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, omitBackground: p.transparent, type: "png" });
  await page.close();
  done++;
  process.stdout.write(`\r  ${done}/${plan.length}  ${p.out.slice(-52)}`.padEnd(80));
}
await browser.close();

// ---- favicon.ico — multi-size, built from the freshly rendered 512.png ---
// Uses Pillow (bundled python). If python/Pillow is missing the PNG favicons
// still cover every current browser; regenerate .ico with realfavicongenerator.
const ICO_TARGETS = [
  "enatega-multivendor-web/public/favicon.ico",
  "enatega-multivendor-web/app/(localized)/favicon.ico",
  "enatega-multivendor-admin/public/favicon.ico",
  "enatega-multivendor-admin/app/(localized)/favicon.ico",
];
try {
  const { execFileSync } = await import("node:child_process");
  const py =
    "from PIL import Image;import sys;" +
    "s=Image.open(sys.argv[1]).convert('RGBA');" +
    "[s.save(o,format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]) for o in sys.argv[2:]]";
  execFileSync(
    "python",
    ["-c", py, `${ROOT}/enatega-multivendor-web/public/512.png`, ...ICO_TARGETS.map((t) => `${ROOT}/${t}`)],
    { stdio: "pipe" },
  );
  done += ICO_TARGETS.length;
  console.log(`\n\nGenerated ${done} files (incl. ${ICO_TARGETS.length} .ico)${failed ? `, ${failed} skipped` : ""}.`);
} catch {
  console.log(
    `\n\nGenerated ${done} PNGs${failed ? `, ${failed} skipped` : ""}. ` +
      "(.ico step skipped — no python/Pillow; PNG favicons still cover all browsers.)",
  );
}
console.log("For the 3 Expo apps run `npx expo prebuild --clean` so native icon/splash");
console.log("drawables are regenerated from the new source PNGs.");
