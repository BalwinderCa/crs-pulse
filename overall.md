# CRS Pulse — Complete Screen & Feature Reference

This document describes every screen, tab, component, store, and service in detail so that any future conversation can understand the app without re-reading the code.

---

## Navigation Structure

### RootNavigator (`mobile/src/navigation/RootNavigator.tsx`)

Stack navigator. On boot it:
1. Loads all stores in parallel (profile, draws, timeline, application, processingTimes, eePool, premium)
2. Hides the splash screen once ready (falls back to defaults if AsyncStorage times out)
3. Routes to `Onboarding` if first launch, otherwise to `Main`

**Stack screens:**

| Route | Screen | Notes |
|---|---|---|
| `Main` | MainNavigator (tabs) | Default after onboarding |
| `Onboarding` | OnboardingScreen | First-launch welcome |
| `Calculators` | CalculatorsScreen | Hub for all 4 calculators |
| `CrsCalculator` | DashboardScreen | Full CRS calculator |
| `FswCalculator` | FswCalculatorScreen | FSW 67-pt grid |
| `BcSirsCalculator` | BcSirsCalculatorScreen | BC PNP 200-pt SIRS |
| `SinpCalculator` | SinpCalculatorScreen | SINP EOI 110-pt |
| `ApplicationSetup` | ApplicationSetupScreen | Pick IRCC category + applied date |
| `DocumentChecklist` | ChecklistHubScreen | Select program (hub) |
| `DocumentChecklistDetail` | DocumentChecklistScreen | View + check documents |
| `ProcessingTimes` | ProcessingTimesScreen | Typical IRCC times by type |
| `Notifications` | NotificationsScreen | Draw history + unread badge |
| `Faq` | FaqScreen | Accordion FAQ |
| `ReportIssue` | ReportIssueScreen | Contact / feedback form |
| `Paywall` | PaywallScreen | Premium unlock modal (presented as modal) |

---

### MainNavigator (`mobile/src/navigation/MainNavigator.tsx`)

Bottom tab navigator with 5 tabs:

| Tab | Screen | Icon | Notes |
|---|---|---|---|
| **Home** | HomeScreen | home icon | Application tracker hub |
| **Timeline** | TimelineScreen | calendar icon | Milestone tracker |
| **Draws** | DrawsScreen | list icon | Live IRCC draws |
| **Analytics** | PremiumAnalyticsScreen | chart icon | Freemium analytics |
| **Settings** | ProfileScreen | person icon | Settings + profile |

---

## Screens — Tab by Tab

---

### Tab 1: Home (`src/features/home/`)

**File:** `HomeScreen.tsx`

**Purpose:** The landing screen after onboarding. Acts as an application tracker hub — summarises where the user stands relative to the latest draw and their tracked IRCC application.

**What's on screen:**

1. **App Header** — App name + bell icon (shows unread badge if new draws since last visit to Notifications)
2. **Score vs Latest Draw card** — Shows user's CRS score (from profileStore) vs the most recent draw's cutoff. Colour-coded: green if above cutoff, red if below, grey if no draw data yet.
3. **Latest Draw Summary** — Draw number, date, cutoff score, number of invitations, category badge.
4. **Application Progress card** — Only shown if a tracked application is set (applicationStore). Displays IRCC category/type, applied date, estimated processing time (from processingTimesStore), and a progress bar showing % of typical time elapsed.
5. **Quick actions row** — Buttons to: Set Up Tracking (→ ApplicationSetup), View Checklist (→ DocumentChecklist), View Processing Times (→ ProcessingTimes).
6. **Recent draws carousel** — Horizontal scroll of the last 3–5 draws (DrawCard).

**State dependencies:** `drawsStore`, `profileStore`, `applicationStore`, `processingTimesStore`

---

### Tab 2: Timeline (`src/features/timeline/`)

**File:** `TimelineScreen.tsx`

**Purpose:** A personal application timeline. Users add dated milestones to track their immigration journey.

**What's on screen:**

1. **Header** — "Application Timeline" + "Add" button (opens add milestone sheet)
2. **Vertical timeline list** — Each milestone shows:
   - Coloured icon (per milestone type)
   - Milestone label (type name or custom label/emoji)
   - Date (YYYY-MM-DD) + "X days ago" / "in X days"
   - Optional note
   - Edit / delete buttons
3. **Add/Edit sheet** — Form with:
   - Milestone type picker (15 types: ITA, Application Submitted, AOR, Biometrics Requested, Biometrics Completed, Medical Requested, Medical Passed, Passport Requested, Passport Submitted, Passport Collected, ADR, Portal 1, Portal 2, Final Decision, Custom)
   - Date picker (React Native DateTimePicker)
   - Note text field
   - For "Custom" type: custom label + emoji inputs
4. **Empty state** — Prompt to add first milestone when list is empty

**State dependencies:** `timelineStore`

**Store:** `timelineStore` — `Milestone[]` persisted in AsyncStorage; sorted by date ascending.

---

### Tab 3: Draws (`src/features/draws/`)

**File:** `DrawsScreen.tsx`

**Purpose:** Browse all historical IRCC Express Entry draws, with live refresh.

**What's on screen:**

1. **Header** — "Express Entry Draws" + optional refresh indicator
2. **Filter pills** — Three options: "Last Month" / "Last Year" / "All Time". Filters the list in-memory.
3. **FlatList of DrawCards** — Each card shows:
   - Draw number + date
   - Category badge (CEC, General, Healthcare, STEM, Trades, French, PNP, Agriculture, Education, etc.)
   - Minimum CRS cutoff score (large, prominent)
   - Number of invitations issued
   - Tie-breaking rule (date/time) if applicable
4. **Pull-to-refresh** — Forces a new IRCC feed fetch
5. **Loading state** — SkeletonCard placeholders on initial load
6. **Error state** — ErrorState component with retry button
7. **Empty state** — EmptyState component if no draws match filter

**State dependencies:** `drawsStore`

**Data source:** IRCC JSON feed at `canada.ca/…/ee_rounds_123_en.json`, fetched directly by the app. 1-hour stale cache; 3× exponential backoff on 5xx/429.

---

### Tab 4: Analytics (`src/features/analytics/`)

**File:** `PremiumAnalyticsScreen.tsx`

**Purpose:** Two-tab analytics dashboard with a freemium split.

#### Sub-tab A: Draws (Free)

Shows aggregate draw statistics — no IAP required.

**What's on screen:**
1. **Average CRS cutoff** over all draws (or filtered period)
2. **Highest / Lowest cutoff** in the dataset
3. **Total invitations issued** (sum)
4. **Cutoff trend line chart** — Historical cutoff scores over time (line chart using react-native-chart-kit or similar)
5. **Category breakdown** — How many draws per category

**State dependencies:** `drawsStore`

#### Sub-tab B: Your Plan (Premium)

Locked behind `premiumStore.isPremium`. If not premium, shows the paywall gate (blurred preview + "Unlock" CTA that navigates to Paywall).

**What's on screen when unlocked:**
1. **Odds Gauge** — Pie/arc chart showing probability of receiving an ITA based on user's CRS vs current pool distribution
   - Categories: High (>50%), Moderate (25–50%), Low (<25%)
2. **CRS Position in Pool** — Forecast band chart showing where the user's score sits in the EE pool distribution bands (601–1200, 501–600, 451–500, 401–450, 351–400, 301–350, <301)
3. **Historical cutoff markers** — User's CRS score overlaid on historical cutoff chart (dashed horizontal line)
4. **EE Pool stats** — Total candidates in pool, distribution breakdown, pool update date
5. **Immigration Levels Plan** — Annual EE + PNP targets for context

**State dependencies:** `drawsStore`, `eePoolStore`, `profileStore`, `premiumStore`

**Key files:**
- `PremiumAnalyticsScreen.tsx` — Tab switcher + premium gate
- `PremiumCharts.tsx` — All visualization components (OddsGauge, ForecastBandChart, etc.)
- `hooks/useAnalyticsData.ts` — Derives odds, percentiles, forecast bands from raw store data
- `hooks/useAnalytics.ts` — Additional derived state for the analytics tab
- `data/eePool.ts` — Bundled EE pool fallback snapshot

---

### Tab 5: Settings (`src/features/profile/`)

**File:** `ProfileScreen.tsx` (rendered as the "Settings" bottom tab)

**Purpose:** User settings, profile management, and premium unlock.

**What's on screen:**

1. **CRS Score card** — Shows current calculated CRS score with breakdown button (→ CrsCalculator)
2. **Profile / CRS Inputs section** — Summary of key calculator inputs (age, education, language scores). Tap to edit (→ CrsCalculator)
3. **Appearance section**
   - Theme selector: System / Light / Dark
   - Accent colour picker: Preset swatches (Electric Indigo default + 5 others)
4. **Notifications section**
   - Push notifications toggle (enables/disables Expo push registration)
   - Weekly summary toggle (if implemented)
5. **Premium section**
   - If not premium: "Unlock Analytics" button → Paywall
   - If premium: "Analytics Unlocked ✓" indicator + Restore Purchases option
6. **Data section**
   - Export profile as PDF
   - Reset all data (clears all stores + AsyncStorage, restarts to onboarding)
7. **About section**
   - App version
   - FAQs link (→ Faq)
   - Privacy Policy link (external URL)
   - Terms of Use link (external URL)
   - Report Issue link (→ ReportIssue)
   - Rate the app (→ App Store/Play Store)

**State dependencies:** `profileStore`, `premiumStore`

---

## Screens — Stack (pushed over tabs)

---

### Onboarding (`src/features/onboarding/`)

**File:** `OnboardingScreen.tsx`

**Purpose:** First-time welcome flow shown before the main tabs.

**What's on screen:**
- FlatList of 4 full-screen slides (horizontal pager):
  1. **Welcome** — App name, tagline, brief description
  2. **Calculators** — Highlights CRS + other calculators
  3. **Live Draws** — Explains draw tracking and notifications
  4. **Push Notifications** — Explains push alerts, requests permission
- "Next" button (advances slide), "Done" on last slide
- Dot page indicator

**On complete:** Sets `ONBOARDING_SEEN` in AsyncStorage, navigates to `Main`.

**Also contains:** `crsCalculator.ts` and `buildCRSInput.ts` utilities (CRS logic is co-located here even though it's used across the app).

---

### CRS Calculator / Dashboard (`src/features/dashboard/`)

**File:** `DashboardScreen.tsx` (also the `CrsCalculator` stack route)

**Purpose:** Full CRS score calculator with live score updates and draw comparison.

**What's on screen:**

1. **Side menu button** — Opens `SideMenu.tsx` slide-in with links to all calculators
2. **Score card (`ScoreCard.tsx`)** — Current CRS score (large), vs latest draw cutoff, colour-coded diff
3. **Prediction card (`PredictionCard.tsx`)** — Odds gauge (rough likelihood of next round)
4. **Calculator form** (scrollable, grouped by section):
   - **Personal**: Age, marital status
   - **Education**: Highest credential level
   - **Language — First Official**: Test type (IELTS/CELPIP/PTE Core/TEF/TCF), scores for Reading/Writing/Listening/Speaking
   - **Language — French**: TEF/TCF scores (if applicable)
   - **Work Experience**: Years of Canadian work experience, years of foreign work experience
   - **Spouse/Partner** (if married/common-law): Education, language, Canadian work experience
   - **Additional Points**: Provincial nomination, valid job offer (NOC TEER 0/1/2/3), Canadian sibling, Canadian education (2yr+), Trade certificate
5. **Score updates live** as inputs change (no submit button)

**State dependencies:** `profileStore` (reads/writes `CalcInputs`), `drawsStore`

**Key files:**
- `DashboardScreen.tsx`
- `ScoreCard.tsx`
- `SideMenu.tsx`
- `PredictionCard.tsx`
- `hooks/useDashboard.ts`
- `features/onboarding/utils/crsCalculator.ts` — The actual CRS calculation logic

**CRS Calculator detail (`crsCalculator.ts`):**
- Implements the official IRCC Comprehensive Ranking System formula
- Scores: Core human capital (age, education, language, work exp), Spouse factors, Skill transferability, Additional points
- Language test conversions: IELTS → CLB, CELPIP → CLB, PTE Core → CLB, TEF → CLB, TCF → CLB
- Output: total CRS score (0–1200) + per-section breakdown

---

### FSW Calculator (`src/features/fsw/`)

**File:** `FswCalculatorScreen.tsx`

**Purpose:** Federal Skilled Worker 67-point eligibility grid.

**What's on screen:**
1. Six selection factor sliders/pickers:
   - Language skills (max 28)
   - Education (max 25)
   - Work experience (max 15)
   - Age (max 12)
   - Arranged employment (max 10)
   - Adaptability (max 10)
2. Live score total
3. Eligibility badge: "Eligible (≥67)" or "Not Eligible (<67)"
4. Hard requirement checks: minimum CLB 7 language, minimum 1 year skilled work experience

**Utils:** `fswCalculator.ts` — scores each of the 6 factors per IRCC's FSW grid

---

### BC PNP SIRS Calculator (`src/features/bcpnp/`)

**File:** `BcSirsCalculatorScreen.tsx`

**Purpose:** British Columbia Provincial Nominee Program — Skills Immigration Registration System self-assessment.

**What's on screen:**
1. Input form covering SIRS scoring categories (NOC skill level, education, wage/salary, work experience, language, regional program, etc.)
2. Live SIRS score (max 200)
3. Score indicator and notes

**Utils:** `sirsCalculator.ts` — BC SIRS 200-point formula

---

### SINP EOI Calculator (`src/features/sinp/`)

**File:** `SinpCalculatorScreen.tsx`

**Purpose:** Saskatchewan Immigrant Nominee Program — Expression of Interest grid.

**What's on screen:**
1. Input form for SINP EOI factors
2. Live EOI score (max 110, min 60 to apply)
3. Eligibility indicator

**Utils:** `sinpCalculator.ts` — SINP 110-point EOI formula

---

### Calculators Hub (`src/features/calculators/`)

**File:** `CalculatorsScreen.tsx`

**Purpose:** Entry point listing all 4 calculators.

**What's on screen:**
- Grid/list of 4 calculator cards:
  1. **CRS Calculator** → `CrsCalculator` route
  2. **FSW 67-Point Grid** → `FswCalculator` route
  3. **BC PNP SIRS** → `BcSirsCalculator` route
  4. **SINP EOI** → `SinpCalculator` route
- Each card shows calculator name, description, and max score

---

### Application Setup (`src/features/tracker/`)

**File:** `ApplicationSetupScreen.tsx`

**Purpose:** Let the user select the IRCC program they applied to, so the Home screen can show processing time progress.

**What's on screen:**
1. **Category picker** — Grouped list of IRCC categories (Economic, Humanitarian, Family, etc.)
2. **Type picker** — Sub-types within selected category (e.g., "Federal Skilled Worker", "Canadian Experience Class")
3. **Applied date field** — Date picker (optional; shows "not applied yet" if blank)
4. **Save / Clear buttons**

**State dependencies:** `applicationStore`

---

### Processing Times (`src/features/tracker/`)

**File:** `ProcessingTimesScreen.tsx`

**Purpose:** Show IRCC's typical processing time estimates for all programs.

**What's on screen:**
1. Grouped list by category
2. Each type shows: typical time in months, "varies" indicator if no fixed estimate, queue size if available
3. Highlighted row for the user's tracked application (if set)
4. Last updated date (from processingTimesStore)

**State dependencies:** `processingTimesStore`, `applicationStore`

**Data:** Live from GitHub mirror (`data/processing-times.json`), 7-day cache. Falls back to bundled snapshot in `features/tracker/data/processingTimes.ts`.

---

### Document Checklist — Hub (`src/features/checklist/`)

**File:** `ChecklistHubScreen.tsx`

**Purpose:** Pick an IRCC program to view its document checklist.

**What's on screen:**
1. List of all supported programs (FSW, CEC, PNP, Spouse/CoPR, etc.)
2. Per-program progress bar (X of Y items checked)
3. Tap a program → `DocumentChecklistDetail`

---

### Document Checklist — Detail (`src/features/checklist/`)

**File:** `DocumentChecklistScreen.tsx`

**Purpose:** View and check off documents for a specific program.

**What's on screen:**
1. Program name header
2. Checklist grouped by section (e.g., "Personal documents", "Immigration documents", "Financial documents")
3. Each item: checkbox, document name, optional note/link
4. Progress bar (top) showing completion %
5. All checked state persisted per program in AsyncStorage

**Data:** Static data in `features/checklist/data/checklists.ts` (sourced from IRCC requirements). Does not auto-update; maintained manually.

---

### Notifications (`src/features/notifications/`)

**File:** `NotificationsScreen.tsx`

**Purpose:** Show draw history as a notification feed; clear the bell badge.

**What's on screen:**
1. List of draws (most recent first), each shown as a "notification" row with draw number, date, cutoff
2. Unread rows highlighted (draws newer than `notificationsStore.seenDraw`)
3. Viewing this screen calls `markSeen()` — clears the header bell badge

**State dependencies:** `drawsStore`, `notificationsStore`

---

### Paywall (`src/features/paywall/`)

**File:** `PaywallScreen.tsx` (presented as a modal)

**Purpose:** One-time in-app purchase to unlock premium analytics.

**What's on screen:**
1. Feature preview / value proposition (what you get with premium)
2. Price (from `premiumStore.price` — localized from Google Play)
3. **"Unlock Analytics"** button → calls `premiumStore.purchase()`
4. **"Restore Purchases"** button → calls `premiumStore.restore()`
5. Loading state during purchase flow
6. Error message if purchase fails
7. Auto-dismisses on successful purchase (`isPremium` becomes `true`)

**Fail-open:** If `billingAvailable` is false (iOS without StoreKit product, emulator, Play outage), screen shows a "Not available" message instead of the buy button — the paywall never blocks analytics from a user who already paid.

**State dependencies:** `premiumStore`

---

### FAQ (`src/features/faq/`)

**File:** `FaqScreen.tsx`

**Purpose:** Accordion-style FAQ.

**What's on screen:**
- List of Q&A items, each tappable to expand/collapse the answer
- Topics: CRS score, draws, calculators, push notifications, premium, data privacy

---

### Report Issue (`src/features/support/`)

**File:** `ReportIssueScreen.tsx`

**Purpose:** Send feedback or report a bug.

**What's on screen:**
1. Issue type selector (Bug / Feature Request / Other)
2. Text area for description
3. Auto-filled fields (read-only): app version, platform (iOS/Android), device model
4. Optional: include CRS score checkbox
5. **Send** button — composes email or POSTs to support endpoint

---

## Shared Components (`mobile/src/components/`)

### Common (`common/`)

| Component | Purpose |
|---|---|
| `Card.tsx` | Styled container (background, shadow, border radius, padding) |
| `AnimatedCard.tsx` | Card with Reanimated entrance animation |
| `Button.tsx` | Primary / secondary / ghost variants; loading spinner; disabled state |
| `Badge.tsx` | Colour-coded pill (green success, red danger, yellow warning, blue info) |
| `Input.tsx` | Text input with label, validation error, leading/trailing icons |
| `SkeletonCard.tsx` | Animated shimmer placeholder while data loads |
| `EmptyState.tsx` | Centered icon + title + subtitle for empty lists |
| `ErrorState.tsx` | Error message + "Retry" button |
| `ErrorBoundary.tsx` | React error boundary; catches render errors, shows fallback |
| `Logo.tsx` | App logo (used on splash / onboarding) |
| `PulseAnimation.tsx` | Looping scale/opacity animation (used for new-draw badge) |

### Layout (`layout/`)

| Component | Purpose |
|---|---|
| `AppHeader.tsx` | Top bar: back button (if applicable), screen title, bell icon with unread badge |
| `Header.tsx` | Simpler variant without bell |
| `ScreenWrapper.tsx` | SafeAreaView + background colour + consistent horizontal padding |

---

## Hooks (`mobile/src/hooks/`)

| Hook | Returns | Notes |
|---|---|---|
| `useColors()` | Current theme's colour palette object | Use instead of hardcoding colours. Switches between `dark` and `light` palettes based on `profileStore.theme` + system preference |
| `useAccentColor()` | Hex string | User's selected accent colour from profileStore |
| `useTabBarLayout()` | `{ height, bottomPadding }` | Computes tab bar height for safe-area-aware scroll padding |
| `useResponsiveLayout()` | `{ isSmall, isMedium, isLarge }` | Screen size breakpoints |
| `useDrawNotifications()` | — | Syncs `LAST_SEEN_DRAW` in AsyncStorage for push de-duplication |
| `useNetworkStatus()` | `{ isOnline: boolean }` | NetInfo wrapper |

---

## Stores (`mobile/src/store/`)

### profileStore

**File:** `profileStore.ts`

**Persisted:** Yes (AsyncStorage key: `crs_pulse.profile`)

**State shape:**
```typescript
type LocalProfile = {
  crs_score: number;
  category: ProgramCategory;
  accent_color: string;
  theme: 'system' | 'light' | 'dark';
  notifications_enabled: boolean;
  weekly_summary_enabled: boolean;
  calculatorInputs: CalcInputs;
};
```

**CalcInputs fields:** maritalStatus, age, educationLevel, firstLanguageTest (type + R/W/L/S scores), secondLanguageTest, canadianWorkExp (years), foreignWorkExp (years), spouseEducation, spouseLanguageTest, spouseCanadianWorkExp, provincialNomination, validJobOffer, jobOfferNocTeer, canadianSibling, canadianEducation (years), tradeCertificate, tefScaleVersion.

**Derived export:** `crsScore` — computed by running `crsCalculator` on the stored `CalcInputs`.

**Actions:** `load()`, `save()`, `saveCalcInputs(inputs)`, `reset()`, `clear()`

---

### drawsStore

**File:** `drawsStore.ts`

**Persisted:** Yes (draws array + lastFetched timestamp)

**State shape:**
```typescript
type DrawsStore = {
  draws: Draw[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastFetched: string;
  error: string | null;
};
```

**Cache:** 1-hour stale (STALE_MS = 3_600_000). Serves cached data immediately on app open, refreshes in background if stale.

**Retry:** 3 attempts, exponential backoff (1s, 2s, 4s), on HTTP 5xx or 429.

**Push de-dup:** `LAST_SEEN_DRAW` key in AsyncStorage (separate from notificationsStore) prevents duplicate push alerts for the same draw.

**Actions:** `load()` (cache-first), `refresh()` (force fetch), `setLastSeen(drawNumber)`

---

### applicationStore

**File:** `applicationStore.ts`

**Persisted:** Yes

**State shape:**
```typescript
type TrackedApplication = {
  categoryId: string;
  typeId: string;
  appliedDate: string | null;
};
```

**Actions:** `load()`, `save(application)`, `clear()`

---

### timelineStore

**File:** `timelineStore.ts`

**Persisted:** Yes

**State shape:**
```typescript
type Milestone = {
  id: string;
  type: MilestoneType;
  date: string;        // YYYY-MM-DD
  note: string;
  customLabel?: string;
  customEmoji?: string;
};
```

**Milestone types (15):** ITA, Application Submitted, AOR, Biometrics Requested, Biometrics Completed, Medical Requested, Medical Passed, Passport Requested, Passport Submitted, Passport Collected, ADR, Portal 1, Portal 2, Final Decision, Custom.

**Actions:** `load()`, `add(milestone)`, `update(id, updates)`, `remove(id)`, `clearAll()`

---

### premiumStore

**File:** `premiumStore.ts`

**Persisted:** Yes (AsyncStorage mirror for fast cold start; Play is source of truth)

**State shape:**
```typescript
type PremiumStore = {
  isPremium: boolean;
  loaded: boolean;
  purchasing: boolean;
  price: string | null;
  error: string | null;
  billingAvailable: boolean;
};
```

**IAP product:** `crs_pulse.analytics_unlock` (non-consumable managed product, Google Play)

**Fail-open:** `isPremium = true` when billing is unavailable (iOS without StoreKit, emulator, transient outage).

**Actions:** `init()` (connect + verify entitlement), `purchase()` (launch Play sheet), `restore()` (re-query Play)

---

### processingTimesStore

**File:** `processingTimesStore.ts`

**Persisted:** Yes (7-day cache)

**State shape:**
```typescript
type LiveProcessingTimes = {
  [categoryId: string]: {
    [typeId: string]: {
      months: number;
      varies?: boolean;
      method?: string;
      peopleWaiting?: number;
    }
  }
};
```

**Data source:** `data/processing-times.json` on GitHub (mirrored from IRCC). 7-day cache. Falls back to bundled `features/tracker/data/processingTimes.ts` on fetch failure.

**Actions:** `load()` (cache-first)

---

### eePoolStore

**File:** `eePoolStore.ts`

**Persisted:** Yes (7-day cache)

**State shape:**
```typescript
type EePoolData = {
  updated: string;
  source: string;
  pool: {
    total: number;
    distribution: PoolBand[];   // [{range: "601-1200", count: N}, ...]
  };
  levels: LevelsPlan;           // year, eeTarget, pnpTarget, etc.
};
```

**Data source:** `data/ee-pool.json` on GitHub. 7-day cache. Falls back to bundled `EE_POOL_FALLBACK` snapshot (January 8, 2026).

**Actions:** `load()` (cache-first)

---

### notificationsStore (feature-local)

**File:** `features/notifications/store/notificationsStore.ts`

**Persisted:** Yes

**State shape:**
```typescript
type NotificationsStore = {
  seenDraw: number | null;  // highest draw number seen on Notifications screen
  loaded: boolean;
};
```

**Purpose:** Drives the bell badge in `AppHeader`. Separate from `drawsStore.LAST_SEEN_DRAW` (which is for push de-duplication, not badge display).

**Actions:** `load()`, `markSeen(drawNumber)`, `clear()`

---

## Services (`mobile/src/services/`)

### pushService.ts

Manages Expo push token lifecycle.

| Function | What it does |
|---|---|
| `registerForPushNotifications()` | Requests permission, gets Expo token, POSTs to worker `/register` |
| `unregisterPushNotifications()` | DELETEs token from worker `/revoke` |
| `setupPushListeners()` | Listens for foreground + background push events |

- Skips silently on simulator, Expo Go, and unconfigured projects
- Uses Bearer auth (`EXPO_PUBLIC_PUSH_API_KEY`)

### iapService.ts

Thin wrapper over `react-native-iap` for Google Play Billing.

| Function | What it does |
|---|---|
| `connect()` | Opens billing connection; idempotent; flushes pending purchases (Android) |
| `fetchProducts()` | Gets store product metadata (localized price) |
| `buy()` | Launches Play purchase sheet |
| `getOwnedSkus()` | Returns owned SKUs — source of truth for entitlement |

### errorReporter.ts

Production-safe error logging.

| Function | What it does |
|---|---|
| `reportError(error, source?)` | Buffers error in ring buffer |
| `transmit()` | POSTs buffered errors to `EXPO_PUBLIC_ERROR_REPORT_URL` |

- Installs global `ErrorUtils` handler for uncaught JS exceptions
- No-ops / console.warn in development
- Never throws; errors never mask the original failure

---

## Workers — Cloudflare Push (`workers/push/src/`)

### index.ts

Main entry point. Two export handlers:

**`fetch(request, env)`** — HTTP:

| Route | Method | Auth | Handler |
|---|---|---|---|
| `/health` | GET | None | Returns 200 OK |
| `/register` | POST | `Bearer PUSH_API_SECRET` | Validates token, rate-limits per IP, stores in KV |
| `/revoke` | DELETE | `Bearer PUSH_API_SECRET` | Tombstones token in KV |
| `/sync` | POST | `Bearer SYNC_SECRET` | Manually triggers receipt check + draw check |

**`scheduled(event, env)`** — Cron (every 15 min):
1. `processReceipts()` — Poll Expo receipt API for pending delivery statuses; revoke DeviceNotRegistered tokens
2. `checkAndNotify()` — Fetch latest draw from GitHub mirror; compare to KV `LAST_DRAW_KEY`; if new draw, fan out Expo push in 100-message chunks

### tokenStore.ts

KV token storage operations.

- **Key format:** `token:<platform>:<hash>`
- **Tombstone format:** `token:<platform>:<hash>:revoked`
- Auto-migrates legacy single-array format on first read
- `list()`, `register(token, platform)`, `revoke(token)`, `isRevoked(token)`

### expoValidate.ts

Calls the Expo push API to probe-validate a token before storing it. Prevents storing invalid tokens at registration time.

### expoReceipts.ts

Async delivery status polling.

- Stores accepted ticket IDs in KV (`receipts:<id>`)
- `processReceipts()` — Fetches batches of receipt IDs, POSTs to Expo receipt API, handles `DeviceNotRegistered` failures by revoking the token

---

## Data Files (`data/`)

| File | Updated by | Mobile cache | Fallback |
|---|---|---|---|
| `latest-draw.json` | GitHub Actions (IRCC mirror) | N/A — worker reads this | N/A |
| `processing-times.json` | GitHub Actions (IRCC mirror, monthly) | 7 days | `features/tracker/data/processingTimes.ts` |
| `ee-pool.json` | GitHub Actions (when IRCC publishes new pool data) | 7 days | `EE_POOL_FALLBACK` constant in eePoolStore |

---

## Theme System (`mobile/src/theme/`)

### colors.ts

Two palettes: `dark` and `light`. Each has:

| Token | Examples |
|---|---|
| Brand | `navyDark`, `electricIndigo`, `success`, `warning`, `danger` |
| Surface | `background`, `card`, `input`, `border` |
| Text | `primary`, `secondary`, `muted`, `inverse` |

Rule: Always use `useColors()` hook — never hardcode hex values.

### index.ts exports

- **`spacing`:** `xs` (4), `sm` (8), `base` (12), `md` (16), `lg` (24), `xl` (32), `xxl` (48)
- **`typography`:** Font sizes `xs`→`4xl` + weights `regular`, `medium`, `semibold`, `bold`, `black`
- **`shadows`:** Elevation presets (`sm`, `md`, `lg`) for iOS + Android

---

## Types (`mobile/src/types/index.ts`)

| Type | Values / Shape |
|---|---|
| `Category` | CEC, General, Healthcare, STEM, Trades, French, PNP, Agriculture, Education |
| `ProgramCategory` | `Category` + FSW + FST |
| `Draw` | `{ id, draw_number, date, category, cutoff_score, invitations_issued, tie_breaking_rule }` |
| `DrawFilter` | `last_month` \| `last_year` \| `all` |
| `RootStackParamList` | All stack route params |
| `MainTabParamList` | All tab route params |
| `MilestoneType` | 15 milestone types (see timelineStore section) |

---

## Constants (`mobile/src/constants/index.ts`)

| Constant | Value / Notes |
|---|---|
| `APP_NAME` | `"CRS Pulse"` |
| `STORAGE_KEYS` | All AsyncStorage key strings (namespaced `crs_pulse.*`) |
| `IAP_PRODUCTS.ANALYTICS_UNLOCK` | `"crs_pulse.analytics_unlock"` |
| `CATEGORY_LABELS` | Human-readable labels for all program categories |
| `PROCESSING_TIMES_URL` | GitHub mirror URL for processing-times.json |
| `EE_POOL_URL` | GitHub mirror URL for ee-pool.json |
| `CRS_MIN` / `CRS_MAX` | `0` / `1200` |

---

## Environment Variables

### Mobile (`mobile/.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_PUSH_URL` | Yes | Cloudflare Worker base URL |
| `EXPO_PUBLIC_PUSH_API_KEY` | Yes | Bearer token (must match worker `PUSH_API_SECRET`) |
| `EAS_PROJECT_ID` | Yes | Expo EAS project ID |
| `EXPO_PUBLIC_APP_STORE_ID` | No | For in-app "Rate" link on iOS |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No | Override privacy policy URL |
| `EXPO_PUBLIC_ERROR_REPORT_URL` | No | Endpoint for errorReporter.transmit() |

### Worker (`wrangler secret put`)

| Secret | Purpose |
|---|---|
| `PUSH_API_SECRET` | Bearer auth for `/register` and `/revoke` |
| `SYNC_SECRET` | Bearer auth for `/sync` |
