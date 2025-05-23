const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  birthDate: new Date('1990-01-01'),
  preferences: {
    relationshipTypes: ['friends'],
    contentFilters: {},
    drinkingIntensity: 'moderate'
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
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg'
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
    drinkingConsequence: { onComplete: 0, onSkip: 1 },
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
  hostId: 'test-uid-123',
  relationshipType: 'friends',
  status: 'waiting',
  players: [
    {
      userId: 'test-uid-123',
      displayName: 'Test User',
      connectionLevel: 1,
      points: 0,
      isActive: true
    }
  ],
  currentTurn: 'test-uid-123',
  configuration: {
    contentFilters: {},
    drinkingIntensity: 'moderate',
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
  mockCard,
  mockGameSession
};