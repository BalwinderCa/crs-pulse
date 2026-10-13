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

  // Without a url the native module disables itself silently, and a build that
  // shipped that way could never be fixed over the air.
  it('points EAS Update at this project and pins updates to the app version', () => {
    const config = require('../../app.config.js')();

    expect(config.updates.url).toBe(`https://u.expo.dev/${config.extra.eas.projectId}`);
    expect(config.extra.eas.projectId).toMatch(/^[0-9a-f-]{36}$/);
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    expect(config.updates.fallbackToCacheTimeout).toBe(0);
  });
});
