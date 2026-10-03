// The ATT purpose string must be in Info.plist whatever the build env says:
// expo-tracking-transparency aborts the app at launch when it is missing
// (iOS 1.0.10 build 56 crashed on every launch this way).
describe('app.config.js', () => {
  const saved = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
    else process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = saved;
    jest.resetModules();
  });

  it.each([undefined, 'false', 'true'])(
    'includes NSUserTrackingUsageDescription when EXPO_PUBLIC_MONETIZATION_ENABLED=%s',
    (value) => {
      if (value === undefined) delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
      else process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = value;
      const config = require('../../app.config.js')();

      expect(config.ios.infoPlist.NSUserTrackingUsageDescription).toEqual(expect.any(String));
      const ads = config.plugins.find(
        (p: unknown) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads',
      );
      expect(ads[1].userTrackingUsageDescription).toBe(
        config.ios.infoPlist.NSUserTrackingUsageDescription,
      );
    },
  );
});
