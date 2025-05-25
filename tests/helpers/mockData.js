// tests/helpers/mockData.js (Updated)
const mockUser = {
  uid: 'firebase-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  birthDate: new Date('1990-01-01'),
  preferences: {
    relationshipTypes: ['friends'],
    contentFilters: {},
  },
  statistics: {
    gamesPlayed: 0,
    connectionLevelsReached: {},
    favoriteRelationshipType: null
  },
  createdAt: new Date(),
  lastLoginAt: new Date()
};

const mockFirebaseUser = {
  uid: 'firebase-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg'
};

const mockUserWithStats = {
  ...mockUser,
  statistics: {
    gamesPlayed: 5,
    connectionLevelsReached: {
      'friends': 3,
      'new_couples': 2
    },
    favoriteRelationshipType: 'friends'
  }
};

const mockUpdatedUser = {
  ...mockUser,
  displayName: 'Updated Test User',
  avatar: 'https://example.com/new-avatar.jpg',
  preferences: {
    relationshipTypes: ['friends', 'colleagues'],
    contentFilters: { nsfw: false },
  }
};

const mockGameData = {
  relationshipType: 'friends',
  connectionLevel: 3,
  sessionDuration: 1800000 // 30 minutes
};

const mockCard = {
  id: 'card-123',
  content: 'What is your favorite memory?',
  type: 'question',
  connectionLevel: 1,
  relationshipTypes: ['friends'],
  categories: ['memories'],
  metadata: {
    estimatedResponseTime: 60,
    completionCriteria: 'verbal_response'
  },
  statistics: {
    timesPlayed: 0,
    skipRate: 0,
    averageRating: null
  },
  status: 'active',
  createdBy: 'system',
  createdAt: new Date()
};

const mockGameSession = {
  id: 'session-123',
  hostId: 'firebase-uid-123',
  relationshipType: 'friends',
  status: 'waiting',
  players: [
    {
      userId: 'firebase-uid-123',
      displayName: 'Test User',
      connectionLevel: 1,
      points: 0,
      isActive: true
    }
  ],
  currentTurn: 'firebase-uid-123',
  configuration: {
    contentFilters: {},
    winCondition: 'first_to_level_4'
  },
  gameState: {
    currentCard: null,
    cardHistory: [],
    roundNumber: 1,
    startedAt: null
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

module.exports = {
  mockUser,
  mockFirebaseUser,
  mockUserWithStats,
  mockUpdatedUser,
  mockGameData,
  mockCard,
  mockGameSession
};
