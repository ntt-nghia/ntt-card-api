require('dotenv').config();

// Validate critical environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // Gemini AI configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 1000
  },

  // Game configuration
  game: {
    maxSessionDuration: 3600000, // 1 hour in milliseconds
    maxPlayersPerSession: 8,
    connectionLevels: 4,
    cardTypes: ['question', 'challenge', 'scenario', 'connection', 'wild'],
    relationshipTypes: ['friends', 'colleagues', 'new_couples', 'established_couples', 'family']
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  }
};

module.exports = config;