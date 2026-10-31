const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_PUBLIC_SHARE_PREVIEW === '1') {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolved = context.resolveRequest(context, moduleName, platform);
    if (platform === 'web' && resolved.type === 'sourceFile') {
      if (resolved.filePath.endsWith('/expo-router/build/qualified-entry.js')) {
        return { type: 'sourceFile', filePath: path.join(__dirname, 'scripts/preview/entry.tsx') };
      }
      if (resolved.filePath.endsWith('/expo-router/build/global-state/browserHistoryAdapter.js')) {
        // The router keeps its own navigation history. A file:// preview must not
        // push /product/... URLs into the browser (which would leave the file).
        return { type: 'sourceFile', filePath: path.join(__dirname, 'scripts/preview/history.js') };
      }
    }
    return resolved;
  };
}

module.exports = config;
