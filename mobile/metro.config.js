const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// posthog-react-native imports `@posthog/core/surveys`, a subpath that
// @posthog/core only publishes through package.json "exports". Metro on Expo
// SDK 52 ignores "exports" unless unstable_enablePackageExports is on, and
// turning that on changes resolution for every package. Map just this
// package's subpaths to their CommonJS builds instead. Remove after the
// SDK 53+ upgrade, where package exports are enabled by default.
const POSTHOG_CORE_SUBPATH = /^@posthog\/core\/([a-z-]+)$/;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const match = POSTHOG_CORE_SUBPATH.exec(moduleName);
  if (match) {
    return {
      type: 'sourceFile',
      // package.json isn't exported either; the main entry is dist/index.js.
      filePath: path.join(path.dirname(require.resolve('@posthog/core')), match[1], 'index.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
