const fs = require('node:fs');
const path = require('node:path');

/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json').expo;

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

const rawProjectId = process.env.EAS_PROJECT_ID || base.extra?.eas?.projectId;
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

module.exports = () => ({
  ...base,
  android: {
    ...base.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  ios: {
    ...base.ios,
    config: {
      ...base.ios?.config,
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ...base.ios?.infoPlist,
      CFBundleDisplayName: 'CRS Pulse',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  extra: {
    ...base.extra,
    eas: {
      ...base.extra?.eas,
      ...(projectId && projectId !== 'YOUR_EAS_PROJECT_ID' ? { projectId } : {}),
    },
    privacyPolicyUrl,
    githubRepoUrl: 'https://github.com/BalwinderCa/crs-pulse',
    appStoreId: appStoreId || undefined,
  },
});
