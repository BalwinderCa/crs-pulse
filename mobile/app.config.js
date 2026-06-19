const fs = require('node:fs');
const path = require('node:path');

// Android push (FCM V1) requires google-services.json baked into the build.
// On EAS, provide it as a file-type env var named GOOGLE_SERVICES_JSON;
// locally, drop the real file at mobile/google-services.json (gitignored).
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync(path.join(__dirname, 'google-services.json'))
    ? './google-services.json'
    : undefined);

if (!googleServicesFile && process.env.APP_ENV === 'production') {
  console.warn(
    '[CRS Pulse] google-services.json not found — Android push notifications will not work. ' +
      'Set the GOOGLE_SERVICES_JSON file env var in EAS or add mobile/google-services.json.',
  );
}

// Created via `eas init` as @balwinder98/crs-pulse.
const projectId = process.env.EAS_PROJECT_ID || '255e43da-70b7-44a9-a50f-88522339a9cd';
const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md';

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  // Launcher/home-screen label. Store listing names are set in Play Console /
  // App Store Connect, not here.
  name: 'CRS Pulse',
  slug: 'crs-pulse',
  owner: 'balwinder98',
  version: '1.0.1',
  newArchEnabled: false,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#0A1628',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.crspulse.app',
    buildNumber: '1',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      CFBundleDisplayName: 'CRS Pulse',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    splash: {
      backgroundColor: '#0A1628',
      resizeMode: 'native',
    },
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A1628',
    },
    package: 'com.crspulse.app',
    permissions: ['VIBRATE', 'POST_NOTIFICATIONS'],
    softwareKeyboardLayoutMode: 'resize',
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    // Google Play Billing (one-time analytics unlock). The plugin adds the
    // com.android.vending.BILLING permission and the native billing client.
    ['react-native-iap', { paymentProvider: 'Play Store' }],
    // Google AdMob banner ads (shown to free users only; Premium removes them).
    // The IDs below are Google's PUBLIC TEST app IDs — replace with your real
    // AdMob app IDs (env GOOGLE_ADMOB_ANDROID_APP_ID / _IOS_APP_ID) before
    // shipping, or the build serves only test ads. Changing these requires a
    // native rebuild.
    [
      'react-native-google-mobile-ads',
      {
        androidAppId:
          process.env.GOOGLE_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId:
          process.env.GOOGLE_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0',
        },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#1A6DFF',
        sounds: [],
        iosDisplayInForeground: true,
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0A1628',
        ios: {
          image: './assets/splash.png',
          resizeMode: 'cover',
          enableFullScreenImage_legacy: true,
        },
        android: {
          // Rendered from assets/logo.svg (source of truth for the brand mark)
          image: './assets/splash-icon-android.png',
          imageWidth: 200,
          backgroundColor: '#0A1628',
        },
      },
    ],
  ],
  scheme: 'crspulse',
  extra: {
    eas: {
      projectId,
    },
    privacyPolicyUrl,
    githubRepoUrl: 'https://github.com/BalwinderCa/crs-pulse',
    appStoreId: appStoreId || undefined,
  },
});
