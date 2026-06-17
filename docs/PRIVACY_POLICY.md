# CRS Pulse Privacy Policy

**Effective date:** June 17, 2026  
**App:** CRS Pulse – Express Entry Calculator  
**Contact:** balwinderxcode@gmail.com

## Summary

CRS Pulse is a local-first mobile app. Your CRS profile data stays on your device. We do not operate user accounts. The only data that ever leaves your device is an anonymous push token (and only if you enable draw alerts). We do not collect any device identifier.

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

- **Data Not Linked to You:** CRS calculator inputs and timeline data (stored on device only)
- **Data Used to Track You:** None
- **Identifiers:** Push notification token (only if you enable draw alerts)
- **Purchases:** A one-time, non-consumable in-app purchase ("Analytics unlock") processed by the app store. We do not receive or store your payment details.

## Data sent to third parties

### IRCC (Government of Canada)

Draw history is fetched directly from the official public JSON feed at `canada.ca`. No personal data is sent — only a standard HTTP request.

### Push notifications (optional)

If you enable draw notifications, the app registers an anonymous Expo push token with our Cloudflare Worker so we can alert you when IRCC publishes a new draw. No CRS profile data is included — only the device token and platform (iOS/Android).

You can disable notifications and revoke your token at any time in Settings.

### In-app purchase

The Analytics "Improve" features are unlocked with an optional **one-time, non-consumable** in-app purchase, processed entirely by Google Play (and, where offered, the App Store). Payment is handled by the store — we never receive or store your card or payment information, and we do not collect any device identifier for entitlement (ownership is read back from the store).

## What we do not collect

- No user accounts or login
- No analytics trackers or advertising SDKs
- No sale of personal data
- No immigration profile data on our servers
- No payment information (purchases are handled by the app store)

## Data retention

Local data persists until you uninstall the app or use Reset in Settings. Push tokens are removed when you disable notifications or revoke via the worker API. We do not retain any other off-device data.

## Children's privacy

CRS Pulse is not directed at children under 13.

## Changes

We may update this policy. The effective date above will change when we do. Continued use after changes constitutes acceptance.

## Contact

Questions: balwinderxcode@gmail.com
