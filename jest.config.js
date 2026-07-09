/**
 * Suite de integración de servicios (Supabase mockeado) — corre en Node,
 * sin tocar React Native. Overrides de tsconfig: expo/tsconfig.base usa
 * moduleResolution bundler, incompatible con el runtime CommonJS de Jest.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', moduleResolution: 'node' } },
    ],
  },
};
