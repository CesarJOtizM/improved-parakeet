/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/src/authentication/$1',
    '^@user/(.*)$': '<rootDir>/src/authentication/users/$1',
    '^@role/(.*)$': '<rootDir>/src/authentication/roles/$1',
    '^@session/(.*)$': '<rootDir>/src/authentication/sessions/$1',
    '^@security/(.*)$': '<rootDir>/src/authentication/security/$1',
    '^@inventory/(.*)$': '<rootDir>/src/inventory/$1',
    '^@product/(.*)$': '<rootDir>/src/inventory/products/$1',
    '^@warehouse/(.*)$': '<rootDir>/src/inventory/warehouses/$1',
    '^@movement/(.*)$': '<rootDir>/src/inventory/movements/$1',
    '^@transfer/(.*)$': '<rootDir>/src/inventory/transfers/$1',
    '^@stock/(.*)$': '<rootDir>/src/inventory/stock/$1',
    '^@report/(.*)$': '<rootDir>/src/reporting/$1',
    '^@import/(.*)$': '<rootDir>/src/imports/$1',
    '^@organization/(.*)$': '<rootDir>/src/organization/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@interface/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
  // Configuraciones adicionales recomendadas por la documentación
  clearMocks: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Configuración para TypeScript
  moduleFileExtensions: ['js', 'json', 'ts'],
};

module.exports = config;
