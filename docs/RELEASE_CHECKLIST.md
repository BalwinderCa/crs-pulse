# CRS Pulse — Release Checklist

## Pre-build

- [ ] `cd mobile && eas init` — set `EAS_PROJECT_ID` in `.env.local` and EAS secrets
- [ ] `wrangler secret put PUSH_API_SECRET` — set same value as `EXPO_PUBLIC_PUSH_API_KEY` in EAS secrets
- [ ] `wrangler secret put SYNC_SECRET` — for manual `/sync` only
- [ ] `cd workers/push && npm run deploy`
- [ ] `google-play-service-account.json` in `mobile/` (gitignored) for `eas submit`

## Android push (FCM V1) — required for notifications

- [ ] Create a Firebase project and add an Android app with package `com.crspulse.app`
- [ ] Download the real `google-services.json` (replace the placeholder in `mobile/`)
- [ ] Upload it to EAS as a file env var: `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production`
- [ ] Firebase Console → Project settings → Cloud Messaging → generate an FCM **service account key**, then upload: `eas credentials` → Android → Google Service Account → FCM V1
- [ ] Rebuild after wiring credentials (FCM config is baked in at build time)

## Play Console

- [ ] Privacy policy URL: `https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md`
- [ ] Data safety: device-stored CRS data; optional push token to Cloudflare Worker
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
