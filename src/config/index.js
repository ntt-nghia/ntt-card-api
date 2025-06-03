require('dotenv').config();

// Validate critical environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
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

  initAdmin: {
    email: process.env.FIREBASE_INIT_ADMIN_EMAIL,
    password: process.env.FIREBASE_INIT_ADMIN_PASSWORD,
    displayName: process.env.FIREBASE_INIT_ADMIN_DISPLAYNAME,
    birthDate: process.env.FIREBASE_INIT_ADMIN_BIRTHDATE,
    language: process.env.FIREBASE_INIT_ADMIN_LANGUAGE,
    role: process.env.FIREBASE_INIT_ADMIN_ROLE,
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

  // Enhanced Gemini AI configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 2048,

    // Quality and performance settings
    qualitySettings: {
      lowTheta: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.3
      },
      mediumTheta: {
        temperature: 0.5,
        topP: 0.7,
        topK: 20,
        frequencyPenalty: 0.5
      },
      highTheta: {
        temperature: 0.2,
        topP: 0.4,
        topK: 10,
        frequencyPenalty: 0.8
      }
    },

    // Rate limiting and cost optimization
    rateLimiting: {
      requestsPerMinute: parseInt(process.env.GEMINI_REQUESTS_PER_MINUTE) || 60,
      requestsPerHour: parseInt(process.env.GEMINI_REQUESTS_PER_HOUR) || 1000,
      maxRetries: 3,
      retryDelay: 1000 // Base delay in ms
    },

    // Safety settings
    safetySettings: {
      harassment: process.env.GEMINI_SAFETY_HARASSMENT || 'BLOCK_MEDIUM_AND_ABOVE',
      hateSpeech: process.env.GEMINI_SAFETY_HATE_SPEECH || 'BLOCK_MEDIUM_AND_ABOVE',
      sexuallyExplicit: process.env.GEMINI_SAFETY_SEXUALLY_EXPLICIT || 'BLOCK_MEDIUM_AND_ABOVE',
      dangerousContent: process.env.GEMINI_SAFETY_DANGEROUS_CONTENT || 'BLOCK_MEDIUM_AND_ABOVE'
    }
  },

  // Game configuration
  game: {
    maxSessionDuration: 3600000, // 1 hour in milliseconds
    maxPlayersPerSession: 8,
    connectionLevels: 4,
    cardTypes: ['question', 'challenge', 'scenario', 'connection', 'wild'],
    relationshipTypes: ['friends', 'colleagues', 'new_couples', 'established_couples', 'family'],

    // AI generation limits
    ai: {
      maxCardsPerRequest: 20,
      maxBatchConfigurations: 10,
      minThetaValue: 0.1,
      maxThetaValue: 1.0,
      supportedLanguages: ['en', 'vn'],
      duplicateCheckLimit: 1000, // Max existing cards to check for duplicates
      sessionCacheSize: 10000 // Max items in session duplicate cache
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log',

    // AI-specific logging
    aiLogging: {
      logGenerationRequests: process.env.LOG_AI_REQUESTS === 'true',
      logGenerationResponses: process.env.LOG_AI_RESPONSES === 'true',
      logPerformanceMetrics: process.env.LOG_AI_PERFORMANCE === 'true'
    }
  },

  // Monitoring and alerting
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    aiServiceHealthCheckInterval: parseInt(process.env.AI_HEALTH_CHECK_INTERVAL) || 300000, // 5 minutes
    alertThresholds: {
      aiResponseTime: parseInt(process.env.AI_RESPONSE_TIME_THRESHOLD) || 30000, // 30 seconds
      aiErrorRate: parseFloat(process.env.AI_ERROR_RATE_THRESHOLD) || 0.1, // 10%
      duplicateRate: parseFloat(process.env.DUPLICATE_RATE_THRESHOLD) || 0.2 // 20%
    }
  }
};

// Validate Gemini configuration if AI features are enabled
if (config.gemini.apiKey) {
  console.log('✅ Gemini AI service configured');
  console.log(`🤖 Model: ${config.gemini.model}`);
  console.log(`🌍 Languages: ${config.game.ai.supportedLanguages.join(', ')}`);
} else {
  console.warn('⚠️  Gemini API key not provided. AI features will be disabled.');
}

module.exports = config;
