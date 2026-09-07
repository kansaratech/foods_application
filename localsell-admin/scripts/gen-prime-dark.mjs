/**
 * Generates `app/prime-dark.generated.css` from PrimeReact's first-party
 * `lara-dark-blue` theme by scoping every rule under `.dark`.
 *
 * Why: the admin app loads the `lara-light-blue` theme inside `@layer(primereact)`
 * so Tailwind utilities keep winning the cascade. We can't `<link>`-swap a full
 * dark theme without leaving that layer, so instead we ship the dark theme's rules
 * scoped to `html.dark` in the same layer. `next-themes` toggles the `.dark` class.
 *
 * This replaces ~1.4k lines of hand-written, `!important`-riddled `.dark .p-*`
 * overrides in `global.css` with the real, complete dark theme.
 *
 * Run:  node scripts/gen-prime-dark.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

const ADMIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = require.resolve(
  'primereact/resources/themes/lara-dark-blue/theme.css'
);
const OUT = resolve(ADMIN_ROOT, 'app/prime-dark.generated.css');
const SCOPE = '.dark';

const source = readFileSync(SRC, 'utf8');
const root = postcss.parse(source, { from: SRC });

// The light theme already registers the Inter font-face and every @keyframes
// under identical names — the dark copies are byte-identical, so drop them.
root.walkAtRules((at) => {
  if (at.name === 'font-face' || at.name === 'keyframes') at.remove();
});

const scopeSelector = (selector) => {
  const s = selector.trim();
  if (s === ':root' || s === 'html' || s === 'body' || s === '*') return SCOPE;
  if (s.startsWith(':root')) return `${SCOPE}${s.slice(':root'.length)}`;
  if (s.startsWith('html')) return `${SCOPE}${s.slice('html'.length)}`;
  return `${SCOPE} ${s}`;
};

root.walkRules((rule) => {
  // Skip anything still nested in an at-rule we keep as-is (e.g. @media handled
  // by walkRules recursing into it — that's fine, we still want to scope those).
  if (
    rule.parent &&
    rule.parent.type === 'atrule' &&
    /keyframes/i.test(rule.parent.name)
  ) {
    return;
  }
  rule.selectors = rule.selectors.map(scopeSelector);
});

const banner =
  '/*\n' +
  ' * AUTO-GENERATED — do not edit.\n' +
  ' * Source: primereact/resources/themes/lara-dark-blue/theme.css\n' +
  ' * Regenerate: node scripts/gen-prime-dark.mjs\n' +
  ' * Every rule is scoped under `.dark`; brand-token overrides live in theme-tokens.css.\n' +
  ' */\n';

writeFileSync(OUT, banner + root.toString() + '\n', 'utf8');

const bytes = Buffer.byteLength(banner + root.toString());
console.log(
  `wrote ${OUT.replace(ADMIN_ROOT + '/', '')} (${(bytes / 1024).toFixed(1)} kB)`
);
