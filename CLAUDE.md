# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRS Pulse is a React Native (Expo) mobile app for Canadian Express Entry immigration applicants. It bundles several eligibility calculators (CRS, FSW 67-point grid, BC PNP SIRS, SINP EOI), fetches live IRCC draw results, provides analytics, tracks the user's application with a milestone timeline / processing-time estimates / per-program document checklists, and delivers push notifications via a Cloudflare Worker. All user data stays on-device — only anonymous Expo push tokens are sent to the worker.

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
```

The worker reads draws from a GitHub-hosted mirror (`raw.githubusercontent.com/.../data/latest-draw.json`), not IRCC directly — canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520. The mobile app still fetches the IRCC JSON feed directly.

The worker also exposes HTTP endpoints (`/register`, `/revoke`) that `pushService.ts` calls to manage Expo push tokens stored in Cloudflare KV.

### Mobile State Management (Zustand + AsyncStorage)

Stores in `src/store/`:

| Store | Key State | Purpose |
|---|---|---|
| `profileStore` | `CalcInputs`, `LocalProfile` | CRS calculator inputs, theme, notifications, accent color |
| `drawsStore` | `Draw[]`, cache timestamp | IRCC draw data; refreshes with 3× exponential backoff |
| `timelineStore` | `Milestone[]` | Application timeline milestones, sorted by date |
| `applicationStore` | `TrackedApplication` | The IRCC category/type the user is tracking + applied date |

These stores are persisted via `zustand/middleware` + AsyncStorage. Profile store also exports a derived `crsScore` computed from `CalcInputs`. A feature-local `src/features/notifications/store/notificationsStore.ts` tracks the last draw number seen on the notifications page (drives the header bell badge), separate from the draws store's push de-dup `LAST_SEEN_DRAW`.

### Feature Structure

Each screen area lives under `src/features/<name>/` and contains its own components, hooks, and utils co-located together. Features:

- `home` — landing screen (application tracker hub)
- `dashboard` — CRS calculator screen
- `calculators` — hub linking to all calculators
- `draws`, `analytics`, `timeline` — live draws, on-device trends, milestone timeline
- `tracker` — application setup + IRCC processing-time estimates
- `checklist` — per-program document checklists
- `notifications`, `profile`, `settings`, `onboarding`, `faq`, `support`

Calculator logic lives in each feature's `utils/` (each documents its IRCC/provincial source and is "estimate only"):

| Calculator | File | Notes |
|---|---|---|
| CRS | `features/onboarding/utils/crsCalculator.ts` | Official IRCC formula; all language tests (IELTS, CELPIP, PTE, TEF, CLB) |
| FSW 67-point | `features/fsw/utils/fswCalculator.ts` | Six selection factors, min 67 to be eligible |
| BC PNP SIRS | `features/bcpnp/utils/sirsCalculator.ts` | 200-point SIRS grid |
| SINP EOI | `features/sinp/utils/sinpCalculator.ts` | 110-point Saskatchewan EOI grid, min 60 |

Static reference data: `features/checklist/data/checklists.ts` (document checklists by program), `features/tracker/data/processingTimes.ts` (IRCC category/type processing times).

### Navigation

`RootNavigator` (stack) loads profile and draws on boot, then renders `MainNavigator` (bottom tabs): Dashboard → Timeline → Draws → Analytics → Settings. The stack also hosts pushed screens reached from menus/cards: `Onboarding`, `Calculators`, `CrsCalculator`, `SinpCalculator`, `FswCalculator`, `BcSirsCalculator`, `ApplicationSetup`, `DocumentChecklist`(+`Detail`), `ProcessingTimes`, `Notifications`, `Faq`, `ReportIssue`.

### Theme System

`src/theme/` exports `colors` (dark/light palettes with WCAG AA contrast ratios), `spacing`, `typography`, and `shadows`. Use the `useColors()` hook to get the current theme's color palette — never hardcode colors.

### Push Worker (`workers/push/src/index.ts`)

Two entry points:
- `fetch(request, env)` — HTTP handler for `/register`, `/revoke`, and `/sync` (manual trigger)
- `scheduled(event, env)` — Cron trigger every 15 minutes; reads the GitHub draw mirror, compares to KV-cached last draw, fans out Expo push notifications if a new draw is detected

Revoked tokens are tombstoned in KV (not deleted) so legacy migrations don't resurrect them. Runs on wrangler 4. Secrets required: `PUSH_API_SECRET` (bearer token for register/revoke), `SYNC_SECRET` (manual sync auth). KV binding: `TOKENS_KV`.

## Key Conventions

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

Optional: `EXPO_PUBLIC_APP_STORE_ID`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`.

### Services & Observability

`src/services/` holds cross-feature services: `pushService.ts` (Expo token register/revoke against the worker) and `errorReporter.ts` (production-safe error reporter — no-ops/console in dev).

### Testing

Tests live in `mobile/__tests__/` mirroring the `src/` structure (components, hooks, services, utils). Expo modules, AsyncStorage, NetInfo, Reanimated, and LinearGradient are all pre-mocked in Jest setup. When testing store logic, reset Zustand state between tests.
