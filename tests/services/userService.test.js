// tests/services/userService.test.js
const UserService = require('../../src/services/userService');
const { AppError } = require('../../src/middleware/errorHandler');
const TestUtils = require('../helpers/testUtils');
const {
  mockUser,
  mockUserWithStats,
  mockUpdatedUser
} = require('../helpers/mockData');

// Import the actual UserService class (not mocked for this test)
jest.unmock('../../src/services/userService');

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestUtils.resetAllMocks();
    userService = new UserService();
    TestUtils.mockUserRepositorySuccess();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUser', () => {
    describe('Successful User Creation', () => {
      test('should create user with valid data', async () => {
        // Arrange
        const userData = {
          uid: 'firebase-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01'),
          avatar: 'https://example.com/avatar.jpg',
          preferences: {
            relationshipTypes: ['friends'],
            contentFilters: {}
          },
          role: "user",
          statistics: {
            averageSessionDuration: 0,
            relationshipTypeUsage: {},
            favoriteRelationshipType: null,
            totalSessions: 0
          }
        };

        global.mockUserRepository.findById.mockResolvedValue(null); // User doesn't exist
        global.mockUserRepository.create.mockResolvedValue(mockUser);

        // Act
        const result = await userService.createUser(userData);

        // Assert
        expect(global.mockUserRepository.findById)
          .toHaveBeenCalledWith(userData.uid);
        expect(global.mockUserRepository.create)
          .toHaveBeenCalledWith(expect.objectContaining({
            ...userData
          }));
        expect(result)
          .toEqual(mockUser);
      });

      test('should create user with minimal valid data', async () => {
        // Arrange
        const minimalUserData = {
          uid: 'firebase-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01')
        };

        global.mockUserRepository.findById.mockResolvedValue(null);
        global.mockUserRepository.create.mockResolvedValue(mockUser);

        // Act
        const result = await userService.createUser(minimalUserData);

        // Assert
        expect(result)
          .toEqual(mockUser);
      });
    });

    describe('User Creation Validation Failures', () => {
      test('should throw validation error for invalid email', async () => {
        // Arrange
        const invalidUserData = {
          uid: 'firebase-uid-123',
          email: 'invalid-email',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01')
        };

        // Act & Assert
        await expect(userService.createUser(invalidUserData))
          .rejects
          .toThrow(
            expect.objectContaining({
              statusCode: 400,
              message: expect.stringContaining('Validation error')
            })
          );

        expect(global.mockUserRepository.create)
          .not
          .toHaveBeenCalled();
      });

      test('should throw validation error for missing required fields', async () => {
        // Arrange
        const incompleteUserData = {
          uid: 'firebase-uid-123',
          email: 'test@example.com'
          // Missing displayName and birthDate
        };

        // Act & Assert
        await expect(userService.createUser(incompleteUserData))
          .rejects
          .toThrow(
            expect.objectContaining({
              statusCode: 400,
              message: expect.stringContaining('Validation error')
            })
          );
      });

      test('should throw validation error for underage user', async () => {
        // Arrange
        const underageUserData = {
          uid: 'firebase-uid-123',
          email: 'test@example.com',
          displayName: 'Young User',
          birthDate: new Date('2010-01-01') // Too young
        };

        // Act & Assert
        await expect(userService.createUser(underageUserData))
          .rejects
          .toThrow(
            expect.objectContaining({
              statusCode: 400,
              message: expect.stringContaining('Validation error')
            })
          );
      });
    });

    describe('User Already Exists', () => {
      test('should throw error when user already exists', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        userData.uid = 'firebase-uid-123';
        global.mockUserRepository.findById.mockResolvedValue(mockUser); // User exists

        // Act & Assert
        await expect(userService.createUser(userData))
          .rejects
          .toThrow(
            new AppError('User already exists', 409)
          );

        expect(global.mockUserRepository.create)
          .not
          .toHaveBeenCalled();
      });
    });

    describe('Repository Failures', () => {
      test('should handle repository creation failure', async () => {
        // Arrange
        const userData = {
          uid: 'firebase-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          birthDate: new Date('1990-01-01')
        };

        global.mockUserRepository.findById.mockResolvedValue(null);
        TestUtils.mockUserRepositoryError('create', new Error('Database error'));

        // Act & Assert
        await expect(userService.createUser(userData))
          .rejects
          .toThrow('Database error');
      });
    });
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      global.mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(uid);

      // Assert
      expect(global.mockUserRepository.findById)
        .toHaveBeenCalledWith(uid);
      expect(result)
        .toEqual(mockUser);
    });

    test('should throw error when user not found', async () => {
      // Arrange
      const uid = 'nonexistent-uid';
      global.mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById(uid))
        .rejects
        .toThrow(
          new AppError('User not found', 404)
        );
    });

    test('should handle repository errors', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      TestUtils.mockUserRepositoryError('findById', new Error('Database connection failed'));

      // Act & Assert
      await expect(userService.getUserById(uid))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('getUserByEmail', () => {
    test('should return user when found by email', async () => {
      // Arrange
      const email = 'test@example.com';
      global.mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(global.mockUserRepository.findByEmail)
        .toHaveBeenCalledWith(email);
      expect(result)
        .toEqual(mockUser);
    });

    test('should return null when user not found by email', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      global.mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result)
        .toBeNull();
    });
  });

  describe('updateUser', () => {
    test('should update user successfully', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const updateData = TestUtils.createValidUpdateData();
      global.mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userService.updateUser(uid, updateData);

      // Assert
      expect(global.mockUserRepository.update)
        .toHaveBeenCalledWith(uid, updateData);
      expect(result)
        .toEqual(mockUpdatedUser);
    });

    test('should handle email uniqueness validation', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const updateData = { email: 'existing@example.com' };

      // Mock existing user with different uid
      const existingUser = {
        ...mockUser,
        uid: 'different-uid'
      };
      global.mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.updateUser(uid, updateData))
        .rejects
        .toThrow(
          new AppError('Email already in use by another user', 409)
        );

      expect(global.mockUserRepository.update)
        .not
        .toHaveBeenCalled();
    });

    test('should allow email update for same user', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const updateData = { email: 'newemail@example.com' };

      global.mockUserRepository.findByEmail.mockResolvedValue(mockUser); // Same user
      global.mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      // Act
      const result = await userService.updateUser(uid, updateData);

      // Assert
      expect(global.mockUserRepository.update)
        .toHaveBeenCalledWith(uid, updateData);
      expect(result)
        .toEqual(mockUpdatedUser);
    });

    test('should handle repository update failure', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const updateData = TestUtils.createValidUpdateData();
      TestUtils.mockUserRepositoryError('update', new Error('Update failed'));

      // Act & Assert
      await expect(userService.updateUser(uid, updateData))
        .rejects
        .toThrow('Update failed');
    });
  });

  describe('updateUserPreferences', () => {
    test('should update user preferences successfully', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const newPreferences = TestUtils.createValidPreferences();
      global.mockUserRepository.findById.mockResolvedValue(mockUser);
      global.mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        preferences: { ...mockUser.preferences, ...newPreferences }
      });

      // Act
      const result = await userService.updateUserPreferences(uid, newPreferences);

      // Assert
      expect(global.mockUserRepository.findById)
        .toHaveBeenCalledWith(uid);
      expect(global.mockUserRepository.update)
        .toHaveBeenCalledWith(uid, {
          preferences: { ...mockUser.preferences, ...newPreferences }
        });
      expect(result.preferences)
        .toEqual(expect.objectContaining(newPreferences));
    });

    test('should handle user not found', async () => {
      // Arrange
      const uid = 'nonexistent-uid';
      const preferences = TestUtils.createValidPreferences();
      global.mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUserPreferences(uid, preferences))
        .rejects
        .toThrow(
          new AppError('User not found', 404)
        );

      expect(global.mockUserRepository.update)
        .not
        .toHaveBeenCalled();
    });
  });

  describe('recordGamePlayed', () => {
    test('should record game and update statistics correctly', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const gameData = TestUtils.createValidGameData();
      global.mockUserRepository.findById.mockResolvedValue(mockUser);

      const expectedStatistics = {
        gamesPlayed: 1,
        connectionLevelsReached: {
          friends: 3
        },
        favoriteRelationshipType: 'friends'
      };

      // Act
      const result = await userService.recordGamePlayed(uid, gameData);

      // Assert
      expect(global.mockUserRepository.findById)
        .toHaveBeenCalledWith(uid);
      expect(global.mockUserRepository.updateStatistics)
        .toHaveBeenCalledWith(uid, expectedStatistics);
      expect(result)
        .toEqual(expectedStatistics);
    });

    test('should update existing statistics correctly', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const gameData = {
        relationshipType: 'colleagues',
        connectionLevel: 2
      };
      global.mockUserRepository.findById.mockResolvedValue(mockUserWithStats);

      const expectedStatistics = {
        gamesPlayed: 6, // 5 + 1
        connectionLevelsReached: {
          friends: 3, // existing
          new_couples: 2, // existing
          colleagues: 2 // new
        },
        favoriteRelationshipType: 'colleagues' // still most played
      };

      // Act
      const result = await userService.recordGamePlayed(uid, gameData);

      // Assert
      expect(result)
        .toEqual(expectedStatistics);
    });

    test('should handle higher connection level for existing relationship', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const gameData = {
        relationshipType: 'friends',
        connectionLevel: 4
      };
      global.mockUserRepository.findById.mockResolvedValue(mockUserWithStats);

      // Act
      const result = await userService.recordGamePlayed(uid, gameData);

      // Assert
      expect(result.connectionLevelsReached.friends)
        .toBe(4); // Updated to higher level
    });

    test('should not decrease connection level for existing relationship', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const gameData = {
        relationshipType: 'friends',
        connectionLevel: 1
      };
      global.mockUserRepository.findById.mockResolvedValue(mockUserWithStats);

      // Act
      const result = await userService.recordGamePlayed(uid, gameData);

      // Assert
      expect(result.connectionLevelsReached.friends)
        .toBe(3); // Kept at higher level
    });

    test('should handle user not found', async () => {
      // Arrange
      const uid = 'nonexistent-uid';
      const gameData = TestUtils.createValidGameData();
      global.mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.recordGamePlayed(uid, gameData))
        .rejects
        .toThrow(
          new AppError('User not found', 404)
        );
    });

    test('should handle repository statistics update failure', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      const gameData = TestUtils.createValidGameData();
      global.mockUserRepository.findById.mockResolvedValue(mockUser);
      TestUtils.mockUserRepositoryError('updateStatistics', new Error('Statistics update failed'));

      // Act & Assert
      await expect(userService.recordGamePlayed(uid, gameData))
        .rejects
        .toThrow('Statistics update failed');
    });
  });

  describe('updateLastLogin', () => {
    test('should update last login successfully', async () => {
      // Arrange
      const uid = 'firebase-uid-123';

      // Act
      await userService.updateLastLogin(uid);

      // Assert
      expect(global.mockUserRepository.updateLastLogin)
        .toHaveBeenCalledWith(uid);
    });

    test('should handle repository failure gracefully', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      TestUtils.mockUserRepositoryError('updateLastLogin', new Error('Update failed'));

      // Act & Assert - Should not throw error
      await expect(userService.updateLastLogin(uid))
        .rejects
        .toThrow();
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      // Arrange
      const uid = 'firebase-uid-123';

      // Act
      await userService.deleteUser(uid);

      // Assert
      expect(global.mockUserRepository.delete)
        .toHaveBeenCalledWith(uid);
    });

    test('should handle repository deletion failure', async () => {
      // Arrange
      const uid = 'firebase-uid-123';
      TestUtils.mockUserRepositoryError('delete', new Error('Deletion failed'));

      // Act & Assert
      await expect(userService.deleteUser(uid))
        .rejects
        .toThrow('Deletion failed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null or undefined input gracefully', async () => {
      // Act & Assert
      await expect(userService.createUser(null))
        .rejects
        .toThrow();
      await expect(userService.createUser(undefined))
        .rejects
        .toThrow();
      await expect(userService.getUserById(undefined))
        .rejects
        .toThrow();
      await expect(userService.getUserById(null))
        .rejects
        .toThrow();
    });

    test('should handle empty string inputs', async () => {
      // Act & Assert
      await expect(userService.getUserById(''))
        .rejects
        .toThrow();
      await expect(userService.getUserByEmail(''))
        .rejects
        .toThrow();
    });

    test('should handle malformed data gracefully', async () => {
      // Arrange
      const malformedData = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        birthDate: 'not-a-date', // Invalid date
        preferences: 'not-an-object' // Invalid preferences
      };

      // Act & Assert
      await expect(userService.createUser(malformedData))
        .rejects
        .toThrow(
          expect.objectContaining({
            statusCode: 400,
            message: expect.stringContaining('Validation error')
          })
        );
    });
  });
});
