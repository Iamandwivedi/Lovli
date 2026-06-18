module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 (SDK 54) ships its worklets transform in this package.
      // Must remain the last plugin in the list.
      'react-native-worklets/plugin',
    ],
  };
};
