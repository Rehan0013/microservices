module.exports = {
  testEnvironment: 'node',
  // run this file before other modules so we can mock external services
  setupFiles: ['<rootDir>/jest.env.js'],
  // setupFilesAfterEnv runs after the test framework is installed (so before/after hooks work)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['js', 'json', 'node'],
  moduleNameMapper: {
    '^../db/redis$': '<rootDir>/tests/helpers/redisMock.js',
  },
};
