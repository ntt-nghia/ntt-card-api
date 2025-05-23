const axios = require('axios');
const { auth } = require('../src/config/firebase');

const BASE_URL = 'http://localhost:3000/api/v1';

async function cleanupTestUser(email) {
  try {
    const user = await auth.getUserByEmail(email);
    if (user) {
      await auth.deleteUser(user.uid);
      console.log('🧹 Cleaned up existing test user');
    }
  } catch (error) {
    // User doesn't exist, which is fine
  }
}

async function testAuth() {
  const testEmail = `test-${Date.now()}@example.com`;

  try {
    // Cleanup any existing test user
    await cleanupTestUser(testEmail);

    // Test registration
    const registerData = {
      email: testEmail,
      password: 'password123456',
      displayName: 'Test User',
      birthDate: new Date('1990-01-01').toISOString()
    };

    console.log('Testing registration...');
    console.log('Test user email:', testEmail);

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful');
    console.log('User UID:', registerResponse.data.data.user.uid);
    console.log('Display Name:', registerResponse.data.data.user.displayName);

    // Test health endpoint
    console.log('\nTesting health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check successful');
    console.log('Server uptime:', Math.round(healthResponse.data.uptime), 'seconds');

    // Cleanup test user
    await cleanupTestUser(testEmail);
    console.log('🧹 Test user cleaned up');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }

    // Attempt cleanup even on failure
    try {
      await cleanupTestUser(testEmail);
    } catch (cleanupError) {
      console.error('Failed to cleanup test user:', cleanupError.message);
    }
  }
}

// Add a small delay before running test
setTimeout(testAuth, 1000);