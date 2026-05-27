# CRS Pulse — App Store Listing (iOS)

## App Name
CRS Pulse – Express Entry Tracker

## Subtitle (30 chars max)
Track Your CRS Score & Draws

## Promotional Text (170 chars max — updatable without review)
New draw? You'll know instantly. CRS Pulse tracks Express Entry cutoffs, trends, and your personal chances — all updated in real time.

## Description (4000 chars max)

**CRS Pulse** is the essential companion app for Canadian Express Entry candidates.
Stay informed, track your score, and understand your immigration chances — all in one place.

---

**Real-time Draw Tracking**
• Instant push notifications when a new Express Entry draw is published
• Complete draw history with cutoff scores, categories, and invitation counts
• Filter by time period: Last Month, Last Year, or All Time

**Your Personal CRS Dashboard**
• Enter your current CRS score and Express Entry category
• See exactly how your score compares to the latest draw cutoff
• Visual indicator: Are you above, near, or below the cutoff?

**Smart Prediction Engine**
• Personalized prediction based on your score vs recent draw averages
• Three clear prediction levels: High Chance, Moderate Chance, Long Wait
• Score gap analysis: know exactly how many points you need to improve

**Analytics & Trends**
• Historical cutoff trend charts (3 months, 6 months, 1 year, all time)
• Average, highest, and lowest cutoffs by category
• Trend direction: is the bar rising or falling?

**Supported Categories**
• Canadian Experience Class (CEC)
• No Category (General)
• Healthcare Occupations
• STEM Occupations
• Trade Occupations
• French Language Proficiency

**Push Notifications**
• Notified the moment a new draw is published
• Weekly summary of your standing
• Fully customizable — enable only what matters to you

**Offline Support**
• Cached data available without internet connection
• Seamless sync when you reconnect

**Sign In Your Way**
• Email & password
• Sign in with Apple (required for App Store)
• Sign in with Google

---

*CRS Pulse is an independent tool and is not affiliated with Immigration, Refugees and Citizenship Canada (IRCC). Draw data is sourced from publicly available IRCC information.*

---

## Keywords (100 chars max, comma-separated)
express entry,CRS score,immigration,Canada,IRCC,draw tracker,permanent residence,points

## Category
Primary: Productivity
Secondary: Lifestyle

## Age Rating
4+ (no objectionable content)

## Privacy Policy URL
https://crspulse.ca/privacy

## Support URL
https://crspulse.ca/support

## Marketing URL (optional)
https://crspulse.ca

## Copyright
© 2025 CRS Pulse. All rights reserved.

---

## Screenshots

### iPhone 6.9" (iPhone 16 Pro Max — required)
1. Dashboard — Score card showing 527 vs 524 cutoff (+3, High Chance)
2. Draw History — Filtered CEC draws list
3. Analytics — Line chart 12-month trend
4. Notifications — Draw #280 alert received
5. Profile Setup — CRS score + category picker

### iPhone 6.7" (iPhone 16 Plus — optional, reuse 6.9" if same layout)
Same as above

### iPad Pro 13" (if supporting iPad — skip if supportsTablet: false)
N/A — tablet not supported

---

## App Icon (1024x1024 PNG, no alpha)
- Background: Deep navy (#0A1628)
- Foreground: Canadian maple leaf outline + CRS gauge
- Accent: Canadian flag red (#FF0000) + brand blue (#1A6DFF)

---

## App Store Connect — Data Privacy

### Data Collected (under App Privacy → Data Types)

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Name | Yes | Yes | No |
| Email Address | Yes | Yes | No |
| User ID | Yes | Yes | No |
| Device ID | Yes | Yes | No |
| Coarse Location | No | — | — |
| Browsing History | No | — | — |
| Purchases | No | — | — |

### Data Use Purposes
- App Functionality: name, email, user ID, device ID
- Analytics: aggregated, non-identifying usage patterns only

---

## Review Notes (for App Review team)
- Apple Sign In implemented via `expo-apple-authentication`
- Sign in with Apple is presented on the Login and Register screens on iOS
- Google Sign In is also available as an alternative
- Push notifications require APNs key uploaded to Firebase console (FCM bridging)
- No in-app purchases; app is free
- No ads
- Test account: reviewer@crspulse.ca / TestReview2025!
