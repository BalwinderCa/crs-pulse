#!/usr/bin/env node
// Publish an over-the-air (EAS Update) release to the production channel.
//
//   npm run ota -- "what changed"            bundle, verify, publish
//   npm run ota -- --dry-run "what changed"  bundle and verify only
//
// Why not plain `eas update`: EXPO_PUBLIC_* values are inlined into the bundle
// when it is built. A store build gets them from eas.json's production "env"
// block plus the EAS "production" environment (EXPO_PUBLIC_PUSH_API_KEY).
// `eas update` reads only the latter, so on its own it would publish a bundle
// with ads, analytics and the push URL switched off. This script bundles with
// both sources, checks the result, and only then publishes that exact bundle.
//
// An update reaches only binaries whose app version equals `version` in
// app.config.js (runtimeVersion policy "appVersion"), and can only change
// JavaScript and assets. Native modules or app.config.js changes need a build.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const message = args.filter((a) => a !== '--dry-run').join(' ').trim();
if (!message) {
  console.error('Usage: npm run ota -- [--dry-run] "what changed"');
  process.exit(1);
}

const fail = (why) => {
  console.error(`\nNot published: ${why}`);
  process.exit(1);
};

const profileEnv = require(path.join(root, 'eas.json')).build.production.env;
const env = { ...profileEnv, ...process.env };

// Each of these must end up inside the bundle for its platform.
const REQUIRED = {
  ios: ['EXPO_PUBLIC_PUSH_URL', 'EXPO_PUBLIC_POSTHOG_HOST', 'EXPO_PUBLIC_ADMOB_NATIVE_IOS', 'EXPO_PUBLIC_ADMOB_APP_OPEN_IOS'],
  android: ['EXPO_PUBLIC_PUSH_URL', 'EXPO_PUBLIC_POSTHOG_HOST', 'EXPO_PUBLIC_ADMOB_NATIVE_ANDROID', 'EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID'],
};
for (const name of new Set([...REQUIRED.ios, ...REQUIRED.android, 'EXPO_PUBLIC_POSTHOG_KEY'])) {
  if (!env[name]) fail(`${name} is missing from eas.json's production env.`);
}
if (env.EXPO_PUBLIC_MONETIZATION_ENABLED !== 'true') fail('EXPO_PUBLIC_MONETIZATION_ENABLED is not "true".');

const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: root, env, stdio: 'inherit' });
const eas = (...easArgs) => run('npx', ['--yes', 'eas-cli@latest', ...easArgs]);

// Bundle inside the EAS production environment so the push key is inlined too.
// --clear matters: Metro caches transformed files without regard to env values,
// so a cached bundle can carry whatever was set the last time Metro ran.
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
eas(
  'env:exec',
  'production',
  'test -n "$EXPO_PUBLIC_PUSH_API_KEY" || { echo "EXPO_PUBLIC_PUSH_API_KEY is not set in the EAS production environment"; exit 1; }; ' +
    'npx expo export --platform ios --platform android --output-dir dist --dump-sourcemap --dump-assetmap --clear',
  '--non-interactive',
);

for (const platform of Object.keys(REQUIRED)) {
  const dir = path.join(dist, '_expo', 'static', 'js', platform);
  const bundles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(hbc|js)$/.test(f)) : [];
  if (bundles.length === 0) fail(`no ${platform} bundle in dist/.`);
  const code = Buffer.concat(bundles.map((f) => fs.readFileSync(path.join(dir, f))));
  for (const name of REQUIRED[platform]) {
    if (!code.includes(env[name])) fail(`the ${platform} bundle does not contain ${name}.`);
  }
  console.log(`✓ ${platform} bundle carries the production configuration`);
}

const { version } = require(path.join(root, 'app.config.js'))();
if (dryRun) {
  console.log(`\nDry run: bundle is good. It would go to ${version} installs on the production channel.`);
  process.exit(0);
}

eas(
  'update',
  '--channel', 'production',
  '--environment', 'production',
  '--skip-bundler',
  '--input-dir', 'dist',
  '--message', message,
  '--non-interactive',
);
console.log(`\nPublished to ${version} installs. Devices apply it on the second launch after it downloads.`);
