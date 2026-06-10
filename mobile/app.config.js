/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json').expo;

const projectId = process.env.EAS_PROJECT_ID || base.extra?.eas?.projectId;
const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md';

module.exports = () => ({
  ...base,
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
