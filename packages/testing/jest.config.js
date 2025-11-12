module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@ghost-sdk/core$': '<rootDir>/../core/src',
    '^@ghost-sdk/monero$': '<rootDir>/../monero/src',
    '^@ghost-sdk/zcash$': '<rootDir>/../zcash/src',
    '^@ghost-sdk/integrations$': '<rootDir>/../integrations/src',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
  testTimeout: 30000,
  verbose: true,
};
