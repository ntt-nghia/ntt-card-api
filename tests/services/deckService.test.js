const DeckService = require('../../src/services/deckService');
const { AppError } = require('../../src/middleware/errorHandler');
const TestUtils = require('../helpers/testUtils');

jest.unmock('../../src/services/deckService');

// Mock data
const mockDeck = {
  id: 'deck-123',
  name: {
    en: 'Test Deck',
    vn: 'Bộ Thẻ Test'
  },
  description: {
    en: 'Test description',
    vn: 'Mô tả test'
  },
  relationshipType: 'friends',
  tier: 'FREE',
  price: 0,
  cardCount: {
    total: 10,
    free: 10,
    premium: 0
  },
  tags: ['test'],
  statistics: {
    purchases: 0,
    sessionsPlayed: 0
  },
  status: 'active',
  createdBy: 'admin-123',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockPremiumDeck = {
  ...mockDeck,
  id: 'deck-premium-123',
  name: {
    en: 'Premium Deck',
    vn: 'Bộ Thẻ Cao Cấp'
  },
  tier: 'PREMIUM',
  price: 9.99,
  cardCount: {
    total: 15,
    free: 5,
    premium: 10
  }
};

const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  unlockedDecks: ['deck-123'],
  purchaseHistory: []
};

const mockCard = {
  id: 'card-123',
  content: {
    en: 'Test question',
    vn: 'Câu hỏi test'
  },
  type: 'question',
  connectionLevel: 1,
  relationshipTypes: ['friends'],
  deckIds: ['deck-123'],
  tier: 'FREE'
};

describe('DeckService', () => {
  let deckService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestUtils.resetAllMocks();
    deckService = new DeckService();

  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createDeck', () => {
    describe('Successful Deck Creation', () => {
      test('should create deck with valid data', async () => {
        // Arrange
        const deckData = {
          name: {
            en: 'New Deck',
            vn: 'Bộ Thẻ Mới'
          },
          description: {
            en: 'New description',
            vn: 'Mô tả mới'
          },
          relationshipType: 'friends',
          tier: 'FREE',
          price: 0,
          createdBy: 'admin-123'
        };

        mockDeckRepository.create.mockResolvedValue(mockDeck);

        // Act
        const result = await deckService.createDeck(deckData);

        // Assert
        expect(mockDeckRepository.create)
          .toHaveBeenCalledWith(
            expect.objectContaining({
              ...deckData
            })
          );
        expect(result)
          .toEqual(mockDeck);
      });

      test('should create premium deck with price', async () => {
        // Arrange
        const premiumDeckData = {
          name: {
            en: 'Premium Deck',
            vn: 'Bộ Thẻ Cao Cấp'
          },
          description: {
            en: 'Premium description',
            vn: 'Mô tả cao cấp'
          },
          relationshipType: 'established_couples',
          tier: 'PREMIUM',
          price: 19.99,
          createdBy: 'admin-123'
        };

        mockDeckRepository.create.mockResolvedValue(mockPremiumDeck);

        // Act
        const result = await deckService.createDeck(premiumDeckData);

        // Assert
        expect(mockDeckRepository.create)
          .toHaveBeenCalledWith(
            expect.objectContaining({
              ...premiumDeckData
            })
          );
        expect(result)
          .toEqual(mockPremiumDeck);
      });
    });

    describe('Deck Creation Validation Failures', () => {
      test('should throw validation error for invalid deck data', async () => {
        // Arrange
        const invalidDeckData = {
          name: 'invalid-name', // Should be object with language keys
          relationshipType: 'invalid-type',
          type: 'INVALID_TYPE'
        };

        // Act & Assert
        await expect(deckService.createDeck(invalidDeckData))
          .rejects
          .toThrow(
            expect.objectContaining({
              statusCode: 400,
              message: expect.stringContaining('Validation error')
            })
          );

        expect(mockDeckRepository.create)
          .not
          .toHaveBeenCalled();
      });

      test('should throw validation error for premium deck without price', async () => {
        // Arrange
        const invalidPremiumData = {
          name: { en: 'Premium Deck' },
          description: { en: 'Premium description' },
          relationshipType: 'friends',
          tier: 'PREMIUM',
          price: 0 // Invalid for premium deck
        };

        // Act & Assert
        await expect(deckService.createDeck(invalidPremiumData))
          .rejects
          .toThrow(
            expect.objectContaining({
              statusCode: 400,
              message: expect.stringContaining('Validation error')
            })
          );
      });
    });

    describe('Repository Failures', () => {
      test('should handle repository creation failure', async () => {
        // Arrange
        const deckData = {
          name: { en: 'Test Deck' },
          description: { en: 'Test description' },
          relationshipType: 'friends',
          tier: 'FREE',
          createdBy: 'admin-123'
        };

        mockDeckRepository.create.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(deckService.createDeck(deckData))
          .rejects
          .toThrow('Database error');
      });
    });
  });

  describe('getDeckById', () => {
    test('should return deck when found', async () => {
      // Arrange
      const deckId = 'deck-123';
      mockDeckRepository.findById.mockResolvedValue(mockDeck);

      // Act
      const result = await deckService.getDeckById(deckId);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(result)
        .toEqual(mockDeck);
    });

    test('should return deck with access info when userId provided', async () => {
      // Arrange
      const deckId = 'deck-123';
      const userId = 'user-123';

      mockDeckRepository.findById.mockResolvedValue(mockDeck);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await deckService.getDeckById(deckId, userId);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(mockUserRepository.findById)
        .toHaveBeenCalledWith(userId);
      expect(result)
        .toEqual({
          ...mockDeck,
          hasAccess: true,
          isUnlocked: true
        });
    });

    test('should show no access for premium deck when not unlocked', async () => {
      // Arrange
      const deckId = 'deck-premium-123';
      const userId = 'user-123';
      const userWithoutAccess = {
        ...mockUser,
        unlockedDecks: []
      };

      mockDeckRepository.findById.mockResolvedValue(mockPremiumDeck);
      mockUserRepository.findById.mockResolvedValue(userWithoutAccess);

      // Act
      const result = await deckService.getDeckById(deckId, userId);

      // Assert
      expect(result)
        .toEqual({
          ...mockPremiumDeck,
          hasAccess: false,
          isUnlocked: false
        });
    });

    test('should throw error when deck not found', async () => {
      // Arrange
      const deckId = 'nonexistent-deck';
      mockDeckRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.getDeckById(deckId))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });
  });

  describe('getDecksByRelationshipType', () => {
    test('should return decks for relationship type', async () => {
      // Arrange
      const relationshipType = 'friends';
      const decks = [mockDeck];

      mockDeckRepository.findByRelationshipType.mockResolvedValue(decks);

      // Act
      const result = await deckService.getDecksByRelationshipType(relationshipType);

      // Assert
      expect(mockDeckRepository.findByRelationshipType)
        .toHaveBeenCalledWith(relationshipType);
      expect(result)
        .toEqual(decks);
    });

    test('should return decks with access info when userId provided', async () => {
      // Arrange
      const relationshipType = 'friends';
      const userId = 'user-123';
      const decks = [mockDeck, mockPremiumDeck];

      mockDeckRepository.findByRelationshipType.mockResolvedValue(decks);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await deckService.getDecksByRelationshipType(relationshipType, userId);

      // Assert
      expect(result)
        .toHaveLength(2);
      expect(result[0])
        .toEqual({
          ...mockDeck,
          hasAccess: true,
          isUnlocked: true
        });
      expect(result[1])
        .toEqual({
          ...mockPremiumDeck,
          hasAccess: false,
          isUnlocked: false
        });
    });
  });

  describe('getUserAvailableDecks', () => {
    test('should return available decks for user', async () => {
      // Arrange
      const userId = 'user-123';
      const decks = [mockDeck, mockPremiumDeck];

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockDeckRepository.findAll.mockResolvedValue(decks);

      // Act
      const result = await deckService.getUserAvailableDecks(userId);

      // Assert
      expect(mockUserRepository.findById)
        .toHaveBeenCalledWith(userId);
      expect(mockDeckRepository.findAll)
        .toHaveBeenCalledWith({ status: 'active' });
      expect(result)
        .toHaveLength(2);
      expect(result[0].hasAccess)
        .toBe(true);
      expect(result[1].hasAccess)
        .toBe(false);
    });

    test('should throw error when user not found', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.getUserAvailableDecks(userId))
        .rejects
        .toThrow(new AppError('User not found', 404));
    });
  });

  describe('userHasAccessToDeck', () => {
    test('should return true for FREE deck', () => {
      // Act
      const result = deckService.userHasAccessToDeck(mockDeck, mockUser);

      // Assert
      expect(result)
        .toBe(true);
    });

    test('should return true for unlocked PREMIUM deck', () => {
      // Arrange
      const userWithPremium = {
        ...mockUser,
        unlockedDecks: ['deck-123', 'deck-premium-123']
      };

      // Act
      const result = deckService.userHasAccessToDeck(mockPremiumDeck, userWithPremium);

      // Assert
      expect(result)
        .toBe(true);
    });

    test('should return false for locked PREMIUM deck', () => {
      // Act
      const result = deckService.userHasAccessToDeck(mockPremiumDeck, mockUser);

      // Assert
      expect(result)
        .toBe(false);
    });

    test('should return false for null inputs', () => {
      // Act & Assert
      expect(deckService.userHasAccessToDeck(null, mockUser))
        .toBe(false);
      expect(deckService.userHasAccessToDeck(mockDeck, null))
        .toBe(false);
    });
  });

  describe('unlockDeck', () => {
    test('should unlock premium deck for user', async () => {
      // Arrange
      const userId = 'user-123';
      const deckId = 'deck-premium-123';
      const purchaseData = {
        transactionId: 'txn-123',
        paymentMethod: 'stripe'
      };
      const userWithoutDeck = {
        ...mockUser,
        unlockedDecks: []
      };
      const updatedUser = {
        ...mockUser,
        unlockedDecks: [deckId]
      };

      mockDeckRepository.findById.mockResolvedValue(mockPremiumDeck);
      mockUserRepository.findById.mockResolvedValue(userWithoutDeck);
      mockUserRepository.addUnlockedDeck.mockResolvedValue();
      mockUserRepository.addPurchaseHistory.mockResolvedValue();
      mockDeckRepository.incrementPurchases.mockResolvedValue();
      mockUserRepository.findById.mockResolvedValueOnce(userWithoutDeck)
        .mockResolvedValueOnce(updatedUser);

      // Act
      const result = await deckService.unlockDeck(userId, deckId, purchaseData);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(mockUserRepository.addUnlockedDeck)
        .toHaveBeenCalledWith(userId, deckId);
      expect(mockUserRepository.addPurchaseHistory)
        .toHaveBeenCalledWith(userId, {
          deckId,
          amount: mockPremiumDeck.price,
          currency: 'USD',
          ...purchaseData
        });
      expect(mockDeckRepository.incrementPurchases)
        .toHaveBeenCalledWith(deckId);
      expect(result)
        .toEqual(updatedUser);
    });

    test('should throw error when deck not found', async () => {
      // Arrange
      const userId = 'user-123';
      const deckId = 'nonexistent-deck';

      mockDeckRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.unlockDeck(userId, deckId))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });

    test('should throw error when trying to unlock FREE deck', async () => {
      // Arrange
      const userId = 'user-123';
      const deckId = 'deck-123';

      mockDeckRepository.findById.mockResolvedValue(mockDeck);

      // Act & Assert
      await expect(deckService.unlockDeck(userId, deckId))
        .rejects
        .toThrow(new AppError('Deck is already free', 400));
    });

    test('should throw error when deck already unlocked', async () => {
      // Arrange
      const userId = 'user-123';
      const deckId = 'deck-premium-123';
      const userWithDeck = {
        ...mockUser,
        unlockedDecks: [deckId]
      };

      mockDeckRepository.findById.mockResolvedValue(mockPremiumDeck);
      mockUserRepository.findById.mockResolvedValue(userWithDeck);

      // Act & Assert
      await expect(deckService.unlockDeck(userId, deckId))
        .rejects
        .toThrow(new AppError('Deck already unlocked', 400));
    });
  });

  describe('getDeckCards', () => {
    test('should return all cards for accessible deck', async () => {
      // Arrange
      const deckId = 'deck-123';
      const userId = 'user-123';
      const cards = [mockCard];

      mockDeckRepository.findById.mockResolvedValue(mockDeck);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockCardRepository.findByDeckId.mockResolvedValue(cards);

      // Act
      const result = await deckService.getDeckCards(deckId, userId);

      // Assert
      expect(mockCardRepository.findByDeckId)
        .toHaveBeenCalledWith(deckId, {});
      expect(result)
        .toEqual(cards);
    });

    test('should filter premium cards for inaccessible deck', async () => {
      // Arrange
      const deckId = 'deck-premium-123';
      const userId = 'user-123';
      const cards = [
        {
          ...mockCard,
          tier: 'FREE'
        },
        {
          ...mockCard,
          id: 'card-premium',
          tier: 'PREMIUM'
        }
      ];
      const userWithoutAccess = {
        ...mockUser,
        unlockedDecks: []
      };

      mockDeckRepository.findById.mockResolvedValue(mockPremiumDeck);
      mockUserRepository.findById.mockResolvedValue(userWithoutAccess);
      mockCardRepository.findByDeckId.mockResolvedValue(cards);

      // Act
      const result = await deckService.getDeckCards(deckId, userId);

      // Assert
      expect(result)
        .toHaveLength(1);
      expect(result[0].tier)
        .toBe('FREE');
    });
  });

  describe('updateDeck', () => {
    test('should update deck with valid data', async () => {
      // Arrange
      const deckId = 'deck-123';
      const updateData = { tags: ['updated', 'test'] };
      const updatedDeck = { ...mockDeck, ...updateData };

      mockDeckRepository.findById.mockResolvedValue(mockDeck);
      mockDeckRepository.update.mockResolvedValue(updatedDeck);

      // Act
      const result = await deckService.updateDeck(deckId, updateData);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(mockDeckRepository.update)
        .toHaveBeenCalledWith(deckId, updateData);
      expect(result)
        .toEqual(updatedDeck);
    });

    test('should throw error when deck not found', async () => {
      // Arrange
      const deckId = 'nonexistent-deck';
      const updateData = { tags: ['test'] };

      mockDeckRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.updateDeck(deckId, updateData))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });

    test('should throw validation error for invalid update data', async () => {
      // Arrange
      const deckId = 'deck-123';
      const invalidUpdateData = { type: 'INVALID_TYPE' };

      mockDeckRepository.findById.mockResolvedValue(mockDeck);

      // Act & Assert
      await expect(deckService.updateDeck(deckId, invalidUpdateData))
        .rejects
        .toThrow(
          expect.objectContaining({
            statusCode: 400,
            message: expect.stringContaining('Validation error')
          })
        );
    });
  });

  describe('addCardsToDeck', () => {
    test('should add cards to deck and update card count', async () => {
      // Arrange
      const deckId = 'deck-123';
      const cardIds = ['card-1', 'card-2'];

      mockDeckRepository.findById.mockResolvedValue(mockDeck);
      mockCardRepository.addToDeck.mockResolvedValue();
      mockCardRepository.findByDeckId.mockResolvedValue([mockCard, mockCard]);
      mockDeckRepository.updateCardCount.mockResolvedValue();

      // Act
      await deckService.addCardsToDeck(deckId, cardIds);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(mockCardRepository.addToDeck)
        .toHaveBeenCalledTimes(2);
      expect(mockCardRepository.addToDeck)
        .toHaveBeenCalledWith('card-1', deckId);
      expect(mockCardRepository.addToDeck)
        .toHaveBeenCalledWith('card-2', deckId);
      expect(mockDeckRepository.updateCardCount)
        .toHaveBeenCalledWith(deckId, {
          total: 2,
          free: 2,
          premium: 0
        });
    });

    test('should throw error when deck not found', async () => {
      // Arrange
      const deckId = 'nonexistent-deck';
      const cardIds = ['card-1'];

      mockDeckRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.addCardsToDeck(deckId, cardIds))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });
  });

  describe('removeCardsFromDeck', () => {
    test('should remove cards from deck and update card count', async () => {
      // Arrange
      const deckId = 'deck-123';
      const cardIds = ['card-1', 'card-2'];

      mockCardRepository.removeFromDeck.mockResolvedValue();
      mockCardRepository.findByDeckId.mockResolvedValue([]);
      mockDeckRepository.updateCardCount.mockResolvedValue();

      // Act
      await deckService.removeCardsFromDeck(deckId, cardIds);

      // Assert
      expect(mockCardRepository.removeFromDeck)
        .toHaveBeenCalledTimes(2);
      expect(mockCardRepository.removeFromDeck)
        .toHaveBeenCalledWith('card-1', deckId);
      expect(mockCardRepository.removeFromDeck)
        .toHaveBeenCalledWith('card-2', deckId);
      expect(mockDeckRepository.updateCardCount)
        .toHaveBeenCalledWith(deckId, {
          total: 0,
          free: 0,
          premium: 0
        });
    });
  });

  describe('getDeckStatistics', () => {
    test('should return comprehensive deck statistics', async () => {
      // Arrange
      const deckId = 'deck-123';
      const unlockedUsers = [mockUser];
      const cards = [mockCard];

      mockDeckRepository.findById.mockResolvedValue(mockDeck);
      mockUserRepository.findByUnlockedDeck.mockResolvedValue(unlockedUsers);
      mockCardRepository.findByDeckId.mockResolvedValue(cards);

      // Act
      const result = await deckService.getDeckStatistics(deckId);

      // Assert
      expect(mockDeckRepository.findById)
        .toHaveBeenCalledWith(deckId);
      expect(mockUserRepository.findByUnlockedDeck)
        .toHaveBeenCalledWith(deckId);
      expect(mockCardRepository.findByDeckId)
        .toHaveBeenCalledWith(deckId);

      expect(result)
        .toEqual({
          ...mockDeck.statistics,
          totalUsers: 1,
          totalCards: 1,
          totalDraws: 0,
          averageSkipRate: 0,
          revenue: 0
        });
    });

    test('should throw error when deck not found', async () => {
      // Arrange
      const deckId = 'nonexistent-deck';
      mockDeckRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(deckService.getDeckStatistics(deckId))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });
  });

  describe('deleteDeck', () => {
    test('should delete deck and remove from all cards', async () => {
      // Arrange
      const deckId = 'deck-123';
      const cards = [mockCard];

      mockCardRepository.findByDeckId.mockResolvedValue(cards);
      mockCardRepository.removeFromDeck.mockResolvedValue();
      mockDeckRepository.delete.mockResolvedValue();

      // Act
      await deckService.deleteDeck(deckId);

      // Assert
      expect(mockCardRepository.findByDeckId)
        .toHaveBeenCalledWith(deckId);
      expect(mockCardRepository.removeFromDeck)
        .toHaveBeenCalledWith(mockCard.id, deckId);
      expect(mockDeckRepository.delete)
        .toHaveBeenCalledWith(deckId);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null or undefined input gracefully', async () => {
      // Act & Assert
      await expect(deckService.createDeck(null))
        .rejects
        .toThrow();
      await expect(deckService.createDeck(undefined))
        .rejects
        .toThrow();
      await expect(deckService.getDeckById(undefined))
        .rejects
        .toThrow();
      await expect(deckService.getDeckById(null))
        .rejects
        .toThrow();
    });

    test('should handle empty string inputs', async () => {
      // Act & Assert
      await expect(deckService.getDeckById(''))
        .rejects
        .toThrow(new AppError('Deck not found', 404));
    });

    test('should handle repository errors gracefully', async () => {
      // Arrange
      const deckId = 'deck-123';
      mockDeckRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(deckService.getDeckById(deckId))
        .rejects
        .toThrow('Database connection failed');
    });
  });
});
