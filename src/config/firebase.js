const admin = require('firebase-admin');
const config = require('./index');
const logger = require('../utils/logger');
// Validate required Firebase configuration
const requiredFirebaseConfig = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missingConfig = requiredFirebaseConfig.filter(key => !process.env[key]);
if (missingConfig.length > 0) {
  throw new Error(`Missing required Firebase configuration: ${missingConfig.join(', ')}`);
}

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: 'service_account',
  project_id: config.firebase.projectId,
  private_key: config.firebase.privateKey,
  client_email: config.firebase.clientEmail
};

// Log configuration (without sensitive data) for debugging
logger.info('Initializing Firebase with config:', {
  project_id: serviceAccount.project_id,
  client_email: serviceAccount.client_email,
  private_key_length: serviceAccount.private_key?.length || 0,
  databaseURL: config.firebase.databaseURL,
  storageBucket: config.firebase.storageBucket
});

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: config.firebase.databaseURL,
      storageBucket: config.firebase.storageBucket
    });

    logger.info('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage
};
