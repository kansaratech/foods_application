const { getDefaultConfig } = require('@expo/metro-config')
const path = require('path')

const defaultConfig = getDefaultConfig(__dirname)
defaultConfig.resolver.sourceExts.push('cjs')
defaultConfig.useWatchman = false

// react-native-maps has no web build (pulls in native-only codegen modules).
// Redirect it to a local stub when bundling for web so the app stays buildable.
const mapsStub = path.resolve(__dirname, 'web-stubs/react-native-maps.js')
const upstreamResolveRequest = defaultConfig.resolver.resolveRequest
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-maps' ||
      moduleName.startsWith('react-native-maps/'))
  ) {
    return { type: 'sourceFile', filePath: mapsStub }
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = defaultConfig
