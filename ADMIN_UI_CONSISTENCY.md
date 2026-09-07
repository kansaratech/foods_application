# LocalSell Admin — UI consistency pass

Branch: `feat/admin-theme-tokens` (builds on the theme-token foundation).
Goal: one design system across the whole admin app — same table, same inputs,
same form presentation everywhere. Driven by `app/theme-tokens.css` tokens.

## The problems (audited 2026-09-07)

| Area | State today |
|---|---|
| **Tables** | 38 pages use the shared `<Table>`, **9 pages use a raw `<DataTable>`** (orders, users, restaurants, dispatch, growth-overview, order-history…) → different look, different paginator, different scroll behaviour. `<DataView>` used on ratings. |
| **Inputs** | `input-field` (55×) is the de-facto standard, but `number-input-field` (17×), `password-input-field` (21×), `input-icon-field` (9×), `custom-text-area-field` (6×), `date-input` (3×), `time-input` (4×) each drifted — different border/bg/dark classes, some have no error slot, one `alert()`s, copy-paste `htmlFor="username"` bugs. Plus 6 dead variants: `custom-input`, `custom-text-input`, `text-field`, `custom-radius-input`, `custom-commission-input`, `password-input-field-using-tf`. |
| **Dropdown / MultiSelect / AutoComplete / Calendar** | Themed only via ~1 500 lines of hand-written `.dark .p-*` in global.css (being removed on this branch); wrappers don't share the input shell. |
| **Forms** | 17 forms open as a **right-side `<Sidebar>` drawer** regardless of size — a 2-field cuisine form and a 15-field store form use the same drawer. |
| **Dialogs** | `custom-dialog` is confirm-only (title/message/2 buttons). No Formik-aware form dialog. 3 delete-confirm variants (`custom-dialog`, `delete-dialog`, `confirm-delete-popup`). |

## Target

- **Form presentation rule:** ≤ 4 fields → **modal dialog**; > 4 fields → **dedicated route** (`…/new`, `…/[id]/edit`), the edit route reuses the new-form component.
- **One input shell** — label, control, error, help text, disabled, loading skeleton — shared by every field type, all sizing/colour from tokens.
- **One `<Table>`** — every list screen goes through it.
- **One `<FormDialog>`** and **one `<FormPage>`** layout.

---

## TODO

### Phase 1 — Primitives  ▢
- [ ] `useable-components/form/Field.tsx` — the shared shell (`<Field label error help required>` + `control` slot)
- [ ] Rebuild on top of it: `TextField`, `TextAreaField`, `NumberField`, `PasswordField`, `SelectField`, `MultiSelectField`, `DateField`, `PhoneField` (thin wrappers, identical shell)
- [ ] Delete dead variants: `custom-input`, `custom-text-input`, `text-field`, `custom-radius-input`, `custom-commission-input`, `password-input-field-using-tf`
- [ ] `FormDialog.tsx` — Formik-aware, token header/footer, responsive width, scroll body, standard Save/Cancel
- [ ] `FormPage.tsx` — breadcrumb + title + card + sticky action bar
- [ ] Consolidate 3 delete-confirm dialogs → 1 (`ConfirmDialog`)

### Phase 2 — Table unification  ▢
- [ ] Extend shared `<Table>` with anything the 9 raw pages need (custom row expansion, etc.)
- [ ] Migrate raw `<DataTable>` pages → shared `<Table>`: super-admin orders, vendor orders, order-table, users (×2), restaurants, dispatch, growth-overview, user-detail order-history
- [ ] one paginator template, one empty state, one skeleton, one scroll model everywhere

### Phase 3 — Forms migration  ▢
- [ ] ≤ 4 fields → `FormDialog`: cuisines, shop-types, zone, super-admin coupons, notifications, restaurant withdraw, super-admin withdraw, category, add-subcategories, options, add-ons
- [ ] > 4 fields → `FormPage` route: banners, staff, food, super-admin restaurant, vendor restaurant, vendor profile, coupons (restaurant)
- [ ] delete the `Sidebar` form wrappers once migrated

### Phase 4 — Polish  ▢
- [ ] Buttons — one `<Button>` (variant/size), kill ad-hoc `<button className=…>`
- [ ] Tabs — merge `custom-tab` + `vendor-custom-tab`
- [ ] Cards — merge `resturant-card` / `vendor-card` / `vendors-layout-resturant-card`
- [ ] Empty states / skeletons audit
- [ ] Remove now-unused CSS from global.css / *.module.css

---

## Progress log

_(updated as work lands)_
