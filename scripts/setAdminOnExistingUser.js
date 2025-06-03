#!/usr/bin/env node

/**
 * Script to set admin claims on an existing user
 * Usage: node scripts/setAdminOnExistingUser.js <email_or_uid>
 */

require('dotenv').config();
const AuthService = require('../src/services/authService');
const logger = require('../src/utils/logger');

async function setAdminOnExistingUser(emailOrUid) {
  const authService = new AuthService();
  const { auth } = require('../src/config/firebase');

  try {
    console.log('🔍 Looking up user...');

    let userRecord;

    // Try to get user by email first, then by UID
    try {
      if (emailOrUid.includes('@')) {
        console.log(`📧 Looking up by email: ${emailOrUid}`);
        userRecord = await auth.getUserByEmail(emailOrUid);
      } else {
        console.log(`🆔 Looking up by UID: ${emailOrUid}`);
        userRecord = await auth.getUser(emailOrUid);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error(`❌ User not found: ${emailOrUid}`);
        console.log('\n💡 Make sure the email or UID is correct');
        process.exit(1);
      }
      throw error;
    }

    console.log(`✅ Found user: ${userRecord.displayName || userRecord.email} (${userRecord.uid})`);

    // Check current admin status
    const isCurrentlyAdmin = userRecord.customClaims?.admin === true;
    console.log(`📋 Current admin status: ${isCurrentlyAdmin ? 'Yes' : 'No'}`);

    if (isCurrentlyAdmin) {
      console.log('ℹ️  User is already an admin. No changes needed.');
      return userRecord;
    }

    // Set admin claims
    console.log('\n🔐 Setting admin claims...');
    await authService.setAdminClaim(userRecord.uid);
    console.log('✅ Admin claims set successfully');

    // Verify the change
    console.log('\n🔍 Verifying admin status...');
    const updatedUserRecord = await auth.getUser(userRecord.uid);

    if (updatedUserRecord.customClaims?.admin) {
      console.log('✅ Admin verification successful');
      console.log('\n🎉 User successfully promoted to admin!');
      console.log('\n📋 Updated User Details:');
      console.log(`   UID: ${updatedUserRecord.uid}`);
      console.log(`   Email: ${updatedUserRecord.email}`);
      console.log(`   Display Name: ${updatedUserRecord.displayName}`);
      console.log(`   Admin Status: ${updatedUserRecord.customClaims.admin ? 'Yes' : 'No'}`);
      console.log(`   Role: ${updatedUserRecord.customClaims.role}`);

      return updatedUserRecord;
    } else {
      console.error('❌ Failed to verify admin status');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error setting admin claims:', error.message);
    process.exit(1);
  }
}

// Validate environment
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
  console.log('🔧 Connection Game - Set Admin on Existing User');
  console.log('===============================================\n');

  // Get email or UID from command line arguments
  const emailOrUid = process.argv[2];

  if (!emailOrUid) {
    console.error('❌ Missing required argument');
    console.log('\n📖 Usage:');
    console.log('   node scripts/setAdminOnExistingUser.js <email_or_uid>');
    console.log('\n📝 Examples:');
    console.log('   node scripts/setAdminOnExistingUser.js user@example.com');
    console.log('   node scripts/setAdminOnExistingUser.js abc123def456ghi789');
    process.exit(1);
  }

  // Validate environment
  validateEnvironment();

  console.log(`🎯 Target user: ${emailOrUid}\n`);

  await setAdminOnExistingUser(emailOrUid);

  console.log('\n🎯 Next steps:');
  console.log('   1. User should log out and log back in for changes to take effect');
  console.log('   2. Test admin access via the web interface');
  console.log('   3. Verify admin panel access works correctly');
  console.log('\n✨ Admin promotion complete!');
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { setAdminOnExistingUser };
