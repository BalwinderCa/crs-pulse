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

// Linked via `eas init` as @balwinder98/crs-pulse. Set EAS_PROJECT_ID to override.
const projectId = process.env.EAS_PROJECT_ID || '255e43da-70b7-44a9-a50f-88522339a9cd';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://www.crspulse.com/privacy';

// When false the app ships fully free and the ATT tracking purpose string is
// omitted from Info.plist, so the binary matches the "Data Not Collected"
// privacy label. Set EXPO_PUBLIC_MONETIZATION_ENABLED=true in your build env
// (eas.json or EAS secret) to enable ads + the ATT prompt.
const MONETIZATION_ENABLED = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';

// Inline config plugin: adds -Xskip-metadata-version-check to all subproject
// Kotlin compile tasks. Required because play-services-ads 25.0.0 (pulled in
// by react-native-google-mobile-ads 16.x) ships Kotlin metadata compiled with
// Kotlin 2.2, but the project targets Kotlin 1.9.x. Remove once RNGMA bumps
// their minimum Kotlin or we upgrade the project to Kotlin 2.x.
function withKotlinMetadataVersionSkip(config) {
  const { withProjectBuildGradle } = require('@expo/config-plugins');
  return withProjectBuildGradle(config, (mod) => {
    const MARKER = '-Xskip-metadata-version-check';
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += `
// play-services-ads ≥25 ships Kotlin 2.2 metadata; project uses Kotlin 1.9.x.
subprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions { freeCompilerArgs += ["-Xskip-metadata-version-check"] }
    }
}
`;
    }
    return mod;
  });
}

// Inline config plugin: pins the node executable to Node 20 for codegen tasks.
// Node 26 (default brew install) breaks RN codegen for RNGMA specs.
// Only applied when /usr/local/Cellar/node@20 exists (local dev); EAS images
// ship Node 18/20 already.
function withNode20ForCodegen(config) {
  const { withAppBuildGradle } = require('@expo/config-plugins');
  const node20 = '/usr/local/Cellar/node@20/20.20.2/bin/node';
  const { existsSync } = require('node:fs');
  if (!existsSync(node20)) return config;
  return withAppBuildGradle(config, (mod) => {
    const MARKER = 'nodeExecutableAndArgs';
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /^(react \{)/m,
        `$1\n    nodeExecutableAndArgs = ["${node20}"]`,
      );
    }
    return mod;
  });
}

// Inline config plugin: injects the real AdMob App ID into AndroidManifest with
// tools:replace so it wins over RNGMA's empty placeholder value.
function withAdMobManifest(config) {
  const { withAndroidManifest } = require('@expo/config-plugins');
  const appId =
    process.env.GOOGLE_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;
    const metaData = (app['meta-data'] ??= []);
    const existing = metaData.find(
      (m) => m.$['android:name'] === 'com.google.android.gms.ads.APPLICATION_ID',
    );
    const entry = {
      $: {
        'android:name': 'com.google.android.gms.ads.APPLICATION_ID',
        'android:value': appId,
        'tools:replace': 'android:value',
      },
    };
    if (existing) Object.assign(existing.$, entry.$);
    else metaData.push(entry);
    // Ensure tools namespace is declared on the root manifest element.
    mod.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    return mod;
  });
}

// Canonical Google AdMob SKAdNetwork identifiers for iOS ad attribution under
// App Tracking Transparency. Sourced from Google's official list
// (developers.google.com/admob/ios/3p-skadnetworks) and passed to the
// react-native-google-mobile-ads plugin, which injects them into Info.plist as
// SKAdNetworkItems. Re-check against Google's list periodically — buyers change.
const SKADNETWORK_ITEMS = [
  'cstr6suwn9.skadnetwork', '4fzdc2evr5.skadnetwork', '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork', 'p78axxw29g.skadnetwork', 'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork', 'cp8zw746q7.skadnetwork', '3sh42y64q3.skadnetwork',
  'c6k4g5qg8m.skadnetwork', 's39g8k73mm.skadnetwork', 'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork', 'f38h382jlk.skadnetwork', 'hs6bdukanm.skadnetwork',
  'mlmmfzh3r3.skadnetwork', 'v4nxqhlyqp.skadnetwork', 'wzmmz9fp6w.skadnetwork',
  'su67r6k2v3.skadnetwork', 'yclnxrl5pm.skadnetwork', 't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork', 'gta9lk7p23.skadnetwork', 'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork', 'v9wttpbfk9.skadnetwork', 'n38lu8286q.skadnetwork',
  '47vhws6wlr.skadnetwork', 'kbd757ywx3.skadnetwork', '9t245vhmpl.skadnetwork',
  'a2p9lx4jpn.skadnetwork', '22mmun2rn5.skadnetwork', '44jx6755aq.skadnetwork',
  'k674qkevps.skadnetwork', '4468km3ulz.skadnetwork', '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork', 'klf5c3l5u5.skadnetwork', 'ppxm28t8ap.skadnetwork',
  'kbmxgpxpgc.skadnetwork', 'uw77j35x4d.skadnetwork', '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork', 'tl55sbb4fm.skadnetwork', 'c3frkrj4fj.skadnetwork',
  'e5fvkxwrpn.skadnetwork', '8c4e2ghe7u.skadnetwork', '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork', '3qcr597p9d.skadnetwork',
];

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  // Launcher/home-screen label. Store listing names are set in Play Console /
  // App Store Connect, not here.
  name: 'CRS Pulse',
  slug: 'crs-pulse',
  owner: 'balwinder98',
  version: '1.0.6',
  newArchEnabled: true,
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
      // ATT purpose string, ONLY when ads are enabled. adsService calls
      // requestTrackingPermissionsAsync() on iOS — but that path is gated by
      // MONETIZATION_ENABLED, so in free mode tracking is never requested and the
      // string must be absent to match the "Data Not Collected" privacy label
      // (Apple rejects a present NSUserTrackingUsageDescription the label contradicts).
      ...(MONETIZATION_ENABLED
        ? {
            NSUserTrackingUsageDescription:
              'This identifier will be used to deliver and measure more relevant ads in the free version of CRS Pulse.',
          }
        : {}),
    },
  },
  android: {
    splash: {
      backgroundColor: '#0A1628',
      resizeMode: 'native',
    },
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#DF2C19',
    },
    package: 'com.crspulse.app',
    versionCode: 13,
    permissions: [
      'VIBRATE',
      'POST_NOTIFICATIONS',
      'com.google.android.gms.permission.AD_ID',
    ],
    softwareKeyboardLayoutMode: 'resize',
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    withKotlinMetadataVersionSkip,
    withNode20ForCodegen,
    withAdMobManifest,
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
        // Mirrors the infoPlist NSUserTrackingUsageDescription above — only when
        // monetization (and thus tracking) is enabled.
        ...(MONETIZATION_ENABLED
          ? {
              userTrackingUsageDescription:
                'This identifier will be used to deliver and measure more relevant ads in the free version of CRS Pulse.',
            }
          : {}),
        // Injected into Info.plist as SKAdNetworkItems for iOS ad attribution
        // under ATT. The plugin only adds these when the option is provided.
        skAdNetworkItems: SKADNETWORK_ITEMS,
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
      ...(projectId ? { projectId } : {}),
    },
    privacyPolicyUrl,
    githubRepoUrl: 'https://github.com/BalwinderCa/crs-pulse',
  },
});
