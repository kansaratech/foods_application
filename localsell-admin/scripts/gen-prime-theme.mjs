/**
 * Generates the two PrimeReact theme files the admin actually loads:
 *
 *   app/prime-light.generated.css  — lara-light-blue, `@layer` flattened
 *   app/prime-dark.generated.css   — lara-dark-blue, `@layer` flattened AND
 *                                    every rule scoped under `.dark`
 *
 * Why flatten: Next 14.2 mangles `@import ... layer()`, so the theme is loaded
 * unlayered. But the compiled lara CSS wraps part of itself in
 * `@layer primereact {}` — which then loses the cascade to Tailwind's
 * `@layer base` reset (killing `.p-button`, etc). Flattening makes the whole
 * theme unlayered so it behaves like a plain stylesheet again.
 *
 * `next-themes` toggles `.dark` on <html>; brand-token overrides live in
 * app/theme-tokens.css (imported after these).
 *
 * Run:  node scripts/gen-prime-theme.mjs   (also: npm run gen:theme)
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

const ADMIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function flattenLayers(root) {
  root.walkAtRules('layer', (at) => {
    if (at.nodes) at.replaceWith(at.nodes);
    else at.remove();
  });
}

function generate({ theme, out, scope }) {
  const src = require.resolve(`primereact/resources/themes/${theme}/theme.css`);
  const root = postcss.parse(readFileSync(src, 'utf8'), { from: src });

  flattenLayers(root);

  if (scope) {
    // The light theme registers the Inter @font-face / @keyframes under
    // identical names — the scoped copy would just duplicate them.
    root.walkAtRules((at) => {
      if (at.name === 'font-face' || at.name === 'keyframes') at.remove();
    });
    const scopeSelector = (sel) => {
      const s = sel.trim();
      if (s === ':root' || s === 'html' || s === 'body' || s === '*') return scope;
      if (s.startsWith(':root')) return `${scope}${s.slice(':root'.length)}`;
      if (s.startsWith('html')) return `${scope}${s.slice('html'.length)}`;
      return `${scope} ${s}`;
    };
    root.walkRules((rule) => {
      if (
        rule.parent?.type === 'atrule' &&
        /keyframes/i.test(rule.parent.name)
      ) {
        return;
      }
      rule.selectors = rule.selectors.map(scopeSelector);
    });
  }

  const banner =
    `/*\n * AUTO-GENERATED — do not edit. Run: node scripts/gen-prime-theme.mjs\n` +
    ` * Source: primereact/resources/themes/${theme}/theme.css (@layer flattened${
      scope ? `, scoped under \`${scope}\`` : ''
    })\n */\n`;

  const css = banner + root.toString() + '\n';
  writeFileSync(resolve(ADMIN_ROOT, out), css, 'utf8');
  console.log(`wrote ${out} (${(Buffer.byteLength(css) / 1024).toFixed(1)} kB)`);
}

// The generated CSS keeps `@font-face { src: url("./fonts/InterVariable.woff2") }`
// — relative to app/, so put the Inter files there.
const FONT_DIR = resolve(ADMIN_ROOT, 'app/fonts');
mkdirSync(FONT_DIR, { recursive: true });
for (const f of ['InterVariable.woff2', 'InterVariable-Italic.woff2']) {
  copyFileSync(
    require.resolve(`primereact/resources/themes/lara-light-blue/fonts/${f}`),
    resolve(FONT_DIR, f)
  );
}
console.log('copied Inter fonts to app/fonts/');

generate({
  theme: 'lara-light-blue',
  out: 'app/prime-light.generated.css',
  scope: null,
});
generate({
  theme: 'lara-dark-blue',
  out: 'app/prime-dark.generated.css',
  scope: '.dark',
});
