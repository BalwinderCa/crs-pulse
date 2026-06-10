# CRS Pulse

Express Entry tracker for Canada immigration applicants. Calculate your CRS score, follow live IRCC draws, view trends, and get push alerts when new draws are published.

No accounts. No self-hosted backend. Profile data stays on your device.

## Features

- **CRS calculator** — official IRCC scoring formula
- **Live draws** — fetched directly from the IRCC public JSON feed
- **Trends & analytics** — cutoff averages, charts, and trends computed on-device
- **Application timeline** — track milestones locally
- **Push notifications** — Cloudflare Worker polls IRCC every 15 minutes and sends Expo push when a new draw appears

## Architecture

| Feature | Source |
|---------|--------|
| Draws | Mobile app → [IRCC JSON feed](https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json) |
| Trends | Computed on-device from cached draws |
| Push alerts | [Cloudflare Worker](workers/push/) → Expo Push API |

```
mobile/          Expo React Native app
workers/push/    Cloudflare Worker (KV + cron)
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

Privacy policy: [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) — host at `https://crspulse.app/privacy` for Play Store.

Run on a device or simulator:

```bash
npm run ios
npm run android
```

Push notifications require a **physical device** (not simulator).

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
```

Verify:

```bash
curl https://crs-pulse-push.balwinderxcode.workers.dev/health
```

### Worker API

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| POST | `/register` | `{ "token": "ExponentPushToken[...]", "platform": "ios" \| "android" }` |
| DELETE | `/revoke` | `{ "token": "ExponentPushToken[...]" }` |
| POST | `/sync` | optional `Authorization: Bearer SYNC_SECRET` |

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
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |

### Push worker (`workers/push/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Local worker at `:8787` |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run tail` | Stream live logs |

## Production builds

```bash
cd mobile
eas login
eas build:configure
eas build --platform android --profile production
eas build --platform ios --profile production
```

`EXPO_PUBLIC_PUSH_URL` is set in `mobile/eas.json` for preview and production profiles.

## Project structure

```
express-entry-calculator/
├── mobile/
│   ├── src/
│   │   ├── features/       # Screens (dashboard, draws, analytics, profile, timeline)
│   │   ├── store/          # Zustand stores (profile, draws, timeline)
│   │   ├── services/       # pushService
│   │   └── navigation/
│   └── app.json
├── workers/push/
│   └── src/index.ts        # IRCC poll + Expo push
```

## Privacy

All CRS inputs and profile settings are stored locally on the device. The push worker only stores anonymous Expo device tokens — no personal immigration data is sent to any server.

## License

Private project.
