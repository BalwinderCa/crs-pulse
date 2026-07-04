# CRS Pulse Privacy Policy

**Effective date:** July 4, 2026  
**App:** CRS Pulse – Express Entry Calculator  
**Contact:** contact@crspulse.com

## Summary

CRS Pulse is a **completely free**, local-first mobile app — no ads, no in-app purchases, and no subscriptions. Your CRS profile data stays on your device, and we do not operate user accounts. The only personal data we send to **our own** servers is an anonymous push token, and only if you enable draw alerts. We never collect your CRS profile or immigration data off-device.

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

- **Data Not Collected:** the app collects no data linked to you and does not track you.
- CRS calculator inputs and timeline data are stored on device only.
- **Identifiers:** an anonymous push notification token (only if you enable draw alerts).

## Data sent to third parties

### IRCC (Government of Canada)

Draw history is fetched directly from the official public JSON feed at `canada.ca`. No personal data is sent — only a standard HTTP request.

### Push notifications (optional)

If you enable draw notifications, the app registers an anonymous Expo push token with our Cloudflare Worker so we can alert you when IRCC publishes a new draw. No CRS profile data is included — only the device token and platform (iOS/Android).

You can disable notifications and revoke your token at any time in Settings.

## What we do not collect

- No user accounts or login
- No ads and no advertising SDKs
- No in-app purchases or payment information
- No analytics trackers
- No sale of personal data
- No immigration profile data on our servers

## Data retention

Local data persists until you uninstall the app or use Reset in Settings. Push tokens are removed when you disable notifications or revoke via the worker API. We do not retain any other off-device data.

## Children's privacy

CRS Pulse is not directed at children under 13.

## Changes

We may update this policy. The effective date above will change when we do. Continued use after changes constitutes acceptance.

## Contact

Questions: contact@crspulse.com
