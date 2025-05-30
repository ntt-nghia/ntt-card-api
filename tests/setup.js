// test/setup.js

// Firebase Admin Mocks
let mockFirebaseAuth = {
  createUser: jest.fn(),
  verifyIdToken: jest.fn(),
  createCustomToken: jest.fn(),
  deleteUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUser: jest.fn(),
  setCustomUserClaims: jest.fn(),
  generatePasswordResetLink: jest.fn()
};

let mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  runTransaction: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
    delete: jest.fn()
  }
};

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(() => mockFirestore),
  auth: jest.fn(() => mockFirebaseAuth),
  storage: jest.fn(() => ({})),
  apps: []
}));

// UserRepository Mock
let mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  updateLastLogin: jest.fn(),
  updateStatistics: jest.fn(),
  delete: jest.fn(),
  addUnlockedDeck: jest.fn(),
  addPurchaseHistory: jest.fn(),
  findByUnlockedDeck: jest.fn()
};

jest.mock('../src/repositories/userRepository', () =>
  jest.fn(() => mockUserRepository)
);


// Mock the repositories
let mockDeckRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findByRelationshipType: jest.fn(),
  findByIds: jest.fn(),
  update: jest.fn(),
  updateStatistics: jest.fn(),
  updateCardCount: jest.fn(),
  incrementPurchases: jest.fn(),
  delete: jest.fn()
};

jest.mock('../src/repositories/deckRepository', () => {
  return jest.fn().mockImplementation(() => mockDeckRepository);
});

let mockCardRepository = {
  findByDeckId: jest.fn(),
  findByDeckIds: jest.fn(),
  addToDeck: jest.fn(),
  removeFromDeck: jest.fn()
};

jest.mock('../src/repositories/cardRepository', () => {
  return jest.fn().mockImplementation(() => mockCardRepository);
});


// UserService Mock
let mockUserService = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn()
};

jest.mock('../src/services/userService', () =>
  jest.fn(() => mockUserService)
);

// Logger Mock
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Environment Variables for Test
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_PRIVATE_KEY: 'test-key',
  FIREBASE_CLIENT_EMAIL: 'test@test.com',
  JWT_SECRET: 'test-secret'
};

// Jest Timeout
jest.setTimeout(10_000);

// Export mocks globally
global.mockFirebaseAuth = mockFirebaseAuth;
global.mockFirestore = mockFirestore;
global.mockUserRepository = mockUserRepository;
global.mockUserService = mockUserService;
global.mockCardRepository = mockCardRepository;
global.mockDeckRepository = mockDeckRepository;
