// mobile/babel.config.js
// Required for Expo Router + react-native-reanimated/worklets.
// babel-preset-expo auto-injects the react-native-worklets plugin (reanimated v4)
// when reanimated is installed — so worklets like Sparkle's useAnimatedStyle work.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: the worklets/reanimated plugin is added automatically by babel-preset-expo
    // in SDK 54. If you ever add other plugins, the worklets plugin must remain LAST.
  };
};
