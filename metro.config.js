const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// 1. Watch the local messenger folder
const messengerPath = path.resolve(projectRoot, '../auxwallMessenger');
config.watchFolders = [messengerPath];

// 2. Help Metro find the messenger's node_modules and its own code
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(messengerPath, 'node_modules'),
];

// 3. Ensure extensions are handled correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json'];
config.resolver.assetExts = [...config.resolver.assetExts, 'png', 'jpg', 'jpeg', 'svg'];

module.exports = config;