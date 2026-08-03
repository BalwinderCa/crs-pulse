# Google Play Store Listing

Mirrors the live App Store listing (id 6784619403) so both stores describe the
same app. When the iOS copy changes, update this file from it — the App Store
text is the source of truth, since that is the version that has passed review.

**Ads-only.** The app ships with AdMob banners and no purchasable product, so
this listing must not mention an unlock, upgrade, subscription or Premium tier.
The `react-native-iap` code is dormant: the paywall needs `billingAvailable`,
which stays false while no product exists in Play Console. Declare
**In-app purchases: No** and **Contains ads: Yes**.

## App name (max 30 chars)
CRS Pulse - IRCC Tracker

## Short description (max 80 chars)
Calculate your CRS score, track IRCC draws, and get alerts for new cutoffs.

## Full description (max 4000 chars)

CRS Pulse is the all-in-one companion for Canadian Express Entry applicants. Calculate your score, get notified the instant a new draw is announced, and track your PR application from start to finish — completely private, with all your data stored on your device.

CALCULATE YOUR SCORE
• Comprehensive Ranking System (CRS) calculator using the official scoring formula
• Supports every accepted language test: IELTS, CELPIP, PTE Core, TEF and TCF (with CLB conversion)
• Federal Skilled Worker (FSW) 67-point eligibility grid
• BC PNP Skills Immigration Registration System (SIRS) 200-point calculator
• Saskatchewan (SINP) Expression of Interest 110-point grid

NEVER MISS A DRAW
• Live IRCC Express Entry draw results, refreshed automatically
• Push notification the moment a new draw is published
• Filter draws by category — general, PNP, French, healthcare, trades, STEM and more

DRAW INSIGHTS & ANALYTICS
• Score trends and cut-off history across recent draws
• See where you stand against the latest invitation scores
• Express Entry pool distribution and the federal Immigration Levels Plan at a glance

TRACK YOUR APPLICATION
• Milestone timeline from profile to ITA to PR confirmation
• Estimated IRCC processing times by program and application type
• Per-program document checklists with progress tracking

PRIVATE BY DESIGN
• All of your profile and application data stays on your device
• No account, no sign-up required

CRS Pulse provides estimates only. Scores, draw data, and processing times are for informational purposes and are not a guarantee of eligibility, invitation, or outcome. Always confirm details with official sources before making decisions.

CRS Pulse is an independent app and is not affiliated with, endorsed by, or sponsored by Immigration, Refugees and Citizenship Canada (IRCC) or the Government of Canada.

## What's new (max 500 chars)

First Android release — everything above, now on Play:
• CRS, FSW, BC PNP (SIRS) and Saskatchewan (SINP) calculators
• Live IRCC draws with push alerts for new rounds
• Application timeline, processing-time estimates and document checklists
• Express Entry pool and Immigration Levels Plan insights
• English & French, dark and light themes

For later updates, mirror the iOS release notes for the matching version.

## Category
Tools

> iOS lists this app under Reference (secondary: Utilities). Play's nearest
> equivalent is "Books & Reference"; Tools is kept because comparable
> calculator/tracker apps rank there. Change it if you want strict parity.

## Content rating
Everyone (IARC) — matches the App Store's 4+.

## Contact email
contact@crspulse.com

## Privacy policy
https://www.crspulse.com/privacy

## Graphic assets

Play builds none of these from the app — every one is uploaded by hand under
Main store listing, which is why the listing keeps showing old branding after a
new build ships.

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, no alpha | `mobile/build/play-listing/play-icon-512.png` — current maple-leaf mark |
| Feature graphic | 1024×500 PNG/JPEG, no alpha | `mobile/build/play-listing/play-feature-graphic.png` |
| Phone screenshots | 2–8, min 320px, 9:16 | `mobile/build/screenshots/play-android/` — 8 shots, 1080×2400, captured on a Pixel 6 AVD (Android 15) running the release APK of 1.0.6 |

Screenshots were taken on the AVD named `crspulse` with the SystemUI demo mode
enabled (fixed 9:30 clock, full battery/signal, no notification icons) — rerun
`adb shell am broadcast -a com.android.systemui.demo -e command enter` and
friends before recapturing so the status bar stays consistent. App state is
seeded straight into AsyncStorage rather than typed in; keep the seed SQL with
the screenshots if you need to reproduce the same profile (CRS 545, CEC,
applied 2026-05-15).
