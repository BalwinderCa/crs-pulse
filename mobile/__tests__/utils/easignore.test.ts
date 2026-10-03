import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

// eas-cli uploads the repository from its root and filters it with the root
// .easignore alone (while that file exists, every .gitignore is skipped). If a
// local mobile/ios or mobile/android slips into the upload, EAS skips
// `expo prebuild` and compiles that stale project instead of app.config.js. That
// is how iOS 1.0.10 build 56 shipped without NSUserTrackingUsageDescription and
// crashed on launch. These checks use the same `ignore` matcher eas-cli uses.
const REPO_ROOT = path.resolve(__dirname, '../../..');
const rules = ignore().add(fs.readFileSync(path.join(REPO_ROOT, '.easignore'), 'utf8'));

describe('root .easignore', () => {
  it.each([
    'mobile/ios/CRSPulse/Info.plist',
    'mobile/ios/Podfile',
    'mobile/android/app/build.gradle',
    'mobile/android/app/src/main/AndroidManifest.xml',
  ])('keeps the generated native project out of EAS uploads: %s', (file) => {
    expect(rules.ignores(file)).toBe(true);
  });

  it.each(['mobile/app.config.js', 'mobile/eas.json', 'mobile/package.json', 'mobile/src/services/adsService.ts'])(
    'still uploads %s',
    (file) => {
      expect(rules.ignores(file)).toBe(false);
    },
  );

  it('has no mobile/.easignore, which eas-cli would never read', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'mobile/.easignore'))).toBe(false);
  });
});
