# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRS Pulse is a React Native (Expo) mobile app for Canadian Express Entry immigration applicants. It bundles several eligibility calculators (CRS, FSW 67-point grid, BC PNP SIRS, SINP EOI), fetches live IRCC draw results, provides analytics (a freemium split — free draw insights and Google AdMob banner ads for free users, plus a one-time in-app purchase that unlocks the personalised "Your Plan" analytics and removes ads), tracks the user's application with a milestone timeline / processing-time estimates / per-program document checklists, and delivers push notifications via a Cloudflare Worker. All user data stays on-device — only anonymous Expo push tokens are sent to the worker; the in-app purchase is processed entirely by the app store (no payment data reaches us).

The repository has two independent workspaces:
- `mobile/` — Expo React Native app
- `workers/push/` — Cloudflare Worker for polling IRCC and sending push notifications

## Commands

### Mobile (`cd mobile`)

```bash
npm run start          # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run test           # Run Jest tests
npm run test:coverage  # Enforced thresholds: critical calculators ≥95%, CRS grid ≥75%, global floor
npm run test -- --testPathPattern=<file>  # Run a single test file
npm run lint           # ESLint
npm run type-check     # TypeScript check (no emit)
```

### Cloudflare Worker (`cd workers/push`)

```bash
npm run dev            # Local worker dev server (wrangler dev)
npm run deploy         # Deploy to Cloudflare
npm run type-check     # TypeScript check (no emit)
```

### EAS Builds (from `mobile/`)

```bash
eas build --profile development --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit                                      # Submit to app stores
```

## Architecture

### Data Flow

```
GitHub Actions mirror (data/latest-draw.json) → Cloudflare Worker (every 15 min, KV cache)
                       ↓ (new draw detected)
              Expo Push Notification API
                       ↓
              Mobile App (push alert)

Mobile App → IRCC JSON feed (direct fetch, 1-hour stale cache in drawsStore)

GitHub Actions mirror (data/processing-times.json) → processingTimesStore (7-day cache)
GitHub Actions mirror (data/ee-pool.json) → eePoolStore (7-day cache)
```

The worker reads draws from a GitHub-hosted mirror (`raw.githubusercontent.com/.../data/latest-draw.json`), not IRCC directly — canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520. The mobile app still fetches the IRCC JSON feed directly.

The worker also exposes HTTP endpoints (`/register`, `/revoke`, `/health`, `/sync`) that `pushService.ts` calls to manage Expo push tokens stored in Cloudflare KV.

### Mobile State Management (Zustand + AsyncStorage)

Stores in `src/store/`:

| Store | Key State | Purpose |
|---|---|---|
| `profileStore` | `CalcInputs`, `LocalProfile` | CRS calculator inputs, theme, notifications, accent color |
| `drawsStore` | `Draw[]`, cache timestamp | IRCC draw data; refreshes with 3× exponential backoff; 1-hour cache |
| `timelineStore` | `Milestone[]` | Application timeline milestones, sorted by date |
| `applicationStore` | `TrackedApplication` | The IRCC category/type the user is tracking + applied date |
| `premiumStore` | `isPremium`, `billingAvailable`, `price` | Google Play one-time "Analytics unlock" entitlement. Play is the source of truth; the gate fails OPEN when no product is purchasable (iOS without a configured product, emulator, transient outage) |
| `processingTimesStore` | `LiveProcessingTimes` | IRCC processing times by category/type; 7-day cache with bundled fallback |
| `eePoolStore` | `EePoolData` | Express Entry pool distribution + Immigration Levels Plan; 7-day cache with bundled fallback |

These stores are persisted via `zustand/middleware` + AsyncStorage. Profile store also exports a derived `crsScore` computed from `CalcInputs`. A feature-local `src/features/notifications/store/notificationsStore.ts` tracks the last draw number seen on the notifications page (drives the header bell badge), separate from the draws store's push de-dup `LAST_SEEN_DRAW`.

### Feature Structure

Each screen area lives under `src/features/<name>/` and contains its own components, hooks, and utils co-located together. Features:

- `home` — landing screen (application tracker hub with latest draw and progress)
- `dashboard` — CRS calculator screen with score card and prediction
- `calculators` — hub linking to all calculators
- `draws` — live IRCC draws with category filters
- `analytics` — premium analytics (2 tabs: free draw trends + paid personal odds)
- `timeline` — milestone tracker with add/edit/delete
- `tracker` — application setup + IRCC processing-time estimates
- `checklist` — per-program document checklists with progress tracking
- `notifications` — draw notifications history with unread badge
- `paywall` — one-time IAP modal for analytics unlock
- `profile` — settings (the "Settings" bottom tab renders `profile`'s `ProfileScreen`)
- `onboarding` — first-time 4-slide welcome flow
- `faq` — accordion FAQ screen
- `support` — contact / report issue form
- `fsw` — Federal Skilled Worker 67-point calculator
- `bcpnp` — BC PNP SIRS 200-point calculator
- `sinp` — Saskatchewan EOI 110-point calculator

Calculator logic lives in each feature's `utils/` (each documents its IRCC/provincial source and is "estimate only"):

| Calculator | File | Notes |
|---|---|---|
| CRS | `features/onboarding/utils/crsCalculator.ts` | Official IRCC formula; all language tests (IELTS, CELPIP, PTE Core, TEF/TCF, CLB) |
| FSW 67-point | `features/fsw/utils/fswCalculator.ts` | Six selection factors, min 67 to be eligible |
| BC PNP SIRS | `features/bcpnp/utils/sirsCalculator.ts` | 200-point SIRS grid |
| SINP EOI | `features/sinp/utils/sinpCalculator.ts` | 110-point Saskatchewan EOI grid, min 60 |

Static reference data: `features/checklist/data/checklists.ts` (document checklists by program), `features/tracker/data/processingTimes.ts` (bundled IRCC processing times fallback).

### Navigation

`RootNavigator` (stack) loads all stores on boot (profile, draws, timeline, application, processing times, EE pool, premium), hides splash screen when ready, then renders `MainNavigator` (5 bottom tabs): **Home → Timeline → Draws → Analytics → Settings**. The stack also hosts pushed screens reached from menus/cards: `Onboarding`, `Calculators`, `CrsCalculator`, `SinpCalculator`, `FswCalculator`, `BcSirsCalculator`, `ApplicationSetup`, `DocumentChecklist` (hub + detail), `ProcessingTimes`, `Notifications`, `Faq`, `ReportIssue`, `Paywall` (modal).

### Theme System

`src/theme/` exports `colors` (dark/light palettes with WCAG AA contrast ratios), `spacing`, `typography`, and `shadows`. Use the `useColors()` hook to get the current theme's color palette — never hardcode colors.

### Push Worker (`workers/push/src/`)

Four source files:
- `index.ts` — HTTP handler (`/register`, `/revoke`, `/health`, `/sync`) + scheduled cron entry point
- `tokenStore.ts` — KV token storage (register/revoke/list/migrate legacy single-array format)
- `expoValidate.ts` — Validates Expo push tokens with Expo API before storing
- `expoReceipts.ts` — Polls Expo receipt API for async delivery status; revokes failed tokens

Two entry points:
- `fetch(request, env)` — HTTP handler for `/register`, `/revoke`, `/health`, and `/sync` (manual trigger)
- `scheduled(event, env)` — Cron trigger every 15 minutes; reads the GitHub draw mirror, compares to KV-cached last draw, fans out Expo push notifications if a new draw is detected

Revoked tokens are tombstoned in KV (not deleted) so legacy migrations don't resurrect them. Runs on wrangler 4. Secrets required: `PUSH_API_SECRET` (bearer token for register/revoke), `SYNC_SECRET` (manual sync auth). Optional: `RESEND_API_KEY`/`EMAIL_FROM` (email alerts) and `ALERT_EMAIL` (recipient for the stale-mirror heartbeat — the cron emails it once if the draw mirror goes >30 days stale). KV binding: `TOKENS_KV`.

## Key Conventions

### Internationalization (i18n)

All user-facing strings must use the i18next/react-i18next system. Translation keys live in `src/i18n/en.ts` and `src/i18n/fr.ts` with structural parity enforced by the `TranslationKeys` type.

- **React components:** use `const { t } = useTranslation()` hook.
- **Hooks/store files (non-component contexts):** import `i18n` directly from `@/i18n` and call `i18n.t('key')`.
- **Markup with inline translations:** use the `<Trans>` component.
- **Parameterized strings:** use `t('key', { variable: value })` with `{{variable}}` in the translation value.
- **New keys:** add to both `en.ts` and `fr.ts`. French translations should be flagged `[REVIEW]` at the top for human review.
- **Naming convention:** keys are organized in nested sections matching feature/domain (e.g., `common.goBack`, `education.bachelors`, `analytics.clearTrend`).

### TypeScript

Strict mode is fully enabled (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`). Prefix intentionally unused parameters with `_`.

### Path Aliases

All imports within `mobile/src/` use the `@/` alias (e.g., `@/store/drawsStore`, `@/theme/colors`). Avoid relative imports that traverse more than one directory level.

### Environment Variables

Copy `mobile/.env.example` to `mobile/.env.local`. Required vars:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_PUSH_URL` | Cloudflare Worker endpoint |
| `EXPO_PUBLIC_PUSH_API_KEY` | Bearer token matching worker's `PUSH_API_SECRET` |
| `EAS_PROJECT_ID` | From `eas init` or expo.dev |

Optional: `EXPO_PUBLIC_APP_STORE_ID`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_ERROR_REPORT_URL`. AdMob IDs (`GOOGLE_ADMOB_ANDROID_APP_ID`/`_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`/`_IOS`) are set in `eas.json`'s `production` env for release builds (dev falls back to Google test IDs); the app ID and ad-unit IDs must share one AdMob publisher account.

### Services & Observability

`src/services/` holds cross-feature services:
- `pushService.ts` — Expo token register/revoke against the worker; skips on simulator/Expo Go
- `iapService.ts` — Thin `react-native-iap` wrapper over Google Play Billing for the one-time "Analytics unlock" (`crs_pulse.analytics_unlock`); handles connect/buy/restore/entitlement check
- `errorReporter.ts` — Production-safe error reporter; ring-buffer of recent errors, POST to optional `EXPO_PUBLIC_ERROR_REPORT_URL`; no-ops/console in dev; installs global JS error handler
- `adsService.ts` — Initializes Google Mobile Ads at boot (`initAds()` from `RootNavigator`; iOS requests App Tracking Transparency first). `AdBanner` renders in the Draws/Notifications lists (after every 5th row), free users only, hidden for Premium, and self-hides on ad no-fill; `__DEV__` uses Google test ad units. A brand-new AdMob app returns no-fill for hours–days, so empty ad slots are expected at first.

### Premium / IAP Gate

The analytics "Your Plan" tab is gated behind a one-time Google Play managed product (`crs_pulse.analytics_unlock`). `premiumStore` is the source of truth — it connects to billing on init, verifies entitlement, and mirrors to AsyncStorage for fast cold starts. The gate **fails open** through `billingAvailable`: when no purchasable product loads (iOS without StoreKit, emulator, transient Play outage) `billingAvailable` becomes `false` and consumers treat that as "don't lock" — the analytics "Your Plan" tab unlocks (`planLocked = premiumLoaded && !isPremium && billingAvailable`) and the paywall/upgrade banner hide. Note `isPremium` itself is **not** force-set to `true`, so AdMob ads — which gate only on `isPremium` — keep showing for non-purchasers.

### Testing

Tests live in `mobile/__tests__/` mirroring the `src/` structure (components, hooks, services, utils). Expo modules, AsyncStorage, NetInfo, Reanimated, and LinearGradient are all pre-mocked in Jest setup. When testing store logic, reset Zustand state between tests.
