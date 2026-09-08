# Phase 2 — working checklist

Tick these off as you go. Ordered so nothing blocks on something below it.
Full context for any step is in [`APP_CONSOLE_SETUP.md`](APP_CONSOLE_SETUP.md).

**Identifiers** (fixed, from Phase 1):

| app | bundle id / package | iOS App Group |
|---|---|---|
| customer | `in.localsell.customer` | `group.in.localsell.customer.shared` |
| customer widget | `in.localsell.customer.orderActivity` | (same group) |
| store | `in.localsell.store` | — |
| rider | `in.localsell.rider` | — |

**Scope decision baked in:** Android **OAuth client** and **release-SHA Maps
restriction** are deferred to Phase 3 (they need the release keystore that
doesn't exist yet). Phase 2 does Web + iOS OAuth and an API-only Maps Android
key. Google Sign-In on Android dev builds won't work until Phase 3 — fine.

---

## Block A — Apple Developer

<https://developer.apple.com/account/resources/identifiers/list>

- [ ] **A1** — Identifiers › **App Groups** › `+` → identifier
      `group.in.localsell.customer.shared`, description "LocalSell Customer Shared"
- [ ] **A2** — Identifiers › **App IDs** › `+` › App →
      `in.localsell.customer` ("LocalSell Customer"). Tick: **Push Notifications**,
      **App Groups** (assign `group.in.localsell.customer.shared`),
      **Sign In with Apple**. Save.
- [ ] **A3** — App ID `in.localsell.customer.orderActivity`
      ("LocalSell Customer Order Activity"). Tick: **App Groups**
      (assign the same group). Save.
- [ ] **A4** — App ID `in.localsell.store` ("LocalSell Store"). Tick:
      **Push Notifications**. Save.
- [ ] **A5** — App ID `in.localsell.rider` ("LocalSell Rider"). Tick:
      **Push Notifications**. Save.
- [ ] **A6** — Membership (left nav) → copy the **Team ID** (10 chars).
      → record as `APPLE_TEAM_ID`
- [ ] **A7** — Keys → confirm the APNs Auth Key `.p8` is downloadable / on file,
      note its **Key ID** (needed in C7, not the repo).

---

## Block B — App Store Connect

<https://appstoreconnect.apple.com/apps>

- [ ] **B1** — `+` › New App → Name **LocalSell**, Platform iOS, Bundle ID
      `in.localsell.customer`, SKU `localsell-customer`, Primary language
      **English (India)**. Create.
- [ ] **B2** — New App → **LocalSell Store**, Bundle ID `in.localsell.store`,
      SKU `localsell-store`.
- [ ] **B3** — New App → **LocalSell Rider**, Bundle ID `in.localsell.rider`,
      SKU `localsell-rider`.
- [ ] **B4** — Open each app › App Information › General Information → copy the
      **Apple ID** (10-digit number).
      → record `ASC_APP_ID_CUSTOMER`, `ASC_APP_ID_STORE`, `ASC_APP_ID_RIDER`

> If a Bundle ID doesn't appear in the dropdown, wait a few minutes after
> Block A — Apple takes time to propagate new App IDs to ASC.

---

## Block C — Firebase

<https://console.firebase.google.com> → project **`localsell`** → ⚙ Project
settings → **Your apps**.

- [ ] **C1** — Add app › **Android** → package `in.localsell.customer`,
      nickname "LocalSell Customer (Android)". Register. **Download
      `google-services.json`** → save as `localsell-app/google-services.json`
      (overwrite the placeholder).
- [ ] **C2** — Add app › Android → `in.localsell.store` →
      `localsell-store/google-services.json`
- [ ] **C3** — Add app › Android → `in.localsell.rider` →
      `localsell-rider/google-services.json`
- [ ] **C4** — Add app › **iOS** → bundle `in.localsell.customer`,
      nickname "LocalSell Customer (iOS)". Register. **Download
      `GoogleService-Info.plist`** → save as
      `localsell-app/GoogleService-Info.plist` (overwrite the placeholder).
- [ ] **C5** — Add app › iOS → `in.localsell.store` →
      `localsell-store/GoogleService-Info.plist` (new file — kept for Phase 8)
- [ ] **C6** — Add app › iOS → `in.localsell.rider` →
      `localsell-rider/GoogleService-Info.plist` (new file — kept for Phase 8)
- [ ] **C7** — Project settings › **Cloud Messaging** tab → under each of the
      3 iOS apps, "APNs Authentication Key" → **Upload** the `.p8` + Key ID +
      Team ID. (One upload can cover all 3 if same key.)
- [ ] **C8** — Project settings › General → copy **Project number**.
      → record `FIREBASE_PROJECT_NUMBER`

**6 files now in place:**
```
localsell-app/google-services.json          localsell-app/GoogleService-Info.plist
localsell-store/google-services.json         localsell-store/GoogleService-Info.plist
localsell-rider/google-services.json         localsell-rider/GoogleService-Info.plist
```

---

## Block D — Google Cloud

<https://console.cloud.google.com> → project **`localsell`**.

- [ ] **D1** — APIs & Services › **Library** → confirm **Enabled** (enable if
      not): Maps SDK for Android, Maps SDK for iOS, Maps JavaScript API,
      Places API, Geocoding API, Directions API.
- [ ] **D2** — APIs & Services › **Credentials** › `+ Create credentials` ›
      **API key**. Rename to `LocalSell Maps — Android`. Edit →
      **API restrictions**: "Restrict key" → **Maps SDK for Android**.
      **Application restrictions**: leave **None** for now (locked down in
      Phase 3 with the release SHA-1). Save.
      → record `MAPS_KEY_ANDROID`
- [ ] **D3** — `+ Create credentials` › API key → `LocalSell Maps — iOS`.
      API restrictions → **Maps SDK for iOS**. Application restrictions →
      **iOS apps** → add bundle IDs `in.localsell.customer`,
      `in.localsell.store`, `in.localsell.rider`. Save.
      → record `MAPS_KEY_IOS`
- [ ] **D4** — APIs & Services › **OAuth consent screen** →
      User type **External** → App name **LocalSell**, user support email,
      App logo, **Authorised domain** `localsell.in`, Developer contact email.
      App domain links: home `https://localsell.in`, privacy
      `https://localsell.in/privacy`, terms `https://localsell.in/terms`.
      Scopes: keep defaults (`openid`, `email`, `profile`). Save. Publish →
      "In production" (or leave "Testing" + add test users for now).
- [ ] **D5** — Credentials › `+ Create credentials` › **OAuth client ID** →
      Application type **Web application**, name `LocalSell Web (Google Sign-In)`.
      No redirect URIs needed. Create.
      → record `GOOGLE_WEB_CLIENT_ID`  (`...apps.googleusercontent.com`)
- [ ] **D6** — `+ Create credentials` › OAuth client ID → type **iOS**,
      name `LocalSell Customer (iOS)`, Bundle ID `in.localsell.customer`. Create.
      → record `GOOGLE_IOS_CLIENT_ID`  and its **reversed** form
      (`com.googleusercontent.apps.NNNNN-hash`) → `GOOGLE_IOS_REVERSED_CLIENT_ID`
- [ ] **D7** — *(deferred to Phase 3)* Android OAuth client — needs the release
      keystore SHA-1. Skip.

---

## Block E — Google Play Console

<https://play.google.com/console>

- [ ] **E1** — Create app → **LocalSell**, default language English (India),
      App, Free.
- [ ] **E2** — Create app → **LocalSell Store**.
- [ ] **E3** — Create app → **LocalSell Rider**.
- [ ] **E4** — Decide track for store + rider: public production vs
      closed/internal only for partners (recommended: closed for partners).
      *(No values to record — package names lock on first upload in Phase 3.)*

---

## Block F — hand back

- [ ] **F1** — Fill this in and paste it back:

```
APPLE_TEAM_ID                  =
MAPS_KEY_ANDROID               =
MAPS_KEY_IOS                   =
GOOGLE_WEB_CLIENT_ID           =
GOOGLE_IOS_CLIENT_ID           =
GOOGLE_IOS_REVERSED_CLIENT_ID  =
ASC_APP_ID_CUSTOMER            =
ASC_APP_ID_STORE               =
ASC_APP_ID_RIDER               =
FIREBASE_PROJECT_NUMBER        =
```

- [ ] **F2** — Confirm the 6 Firebase files are saved to the paths in Block C.
      (Commit them, or tell me they're in place and I'll add them.)

### Then Claude finishes Phase 2 (one pass)

- writes `.env.production` in all 3 apps from F1
- replaces `REPLACE_WITH_LOCALSELL_IOS_OAUTH_REVERSED` in `localsell-app/app.config.js`
- replaces `REPLACE_WITH_LOCALSELL_ASC_APP_ID` in `localsell-app/src/components/Update/ForceUpdate.js`
- `npx expo config --type prebuild` re-verify on all 3
- commit `chore(apps): wire LocalSell services (Phase 2)`
- Phase 3 kicks off (JDK 17 + Android SDK, 3 release keystores, first
  `gradlew bundleRelease` per app) — and its SHA-1/SHA-256 go back into
  Firebase (C1–C3), the Maps Android key (D2 restriction), and a new Android
  OAuth client (D7).

---

## Optional now / needed later

| Item | When | Notes |
|---|---|---|
| Android OAuth client (D7) | Phase 3 | needs release keystore SHA-1 |
| Maps Android key app-restriction (D2) | Phase 3 | needs release keystore SHA-1 |
| Firebase Android SHA-1/SHA-256 (C1–C3) | Phase 3 | for App Check / Dynamic Links / Google sign-in on Android |
| Play service-account JSON | Phase 6 | only for scripted uploads; manual upload first |
| `apple-app-site-association` / `assetlinks.json` | after first build | universal / app links — optional for launch |
| Server FCM sender (push) | Phase 8 | API doesn't send push yet |
| Sentry DSNs | later | push/Sentry disabled for launch |

### If you want Google Sign-In working on Android dev builds *now*

Generate the debug keystore SHA-1 (needs JDK `keytool`):

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```
(Windows path: `%USERPROFILE%\.android\debug.keystore`; if the file is missing,
it's created by the first `expo run:android`.)

Then in D7 create an **Android** OAuth client: package `in.localsell.customer`,
paste the **SHA-1**. Record `GOOGLE_ANDROID_CLIENT_ID` and add it to F1.
