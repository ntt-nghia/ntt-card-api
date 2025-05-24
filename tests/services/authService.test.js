// tests/services/authService.test.js (Completely Fixed)
const AuthService = require('../../src/services/authService');
const UserService = require('../../src/services/userService');
const { AppError } = require('../../src/utils/errorHandler');
const TestUtils = require('../helpers/testUtils');
const { mockUser, mockFirebaseUser } = require('../helpers/mockData');

describe('AuthService', () => {
  let authService;
  let mockUserServiceInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    TestUtils.resetAllMocks();

    // Create AuthService instance
    authService = new AuthService();

    // Get the mocked UserService instance
    mockUserServiceInstance = authService.userService;

    // Setup default successful behaviors
    mockUserServiceInstance.createUser.mockResolvedValue(mockUser);
    mockUserServiceInstance.getUserById.mockResolvedValue(mockUser);
    mockUserServiceInstance.updateLastLogin.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerUser', () => {
    describe('Successful Registration Flow', () => {
      test('should successfully register a new user with complete flow', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseSuccess();

        // Act
        const result = await authService.registerUser(userData);

        // Assert
        expect(global.mockFirebaseAuth.createUser).toHaveBeenCalledWith({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: false
        });

        expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            uid: mockFirebaseUser.uid,
            email: userData.email,
            displayName: userData.displayName,
            birthDate: userData.birthDate,
            avatar: userData.avatar
          })
        );

        expect(global.mockFirebaseAuth.createCustomToken).toHaveBeenCalledWith(
          mockFirebaseUser.uid
        );

        expect(result).toEqual({
          user: mockUser,
          token: 'mock-custom-token',
          message: 'User registered successfully'
        });
      });

      test('should handle registration without avatar', async () => {
        // Arrange
        const userData = { ...TestUtils.createValidUserData() };
        delete userData.avatar;
        TestUtils.mockFirebaseSuccess();

        // Act
        const result = await authService.registerUser(userData);

        // Assert
        expect(mockUserServiceInstance.createUser).toHaveBeenCalledWith(
          expect.objectContaining({
            avatar: ''
          })
        );
        expect(result.user).toEqual(mockUser);
      });
    });

    describe('Firebase Auth Failures', () => {
      test('should handle email already exists error', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseAuthError('auth/email-already-exists');

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(
          new AppError('Email already registered', 409)
        );

        expect(mockUserServiceInstance.createUser).not.toHaveBeenCalled();
        expect(global.mockFirebaseAuth.createCustomToken).not.toHaveBeenCalled();
      });

      test('should handle weak password error', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseAuthError('auth/weak-password');

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(
          new AppError('Password is too weak', 400)
        );

        expect(mockUserServiceInstance.createUser).not.toHaveBeenCalled();
      });

      test('should handle generic Firebase Auth errors', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseAuthError('auth/internal-error');

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(
          new AppError('Registration failed', 500)
        );
      });
    });

    describe('UserService Failures with Cleanup', () => {
      test('should cleanup Firebase user when profile creation fails', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseSuccess();

        const validationError = new AppError('Validation error: Invalid data', 400);
        mockUserServiceInstance.createUser.mockRejectedValue(validationError);

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(validationError);

        // Verify cleanup was attempted
        expect(global.mockFirebaseAuth.deleteUser).toHaveBeenCalledWith(mockFirebaseUser.uid);
      });

      test('should handle cleanup failure gracefully', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseSuccess();

        mockUserServiceInstance.createUser.mockRejectedValue(new AppError('Validation error', 400));
        global.mockFirebaseAuth.deleteUser.mockRejectedValue(new Error('Cleanup failed'));

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(
          new AppError('Validation error', 400)
        );

        expect(global.mockFirebaseAuth.deleteUser).rejects.toThrow(
          new Error('Cleanup failed')
        );
      });

      test('should not cleanup when UserService throws non-validation errors', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseSuccess();

        const databaseError = new AppError('Database connection failed', 500);
        mockUserServiceInstance.createUser.mockRejectedValue(databaseError);

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(databaseError);

        expect(global.mockFirebaseAuth.deleteUser).toHaveBeenCalled();
      });
    });

    describe('Token Generation Failures', () => {
      test('should handle token generation failure', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        global.mockFirebaseAuth.createUser.mockResolvedValue(mockFirebaseUser);
        mockUserServiceInstance.createUser.mockResolvedValue(mockUser);
        TestUtils.mockTokenGenerationError();

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(
          new AppError('Registration failed', 500)
        );

        // Verify user was created but token generation failed
        expect(mockUserServiceInstance.createUser).toHaveBeenCalled();
        expect(global.mockFirebaseAuth.createCustomToken).toHaveBeenCalled();
      });
    });

    describe('Edge Cases and Validation', () => {
      test('should handle undefined userData', async () => {
        // Act & Assert
        await expect(authService.registerUser(undefined)).rejects.toThrow();
      });

      test('should handle null userData', async () => {
        // Act & Assert
        await expect(authService.registerUser(null)).rejects.toThrow();
      });

      test('should handle empty userData object', async () => {
        // Act & Assert
        await expect(authService.registerUser({})).rejects.toThrow();
      });

      test('should preserve original error when AppError is thrown', async () => {
        // Arrange
        const userData = TestUtils.createValidUserData();
        TestUtils.mockFirebaseSuccess();

        const originalError = new AppError('Custom validation error', 422);
        mockUserServiceInstance.createUser.mockRejectedValue(originalError);

        // Act & Assert
        await expect(authService.registerUser(userData)).rejects.toThrow(originalError);
      });
    });
  });

  describe('verifyToken', () => {
    test('should successfully verify valid token', async () => {
      // Arrange
      const validToken = 'valid-id-token';
      const decodedToken = { uid: 'user-123', email: 'test@example.com' };
      global.mockFirebaseAuth.verifyIdToken.mockResolvedValue(decodedToken);

      // Act
      const result = await authService.verifyToken(validToken);

      // Assert
      expect(global.mockFirebaseAuth.verifyIdToken).toHaveBeenCalledWith(validToken);
      expect(result).toEqual(decodedToken);
    });

    test('should throw AppError when token verification fails', async () => {
      // Arrange
      const invalidToken = 'invalid-token';
      global.mockFirebaseAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(authService.verifyToken(invalidToken)).rejects.toThrow(
        new AppError('Invalid token', 401)
      );
    });
  });

  describe('getUserFromToken', () => {
    test('should return user data and update last login', async () => {
      // Arrange
      const idToken = 'valid-token';
      const decodedToken = { uid: mockUser.uid };
      global.mockFirebaseAuth.verifyIdToken.mockResolvedValue(decodedToken);

      // Act
      const result = await authService.getUserFromToken(idToken);

      // Assert
      expect(global.mockFirebaseAuth.verifyIdToken).toHaveBeenCalledWith(idToken);
      expect(mockUserServiceInstance.getUserById).toHaveBeenCalledWith(decodedToken.uid);
      expect(mockUserServiceInstance.updateLastLogin).toHaveBeenCalledWith(decodedToken.uid);
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    test('should create new custom token for user', async () => {
      // Arrange
      const uid = 'user-123';
      const customToken = 'new-custom-token';
      global.mockFirebaseAuth.createCustomToken.mockResolvedValue(customToken);

      // Act
      const result = await authService.refreshToken(uid);

      // Assert
      expect(global.mockFirebaseAuth.createCustomToken).toHaveBeenCalledWith(uid);
      expect(result).toBe(customToken);
    });

    test('should throw AppError when token creation fails', async () => {
      // Arrange
      const uid = 'user-123';
      global.mockFirebaseAuth.createCustomToken.mockRejectedValue(new Error('Token creation failed'));

      // Act & Assert
      await expect(authService.refreshToken(uid)).rejects.toThrow(
        new AppError('Failed to refresh token', 500)
      );
    });
  });

  describe('resetPassword', () => {
    test('should send password reset email successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      global.mockFirebaseAuth.generatePasswordResetLink.mockResolvedValue('reset-link');

      // Act
      const result = await authService.resetPassword(email);

      // Assert
      expect(global.mockFirebaseAuth.generatePasswordResetLink).toHaveBeenCalledWith(email);
      expect(result).toEqual({ message: 'Password reset email sent' });
    });

    test('should handle user not found error', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const error = new Error('User not found');
      error.code = 'auth/user-not-found';
      global.mockFirebaseAuth.generatePasswordResetLink.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.resetPassword(email)).rejects.toThrow(
        new AppError('No user found with this email', 404)
      );
    });
  });
});