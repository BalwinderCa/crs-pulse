# CRS Pulse — Release Checklist

## Pre-build

- [ ] `cd mobile && eas init` — set `EAS_PROJECT_ID` in `.env.local` and EAS secrets
- [ ] **Push API key — never committed.** `eas.json` no longer carries a value for
      `EXPO_PUBLIC_PUSH_API_KEY`; create it as an EAS env secret so the production
      build can authenticate to the worker:
      `eas env:create --name EXPO_PUBLIC_PUSH_API_KEY --type sensitive --value "<random-strong-secret>" --environment production`
      (NOTE: `EXPO_PUBLIC_*` vars are bundled into the JS and are therefore *not*
      truly secret — they only deter casual abuse on top of the worker's per-IP
      rate limiter and Expo token validation. Rotate it if leaked.)
- [ ] `wrangler secret put PUSH_API_SECRET` — set the **same value** as the
      `EXPO_PUBLIC_PUSH_API_KEY` EAS secret above (worker rejects mismatches with 401)
- [ ] `wrangler secret put SYNC_SECRET` — for manual `/sync` only
- [ ] (optional) `wrangler secret put ALERT_EMAIL` — the cron emails this address
      once if the draw mirror goes >30 days stale (needs `RESEND_API_KEY` +
      `EMAIL_FROM`); no-op if unset
- [ ] `cd workers/push && npm run deploy`
- [ ] `google-play-service-account.json` in `mobile/` (gitignored) for `eas submit`

## Android push (FCM V1) — required for notifications

- [ ] Create a Firebase project and add an Android app with package `com.crspulse.app`
- [ ] Download the real `google-services.json` (replace the placeholder in `mobile/`)
- [ ] Upload it to EAS as a file env var: `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production`
- [ ] Firebase Console → Project settings → Cloud Messaging → generate an FCM **service account key**, then upload: `eas credentials` → Android → Google Service Account → FCM V1
- [ ] Rebuild after wiring credentials (FCM config is baked in at build time)

## Play Console

- [ ] Privacy policy URL: `https://www.crspulse.com/privacy`
- [ ] Data safety form (must match PRIVACY_POLICY.md):
  - Device-stored CRS data (not collected off-device)
  - Optional anonymous push token → Cloudflare Worker
  - **Free version only:** Google AdMob collects the **advertising ID** + app-interaction
    data for advertising ("Data shared", purpose: Advertising/Marketing). Declare
    "Yes" to data collection/sharing and to the advertising-ID question.
- [ ] Content rating (IARC): reference / immigration information
- [ ] Target API 35 (Expo SDK 52 production build)
- [ ] Store listing copy from `docs/PLAY_STORE_LISTING.md`
- [ ] Screenshots: Home calculator, Draws, Trends, Profile

## Build & submit

```bash
cd mobile
npm run build:android    # eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

## Post-release

- [ ] Verify push registration on a physical Android device
- [ ] Verify IRCC draw fetch and offline cache
- [ ] Monitor Cloudflare Worker logs: `cd workers/push && npm run tail`

## Troubleshooting (lessons learned)

- **`gradlew`: "SDK location not found"** during a local `eas build --local` → export `ANDROID_HOME` (e.g. `$HOME/Library/Android/sdk`) before building. (Raw `gradlew bundleRelease` also produces a **debug-signed** bundle Play rejects — build through EAS so the upload keystore is injected.)
- **Play upload: "Version code N has already been used"** → bump it; under `appVersionSource: remote` EAS auto-increments its own counter (the `app.config.js` value is ignored), and a failed build can still consume a number, so gaps are fine.
- **"Your advertising ID declaration … an active artifact doesn't include AD_ID":** not about the new bundle — an **older active artifact** (built before the `AD_ID` permission) is still live in some track. Retire it (roll the new build over it) rather than re-uploading. Keep the declaration "Yes" (the app uses AdMob).
- **`eas submit`: "service account is missing the necessary permissions":** grant the `google-play-service-account.json` identity _"Release apps to testing tracks"_ in Play Console → Users and permissions. The first release of a new app must be created manually in the UI. For local builds, submit with `--path <aab>` (not `--latest`).
- **In-app "Could not reach the notification service":** worker `PUSH_API_SECRET` ≠ app `EXPO_PUBLIC_PUSH_API_KEY` → `/register` returns 401. Set them equal (`eas env:list production --include-sensitive` reads the app key; `wrangler secret put PUSH_API_SECRET` aligns the worker), then toggle notifications off/on to re-register.
- **No ads after install:** banners show only in the Draws/Notifications lists (every 5th row), never for Premium, and self-hide on no-fill. New AdMob apps no-fill for hours–days; verify wiring with a dev build (test ads always fill).
