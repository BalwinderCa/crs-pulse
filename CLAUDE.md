# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRS Pulse is a React Native (Expo) mobile app for Canadian Express Entry immigration applicants. It calculates CRS scores, fetches live IRCC draw results, provides analytics, and delivers push notifications via a Cloudflare Worker. All user data stays on-device — only anonymous Expo push tokens are sent to the worker.

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
IRCC JSON feed → Cloudflare Worker (every 15 min, KV cache)
                       ↓ (new draw detected)
              Expo Push Notification API
                       ↓
              Mobile App (push alert)

Mobile App → IRCC JSON feed (direct fetch, 1-hour stale cache in drawsStore)
```

The worker also exposes HTTP endpoints (`/register`, `/revoke`) that `pushService.ts` calls to manage Expo push tokens stored in Cloudflare KV.

### Mobile State Management (Zustand + AsyncStorage)

Three persisted stores in `src/store/`:

| Store | Key State | Purpose |
|---|---|---|
| `profileStore` | `CalcInputs`, `LocalProfile` | CRS calculator inputs, theme, notifications, accent color |
| `drawsStore` | `Draw[]`, cache timestamp | IRCC draw data; refreshes with 3× exponential backoff |
| `timelineStore` | `Milestone[]` | Application timeline milestones, sorted by date |

All three stores are persisted via `zustand/middleware` + AsyncStorage. Profile store also exports a derived `crsScore` computed from `CalcInputs`.

### Feature Structure

Each screen area lives under `src/features/<name>/` and contains its own components, hooks, and utils co-located together. Features: `dashboard`, `draws`, `analytics`, `profile`, `timeline`, `onboarding`.

The CRS calculator logic is in `src/features/onboarding/utils/crsCalculator.ts` and implements the official IRCC formula for all language tests (IELTS, CELPIP, PTE, TEF, CLB).

### Navigation

`RootNavigator` (stack) loads profile and draws on boot, then renders `MainNavigator` (bottom tabs): Dashboard → Timeline → Draws → Analytics → Settings.

### Theme System

`src/theme/` exports `colors` (dark/light palettes with WCAG AA contrast ratios), `spacing`, `typography`, and `shadows`. Use the `useColors()` hook to get the current theme's color palette — never hardcode colors.

### Push Worker (`workers/push/src/index.ts`)

Two entry points:
- `fetch(request, env)` — HTTP handler for `/register`, `/revoke`, and `/sync` (manual trigger)
- `scheduled(event, env)` — Cron trigger every 15 minutes; polls IRCC, compares to KV-cached last draw, fans out Expo push notifications if a new draw is detected

Secrets required: `PUSH_API_SECRET` (bearer token for register/revoke), `SYNC_SECRET` (manual sync auth). KV binding: `TOKENS_KV`.

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

### Testing

Tests live in `mobile/__tests__/` mirroring the `src/` structure (components, hooks, services, utils). Expo modules, AsyncStorage, NetInfo, Reanimated, and LinearGradient are all pre-mocked in Jest setup. When testing store logic, reset Zustand state between tests.
