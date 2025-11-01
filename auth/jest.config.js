module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['js', 'json', 'node'],
  moduleNameMapper: {
    '^../db/redis$': '<rootDir>/tests/helpers/redisMock.js',
  },
};
