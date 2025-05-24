// tests/helpers/testUtils.js (Fixed version)
const { mockUser, mockFirebaseUser } = require('./mockData');

class TestUtils {
  static resetAllMocks() {
    // Reset specific mocks directly
    if (global.mockFirebaseAuth) {
      Object.values(global.mockFirebaseAuth).forEach(mockFn => {
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
}

module.exports = TestUtils;