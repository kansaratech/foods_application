# LocalSell — Platform Hardening Roadmap

Clearing the Enatega starter-kit debt across all 5 apps **without a feature freeze**.
Companion to [ADMIN_UI_CONSISTENCY.md](ADMIN_UI_CONSISTENCY.md) (the admin-specific instance
of Phase 3 below).

---

## Where we are (audited 2026-09-07)

| App | Stack | Size | Debt signature |
|---|---|---|---|
| **customer** (`localsell-app`) | Expo SDK 53, **plain JS (423 files, 0 TS)**, `@react-navigation/stack`, Enatega `ThemeContext`/`ThemeReducer` | ~81k LOC, 42 screens, 52 native deps | original Enatega gen, barely modernised. 51 component folders, v1/v2 dupes (`NewRestaurantDetail` + `NewRestaurantDetailDesign`), `themeColors.js` |
| **rider** (`localsell-rider`) | Expo SDK 53, **TS**, `expo-router` + drawer, `ThemedText`/`ThemedView` | ~34k LOC, 24 screens, 42 native deps | newer gen. 23 `useable-components`, `constants/colors.ts`. Close to store. |
| **store** (`localsell-store`) | Expo SDK **54**, TS, `expo-router` + drawer | ~22k LOC, 14 screens, 41 native deps | same gen as rider (SDK ahead). 24 `useable-components`. |
| **admin** (`localsell-admin`) | Next 14, PrimeReact + Tailwind + next-themes | — | 60+ overlapping `useable-components`; theme + form-control pass **in progress** on `feat/admin-theme-tokens` |
| **web** (`localsell-web`) | Next 14, Tailwind | — | partial token work done; config-context currency pinned |
| **api** (`localsell-api`) | Node + GraphQL + Prisma/MySQL | — | `compat.resolvers.ts` / `compat.typeDefs` = an explicit shim for legacy queries → schema has drifted |

**No monorepo** — 5 sibling folders, separate `node_modules` / eslint / lockfiles. eslint configs
split: customer + admin on legacy `.eslintrc.json`, rider/store/web on flat `eslint.config.mjs`.

**Key insight for sequencing:** rider ≈ store (same generation, already TS + `expo-router`).
Customer is a generation behind and 2–3× the size. So: **standardise rider+store first → they
become the reference → then drag customer up to that bar.**

---

## Principles — the definition of "done" (so it's not endless)

1. **One canonical component per role.** A `<Button>`, an input `<Field>`, a `<Card>`, a
   `<ListRow>`, an `<EmptyState>`, a `<Sheet>`. Adding a variant = delete another or justify it
   in the PR description.
2. **Colour / spacing / radius / type from tokens only.** No raw hex, no ad-hoc `style={{ }}`
   where a token/primitive exists. Enforced by lint.
3. **Every screen has the same four states** wired the same way: loading, error, empty, data.
   One data-fetch hook shape.
4. **The starter kit is a donor, not a dependency.** Every file we keep, we own and understand.
   Dead code gets deleted, not commented out.
5. **Ship continuously.** No multi-month freeze. Strangler pattern — the module you touch for a
   feature is the module you clean.
6. **TS by default.** New files TS. Files you meaningfully edit get converted. No big-bang rewrite.

---

## Phase 0 — Guardrails first  ·  ~1 week  ·  do this before anything else

Stops debt growing while you pay it down. Cheap, permanent.

- [ ] **CI gate** per app: `tsc --noEmit` (where TS) + `eslint` + `expo export` / `next build`
      must pass on every PR. (GitHub Actions, one workflow file per app.)
- [ ] **Lint rules that block regressions:**
  - no raw hex in `style`/`className` (`no-color-literals` for RN, custom rule for admin/web)
  - no inline `style={{ }}` objects in RN screens (allow in primitives only)
  - `no-restricted-imports` — ban the known-dead component paths so nobody re-imports them
  - `import/no-cycle`
- [ ] **`CONVENTIONS.md`** per repo area (mobile / admin / web / api): folder layout, naming,
      "how to add a screen", "how to add a component", data-fetching pattern. One page each.
- [ ] **PR checklist** template: "no new component variant · states wired · tokens only · no `any`".
- [ ] **Error monitoring live** — Sentry is half-wired (`*SentryUrl` config keys exist). Turn it
      on for all 5 apps so you're triaging real crashes, not guessing.
- [ ] **Fix the acute bleeders now:**
  - next-intl / i18n blanks whole pages on a missing or trailing-`.` translation key — add
    `onError` + `getMessageFallback` so a bad key logs and renders the key, never a white screen.
    (admin + web; customer app uses i18next — check its fallback config too.)
  - currency → `₹` everywhere (done on `fix/inr-currency-phone`, needs merge)
  - any crash-rate top-5 from Sentry

---

## Phase 1 — Inventory & triage  ·  ~2 weeks

You can't consolidate what you haven't mapped. Output is tracked docs, not code.

- [ ] **Component census** per app — a table: component → files that use it → overlap group →
      verdict (`keep` / `merge into X` / `delete`). (Did this for admin; ~40 of 60 collapse.)
- [ ] **Screen inventory** per app — screen → "solid" / "needs rework" / "rewrite" → owner of the
      canonical pattern it should follow.
- [ ] **API contract audit** — every operation the 3 mobile apps + web + admin call → is it in
      `compat` shim? is it dead? Mark the target schema. Freeze schema changes behind a review.
- [ ] **Dependency audit** — align Expo SDK (rider→54 to match store), one eslint config style,
      dedupe the 40+ native deps list per app (many are transitive or unused).
- [ ] Roll the per-app findings into `<app>/CLEANUP.md` with checkboxes.

---

## Phase 2 — Shared foundation  ·  ~3–4 weeks

The pieces everything else plugs into. **Keep the shared surface small** — sharing lots of RN UI
across apps with slightly different design needs is where these efforts die.

- [ ] **Design tokens — one source.** `colors / spacing / radii / typography / shadows` as a
      plain TS module. Options, cheapest first:
  - **a. `packages/tokens`** + a root `package.json` with `workspaces: ["localsell-*", "packages/*"]`
    and Metro `watchFolders`. ~3 days setup, best long-term.
  - **b. canonical-copy** — `localsell-store` owns `lib/tokens.ts`, a `scripts/sync-tokens.mjs`
    copies it to the others, CI checks they match. Zero infra, relies on the script.
  - Recommend **a** if you'll touch these apps for another year; **b** if not sure.
- [ ] **Format helpers → shared** (`formatCurrency` ₹/en-IN, date, phone/+91, distance). Rider +
      store already have `use-currency`; make it one module.
- [ ] **GraphQL client → one pattern.** admin's `useSetApollo` (auth refresh link, nonce, error
      link) is the good one — port its shape to rider/store/customer. Shared `packages/api-client`
      if using workspaces.
- [ ] **Core primitives, per platform** (RN: rider/store first; then customer; admin already
      underway). One each: `Button`, `Field` (label+control+error), `Select`, `Card`, `ListRow`,
      `EmptyState`, `Sheet`/`Modal`, `Toast`, `Screen` (safe-area + scroll + states).
- [ ] **Form pattern** — one `<FormSheet>` for ≤4 fields, screen route for more (mirror the admin
      `FormDialog` rule). One `<FormActions>` (Cancel/Save).

---

## Phase 3 — Per-app rework  ·  ~3–5 months  ·  one app at a time

Strangler pattern: migrate screen-by-screen onto the Phase 2 primitives, deleting dead components
as you go. Never a half-migrated app in `main` for long — feature-flag or branch per app.

**Order & why:**

1. **store** (~3–4 wk) — smallest (14 screens). Proves the primitives + form pattern fast.
2. **rider** (~4–6 wk) — same generation as store, so ~60% is applying the store playbook. The
   hard 40%: background location, dispatch flow, cash/wallet screens, maps.
3. **customer** (~8–12 wk) — the big one. Its own mini-plan:
   - [ ] nav: `@react-navigation/stack` → `native-stack` (or `expo-router`), collapse v1/v2 dupes
   - [ ] theme: `ThemeContext`/`ThemeReducer` + `themeColors.js` → shared tokens
   - [ ] TS migration: new + touched files only; `checkJs` on, ratchet down `any`
   - [ ] 51 component folders → ~20 primitives + screen-local pieces
   - [ ] critical-path tests: browse → cart → checkout → pay → track (Maestro or Detox, 5–8 flows)
4. **admin** (~3–4 wk) — continue `ADMIN_UI_CONSISTENCY.md` (Phase 1 done; tables + forms left).
5. **web** (~2–3 wk) — token adoption + component dedupe; smaller surface.

Admin + web can run in gaps between mobile milestones (different context, no conflict).

---

## Phase 4 — Contract & infra hygiene  ·  interleaved, ~2 weeks of effort

- [ ] **Kill the `compat` shim** — migrate the last callers to the real schema, delete
      `compat.resolvers.ts` / `compat.typeDefs`.
- [ ] **Schema = contract.** PR review required for `typeDefs` changes; consider a codegen step so
      clients get typed operations (`graphql-codegen`), which also surfaces dead queries.
- [ ] **Expo SDK cadence** — upgrade all 3 apps together, every 2 SDK releases, as a planned
      1-week sprint (not "when something breaks").
- [ ] **Renovate/Dependabot** grouped weekly PRs; CI must pass to merge.
- [ ] **One release runbook** per app (EAS build profiles, versioning, store submission) in
      `<app>/RELEASING.md`.

---

## Cadence — how to do this solo without stalling the business

- **~60% hardening / 40% features** for the ~6-month push. Not 100/0 — the business can't take a
  freeze, and you'll burn out.
- **Boy-scout rule is the engine:** every feature ticket includes cleaning the screen + components
  it touches. Most of Phase 3 happens this way for free.
- **Milestone-gated, not calendar-gated:** finish `store` clean → ship it → reassess before
  starting `rider`. Each app is a checkpoint where you could stop and still be better off.
- **One dedicated block/week** (half a day) for the un-fun structural work that features never
  force you to touch (nav, build config, the shared package).
- **Don't start Phase 3 on an app until Phase 2 primitives exist** — otherwise you migrate
  screens twice.

---

## Estimate

| Path | Solo (interleaved w/ features) | + 1 mid-level RN dev |
|---|---|---|
| Guardrails + Inventory + Foundation (Ph 0–2) | ~7–9 weeks | ~4–5 weeks |
| store rework | ~3–4 weeks | ~2 weeks |
| rider rework | ~4–6 weeks | ~3 weeks |
| customer rework | ~8–12 weeks | ~5–7 weeks |
| admin finish | ~3–4 weeks | (parallel) |
| web finish | ~2–3 weeks | (parallel) |
| Contract/infra hygiene (interleaved) | ~2 weeks | ~1 week |
| **Total calendar (still shipping)** | **~7–9 months** | **~4–5 months** |

For comparison: the full-native rewrite of the 3 mobile apps was estimated at **24–36 months
solo** — this roadmap is ~⅓ the time, keeps both platforms, and you never stop shipping.

---

## Progress log

_(update as milestones land)_

- 2026-09-07 — roadmap written. Admin Phase 1 (form controls + tokens) done on
  `feat/admin-theme-tokens`. Currency/₹ + phone-+91 lockdown done on `fix/inr-currency-phone`.
