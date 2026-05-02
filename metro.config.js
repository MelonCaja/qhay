const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// NO activamos unstable_enablePackageExports
// Esto hace que Metro use el bundle BROWSER de Firebase (puro JS, sin TurboModules)
// El bundle RN de Firebase llama TurboModules incompatibles con Expo Go + New Arch
// El bundle browser usa fetch/XHR que SÍ están disponibles en React Native

module.exports = config;
