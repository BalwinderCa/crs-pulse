# CRS Pulse — Release Checklist

## Pre-Release

### Code
- [ ] All feature screens complete (Splash, Login, Register, Dashboard, Draws, Analytics, Notifications, Profile, Settings)
- [ ] All API endpoints tested against real backend
- [ ] FCM push notifications tested on physical Android device
- [ ] APNs push notifications tested on physical iOS device (via Firebase FCM bridge)
- [ ] Apple Sign In tested on physical iOS device (simulator not supported)
- [ ] Offline mode tested (airplane mode → cached data shows)
- [ ] Expo prebuild run: `expo prebuild --clean`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Tests pass: `npm test`
- [ ] Lint clean: `npm run lint`

### Backend
- [ ] `composer install --no-dev --optimize-autoloader`
- [ ] `php artisan config:cache && php artisan route:cache && php artisan view:cache`
- [ ] Database migrations run on production
- [ ] Redis configured and running
- [ ] Queue workers running
- [ ] Scheduler running
- [ ] Filament admin account created
- [ ] Firebase credentials file uploaded to server
- [ ] `.env` production values set (no debug, correct DB, Redis)
- [ ] Rate limiting tested
- [ ] HTTPS enforced

### Firebase
- [ ] Firebase project created
- [ ] Android app registered (package: `com.crspulse.app`)
- [ ] iOS app registered (bundle ID: `com.crspulse.app`)
- [ ] `google-services.json` in `mobile/` (Android)
- [ ] `GoogleService-Info.plist` in `mobile/` (iOS)
- [ ] APNs Authentication Key (`.p8`) uploaded to Firebase → Project Settings → Cloud Messaging → iOS app
- [ ] Service account JSON in `backend/storage/firebase-credentials.json`
- [ ] `FIREBASE_PROJECT_ID` set in backend `.env`

### Play Store
- [ ] Google Play Console account created
- [ ] App created in Play Console
- [ ] App bundle (AAB) built: `eas build --platform android --profile production`
- [ ] AAB uploaded to Internal Testing track
- [ ] App icon (512x512 PNG) uploaded
- [ ] Feature graphic (1024x500 PNG) uploaded
- [ ] Screenshots (minimum 2) uploaded
- [ ] Short description written (≤80 chars)
- [ ] Full description written
- [ ] Privacy policy URL added
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed:
  - Email address: Collected, not shared
  - Name: Collected, not shared
  - User IDs: Collected, not shared
  - Push token: Collected for notifications
- [ ] App reviewed and approved for Internal Testing

### App Store (iOS)
- [ ] Apple Developer Program enrolled ($99/yr at developer.apple.com)
- [ ] App Store Connect — new app created (bundle ID: `com.crspulse.app`)
- [ ] Certificates & Profiles:
  - [ ] Distribution certificate created in Keychain / EAS managed signing
  - [ ] App Store provisioning profile created
  - [ ] Apple Sign In capability enabled in Identifiers → `com.crspulse.app`
  - [ ] Push Notifications capability enabled (for APNs)
  - [ ] APNs Auth Key (`.p8`) created in Certificates → Keys (use same key for Firebase)
- [ ] `eas.json` submit section filled:
  - `appleId`: your Apple ID email
  - `ascAppId`: numeric App Store Connect App ID (from App Information page)
  - `appleTeamId`: 10-char team ID (from Membership page)
- [ ] IPA built: `eas build --platform ios --profile production`
- [ ] IPA uploaded to TestFlight via `eas submit --platform ios --profile production`
- [ ] TestFlight internal testing completed (at least 1 tester)
- [ ] App Store Connect — App Information filled:
  - [ ] App name: `CRS Pulse – Express Entry Tracker`
  - [ ] Subtitle: `Track Your CRS Score & Draws`
  - [ ] Privacy policy URL added
  - [ ] Category: Productivity / Lifestyle
- [ ] App Store Connect — Version Information filled:
  - [ ] Screenshots (iPhone 6.9" required — 5 minimum)
  - [ ] Promotional text added
  - [ ] Description added (see APP_STORE_LISTING.md)
  - [ ] Keywords added (100 chars max)
  - [ ] Support URL + marketing URL added
  - [ ] Copyright: © 2025 CRS Pulse
- [ ] App Privacy (Data Types) declared — see APP_STORE_LISTING.md table
- [ ] Age rating questionnaire completed (4+)
- [ ] Review notes added (test account credentials)
- [ ] Submit for App Review

### Environment Variables (Mobile)
```
EXPO_PUBLIC_API_URL=https://api.crspulse.ca/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
# iOS only — set in EAS secrets or .env.local
EXPO_PUBLIC_APPLE_BUNDLE_ID=com.crspulse.app
```

### Environment Variables (Backend Production)
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.crspulse.ca
DB_HOST=production_host
REDIS_HOST=production_redis
FIREBASE_PROJECT_ID=your_project_id
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_AUTH_PER_MINUTE=10
```

## Version Checklist

| Item | Value |
|------|-------|
| app.json version | 1.0.0 |
| android.versionCode | 1 |
| ios.buildNumber | 1 |
| eas.json profile | production |
| Backend tag | v1.0.0 |

## Post-Launch

- [ ] Monitor Firebase Crashlytics (if configured) for crash reports
- [ ] Monitor backend logs for 500 errors
- [ ] Verify push notifications arriving within 30 seconds of draw publish
- [ ] Confirm analytics cache updates hourly
- [ ] Monitor Redis memory usage
- [ ] Set up uptime monitoring (e.g., UptimeRobot) for API health endpoint

## EAS Build Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# ── Android ─────────────────────────────────────────────────────────────────

# Build APK for internal testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production

# ── iOS ─────────────────────────────────────────────────────────────────────

# Build IPA for TestFlight (internal distribution)
eas build --platform ios --profile preview

# Build IPA for App Store
eas build --platform ios --profile production

# Submit to App Store Connect (TestFlight)
eas submit --platform ios --profile production

# ── Both platforms ───────────────────────────────────────────────────────────

eas build --platform all --profile production
```

## Apple Sign In — Setup Requirements

1. **Apple Developer Console** (developer.apple.com/account)
   - Identifiers → `com.crspulse.app` → enable **Sign In with Apple**
   - Keys → create new key → enable **Sign In with Apple** → download `.p8` (keep safe, one download only)

2. **Firebase Console** → Project Settings → Cloud Messaging → iOS app
   - Upload APNs Auth Key (the `.p8` file), enter Key ID + Team ID

3. **EAS** handles provisioning profile + distribution certificate automatically when `credentialsSource: "remote"` (default for production profile)

4. **Backend** (`AppleAuthService.php`) verifies identity tokens against Apple's JWKS endpoint — no additional config needed beyond the bundle ID matching `com.crspulse.app`
