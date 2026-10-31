// The portable preview is a separate build; native/development config stays as-is.
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_SHARE_PREVIEW !== '1') return config;
  return {
    ...config,
    plugins: (config.plugins || []).map((plugin) => {
      const [name, options = {}] = Array.isArray(plugin) ? plugin : [plugin];
      return name === 'expo-router' ? [name, { ...options, asyncRoutes: false }] : plugin;
    }),
    extra: {
      ...config.extra,
      router: { ...config.extra?.router, asyncRoutes: { web: false } },
    },
  };
};
