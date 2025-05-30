// tests/helpers/testUtils.js (Fixed version)
const {
  mockFirebaseUser,
  mockUser,
  mockGameData
} = require('./mockData');

class TestUtils {
  static resetAllMocks() {
    if (global.mockFirebaseAuth) {
      Object.values(global.mockFirebaseAuth)
        .forEach(mockFn => {
          if (typeof mockFn.mockReset === 'function') {
            mockFn.mockReset();
          }
        });
    }

    if (global.mockUserRepository) {
      Object.values(global.mockUserRepository)
        .forEach(mockFn => {
          if (typeof mockFn.mockReset === 'function') {
            mockFn.mockReset();
          }
        });
    }

    if (global.mockDeckRepository) {
      Object.values(mockDeckRepository)
        .forEach(mockFn => {
          if (typeof mockFn.mockReset === 'function') {
            mockFn.mockReset();
          }
        });
    }
    if (global.mockCardRepository) {
      Object.values(mockCardRepository)
        .forEach(mockFn => {
          if (typeof mockFn.mockReset === 'function') {
            mockFn.mockReset();
          }
        });
    }
    if (global.mockUserRepository) {
       Object.values(mockUserRepository)
        .forEach(mockFn => {
          if (typeof mockFn.mockReset === 'function') {
            mockFn.mockReset();
          }
        });
    }
  }

  static mockFirebaseSuccess() {
    global.mockFirebaseAuth.createUser.mockResolvedValue({
      uid: mockFirebaseUser.uid,
      email: mockFirebaseUser.email,
      displayName: mockFirebaseUser.displayName
    });

    global.mockFirebaseAuth.createCustomToken.mockResolvedValue('mock-custom-token');
  }

  static mockFirebaseAuthError(errorCode) {
    const error = new Error('Firebase Auth Error');
    error.code = errorCode;
    global.mockFirebaseAuth.createUser.mockRejectedValue(error);
  }

  static mockTokenGenerationError() {
    global.mockFirebaseAuth.createCustomToken.mockRejectedValue(
      new Error('Token generation failed')
    );
  }

  // UserRepository mock helpers
  static mockUserRepositorySuccess() {
    global.mockUserRepository.create.mockResolvedValue(mockUser);
    global.mockUserRepository.findById.mockResolvedValue(mockUser);
    global.mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    global.mockUserRepository.update.mockResolvedValue(mockUser);
    global.mockUserRepository.updateLastLogin.mockResolvedValue();
    global.mockUserRepository.updateStatistics.mockResolvedValue();
    global.mockUserRepository.delete.mockResolvedValue();
  }

  static mockUserRepositoryNotFound() {
    global.mockUserRepository.findById.mockResolvedValue(null);
    global.mockUserRepository.findByEmail.mockResolvedValue(null);
  }

  static mockUserRepositoryError(method, error) {
    global.mockUserRepository[method].mockRejectedValue(error);
  }

  static createValidUserData() {
    return {
      email: 'test@example.com',
      password: 'password123456',
      displayName: 'Test User',
      birthDate: new Date('1990-01-01'),
      avatar: 'https://example.com/avatar.jpg'
    };
  }

  static createInvalidUserData() {
    return {
      email: 'invalid-email',
      password: '123', // Too short
      displayName: '',
      birthDate: new Date('2010-01-01') // Too young
    };
  }

  static createValidUpdateData() {
    return {
      displayName: 'Updated User',
      avatar: 'https://example.com/new-avatar.jpg'
    };
  }

  static createValidPreferences() {
    return {
      relationshipTypes: ['friends', 'colleagues'],
      contentFilters: { nsfw: false }
    };
  }

  static createValidGameData() {
    return {
      relationshipType: 'friends',
      connectionLevel: 3,
      sessionDuration: 1800000
    };
  }
}

module.exports = TestUtils;
