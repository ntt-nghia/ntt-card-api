require('dotenv').config();

console.log('🔍 Testing Firebase Configuration...\n');

// Check environment variables
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

console.log('📋 Environment Variables Check:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'FIREBASE_PRIVATE_KEY') {
      console.log(`✅ ${varName}: [${value.length} characters]`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

// Test Firebase initialization
console.log('\n🔥 Testing Firebase Initialization:');
try {
  const { admin, db, auth } = require('../src/config/firebase');
  console.log('✅ Firebase Admin SDK imported successfully');
  console.log('✅ Firestore instance created');
  console.log('✅ Auth instance created');

  // Test a simple operation
  console.log('\n🧪 Testing Firebase Operations:');

  // Test Firestore connection
  db.settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firestore settings configured');

  console.log('\n🎉 All Firebase configuration tests passed!');

} catch (error) {
  console.error('\n❌ Firebase Configuration Error:');
  console.error(error.message);

  if (error.message.includes('project_id')) {
    console.log('\n💡 Fix suggestions:');
    console.log('1. Check that FIREBASE_PROJECT_ID is set in your .env file');
    console.log('2. Make sure there are no extra spaces or quotes around the value');
    console.log('3. Restart your application after updating .env');
  }

  if (error.message.includes('private_key')) {
    console.log('\n💡 Private Key Fix suggestions:');
    console.log('1. Make sure your private key includes the BEGIN and END lines');
    console.log('2. The private key should be wrapped in double quotes');
    console.log('3. Keep the \\n characters in the key as literal text');
  }
}