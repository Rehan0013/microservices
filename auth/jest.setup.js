const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set some test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

let mongoServer;

// Increase timeout for slower systems
jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  // Clear DB between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Reset redis mock store - access it through require since it's mocked
  require('./tests/helpers/redisMock')._reset();
});
