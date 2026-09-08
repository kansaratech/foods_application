# Phase 2 — Console setup runbook

Everything that has to be created **inside** the LocalSell accounts, and exactly
where each resulting value goes in the repo. Work top to bottom. At the end,
hand the **§7 handoff list** back and the repo wiring is finished in one pass.

Parent accounts (Phase 0) are assumed present: Apple Developer org, Google Play
Console, Google Cloud project `localsell`, Firebase project `localsell`, APNs
`.p8`.

New identifiers (from Phase 1):

| app | bundle id / package | scheme |
|---|---|---|
| customer | `in.localsell.customer` | `localsell` |
| store | `in.localsell.store` | `localsell-store` |
| rider | `in.localsell.rider` | `localsell-rider` |

---

## 1. Apple Developer — App IDs, capabilities, App Group

Portal: <https://developer.apple.com/account/resources>

### 1a. App Group

Identifiers › **App Groups** › `+`
- Description: `LocalSell Customer Shared`
- Identifier: **`group.in.localsell.customer.shared`**

### 1b. App IDs (Identifiers › App IDs › `+` › App)

| Description | Bundle ID | Capabilities to tick |
|---|---|---|
| LocalSell Customer | `in.localsell.customer` | Push Notifications · App Groups (→ `group.in.localsell.customer.shared`) · Sign In with Apple · Associated Domains¹ |
| LocalSell Customer — Order Activity | `in.localsell.customer.orderActivity` | App Groups (→ same group) |
| LocalSell Store | `in.localsell.store` | Push Notifications |
| LocalSell Rider | `in.localsell.rider` | Push Notifications |

¹ Associated Domains only if you want `localsell.in` links to open the app —
see §6 (optional, can add later).

### 1c. APNs key

Keys › you already have the `.p8`. Note the **Key ID** and keep the file — it's
uploaded to Firebase in §2c, not to the repo.

### 1d. Team ID

Membership details › **Team ID** (10 chars). → handoff `APPLE_TEAM_ID`.

> Provisioning profiles: not needed now. Xcode "Automatic signing" with the Team
> selected creates them at build time in Phase 4.

---

## 2. Firebase — register 6 apps, download configs

Console: <https://console.firebase.google.com> › project **`localsell`** ›
Project settings (gear) › **Your apps**.

### 2a. Android apps (`Add app` › Android)

| Package name | App nickname | Debug SHA-1 |
|---|---|---|
| `in.localsell.customer` | LocalSell Customer (Android) | *(add release SHA-1 in Phase 3)* |
| `in.localsell.store` | LocalSell Store (Android) | — |
| `in.localsell.rider` | LocalSell Rider (Android) | — |

Download **`google-services.json`** for each → they go to:

| file in repo | from Firebase app |
|---|---|
| `localsell-app/google-services.json` | `in.localsell.customer` |
| `localsell-store/google-services.json` | `in.localsell.store` |
| `localsell-rider/google-services.json` | `in.localsell.rider` |

> These **overwrite** the Phase-1 placeholder files (which still point at
> `enatega-b7cd2`). Do not merge — replace wholesale.

### 2b. iOS apps (`Add app` › iOS)

| Bundle ID | App nickname |
|---|---|
| `in.localsell.customer` | LocalSell Customer (iOS) |
| `in.localsell.store` | LocalSell Store (iOS) |
| `in.localsell.rider` | LocalSell Rider (iOS) |

Download **`GoogleService-Info.plist`** for each:

| file in repo | from Firebase app | notes |
|---|---|---|
| `localsell-app/GoogleService-Info.plist` | `in.localsell.customer` | required — customer app has `@react-native-firebase` |
| `localsell-store/GoogleService-Info.plist` | `in.localsell.store` | keep for Phase 8 (store iOS push); not referenced by the config yet |
| `localsell-rider/GoogleService-Info.plist` | `in.localsell.rider` | same |

### 2c. Cloud Messaging — APNs

Project settings › **Cloud Messaging** › Apple app configuration → upload the
APNs **`.p8`** auth key + Key ID + Team ID, for **all three** iOS apps.

### 2d. Note the project number / sender id

Project settings › General › **Project number** → this is the FCM sender id,
used by the server in Phase 8.

---

## 3. Google Cloud — Maps keys + OAuth clients

Console: <https://console.cloud.google.com> › project **`localsell`**.

### 3a. Enable APIs (APIs & Services › Library) — if not already

Maps SDK for Android · Maps SDK for iOS · Maps JavaScript API · Places API ·
Geocoding API · Directions API.

### 3b. Maps SDK keys (APIs & Services › Credentials › `+ Create credentials` › API key)

| Key name | Application restriction | API restriction |
|---|---|---|
| `LocalSell Maps — Android` | Android apps: add `in.localsell.customer`, `in.localsell.store`, `in.localsell.rider`, each with its release signing SHA-1 (Phase 3) — for now add the debug SHA-1 so dev builds work | Maps SDK for Android |
| `LocalSell Maps — iOS` | iOS apps: `in.localsell.customer`, `in.localsell.store`, `in.localsell.rider` | Maps SDK for iOS |

→ handoff `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID` and `_IOS` (same value in
all three apps' `.env.production`).

> The **server** Maps key (in DB `Configuration.googleMapsApiKey`, IP-restricted)
> is separate and already working — don't touch it.

### 3c. OAuth consent screen (APIs & Services › OAuth consent screen)

- User type: **External** · Publishing status: in production once verified
- App name `LocalSell`, support email, authorised domain **`localsell.in`**,
  logo, privacy policy `https://localsell.in/privacy`, terms `https://localsell.in/terms`
- Scopes: `openid`, `email`, `profile` (the defaults) — nothing sensitive

### 3d. OAuth 2.0 client IDs (Credentials › `+ Create credentials` › OAuth client ID)

Only the **customer** app does Google Sign-In. Create:

| Type | Settings | Repo target |
|---|---|---|
| **Web application** | name `LocalSell Web (Google Sign-In)`; no redirect URIs needed for native SDK | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` **and** server `GOOGLE_WEB_CLIENT_ID` (§5 / Phase 8) |
| **iOS** | bundle id `in.localsell.customer` | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; its reversed form → `EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID` |
| **Android** | package `in.localsell.customer` + release signing SHA-1 (Phase 3; add debug SHA-1 now) | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |

> `@react-native-google-signin` uses the **Web** client id as its `webClientId`
> and the platform client ids for the native handshake. The reversed iOS client
> id (`com.googleusercontent.apps.NNN-hash`) is the iOS URL scheme — it replaces
> the `REPLACE_WITH_LOCALSELL_IOS_OAUTH_REVERSED` placeholder in
> `localsell-app/app.config.js`.

### 3e. Play service account (optional, for scripted uploads)

IAM & Admin › Service Accounts › create `play-publisher@localsell…`, grant it
access in Play Console › Users and permissions. Download JSON →
`localsell-app/google-service-account.json` etc. (git-ignored). Skip for the
first manual upload.

---

## 4. App Store Connect — app records

<https://appstoreconnect.apple.com> › My Apps › `+` › New App, once per app:

| Name | Bundle ID | SKU | Primary language |
|---|---|---|---|
| LocalSell | `in.localsell.customer` | `localsell-customer` | English (India) |
| LocalSell Store | `in.localsell.store` | `localsell-store` | English (India) |
| LocalSell Rider | `in.localsell.rider` | `localsell-rider` | English (India) |

After creation, each app's **Apple ID** (a 10-digit number, App Information ›
General) → handoff. The customer one replaces
`REPLACE_WITH_LOCALSELL_ASC_APP_ID` in `ForceUpdate.js`.

---

## 5. Google Play Console — app records

<https://play.google.com/console> › Create app, once per app (name, default
language English (India), App/Game = App, Free). Package name is fixed on the
first upload (Phase 3), so nothing to note here yet — just create the shells so
the store listings can be drafted in parallel.

For the store & rider partner apps decide now: **public production** vs a
**closed/internal track** only (recommended for partners).

---

## 6. Deep links (optional — universal / app links)

Only if `localsell.in` links should open the customer app. Needs the web server
to serve two files at `https://localsell.in/.well-known/`:

- `apple-app-site-association` (no extension, `Content-Type: application/json`):
  `{"applinks":{"apps":[],"details":[{"appID":"<TEAMID>.in.localsell.customer","paths":["/order-tracking*","/auth/reset*"]}]}}`
- `assetlinks.json`:
  `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"in.localsell.customer","sha256_cert_fingerprints":["<RELEASE SHA-256>"]}}]`

Then add `Associated Domains` = `applinks:localsell.in` to the customer iOS App
ID (§1b) and an `intentFilter` with `autoVerify` to `app.config.js`. **Defer to
after the first build** — needs the release SHA-256.

---

## 7. Handoff list — paste these back

Once §1–5 are done, reply with:

```
APPLE_TEAM_ID                     = __________ (10 chars)

# Google Maps (one Android + one iOS key, shared by all 3 apps)
MAPS_KEY_ANDROID                  = AIza__________
MAPS_KEY_IOS                      = AIza__________

# Customer-app Google Sign-In (Google Cloud OAuth clients)
GOOGLE_WEB_CLIENT_ID             = __________.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID         = __________.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID             = __________.apps.googleusercontent.com
GOOGLE_IOS_REVERSED_CLIENT_ID    = com.googleusercontent.apps.__________

# App Store Connect Apple IDs
ASC_APP_ID_CUSTOMER             = __________ (10 digits)
ASC_APP_ID_STORE               = __________
ASC_APP_ID_RIDER               = __________

# Firebase
FIREBASE_PROJECT_NUMBER         = __________ (FCM sender id)
```

and drop the downloaded files into place:

```
localsell-app/google-services.json          (in.localsell.customer, Android)
localsell-app/GoogleService-Info.plist       (in.localsell.customer, iOS)
localsell-store/google-services.json         (in.localsell.store, Android)
localsell-store/GoogleService-Info.plist     (in.localsell.store, iOS — for Phase 8)
localsell-rider/google-services.json         (in.localsell.rider, Android)
localsell-rider/GoogleService-Info.plist     (in.localsell.rider, iOS — for Phase 8)
```

### Then Claude wires (Phase 2 repo pass):

- fills `.env.production` in each app from the values above
- replaces `REPLACE_WITH_LOCALSELL_IOS_OAUTH_REVERSED` in `localsell-app/app.config.js`
- replaces `REPLACE_WITH_LOCALSELL_ASC_APP_ID` in `localsell-app/src/components/Update/ForceUpdate.js`
- adds `localsell-store/GoogleService-Info.plist` / rider to their configs' `ios.googleServicesFile` (commented, ready for Phase 8) or leaves as-is
- `npx expo config --type prebuild` re-verify, commit `chore(apps): wire LocalSell services (Phase 2)`
- Phase 3 (local Android build + keystores) can then start; its release SHA-1 /
  SHA-256 get added back into Firebase (§2a), the Maps Android key (§3b) and the
  Android OAuth client (§3d).

---

## Notes / gotchas

- **`.env.production` is git-ignored** — the real keys never get committed. The
  `.env.production.example` files are the committed templates.
- The **customer app will not boot** on device until `localsell-app/google-services.json`
  + `GoogleService-Info.plist` are the real files (it has `@react-native-firebase`
  which throws on a mismatched config).
- Maps **Android** key restriction needs the **release** signing SHA-1, which
  doesn't exist until Phase 3. Add the **debug** SHA-1 now
  (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey
  -storepass android`) so `expo run:android` works meanwhile; add the release
  SHA-1 after the keystore is generated.
- Push notifications are **not sent by the server yet** (Phase 8) — registering
  the FCM/APNs plumbing now just unblocks the builds and future work.
