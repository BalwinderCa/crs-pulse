module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/features': './src/features',
            '@/navigation': './src/navigation',
            '@/store': './src/store',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/types': './src/types',
            '@/utils': './src/utils',
            '@/constants': './src/constants',
            '@/theme': './src/theme',
          },
        },
      ],
      // Reanimated 4's worklets plugin is added by babel-preset-expo (SDK 54+).
    ],
  };
};
