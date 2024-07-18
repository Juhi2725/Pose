// // Learn more https://docs.expo.io/guides/customizing-metro
// const {getDefaultConfig} = require('expo/metro-config');

// // module.exports = getDefaultConfig(__dirname);

// module.exports = (() => {
//   const defaultConfig = getDefaultConfig(__dirname);
//   const {assetExts} = defaultConfig.resolver;
//   return {
//     resolver: {
//       // Add bin to assetExts
//       assetExts: [...assetExts, 'bin'],
//     }
//   };
// })();


// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const {assetExts} = config.resolver;
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  assetExts:  [...assetExts, 'bin'],
};

module.exports = config;