/** @type {import('expo/config').ExpoConfig} */
const base = require('./app.json').expo;

const projectId = process.env.EAS_PROJECT_ID || base.extra?.eas?.projectId;

module.exports = () => ({
  ...base,
  extra: {
    ...base.extra,
    eas: {
      ...base.extra?.eas,
      ...(projectId && projectId !== 'YOUR_EAS_PROJECT_ID' ? { projectId } : {}),
    },
    privacyPolicyUrl: 'https://crspulse.app/privacy',
  },
});
