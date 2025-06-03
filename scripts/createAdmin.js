#!/usr/bin/env node

/**
 * Script to create a new admin user
 * Usage: node scripts/createAdmin.js
 */

require('dotenv')
  .config();
const AuthService = require('../src/services/authService');
const logger = require('../src/utils/logger');
const config = require('../src/config');

// Admin user data - modify these values as needed
const ADMIN_USER_DATA = {
  email: config.initAdmin.email,
  password: config.initAdmin.password,
  displayName: config.initAdmin.displayName,
  birthDate: config.initAdmin.birthDate,
  language: config.initAdmin.language,
  role: config.initAdmin.role
};

async function createAdminUser() {
  const authService = new AuthService();

  try {
    console.log('🚀 Creating admin user...');
    console.log(`📧 Email: ${ADMIN_USER_DATA.email}`);
    console.log(`👤 Name: ${ADMIN_USER_DATA.displayName}`);

    // Step 1: Register the user
    console.log('\n📝 Registering user...');
    const registrationResult = await authService.registerUser(ADMIN_USER_DATA);

    const userId = registrationResult.user.uid;
    console.log(`✅ User created with ID: ${userId}`);

    // Step 2: Set admin claims (this should already be done during registration, but let's ensure)
    console.log('\n🔐 Setting admin claims...');
    await authService.setAdminClaim(userId);
    console.log('✅ Admin claims set successfully');

    // Step 3: Verify admin status
    console.log('\n🔍 Verifying admin status...');
    const { auth } = require('../src/config/firebase');
    const userRecord = await auth.getUser(userId);

    if (userRecord.customClaims?.admin) {
      console.log('✅ Admin verification successful');
      console.log(`🎉 Admin user created successfully!`);
      console.log('\n📋 User Details:');
      console.log(`   UID: ${userId}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Display Name: ${userRecord.displayName}`);
      console.log(`   Admin Status: ${userRecord.customClaims.admin ? 'Yes' : 'No'}`);
      console.log(`   Role: ${userRecord.customClaims.role}`);
    }
    else {
      console.error('❌ Failed to verify admin status');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);

    // Provide helpful error messages
    if (error.message.includes('email-already-exists')) {
      console.log('\n💡 Solution: The email is already registered. You can:');
      console.log('   1. Use a different email address');
      console.log('   2. Set admin claims on existing user with setAdminOnExistingUser.js');
    }
    else if (error.message.includes('weak-password')) {
      console.log('\n💡 Solution: Use a stronger password (min 8 chars, letters + numbers)');
    }

    process.exit(1);
  }
}

// Validate environment before running
function validateEnvironment() {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\n💡 Make sure your .env file is properly configured');
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('🔧 Connection Game - Admin User Creation Script');
  console.log('================================================\n');

  // Validate environment
  validateEnvironment();

  // Confirm before proceeding
  console.log('⚠️  This will create a new admin user with the following details:');
  console.log(`   Email: ${ADMIN_USER_DATA.email}`);
  console.log(`   Name: ${ADMIN_USER_DATA.displayName}`);
  console.log(`   Role: Admin\n`);

  // In production, you might want to add a confirmation prompt
  // For now, we'll proceed directly

  await createAdminUser();

  console.log('\n🎯 Next steps:');
  console.log('   1. Save the login credentials securely');
  console.log('   2. Test admin access via the web interface');
  console.log('   3. Update the admin email/password as needed');
  console.log('\n✨ Admin user creation complete!');
}

// Handle script execution
if (require.main === module) {
  main()
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  createAdminUser,
  ADMIN_USER_DATA
};
