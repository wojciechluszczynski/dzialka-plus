module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@de/db': '../../packages/db/src',
            '@de/scoring': '../../packages/scoring/src',
            '@de/ui': '../../packages/ui/src',
          },
        },
      ],
    ],
  }
}
