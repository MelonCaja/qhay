/**
 * Suite de integración de servicios (Supabase mockeado) — corre en Node,
 * sin tocar React Native. Overrides de tsconfig: expo/tsconfig.base usa
 * moduleResolution bundler, incompatible con el runtime CommonJS de Jest.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // ESM de Expo sin transformar en node_modules → mock (solo email/pass se testea)
  moduleNameMapper: {
    '^expo-web-browser$': '<rootDir>/src/__tests__/mocks/expoModules.ts',
    '^expo-auth-session(/.*)?$': '<rootDir>/src/__tests__/mocks/expoModules.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', moduleResolution: 'node' } },
    ],
  },
};
