// This file runs before modules are loaded. Use it to mock external services
// and set environment variables required by modules at import time.

// Mock the Redis client before any module requires it. Use require inside the factory
// so Jest can hoist the mock properly without referencing out-of-scope variables.
jest.mock('./src/db/redis', () => require('./tests/helpers/redisMock'));

// Mock the broker so tests don't try to connect to RabbitMQ
jest.mock('./src/broker/broker', () => ({
  publishToQueue: async () => {},
}));

// Ensure JWT secret is present for modules that sign/verify tokens on import
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
