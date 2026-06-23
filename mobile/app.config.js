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
const appStoreId = process.env.EXPO_PUBLIC_APP_STORE_ID || '';
const privacyPolicyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
  'https://github.com/BalwinderCa/crs-pulse/blob/main/docs/PRIVACY_POLICY.md';

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

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  // Launcher/home-screen label. Store listing names are set in Play Console /
  // App Store Connect, not here.
  name: 'CRS Pulse',
  slug: 'crs-pulse',
  owner: 'balwinder98',
  version: '1.0.1',
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
      // REQUIRED: adsService.ts calls requestTrackingPermissionsAsync() on iOS.
      // Without this purpose string the ATT prompt no-ops and App Review rejects
      // the binary (and older iOS can crash). Kept here directly (not only via a
      // plugin) so it is guaranteed present regardless of plugin version.
      NSUserTrackingUsageDescription:
        'This identifier will be used to deliver and measure more relevant ads in the free version of CRS Pulse.',
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
        // Mirrors the infoPlist NSUserTrackingUsageDescription above; this also
        // makes the plugin inject the SKAdNetworkItems needed for iOS ad
        // attribution under App Tracking Transparency.
        userTrackingUsageDescription:
          'This identifier will be used to deliver and measure more relevant ads in the free version of CRS Pulse.',
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
    appStoreId: appStoreId || undefined,
  },
});
