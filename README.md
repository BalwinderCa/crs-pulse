# CRS Pulse

IRCC Tracker for Canada immigration applicants. Calculate your CRS score, follow live IRCC draws, view trends, and get push alerts when new draws are published.

No accounts. No self-hosted backend. Profile data stays on your device.

## Features

- **Calculators** — CRS (official IRCC formula), FSW 67-point grid, BC PNP SIRS (200-pt), and SINP EOI (110-pt), all computed on-device
- **Live draws** — fetched directly from the IRCC public JSON feed with pull-to-refresh and category filters
- **Trends & analytics** — cutoff averages, charts, and trends (free); personal odds calculator and CRS forecast bands (premium one-time unlock)
- **Application tracker** — track the IRCC program you applied to, with live processing-time estimates from a GitHub-mirrored IRCC feed
- **Document checklists** — per-program document checklists compiled from IRCC requirements, with per-item progress tracking
- **Application timeline** — add/edit/delete milestones (ITA, AOR, Biometrics, Medical, Passport, etc.) with notes and custom entries
- **Push notifications** — Cloudflare Worker checks for new draws every 15 minutes and sends Expo push when a new draw appears
- **Premium analytics** — one-time in-app purchase unlocks personal odds gauge, EE pool forecast chart, and CRS position relative to historical cutoffs

All calculators are estimates for planning — each screen points to the official IRCC/provincial tool. Profile data stays on-device.

## Architecture

| Feature | Source |
|---------|--------|
| Draws (app) | Mobile app → [IRCC JSON feed](https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json) |
| Draws (worker) | Cloudflare Worker → GitHub Actions mirror (`data/latest-draw.json`)¹ |
| Processing times | Mobile app → GitHub Actions mirror (`data/processing-times.json`), 7-day cache |
| EE pool / levels | Mobile app → GitHub Actions mirror (`data/ee-pool.json`), 7-day cache |
| Trends & analytics | Computed on-device from cached draws + EE pool data |
| Push alerts | [Cloudflare Worker](workers/push/) → Expo Push API |
| Premium unlock | Google Play Billing (one-time managed product: `crs_pulse.analytics_unlock`) |

¹ canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520, so the worker reads the latest draw from a GitHub-hosted mirror instead of IRCC directly.

```
mobile/          Expo React Native app
workers/push/    Cloudflare Worker (KV + cron)
data/            GitHub Actions mirrors (draws, processing times, EE pool)
docs/            Privacy policy
```

## Prerequisites

- Node.js 20+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier, for push only)
- [EAS CLI](https://docs.expo.dev/build/setup/) for production builds: `npm install -g eas-cli`

## Quick start — Mobile

```bash
cd mobile
npm install
cp .env.example .env.local
npm start
```

Set in `mobile/.env.local`:

```
EXPO_PUBLIC_PUSH_URL=https://crs-pulse-push.balwinderxcode.workers.dev
```

Set your EAS project ID in `mobile/.env.local` (or EAS secrets):

```
EAS_PROJECT_ID=your-eas-project-id
```

Privacy policy: [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) — no custom domain needed. Use the GitHub URL in App Store Connect:

`https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md`

Run on a device or simulator:

```bash
npm run ios
```

Push notifications require a **physical iPhone** (not simulator).

## Push worker (Cloudflare)

The worker stores anonymous Expo push tokens and notifies subscribers when IRCC publishes a new draw.

### First-time deploy

```bash
cd workers/push
npm install
npx wrangler login

# Create KV namespaces (one-time)
npx wrangler kv namespace create TOKENS_KV
npx wrangler kv namespace create TOKENS_KV --preview
```

Paste the returned IDs into `workers/push/wrangler.toml`, then:

```bash
npm run deploy

# Required production secrets (one-time)
npx wrangler secret put PUSH_API_SECRET
npx wrangler secret put SYNC_SECRET
```

Set the same `PUSH_API_SECRET` value as `EXPO_PUBLIC_PUSH_API_KEY` in EAS secrets / `mobile/.env.local`.

Verify:

```bash
curl https://crs-pulse-push.balwinderxcode.workers.dev/health
```

### Worker API

| Method | Path | Auth | Body |
|--------|------|------|------|
| GET | `/health` | None | — |
| POST | `/register` | `Bearer PUSH_API_SECRET` | `{ "token": "ExponentPushToken[...]", "platform": "ios" \| "android" }` |
| DELETE | `/revoke` | `Bearer PUSH_API_SECRET` | `{ "token": "ExponentPushToken[...]" }` |
| POST | `/sync` | `Bearer SYNC_SECRET` | — |

Cron runs every 15 minutes after deploy.

Local dev: `npm run dev` → `http://localhost:8787`

## Scripts

### Mobile (`mobile/`)

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm test` | Run Jest tests |
| `npm run test:coverage` | Run Jest with coverage thresholds |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |

### Push worker (`workers/push/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Local worker at `:8787` |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run type-check` | TypeScript check |

## iOS App Store release

### Prerequisites

- [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/yr)
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- Privacy policy URL (GitHub, no domain required): `https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md`

### One-time setup

```bash
cd mobile
npm install
cp .env.example .env.local
eas login
eas init                    # links project, sets EAS_PROJECT_ID
```

Set in `mobile/.env.local`:

```
EAS_PROJECT_ID=your-eas-project-id
EXPO_PUBLIC_PUSH_URL=https://crs-pulse-push.balwinderxcode.workers.dev
```

### App Store Connect

1. Create app at [App Store Connect](https://appstoreconnect.apple.com) with bundle ID `com.crspulse.app`
2. Fill **App Privacy** questionnaire: profile data stored on device; optional push token sent to server; the free version uses Google AdMob — declare the advertising identifier / ad-related data collection (and "Tracking" if you serve personalized ads)
3. Set privacy policy URL: `https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md`
4. Export compliance: app uses standard HTTPS only (`ITSAppUsesNonExemptEncryption` is false)

### Push notifications (APNs)

EAS manages APNs credentials. On first iOS production build:

```bash
eas credentials --platform ios
```

Choose **Push Notifications: Manage your Apple Push Notifications Key** and let EAS create/upload the key.

### Build and submit

```bash
cd mobile
npm run build:ios           # eas build --platform ios --profile production
npm run submit:ios          # eas submit --platform ios --profile production --latest
```

First `eas submit` will prompt for `ascAppId` and `appleTeamId` if not in `eas.json`.

After the app is live, add to `.env.local` for the in-app review link:

```
EXPO_PUBLIC_APP_STORE_ID=1234567890
```

### TestFlight

Production builds with `distribution: store` go to App Store Connect automatically after submit. Add internal/external testers in TestFlight before submitting for App Review.

`EXPO_PUBLIC_PUSH_URL` is set in `mobile/eas.json` for preview and production profiles.

## Project structure

```
express-entry-calculator/
├── mobile/
│   ├── src/
│   │   ├── features/       # home, dashboard, calculators, fsw, bcpnp, sinp,
│   │   │                   #   draws, analytics, timeline, tracker, checklist,
│   │   │                   #   notifications, paywall, profile, onboarding, faq, support
│   │   ├── store/          # Zustand stores (profile, draws, timeline, application,
│   │   │                   #   premium, processingTimes, eePool)
│   │   ├── services/       # pushService, iapService, errorReporter
│   │   ├── components/     # shared UI (Card, Button, Badge, Input, SkeletonCard, etc.)
│   │   ├── hooks/          # useColors, useAccentColor, useTabBarLayout, etc.
│   │   ├── theme/          # colors, spacing, typography, shadows
│   │   ├── navigation/     # RootNavigator, MainNavigator
│   │   ├── types/          # TypeScript types (Draw, Category, RootStackParamList, etc.)
│   │   └── constants/      # STORAGE_KEYS, IAP_PRODUCTS, CATEGORY_LABELS, etc.
│   └── app.config.js
├── workers/push/
│   └── src/
│       ├── index.ts        # HTTP handlers + scheduled cron entry point
│       ├── tokenStore.ts   # KV token storage (register/revoke/list/migrate)
│       ├── expoValidate.ts # Token validation against Expo API
│       └── expoReceipts.ts # Async delivery receipt polling
├── data/
│   ├── latest-draw.json       # GitHub Actions mirror → worker reads this
│   ├── processing-times.json  # IRCC processing times mirror
│   └── ee-pool.json           # Express Entry pool + levels plan mirror
└── docs/
    └── PRIVACY_POLICY.md
```

## Privacy

All CRS inputs and profile settings are stored locally on the device. The push worker only stores anonymous Expo device tokens — no personal immigration data is sent to any server. The in-app purchase is processed entirely by Google Play; no payment data reaches us. The free version shows Google AdMob banner ads (which may collect device/ad identifiers); the one-time Premium unlock removes them.

## License

Private project.
