# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CRS Pulse is a React Native (Expo) mobile app for Canadian Express Entry immigration applicants. It bundles several eligibility calculators (CRS, FSW 67-point grid, BC PNP SIRS, SINP EOI), fetches live IRCC draw results, provides analytics (free draw insights plus the personalised "Your Plan" tab, monetised entirely with Google AdMob ads), tracks the user's application with a milestone timeline / processing-time estimates / per-program document checklists, and delivers push notifications via a Cloudflare Worker. All user profile data stays on-device. Only anonymous Expo push tokens go to the worker, and anonymous usage events (screens, taps, lifecycle) go to PostHog. There are no in-app purchases and no payment data of any kind.

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
npm run test           # node --test (tests are colocated as src/*.test.ts)
npm run deploy         # Deploy to Cloudflare
npm run type-check     # TypeScript check (no emit)
```

**Deploy from `main`, from the right account.** The worker lives on the Cloudflare account
"Balwinderxcode@gmail.com's Account" (workers.dev subdomain `balwinderxcode`). Before deploying,
confirm with `npx wrangler whoami` and `npx wrangler kv namespace list` that the logged-in account
owns KV `588cfb0021b2409e9f5dc1083b0497e8`. Wrangler deploys whatever is checked out, so run
`npm test` first. On 2026-09-22 a deploy from the wrong checkout quietly shipped an older version.
That same account is also the **registrar** for `crspulse.com` (Cloudflare Registrar), not just its
DNS host, so losing access to it means losing control of the domain as well as the worker.

**Shipped apps hardcode `crs-pulse-push.balwinderxcode.workers.dev`** (`mobile/eas.json`), and
that hostname belongs to this account. Moving the worker to another account would stop released
builds from reaching `/register` and `/revoke`. Pushes would still arrive, since delivery is
worker → Expo, but a token that changes could no longer re-register. Put the worker behind a custom
domain and ship an app update before any move. Never rotate `PUSH_API_SECRET` without an app
release for the same reason: shipped builds send it as the bearer on `/register`.

### EAS Builds (from `mobile/`)

```bash
eas build --profile development --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit                                      # Submit to app stores
```

**Store status (as of 2026-10-10).** **iOS v1.0.13 (build 62) is Waiting for Review**, submitted
2026-10-10 with **manual release**, so approval alone ships nothing: it will sit at "Pending
Developer Release" until released by hand (phased release is off). Build 62 (EAS `337d8bca`, from
`16d0391`, tag `ios-build-1.0.13-b62`) was opened from TestFlight on a device with existing data
before it was submitted. The App Store listing is English (U.S.) only. Android **versionCode 30**
(EAS `f81b4a37`, same commit) was built with auto-submit to **Alpha**; that it landed in Play
Console has not been confirmed. Build 62 / versionCode 30 fix four things in build 61's reset
dialog and accent picker: Android back could close the dialog while the wipe carried on, a failed
reset still reported success, the result toast showed behind the dialog, and a stored teal accent
was left with no swatch selected (it now loads as green).

Build 61 / versionCode 29 (`34a1ddc`, EAS `b87b3e78` / `62ca6352`, 2026-10-09) added themed toasts
(below the notch), an in-app Reset All
Data dialog and CRS calculator layout fixes on top of build 60 / versionCode 28 (`ce4e44c`). Those
superseded build 59 / versionCode 27 (`02ed921`) from earlier the same day. 1.0.13 changes: IRCC
"people ahead of you" on the home tracker (exact IRCC figure for the application month, "pending"
after IRCC's table ends) shown as stat tiles with a one-line source note, two onboarding slides
instead of three, the app open ad on every 2nd launch, profile details moved to a My Profile
screen, the PDF export removed, a 9-color accent picker (indigo replaced teal in build 61), a
smaller notification toggle that flips immediately, and CRS calculator default age 28. 1.0.12 was
never submitted for review on either store.

**Previously (as of 2026-10-05).** **v1.0.12 is uploaded on both platforms**, built from
`8bfee9e`. It has two changes since 1.0.11:
- `ac2e83f`: the applied date is saved as the local calendar day. It was being saved via
  `toISOString()`, so an evening pick in Canada was stored as the next day.
- `8103461`: one native ad below the home screen's recent draws.

iOS **build 58** (`ios-build.yml` run 37323604528, EAS `8ed0359a`) was uploaded to App Store
Connect on 2026-10-05 at 15:58 UTC. It is in TestFlight and not yet submitted for review.
Android **versionCode 26** (EAS `61c360c0`) was submitted to the **Alpha** track at 16:06 UTC.

Both jobs waited about 90 minutes in EAS's Free Tier Queue: the free plan runs one job at a time,
and `eas submit` is a queued job too. The iOS submit step normally takes 20 s. If that wait ever
outlasts GitHub's 6-hour job limit, re-run only the submit with `eas submit --id <build>`; the
build doesn't need to be redone. Open the TestFlight build on a device and release manually. Existing users whose
applied date is a day late have to re-pick it, because a shifted date can't be told apart from a
correct one.

iOS: **v1.0.11 (build 57)** is live. It was built by
`.github/workflows/ios-build.yml` from `351d2f4`, got an expedited review, and was approved and
released on 2026-10-03. PostHog shows real users on it from ~19:45 UTC that day, including
devices that had been crash-looping on 1.0.10. **v1.0.10 (build 56)**, released automatically
earlier the same day, **crashed about 0.4 s after every launch**: 28 iOS users reached it, and
the worst reopened it 26 times. Users still on 1.0.10 recover only by updating. 1.0.11's "What's New" covers the
work since 1.0.9: tracking the next application after a decision, removing a previous application,
clearer decided-application labels, and the maple-leaf header mark.

*Why build 56 crashed:* it was uploaded with a stale local `mobile/ios/` from an `expo run:ios` on
2026-10-01. EAS logged "Skipped running expo prebuild because the ios directory already exists"
and compiled that project instead of `app.config.js`. It had the old version string (that's why
the binary said 1.0.10) and no `NSUserTrackingUsageDescription`, so expo-tracking-transparency
aborted at launch. The `mobile/.easignore` that was meant to exclude `ios/` was never read:
**eas-cli reads only the repository-root `.easignore`, and while it exists every `.gitignore` is
skipped.** The root file now excludes `mobile/ios/` and `mobile/android/`, and
`mobile/__tests__/utils/easignore.test.ts` guards it; `172fbd8` also makes the ATT string
unconditional. Nobody had opened build 56 in TestFlight before it was submitted (0 installs), so
**launch a TestFlight build on a device before submitting it**, and prefer manual release for any
build that hasn't been opened.

1.0.9 itself was
submitted 2026-09-27 and released automatically on approval; PostHog shows Apple's review devices
on 2026-09-28/29 and the first real users from 2026-09-29 ~07:20 UTC.
1.0.9's only change is anonymous PostHog analytics (see `analyticsService.ts` below), plus the
onboarding/privacy copy that goes with it. The App Store privacy label was updated the same day:
Product Interaction, Device ID and Coarse Location each gained the Analytics purpose. Android is
**not live**, and the Production track is Inactive. Before 1.0.12 (above), the newest Play upload was **v1.0.11 /
versionCode 25**, built from `bed6f09` (the same mobile code as iOS build 56). Play Console shows it in
**Closed testing - Alpha**, fully rolled out and available to testers since 2026-10-01 11:41.
A manual re-upload on 2026-10-02 was rejected with "Version code 25 has already been used".
**Android shows 1.0.11 for the code iOS ships as 1.0.10.** From 1.0.12 the two version strings
match again. EAS assigns versionCodes automatically (`autoIncrement`, remote version source). versionCode 23 was built from
`3b850fd`, one commit before iOS build 54, so it still bundles `expo-localization` and PostHog
reads the locale from it. The two platforms are otherwise feature-identical: every `Platform.OS` branch is a platform
idiom (keyboard avoidance, date picker, store URL, share payload, ad-unit choice, iOS-only ATT
prompt, where the side menu's review item links) rather than a gated feature. Keep it that way:
when a feature can't work the same on one platform, adapt it rather than hiding it there. (The
review item was iOS-only through Android versionCode 23; from the next build Android shows "Rate
on Google Play", which opens the Play listing because Play has no write-review deep link.) Google gates production access behind "12 testers opted in, for 14
continuous days"; the account reached **12 opted-in testers on 2026-09-29**, so the earliest
the button can go live is **2026-10-13**, and only if none of them opt out before then (dropping
below 12 restarts the clock). Until then `submit.production.android.track` stays
`alpha` — a `production` submit would be rejected. Promote the track only after Play Console's
"Apply for production" button goes live.

**Two EAS build failures from 1.0.9 (2026-09-27), both from adding PostHog on SDK 52:**

1. *Bundle JavaScript: `Unable to resolve module @posthog/core/surveys`.* That subpath only
   exists in `@posthog/core`'s package.json `"exports"`, which Metro on SDK 52 ignores.
   `mobile/metro.config.js` maps `@posthog/core/*` to its CommonJS build rather than turning on
   `unstable_enablePackageExports` for every dependency. Delete it after the SDK 53+ upgrade.
2. *iOS `XCODE_BUILD_ERROR: switch must be exhaustive`* in `ExpoLocalization`. EAS's
   `macos-sequoia-15.6-xcode-26.0` image adds `Calendar.Identifier` cases that
   `expo-localization` 16.0.1 (SDK 52's latest) doesn't handle. It was removed, and PostHog gets
   `$locale`/`$timezone` from Hermes' `Intl` instead. **Before adding any native module on SDK
   52, check it compiles on Xcode 26.** Run `npx expo export` to catch bundling errors locally
   before spending a ~10-minute EAS upload.

**Two Play upload gates that bit us on 2026-09-08, both easy to misread:**

1. *Play Billing ≥ 8.0.0.* Rejected versionCode 19. Fixed by removing `react-native-iap`
   entirely (see Monetisation below).
2. *targetSdk ≥ 36.* Rejected versionCode 20 with `Target SDK of artifact is too low: 20` —
   the trailing number is the **versionCode**, not an SDK level, so don't chase it. Parsing the
   AAB manifest showed a correct build (minSdk 24, targetSdk 35). The real cause is Google's
   2026-08-31 deadline: new uploads must target Android 16 (API 36); only *existing installs*
   may stay at 35. The 2026-08-04 upload predated it, which is why it was the first build to
   fail. Fixed by `expo-build-properties` compileSdk/targetSdk 36 + buildTools 36.0.0.

**16 KB page sizes — a known, unresolved exposure.** Play requires apps targeting Android 15+ to
support 16 KB memory pages (new apps since 2025-11-01, updates since 2026-05-01). 21 of 22
arm64-v8a `.so` files in our AAB are 4 KB-aligned; only `libandroidx.graphics.path.so` is
compliant. Those binaries ship prebuilt inside AARs (Hermes, React Native, Expo modules), so no
linker flag fixes them — it needs an Expo SDK upgrade off 52 / RN 0.76.9. **Play accepted
versionCode 21 to the alpha track anyway**, so this is not currently blocking closed testing, but
expect it to surface on the production track. Verify alignment with an ELF program-header check
before assuming a build is compliant.

**Android credentials are entirely remote — nothing store-related needs to be on disk.**
Signing uses `credentialsSource: "remote"`: the JKS EAS holds (alias
`bd121022349bbbb6c81fa86896c9f53d`) is the key Play has registered as the upload key
(MD5 `48d2840e5102b54ea3eef698fdeb6292`), so no local `credentials.json` is needed.
Submitting uses the Google Service Account key stored on EAS for
`eas-play-publisher@crspulseapp.iam.gserviceaccount.com` (Active in Play Console's Users and
permissions), which is why `submit.production.android` has no `serviceAccountKeyPath`.
`GOOGLE_SERVICES_JSON` is an EAS secret, so builds get FCM config without the file being on
disk; only a local `expo run:android` needs `mobile/google-services.json` fetched from Firebase.

## Architecture

### Data Flow

```
GitHub Actions mirror (data/latest-draw.json) ⇄ Cloudflare Worker (every 15 min, KV cache)
                       ↓ (new draw detected)
              Expo Push Notification API
                       ↓
              Mobile App (push alert)

Mobile App → IRCC JSON feed (direct fetch, 1-hour stale cache in drawsStore)

GitHub Actions mirror (data/processing-times.json) → processingTimesStore (7-day cache)
GitHub Actions mirror (data/ee-pool.json) → eePoolStore (7-day cache)
```

The worker reads draws from a GitHub-hosted mirror (`raw.githubusercontent.com/.../data/latest-draw.json`), not IRCC directly — canada.ca (Akamai) rejects Cloudflare Worker egress with HTTP 520. The mobile app still fetches the IRCC JSON feed directly. GitHub often skips scheduled workflow runs (the mirror's own 15-minute cron ran only about 10 times a day), so the worker triggers the mirror workflow itself on every cron tick via `workflow_dispatch` (`GITHUB_DISPATCH_TOKEN`). Each tick's push reads the previous tick's commit.

`pushService.ts` calls `/register` and `/revoke` to manage the Expo push tokens stored in Cloudflare KV. `/health`, `/sync` and `/stats` are for operators, not the app.

### Mobile State Management (Zustand + AsyncStorage)

Stores in `src/store/`:

| Store | Key State | Purpose |
|---|---|---|
| `profileStore` | `CalcInputs`, `LocalProfile` | CRS calculator inputs, theme, notifications, accent color |
| `drawsStore` | `Draw[]`, cache timestamp | IRCC draw data; refreshes with 3× exponential backoff; 1-hour cache |
| `timelineStore` | `Milestone[]` | Application timeline milestones, sorted by date |
| `applicationStore` | `TrackedApplication` | The IRCC category/type the user is tracking + applied date |
| `processingTimesStore` | `LiveProcessingTimes` | IRCC processing times by category/type; 7-day cache with bundled fallback |
| `eePoolStore` | `EePoolData` | Express Entry pool distribution + Immigration Levels Plan; 7-day cache with bundled fallback |

These stores are persisted via `zustand/middleware` + AsyncStorage. Profile store also exports a derived `crsScore` computed from `CalcInputs`. A feature-local `src/features/notifications/store/notificationsStore.ts` tracks the last draw number seen on the notifications page (drives the header bell badge), separate from the draws store's push de-dup `LAST_SEEN_DRAW`. It also tracks the last processing-times `updated` label seen — `useProcessingTimesBadge()` turns that into the red dot on the header hamburger and the side-menu "Check Processing Times" row, cleared when `ProcessingTimesScreen` mounts.

### Feature Structure

Each screen area lives under `src/features/<name>/` and contains its own components, hooks, and utils co-located together. Features:

- `home` — landing screen (application tracker hub with latest draw and progress)
- `dashboard` — CRS calculator screen with score card and prediction
- `calculators` — hub linking to all calculators
- `draws` — live IRCC draws with category filters
- `analytics` — analytics (2 tabs: draw trends + personal odds); both free
- `timeline` — milestone tracker with add/edit/delete
- `tracker` — application setup + IRCC processing-time estimates
- `checklist` — per-program document checklists with progress tracking
- `notifications` — draw notifications history with unread badge
- `profile` — settings (the "Settings" bottom tab renders `profile`'s `ProfileScreen`)
- `onboarding` — first-time 2-slide welcome flow
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

`RootNavigator` (stack) loads all stores on boot (profile, draws, timeline, application, processing times, EE pool), hides splash screen when ready, then renders `MainNavigator` (5 bottom tabs): **Home → Timeline → Draws → Analytics → Settings**. The stack also hosts pushed screens reached from menus/cards: `Onboarding`, `Calculators`, `CrsCalculator`, `SinpCalculator`, `FswCalculator`, `BcSirsCalculator`, `ApplicationSetup`, `DocumentChecklist` (hub + detail), `ProcessingTimes`, `Notifications`, `Faq`, `ReportIssue`, `MyProfile` (profile details, from Settings).

### Theme System

`src/theme/` exports `colors` (dark/light palettes with WCAG AA contrast ratios), `spacing`, `typography`, and `shadows`. Use the `useColors()` hook to get the current theme's color palette — never hardcode colors.

### Push Worker (`workers/push/src/`)

Four source files:
- `index.ts` — HTTP handler (`/register`, `/revoke`, `/health`, `/sync`, `/stats`) + scheduled cron entry point
- `tokenStore.ts` — KV token storage (register/revoke/list/migrate legacy single-array format)
- `expoValidate.ts` — Validates Expo push tokens with Expo API before storing
- `expoReceipts.ts` — Polls Expo receipt API for async delivery status; revokes failed tokens

Two entry points:
- `fetch(request, env)` — HTTP handler for `/register`, `/revoke`, `/health`, `/sync` (manual trigger), and `/stats` (registry counts — push tokens by platform, email subscribers, pending receipts, last draw; never returns a token or address). `/sync` and `/stats` are gated on `SYNC_SECRET`, deliberately not `PUSH_API_SECRET`, which ships inside every app binary:
  ```bash
  curl -H "Authorization: Bearer $SYNC_SECRET" https://crs-pulse-push.balwinderxcode.workers.dev/stats
  ```
- `scheduled(event, env)` — Cron trigger every 15 minutes; reads the GitHub draw mirror, compares to KV-cached last draw, fans out Expo push notifications if a new draw is detected. Also runs `checkProcessingTimes`, which pushes + emails when the processing-times mirror's id→months signature changes (`peopleWaiting` is ignored — it drifts every refresh)

Revoking deletes the `token:` key and leaves a `revoked:<token>` marker in KV that expires after 1 hour, so a legacy migration can't bring the token back. That marker is also the easiest way to find your own device's token for a single-device test push: turn notifications off in the app, read the one `revoked:` key, then turn them back on. The app never displays its token. Runs on wrangler 4. Secrets required: `PUSH_API_SECRET` (bearer for register/revoke; ships in the app binary), `SYNC_SECRET` (bearer for `/sync` and `/stats`; ops-only). Optional: `GITHUB_DISPATCH_TOKEN` (fine-grained PAT, Actions read+write on this repo; drives and monitors the mirror), `RESEND_API_KEY`/`EMAIL_FROM` (email alerts) and `ALERT_EMAIL` (ops alert recipient). KV binding: `TOKENS_KV`.

**Two mirror heartbeats email `ALERT_EMAIL`, once per outage, and re-arm when the mirror recovers:**
- `checkMirrorRuns` sends an alert when the mirror workflow hasn't *succeeded* for 6 hours. It reads GitHub's run list, which GitHub marks `public, max-age=60` and which a cache between the worker and GitHub once replayed as days-old data. That caused daily false alarms while every run was green. The request therefore adds a unique `_cb` param (`cache: 'no-store'` alone wasn't enough), and a stale reading only sends email if it's still stale on a later tick (`mirror_runs_stale_pending`). If an alert does fire, check the real run history before assuming the mirror is down.
- `checkMirrorFreshness` sends an alert when the newest mirrored draw is more than 30 days old. This catches a mirror that runs green but has stopped fetching new data.

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

Optional: `EXPO_PUBLIC_POSTHOG_KEY`/`_HOST` (analytics; off when unset and in dev), `EXPO_PUBLIC_APP_STORE_ID`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_ERROR_REPORT_URL`. AdMob IDs (`GOOGLE_ADMOB_ANDROID_APP_ID`/`_IOS_APP_ID`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`/`_IOS`) are set in `eas.json`'s `production` env for release builds (dev falls back to Google test IDs); the app ID and ad-unit IDs must share one AdMob publisher account.

### Services & Observability

`src/services/` holds cross-feature services:
- `pushService.ts` — Expo token register/revoke against the worker; skips on simulator/Expo Go
- `errorReporter.ts` — Production-safe error reporter; ring-buffer of recent errors, POST to optional `EXPO_PUBLIC_ERROR_REPORT_URL`; no-ops/console in dev; installs global JS error handler
- `analyticsService.ts` — Anonymous PostHog analytics: lifecycle events, screen views (reported from `RootNavigator`'s `onStateChange`, since PostHog's screen autocapture doesn't support React Navigation 7), and taps. `personProfiles: 'never'`, no session replay, and touch autocapture is narrowed to `testID`/`ph-label` because its default records the tapped element's text, which on calculator screens is the user's own data. Custom events go through `track()`, whose `EventProperties` map types every event and its allowed properties: `crs_calculated`, `push_enabled`/`_disabled`/`_enable_failed`, `milestone_added`, `checklist_item_checked`, `ad_shown`. Key buttons carry a stable `ph-label` (e.g. `home-calculate-crs`, `menu-<id>`, `draws-filter-<category>`) so taps are readable in PostHog; add one to any new button you want to measure. **Never send calculator inputs, scores, timeline or checklist data as event properties.** The public privacy policy (`docs/PRIVACY_POLICY.md`) promises this. Production builds send events to `https://t.crspulse.com`, PostHog's managed reverse proxy (a CNAME on `crspulse.com` to `proxyhog.com`), so blocklists that match `*.posthog.com` don't drop them. Builds up to and including 1.0.9 still post straight to `us.i.posthog.com`. Keep that CNAME in place for as long as proxied builds are installed.

**The website (`web/build.mjs`) sends to the same PostHog project** through the same proxy
(`$lib` = `web`, filter on it to separate site from app), cookieless (`cookieless_mode:
'always'`, which drops every event unless the project's cookieless server hash mode is on) and
with `mask_all_text`, so calculator results never land in click events. It also loads Vercel Web
Analytics. Both are disclosed in the privacy policy's Website section.

**AdSense on the website (review requested 2026-10-02).** crspulse.com was added, verified by
meta tag and submitted for review that day, and the AdSense site status is "Getting ready". A
Google CMP consent message with three choices (consent / do not consent / manage options) was
created for EEA/UK/CH visitors at the same time. The site carries a
`google-adsense-account` meta tag and an `ads.txt` for `ca-pub-4874088724567128`, the same
publisher account as the app's AdMob (`ADSENSE_CLIENT`/`ADMOB_PUB` in `web/build.mjs`).
developer.yxe@gmail.com has a separate AdMob-only AdSense login (`pub-5258670698032581`). Signing
it up for AdSense on 2026-10-02 did not enable websites, so don't point the site at it. **No ad script loads
yet.** Add `adsbygoogle.js` and the ad units only after approval, and reserve each slot's height
so CLS stays near 0. Keep the consent message on (AdSense → Privacy & messaging), because the
privacy policy's "Google AdSense (website ads)" section promises it.

**PostHog stores each event's IP address and GeoIP city/region** — the project's "Discard client IP data" setting (`anonymize_ips`) is off. `docs/PRIVACY_POLICY.md` (also served at `crspulse.com/privacy`) discloses exactly that, and the App Store label declares Coarse Location for Analytics. If you turn the setting on, update the policy's PostHog section to match. When reading the data, exclude bots: Google Play pre-launch devices (Android, `OnePlus8Pro`, Google IP ranges) and Apple App Review (Cupertino iPhone, and an iPad) show up within an hour of each upload or review.
- `adsService.ts` — Initializes Google Mobile Ads at boot (`initAds()` from `RootNavigator`; iOS requests App Tracking Transparency first). `AdBanner` renders in the Draws/Notifications lists (after every 5th row) for all users, and self-hides on ad no-fill; `takeAppOpenAdTurn()` counts cold launches and returns true on every 2nd, and `showAppOpenAd()` then holds the splash for one **app open** ad (the only format Google permits on a launch screen — a banner over the splash is a policy violation), capped at 3s to load and 60s displayed, then `RootNavigator` hides the splash and runs `initAds()` (ATT prompt, which needs the app 'active'); `__DEV__` uses Google test ad units. A brand-new AdMob app returns no-fill for hours–days, so empty ad slots are expected at first.

### Monetisation: ads only, no IAP

**The app has no in-app purchase.** Everything, including the analytics "Your Plan" tab, is free; revenue comes from AdMob alone. `react-native-iap` was removed on 2026-09-08 because Google Play began rejecting uploads that bundle Play Billing < 8.0.0, and react-native-iap 12.x pins 7.0.0. Moving to a Billing-8 release (14.0.0+) would have required `react-native-nitro-modules`, Kotlin 2.1 and compileSdk 36 — an Expo SDK upgrade — so with the purchase never having been sold (Android had 0 installs, and the product was Play-only so it never loaded on iOS) the purchase path was dropped instead.

Removed with it: `premiumStore`, `iapService`, the `paywall` feature, `UpgradeBanner`, the header PRO badge, and the locked "Your Plan" preview. Ads never gated on entitlement — `AdBanner` checks `MONETIZATION_ENABLED` and ad availability only — so ad behaviour is unchanged. **Do not reintroduce `react-native-iap` without first checking the Play Billing minimum**, which Google raises periodically.

### Testing

Tests live in `mobile/__tests__/` mirroring the `src/` structure (components, hooks, services, utils). Expo modules, AsyncStorage, NetInfo, Reanimated, and LinearGradient are all pre-mocked in Jest setup. When testing store logic, reset Zustand state between tests.
