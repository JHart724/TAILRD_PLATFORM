// Integration tests in tests/integration/ and tests/smoke/regression.test.ts need
// a live DB, JWT_SECRET, and TEST_HOSPITAL_*_ID env vars. They're skipped by default
// and opt-in via RUN_INTEGRATION_TESTS=1.
const runIntegration = process.env.RUN_INTEGRATION_TESTS === '1';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    ...(runIntegration ? [] : [
      '<rootDir>/tests/integration/',
      '<rootDir>/tests/smoke/regression\\.test\\.ts$',
    ]),
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/services/_archived/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000,
  verbose: true
};