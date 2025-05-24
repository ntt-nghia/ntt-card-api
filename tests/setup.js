// tests/setup.js (Updated)
// Mock Firebase Admin first
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
  credential: {
    cert: jest.fn()
  },
  firestore: jest.fn(() => mockFirestore),
  auth: jest.fn(() => mockFirebaseAuth),
  storage: jest.fn(() => ({})),
  apps: []
}));

// Mock UserService module completely
jest.mock('../src/services/userService', () => {
  return jest.fn().mockImplementation(() => ({
    createUser: jest.fn(),
    getUserById: jest.fn(),
    updateLastLogin: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn()
  }));
});

// Mock Winston Logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.JWT_SECRET = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Export mocks for use in tests
global.mockFirebaseAuth = mockFirebaseAuth;
global.mockFirestore = mockFirestore;