# CRS Pulse Privacy Policy

**Effective date:** June 16, 2026  
**App:** CRS Pulse – Express Entry Calculator  
**Contact:** balwinderxcode@gmail.com

## Summary

CRS Pulse is a local-first mobile app. Your CRS profile data stays on your device. We do not operate user accounts. The only data that leaves your device is an anonymous push token (if you enable draw alerts) and a one-way hashed device identifier used solely to time the Analytics free trial (described below).

## Data stored on your device

The app stores locally (via AsyncStorage):

- CRS calculator inputs (age, education, language scores, work experience)
- Calculated CRS score and program category
- Theme and notification preferences
- Cached IRCC draw history
- Immigration timeline milestones (if you use the timeline feature)

This data is not transmitted to our servers.

## iOS App Store privacy labels

When completing Apple's App Privacy questionnaire:

- **Data Not Linked to You:** CRS calculator inputs and timeline data (stored on device only); the hashed device identifier used to time the Analytics free trial
- **Data Used to Track You:** None
- **Identifiers:** Push notification token (only if you enable draw alerts); a one-way hashed device identifier (only to time the Analytics free trial)
- **Purchases:** A one-time, non-consumable in-app purchase ("Analytics unlock") processed by the app store. We do not receive or store your payment details.

## Data sent to third parties

### IRCC (Government of Canada)

Draw history is fetched directly from the official public JSON feed at `canada.ca`. No personal data is sent — only a standard HTTP request.

### Push notifications (optional)

If you enable draw notifications, the app registers an anonymous Expo push token with our Cloudflare Worker so we can alert you when IRCC publishes a new draw. No CRS profile data is included — only the device token and platform (iOS/Android).

You can disable notifications and revoke your token at any time in Settings.

### Analytics free-trial integrity (optional Analytics feature)

The Analytics screen is free for a 3-day trial, after which a one-time purchase unlocks it permanently. To stop the trial from being reset by uninstalling and reinstalling, the app computes a **one-way SHA-256 hash** of a device identifier (Android ID / iOS vendor ID) **on your device** and sends only that hash to our Cloudflare Worker — the raw identifier never leaves your device. The Worker stores only a hashed identifier and the trial's start timestamp. It is never linked to your CRS profile, name, or any contact detail, and is not used for tracking or advertising. The record **auto-expires after about 200 days**, and you can delete it immediately with **Reset all data** in Settings (which calls our delete endpoint).

### In-app purchase

The optional "Analytics unlock" is a one-time, non-consumable purchase processed entirely by Google Play (and, where offered, the App Store). Payment is handled by the store — we never receive or store your card or payment information.

## What we do not collect

- No user accounts or login
- No analytics trackers or advertising SDKs
- No sale of personal data
- No immigration profile data on our servers
- No payment information (purchases are handled by the app store)

## Data retention

Local data persists until you uninstall the app or use Reset in Settings. Push tokens are removed when you disable notifications or revoke via the worker API. The hashed trial identifier auto-expires after ~200 days and is deleted immediately when you use **Reset all data**. We do not retain any other off-device data.

## Children's privacy

CRS Pulse is not directed at children under 13.

## Changes

We may update this policy. The effective date above will change when we do. Continued use after changes constitutes acceptance.

## Contact

Questions: balwinderxcode@gmail.com
