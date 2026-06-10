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

const rawProjectId = process.env.EAS_PROJECT_ID;
const projectId =
  rawProjectId && rawProjectId !== 'YOUR_EAS_PROJECT_ID' ? rawProjectId : undefined;

if (!projectId && process.env.APP_ENV === 'production') {
  console.warn(
    '[CRS Pulse] EAS_PROJECT_ID is required for production push notifications. Run `eas init` and set EAS_PROJECT_ID.',
  );
}
const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md';

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  name: 'CRS Pulse – Express Entry Calculator',
  slug: 'crs-pulse',
  version: '1.0.0',
  newArchEnabled: false,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
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
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0A1628',
    },
    package: 'com.crspulse.app',
    versionCode: 1,
    permissions: ['VIBRATE', 'POST_NOTIFICATIONS'],
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
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
        image: './assets/splash.png',
        resizeMode: 'contain',
      },
    ],
  ],
  scheme: 'crspulse',
  extra: {
    eas: {
      ...(projectId ? { projectId } : {}),
    },
    privacyPolicyUrl,
    githubRepoUrl: 'https://github.com/BalwinderCa/crs-pulse',
    appStoreId: appStoreId || undefined,
  },
});
