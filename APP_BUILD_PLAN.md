# LocalSell — Mobile App Build & Release Plan

Getting the three Expo apps (**customer**, **store**, **rider**) off the
inherited Enatega identity and Expo's cloud, onto **LocalSell identifiers**,
**our own Firebase / Google / Apple accounts**, **local machine builds**, and a
**self-hosted OTA** server — then into the Play Store and App Store.

**Decisions locked (2026-09-08):**

| Decision | Choice |
|---|---|
| Build infra | **Local machine builds** — `expo prebuild` + Gradle (Android), Xcode (iOS on a Mac). No EAS Build. |
| Bundle IDs | **`in.localsell.customer` / `in.localsell.store` / `in.localsell.rider`** (reverse-DNS of `localsell.in`) |
| OTA updates | **Self-hosted `expo-updates`** — our own update server, no EAS Update |
| Distribution | **Google Play + Apple App Store** (all three apps) |

> The apps are already visually rebranded to LocalSell (name, icons, splash,
> colours — see `LOCALSELL_BRAND.md`). This plan is **identifiers + accounts +
> build pipeline only**, not design.

---

## 0. Identifier map (old → new)

### Customer app (`localsell-app`)

| Field | Now | New |
|---|---|---|
| `android.package` / `ios.bundleIdentifier` | `com.enatega.multivendor` | `in.localsell.customer` |
| `slug` | `enategamultivendor` | `localsell-customer` |
| `scheme` (deep link) | `enategamultivendor` | `localsell` |
| iOS App Group | `group.com.enatega.multivendor.shared` | `group.in.localsell.customer.shared` |
| Live Activity widget bundle | `com.enatega.multivendor.orderActivity` | `in.localsell.customer.orderActivity` |
| `ios.appleTeamId` | `GDFK7MVY6P` (not ours) | *new LocalSell Team ID* |
| iOS OAuth reversed client id | `com.googleusercontent.apps.650001300965-…` | *new iOS OAuth client* |
| `extra.eas.projectId` | `c21fa0cc-…` | **removed** |
| App Store id (`ForceUpdate.js`) | `id1526488093` | *new ASC app id* |
| Universal-link hosts (`src/routes/index.js`) | `multivendor.enatega.com` | `localsell.in` |

Files to touch: `app.config.js`, `src/routes/index.js`,
`src/components/Update/ForceUpdate.js`, `src/utils/liveActivityService.js`,
`plugins/with-rider-call-handler.js`, `targets/widget/expo-target.config.js`,
`GoogleService-Info.plist`, `google-services.json`,
`android/app/google-services.json`.

### Store app (`localsell-store`)

| Field | Now | New |
|---|---|---|
| `android.package` / `ios.bundleIdentifier` | `multivendor.enatega.restaurant` | `in.localsell.store` |
| `slug` | `enatega-multivendor-restaurant` | `localsell-store` |
| `scheme` | `enatega-store` | `localsell-store` |
| `extra.eas.projectId` | `489af486-…` | **removed** |
| `owner` | `kkansara21` | **removed** |
| App Store id (`eas.json`) | `1526672537` | *new ASC app id* |

Files: `app.json`, `google-services.json`, `android/app/google-services.json`.
`i18next.ts` `enatega-language` storage key — leave (has legacy-key migration).

### Rider app (`localsell-rider`)

| Field | Now | New |
|---|---|---|
| `android.package` / `ios.bundleIdentifier` | `com.enatega.multirider` | `in.localsell.rider` |
| `slug` | `food-delivery-rider-multivendor` | `localsell-rider` |
| `scheme` | `com.enatega.multirider` | `localsell-rider` |
| `owner` | `kkansara21` | **removed** |
| `extra.eas.projectId` | `b7634414-…` | **removed** |
| App Store id (`eas.json`) | `1526674511` | *new ASC app id* |

Files: `app.config.js`, `google-services.json`, `android/app/google-services.json`.
Also drop the deprecated `sentry-expo` dep (keep `@sentry/react-native`).

### Shared

- Google Maps key literal `AIzaSyByQslS8CFpwauY6LgcfOqdhWUohLRYN-Q` appears as a
  fallback in all three configs **and** in every `eas.json` — replace with the
  new LocalSell Maps keys (or a placeholder until §2).
- **Delete `eas.json` in all three apps** — not building or updating via Expo cloud.
- All three `google-services.json` point at Firebase project **`enatega-b7cd2`**
  (project number `505610605704`) — the upstream demo project. New project in §1.

---

## 1. Phase 0 — external accounts — ✅ DONE (2026-09-08)

Parent accounts confirmed present: Apple Developer org, Google Play Console,
Google Cloud `localsell` (+ Maps/Places/Directions APIs), Firebase `localsell`,
APNs `.p8`. **Per-app resources inside them are still to create** — that's
Phase 2 (Firebase app registrations ×6, Apple App IDs + ASC apps ×3, Maps
keys ×2, OAuth clients).

- [x] Apple Developer Program (organization)
- [x] Google Play Console developer account
- [x] Google Cloud project `localsell` + Maps SDK Android/iOS, Maps JavaScript,
      Places, Geocoding, Directions APIs
- [x] Firebase project `localsell`
- [x] APNs auth key (`.p8`)
- [ ] Sentry (optional) — deferred; push/Sentry disabled for launch

**Collect and store securely** (a password manager / the ops vault, *never* git):

| Item | From | Used by |
|---|---|---|
| Apple **Team ID** | Apple Developer › Membership | all 3 app configs, provisioning |
| APNs **auth key** (`.p8`) + Key ID | Apple Developer › Keys | Firebase Cloud Messaging (iOS push) |
| Play Console **account** | Google Play Console | app uploads |
| Play **service-account JSON** (later) | Google Cloud › IAM › Service Accounts | scripted Play uploads (optional) |
| Maps **Android** key | Google Cloud › Credentials | app manifests |
| Maps **iOS** key | Google Cloud › Credentials | Info.plist |
| Maps **server** key (exists) | Google Cloud › Credentials | API `/maps/*` proxy |
| OAuth client IDs — **Web**, **Android** ×3, **iOS** ×3 | Google Cloud › Credentials | customer-app Google Sign-In + server verify |
| Firebase configs — `google-services.json` ×3, `GoogleService-Info.plist` ×3 | Firebase › Project settings | native builds |

---

## 2. Phase 1 — repo rename — ✅ DONE (branch `feat/platform-hardening`)

All identifiers moved to `in.localsell.*`. Placeholder markers
(`REPLACE_WITH_LOCALSELL_*`) mark every spot Phase 2 fills with a real value.

- [x] **Customer `app.config.js`** — bundle id / package / `scheme: 'localsell'`
      / `slug` / App Group / widget entitlements; `appleTeamId` →
      `process.env.APPLE_TEAM_ID` fallback placeholder; Maps key literal → placeholder;
      iOS OAuth reversed-client-id → placeholder; removed `extra.eas`; `version`
      `1.0.0`, `versionCode` 1; `runtimeVersion.policy` `sdkVersion` → `appVersion`.
- [x] **Customer source** — `src/routes/index.js` (prefixes + `localsell.in`
      universal-link hosts), `src/components/Update/ForceUpdate.js` (Play URL →
      `in.localsell.customer`, App Store URL → placeholder),
      `src/utils/liveActivityService.js` (`appGroupId` / `appScheme`),
      `plugins/with-rider-call-handler.js` (scheme), `targets/widget/*`
      (bundle id, `generated.entitlements`, `WidgetLiveActivity.swift` scheme),
      `src/screens/Login/useLogin.js` (demo email), `package.json` `name`.
- [x] **Store `app.json`** — bundle id / package / scheme / slug; removed
      `extra.eas` + `owner`; `version` `1.0.0`, `versionCode` 1.
- [x] **Rider `app.config.js`** — bundle id / package / scheme / slug; removed
      `owner` + `extra.eas`; Maps key literal → placeholder; dropped `sentry-expo`
      dep + `upload-sourcemaps` script; `version` `1.0.0`, `versionCode` 1.
- [x] **Deleted `eas.json`** in all three.
- [x] **`google-services.json` / `GoogleService-Info.plist`** — `package_name` /
      `BUNDLE_ID` swapped to the new IDs so `expo prebuild` still matches. The
      project is still `enatega-b7cd2` — **whole files replaced in Phase 2**;
      Firebase-backed features (push) won't work until then.
- [x] **Env plumbing** — `.env.production.example` committed per app; `.gitignore`
      updated to ignore `.env.production` / `.env.staging`. Build scripts source
      `.env.production` (§3).
- [x] Verified: `npx expo config --type prebuild` resolves clean for all three.

**`expo-updates` URL + `runtimeVersion: fingerprint`** are **deferred to Phase 4**
(no point pointing at a server that doesn't exist). `expo-updates` stays inert
(plugin present, no `url`) until then.

### Deferred (separate "brand copy" cleanup — not identifiers)
- `translations/*.js` (customer) still say "Enatega" in some locale strings.
- AsyncStorage keys `enatega-language` / `enatega-live-activity-session-v2`
  (customer) and `enatega-language` (store/rider) — internal keys, harmless;
  new bundle ids = fresh installs so no migration needed if/when renamed.
- Widget Xcode asset catalogs `EnategaLogo` / `EnategaRider` +
  `logoResourceName` / `riderResourceName`.
- `next.config.mjs` (web/admin) image-host allowlist still lists `enatega.com`.

---

## 3. Phase 2 — wire the new services — ▶ NEARLY DONE (2026-09-08)

**Console step-by-step + the exact handoff list is in
[`APP_CONSOLE_SETUP.md`](APP_CONSOLE_SETUP.md); live status + collected values in
[`PHASE2_CHECKLIST.md`](PHASE2_CHECKLIST.md).** The summary below stays here
for the overview; do the clicking from that runbook.

Real credentials from Phase 0 into the renamed repo.

**Done:** 5 Apple identifiers + APNs key (`XN97C422B2`), Team ID `4P8YMA54XH`,
3 ASC apps (customer `6809771171` / store `6809771443` / rider `6809771948`),
Firebase project `localsell-bf57a` (#`399972178830`) with 6 app registrations,
all 6 config files replaced in the repo, 2 Maps keys, OAuth consent + Web
(`…boo20gq9…`) + iOS (`…hrdsfr2h…`) clients, `.env.production` ×3 written,
`app.config.js` + `ForceUpdate.js` de-placeholdered, all 3 `expo config`
re-verified. **Left:** upload the `.p8` in Firebase Cloud Messaging (×3 iOS
apps); create the 3 Play Console app shells. Android OAuth client + all SHA-1
restrictions are Phase 3.

### Firebase

- [ ] In Firebase `localsell` › add **6 apps**: Android + iOS for each of
      `in.localsell.customer`, `in.localsell.store`, `in.localsell.rider`.
- [ ] Download and commit the **new** `google-services.json` (×3) and
      `GoogleService-Info.plist` (×3), replacing the `enatega-b7cd2` ones. Also
      overwrite `<app>/android/app/google-services.json`.
- [ ] Firebase › Cloud Messaging › iOS — upload the **APNs `.p8`** auth key.
- [ ] For Android app-signing SHA-1/SHA-256 fingerprints, come back after §4
      (keystores) and add them to each Firebase Android app.

### Google Maps / APIs

- [ ] Create **Android** Maps key — restrict to the 3 package names + their
      signing-cert SHA-1s (add SHA-1s after §4).
- [ ] Create **iOS** Maps key — restrict to the 3 bundle IDs.
- [ ] Put them in each app's `.env.production` (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID`
      / `_IOS`) and update the literal fallback in the three configs.
- [ ] Confirm the **server** Maps key (in DB `Configuration.googleMapsApiKey`)
      still works for the API `/maps/*` proxy — unchanged.

### Google Sign-In (customer app only)

- [ ] OAuth consent screen for the `localsell` project (External, verified
      domain `localsell.in`).
- [ ] **Web** OAuth client → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (also used by the
      API to verify Google id tokens — see §6).
- [ ] **iOS** OAuth client (bundle `in.localsell.customer`) →
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + set the reversed id in
      `app.config.js` `CFBundleURLTypes`.
- [ ] **Android** OAuth client (package + release SHA-1, after §4) →
      `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

### Apple

- [ ] Apple Developer › Identifiers › register **App IDs**:
      `in.localsell.customer` (+ `…​.orderActivity` for the widget),
      `in.localsell.store`, `in.localsell.rider`.
- [ ] Capabilities per App ID: **Push Notifications** (all 3);
      **App Groups** `group.in.localsell.customer.shared` (customer + widget);
      **Sign in with Apple** (customer); **Associated Domains**
      `applinks:localsell.in` (customer, optional).
- [ ] **App Group** identifier `group.in.localsell.customer.shared`.
- [ ] **Sign in with Apple** — a Services ID + key if you also do web; for
      native-only, the App ID capability is enough.
- [ ] App Store Connect › create **3 apps** with the new bundle IDs. Record the
      new **ASC app IDs** → put into `ForceUpdate.js` (customer) and remove the
      stale `eas.json` submit blocks (already deleted).

---

## 4. Phase 3 — local Android build pipeline

We stay **Continuous Native Generation** (managed): `android/` stays
git-ignored, regenerated by `expo prebuild` on each build. Config plugins carry
all native changes.

- [ ] Install toolchain on the build machine: **JDK 17**, **Android SDK**
      (cmdline-tools + platform 35 + build-tools), Node 20.16.0. `ANDROID_HOME`
      set.
- [ ] **Generate an upload keystore per app** (keep the 3 `.jks` files in the
      ops vault, never git):
      ```bash
      keytool -genkeypair -v -keystore localsell-customer-upload.jks \
        -alias upload -keyalg RSA -keysize 2048 -validity 10000
      ```
- [ ] Store keystore creds outside the repo — `~/.gradle/gradle.properties`:
      ```properties
      LOCALSELL_CUSTOMER_UPLOAD_STORE_FILE=/secure/localsell-customer-upload.jks
      LOCALSELL_CUSTOMER_UPLOAD_KEY_ALIAS=upload
      LOCALSELL_CUSTOMER_UPLOAD_STORE_PASSWORD=…
      LOCALSELL_CUSTOMER_UPLOAD_KEY_PASSWORD=…
      ```
- [ ] Add a **config plugin** (`plugins/with-release-signing.js`) per app, or a
      committed `android/app/build.gradle` patch via `expo-build-properties`,
      that wires `signingConfigs.release` to those gradle properties. (A small
      `withAppBuildGradle` plugin is the CNG-friendly way.)
- [ ] Print each keystore's **SHA-1 / SHA-256** →
      `keytool -list -v -keystore …` → register in Firebase (Android app),
      Google Cloud (Android OAuth client + Android Maps key restriction).
- [ ] **Build script** `scripts/build-android.sh <app> <profile>`:
      ```bash
      set -euo pipefail
      cd "localsell-$1"
      set -a; . ./.env.production; set +a
      npx expo prebuild --clean -p android
      cd android
      ./gradlew bundleRelease          # .aab for Play
      ./gradlew assembleRelease        # .apk for side-load / QA
      ```
- [ ] First build of each app → install the APK on a device →
      verify: boots, points at `api.localsell.in`, login works, maps render,
      (customer) Google Sign-In works.
- [ ] Enrol each app in **Play App Signing** on first upload; add the
      Play-managed signing SHA-1 back into Firebase + Google Cloud.

---

## 5. Phase 4 — local iOS build pipeline (Mac required)

- [ ] Mac with **Xcode 26** (matches the old `eas.json` image), CocoaPods, the
      new Apple Developer account added in Xcode › Settings › Accounts.
- [ ] **Build script** `scripts/build-ios.sh <app>`:
      ```bash
      set -euo pipefail
      cd "localsell-$1"
      set -a; . ./.env.production; set +a
      npx expo prebuild --clean -p ios
      cd ios && pod install
      ```
      then open `ios/*.xcworkspace` in Xcode.
- [ ] Xcode signing: **Automatic** with the new Team, or manual with
      App Store provisioning profiles per bundle ID. Confirm entitlements
      (App Groups, Push, Sign in with Apple, Associated Domains) resolve.
- [ ] `@bacons/apple-targets` widget (customer) — its target needs its own
      profile for `in.localsell.customer.orderActivity` + the App Group.
- [ ] Product › Archive → Distribute App → App Store Connect → upload.
- [ ] TestFlight internal test each app end-to-end before external review.
- [ ] `plugins/withFmtConstevalFix` (customer) — keep; it's the Xcode 26 build fix.

---

## 6. Phase 5 — self-hosted OTA (`expo-updates`)

- [ ] Deploy an update server. Recommended: the open-source
      **`expo/custom-expo-updates-server`** (Next.js reference impl) next to the
      API — `updates.localsell.in`, reverse-proxied by Apache like the others.
      Storage: local disk or an S3-compatible bucket.
- [ ] **Code-signing** so the client only accepts our updates:
      ```bash
      npx expo-updates codesigning:generate --key-output-dir keys \
        --certificate-output-dir certs --certificate-common-name LocalSell
      npx expo-updates codesigning:configure --certificate-input-dir certs \
        --key-input-dir keys
      ```
      (per app; commit the certificate, vault the private key).
- [ ] `updates.url` in each config → the server's per-app manifest endpoint;
      `runtimeVersion.policy: 'fingerprint'` so an OTA only lands on a binary
      with matching native code.
- [ ] **Publish flow** (replaces `eas update`):
      ```bash
      cd localsell-<app>
      set -a; . ./.env.production; set +a
      npx expo export --platform android --platform ios
      # upload dist/ to the update server under this runtimeVersion + channel
      ./scripts/publish-ota.sh <app> production
      ```
- [ ] Test: ship a JS-only change, confirm an installed build pulls it on next
      launch; confirm a native change bumps the fingerprint and is *not* served
      to the old binary.

---

## 7. Phase 6 — store listings & submission

**Google Play** (per app):
- [ ] Create the app, pick category, content rating questionnaire, **Data
      safety** form, target audience, privacy-policy URL (`localsell.in/privacy`).
- [ ] Store listing: title, short/full description, feature graphic, phone +
      tablet screenshots, app icon (512).
- [ ] Upload the `.aab` to **Internal testing** → **Closed** → **Production**.
- [ ] Store/rider apps: consider **Internal app sharing** or an unlisted track
      for partners instead of public production.

**Apple App Store** (per app):
- [ ] App privacy "nutrition labels", age rating, category, privacy-policy URL.
- [ ] Screenshots (6.7", 6.5", iPad if `supportsTablet`), description, keywords,
      support URL.
- [ ] Submit from TestFlight build → App Review. Expect questions on
      background location (rider), Bluetooth (store printer), account deletion
      (all — the in-app `Deactivate` covers Apple's delete-account rule; link it
      in the review notes).

---

## 8. Server-side follow-ups (`localsell-api`)

Not blocking the builds, but needed for full feature parity:

- [ ] **Mobile push is not implemented server-side** — `sendNotificationUser`
      only writes in-app `webNotification` rows; `notificationToken` is stored
      but never delivered. When push is wanted: add an FCM v1 sender
      (service-account JSON from the new Firebase project) keyed off
      `User.notificationToken`. iOS rides FCM once the APNs `.p8` is uploaded.
- [ ] **Harden Google login** — `login(type:"google")` currently trusts the
      client-supplied identifier (`user.resolvers.ts` comment). Verify the
      `idToken` against the new **Web** OAuth client id server-side.
- [ ] **Deep links** — if using Associated Domains / App Links, host
      `https://localsell.in/.well-known/apple-app-site-association` (Team ID +
      `in.localsell.customer`) and `/.well-known/assetlinks.json` (package +
      release SHA-256).
- [ ] **Force-update thresholds** — confirm where `ForceUpdate.js` reads its min
      version (Configuration row?) and set sane values.
- [ ] `next.config.mjs` (web + admin) still allowlists `enatega.com` /
      `assets.enatega.com` / `aws-server-v2.enatega.com` image hosts — prune to
      `localsell.in` / `api.localsell.in` once no seed data references them.

---

## 9. Per-release checklist (repeatable, once the pipeline exists)

**Native release (store submission):**
1. Bump `version` + `android.versionCode` / iOS build number.
2. `./scripts/build-android.sh <app> production` → `.aab` → Play.
3. `./scripts/build-ios.sh <app>` → Xcode Archive → App Store Connect → TestFlight → submit.
4. Tag `git tag <app>-vX.Y.Z`.

**JS-only hot-fix (no store review):**
1. `./scripts/publish-ota.sh <app> production` — lands on next app launch.
2. Only works when native code / `runtimeVersion` fingerprint is unchanged.

---

## 10. Open items / risks

- **Mac availability** for iOS builds & OTA `expo export` of the iOS bundle —
  confirm there is one, or iOS slips to a later phase.
- **`@bacons/apple-targets`** (customer Live Activity widget) is the fiddliest
  part of the iOS build — its target needs matching bundle id + App Group +
  provisioning. Budget time.
- **Firebase project** is shared by all 3 apps today; the new one must have all
  6 app registrations before any `prebuild` with the new files.
- **Play/Apple review** for the rider app's **background location** and the
  store app's **Bluetooth** printer usage — write clear justifications.
- Apple **account-deletion** requirement — the `Deactivate` mutation exists;
  make sure the customer app surfaces it and the review notes point to it.
- `expo-updates` **`fingerprint`** runtime policy is stricter than the current
  `sdkVersion` — every native dependency change forces a new binary. That's
  correct behaviour, just a workflow change from "OTA everything".
