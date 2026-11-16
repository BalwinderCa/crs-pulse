# CRS Pulse — App Store Connect Listing (iOS)

Copy/paste into App Store Connect → your app → App Information / Version. Character
limits are noted; all fields below are within them.

---

## App Name  (max 30)
```
IRCC Tracker: Score & Draws
```
_Live until 1.0.17: `CRS Pulse - IRCC Tracker`. Chosen 2026-11-14 for 1.0.17 (27 chars); precedent on the
App Store: "IRCC Tracker: Express Entry" and "IRCC Tracker - Moose". iOS only: Play rejected "IRCC" in its
title, so Play stays "CRS Pulse: Score & Draws". Never use "Express Entry" in a name (IRCC official mark).
The on-device name stays "CRS Pulse"._
_French (Canada) localization (29):_ `Suivi IRCC : score et tirages` [REVIEW] (was `CRS Pulse : score et tirages`)
_Both entered and saved in App Store Connect on 2026-11-15 in the new 1.0.17 version (Prepare for Submission); Apple reviews them with the 1.0.17 build. Subtitles unchanged: `CRS score & IRCC draw alerts` / `Score CRS et alertes de tirage`._
_Done 2026-11-16 in the 1.0.17 version: `ircc` dropped from Keywords (the name holds "IRCC"), `cec` added. fr-CA keywords also dropped `ircc` (now `immigration,canada,calculateur,pnp,points,ptqf,nclc,rp,résidence,permanente,sirs,eoi,tef,tcf`). What's New en: "A fresh new app icon. Plus small fixes and improvements." fr-CA: "Une toute nouvelle icône d'application. Et quelques petites corrections et améliorations."_
_Plan (2026-11-15): only if Apple approves this name with 1.0.17, rename inside the app by OTA (header
logo, side menu, text). Decide then whether Android shows it too (Play rejected "IRCC" in its title).
The home-screen name (`app.config.js` name / CFBundleDisplayName) needs a store build, so it would follow in
the build after that._

## Subtitle  (max 30)
```
CRS score & IRCC draw alerts
```

## Promotional Text  (max 170 — editable anytime without review)
```
Track every Express Entry draw the moment it lands, calculate your CRS score, and follow your PR application from ITA to landing — all private, all on your phone.
```

## Keywords  (max 100, comma-separated, no spaces)
```
immigration,canada,calculator,pnp,score,fsw,noc,clb,pr,visa,sirs,eoi,points,bcpnp,sinp,celpip,cec
```
_Don't repeat words already in the name/subtitle (express, entry, crs, draw) — Apple indexes those separately._

## Primary Category
```
Reference
```
## Secondary Category
```
Utilities
```

## Support URL
```
https://www.crspulse.com
```
## Marketing URL (optional)
```
https://www.crspulse.com
```
## Privacy Policy URL
```
https://www.crspulse.com/privacy
```

---

## Description  (max 4000)

```
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
```

---

## What's New in This Version  (first release — optional)
```
Welcome to CRS Pulse! Calculate your CRS score, get instant Express Entry draw alerts, and track your PR application — all in one private, on-device app.
```

---

## App Review notes (paste into "Notes" in the Submit form)
```
- All user data is stored locally on-device. No login/account is required, so no demo credentials are needed.
- The app shows ads via Google AdMob (free tier) and requests App Tracking Transparency on first launch.
- There are no in-app purchases on iOS in this version. The premium "Your Plan" analytics tab is unlocked for free on iOS; there is no purchase flow to test.
- Live draw data is fetched from public IRCC sources for informational/estimate purposes only.
```

---

## App Privacy questionnaire — how to answer
Based on this app's actual behavior:

- **Identifiers → Device ID / Advertising identifier**: YES — collected by Google AdMob.
  - Used for: **Third-Party Advertising**, **Analytics**. Linked to user: No. Tracking: **Yes** (ATT prompt is shown).
- **Usage Data**: only if AdMob measurement is enabled — declare **Product Interaction** under Analytics/Advertising to be safe.
- **Everything else** (name, email, contacts, location, health, financial, contacts, browsing history): **NOT collected** — profile/CRS/application data never leaves the device.
- Push tokens are anonymous (no personal data); they are not tied to identity.

## Other settings
- **Age Rating**: 4+ (no objectionable content). Answer "None" to all content questions.
- **Price**: Free.
- **Encryption / Export compliance**: already declared in the binary
  (`ITSAppUsesNonExemptEncryption = false`) — App Store Connect won't ask again.
</content>
</invoke>
