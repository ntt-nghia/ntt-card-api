require('dotenv')
  .config();

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
    role: process.env.FIREBASE_INIT_ADMIN_ROLE
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
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',

    // Model Selection
    models: {
      flash: 'gemini-1.5-flash-002',
      pro: 'gemini-1.5-pro-002',
      experimental: 'gemini-2.0-flash-experimental'
    },

    // Rate Limits (requests per minute)
    rateLimits: {
      flash: 2000,
      pro: 1000,
      experimental: 60
    },

    // Cost per 1M tokens (USD)
    pricing: {
      flash: {
        input: 0.075,
        output: 0.30,
        inputOver128k: 0.15,
        outputOver128k: 0.60
      },
      pro: {
        input: 3.50,
        output: 10.50,
        inputOver128k: 7.00,
        outputOver128k: 21.00
      }
    },

    // Generation Configuration
    generation: {
      // Theta to Gemini parameter mapping
      qualityMapping: {
        temperature: {
          min: 0.1,
          max: 0.9,
          formula: (theta) => Math.min(0.9, theta * 1.2)
        },
        topP: {
          min: 0.8,
          max: 1.0,
          formula: (theta) => Math.max(0.8, 1 - (theta * 0.2))
        },
        maxOutputTokens: {
          basic: 1024,      // theta < 0.4
          standard: 2048,   // theta 0.4-0.6
          high: 3072,       // theta 0.6-0.8
          premium: 4096     // theta >= 0.8
        }
      },

      // Safety and content filters
      safetySettings: {
        HARM_CATEGORY_HARASSMENT: 'BLOCK_MEDIUM_AND_ABOVE',
        HARM_CATEGORY_HATE_SPEECH: 'BLOCK_MEDIUM_AND_ABOVE',
        HARM_CATEGORY_SEXUALLY_EXPLICIT: 'BLOCK_MEDIUM_AND_ABOVE',
        HARM_CATEGORY_DANGEROUS_CONTENT: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    }
  },

  // Batch Processing Configuration
  batch: {
    defaultSize: 10,
    maxSize: 25,
    minSize: 1,

    // Delays between batches (ms)
    delays: {
      basic: 1000,      // theta < 0.6
      premium: 2000,    // theta >= 0.6
      rateLimited: 5000 // when rate limited
    },

    // Retry configuration
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },

  // Duplication Prevention Configuration
  duplication: {
    // Hash algorithm for content fingerprinting
    hashAlgorithm: 'sha256',

    // Similarity thresholds
    thresholds: {
      exactMatch: 1.0,        // Perfect hash match
      semantic: 0.7,          // Semantic similarity (Jaccard)
      fuzzy: 0.8,            // Fuzzy string matching (Levenshtein)
      keywordOverlap: 0.6     // Keyword overlap threshold
    },

    // Cache settings
    cache: {
      maxSize: 10000,         // Maximum cached content hashes
      ttl: 86400000,         // 24 hours in ms
      cleanupInterval: 3600000 // 1 hour cleanup interval
    },

    // Comparison settings
    comparison: {
      minWordLength: 3,       // Ignore words shorter than this
      maxComparisons: 100,    // Max existing cards to compare against
      skipCommonWords: true   // Skip common English words
    }
  },

  // Content Quality Configuration
  quality: {
    // Tier mapping based on theta
    tierMapping: {
      free: {
        min: 0.1,
        max: 0.5
      },
      premium: {
        min: 0.6,
        max: 1.0
      }
    },

    // Content length recommendations
    contentLength: {
      question: {
        min: 10,
        max: 200,
        optimal: 50
      },
      challenge: {
        min: 15,
        max: 300,
        optimal: 100
      },
      scenario: {
        min: 20,
        max: 400,
        optimal: 150
      },
      connection: {
        min: 15,
        max: 250,
        optimal: 80
      },
      wild: {
        min: 10,
        max: 200,
        optimal: 60
      }
    },

    // Card type distribution by count
    typeDistribution: {
      1: { question: 1.0 },
      2: {
        question: 0.8,
        challenge: 0.2
      },
      3: {
        question: 0.6,
        challenge: 0.3,
        scenario: 0.1
      },
      5: {
        question: 0.5,
        challenge: 0.3,
        scenario: 0.15,
        connection: 0.05
      },
      10: {
        question: 0.4,
        challenge: 0.25,
        scenario: 0.2,
        connection: 0.1,
        wild: 0.05
      },
      default: {
        question: 0.4,
        challenge: 0.25,
        scenario: 0.15,
        connection: 0.1,
        wild: 0.1
      }
    }
  },

  // Language Configuration
  languages: {
    supported: ['en'],
    fallback: 'en',

    // Language-specific prompting
    prompts: {
      en: {
        tone: 'conversational American English',
        style: 'inclusive and culturally neutral',
        audience: 'international English speakers'
      }
      // Future: Add support for Vietnamese and other languages
    }
  },

  // Monitoring and Analytics
  monitoring: {
    // Metrics to track
    metrics: {
      generationTime: true,
      tokenUsage: true,
      costTracking: true,
      duplicateRate: true,
      qualityDistribution: true,
      errorRate: true
    },

    // Thresholds for alerts
    alerts: {
      highCostPerCard: 0.10,     // USD
      highDuplicateRate: 0.3,    // 30%
      slowGenerationTime: 30000, // 30 seconds
      highErrorRate: 0.2         // 20%
    },

    // Logging configuration
    logging: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      includePrompts: process.env.NODE_ENV !== 'production',
      includeResponses: process.env.NODE_ENV !== 'production'
    }
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
