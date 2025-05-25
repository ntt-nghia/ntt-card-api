const admin = require('firebase-admin');
const serviceAccount = require('/Users/nguyentranthanhnghia/Documents/database-tera/src/gke/service_account/fir-local-d89df-firebase-adminsdk-fbsvc-5ee419e046.json'); // Fixme: update this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeDatabase() {
  try {
    // Create initial card content for testing
    const initialCards = [
      {
        content: 'What\'s the most spontaneous thing you\'ve ever done?',
        type: 'question',
        connectionLevel: 1,
        relationshipTypes: ['friends'],
        categories: ['spontaneity', 'experiences'],
        metadata: {
          estimatedResponseTime: 60
        },
        status: 'active',
        createdBy: 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        content: 'Share a childhood memory that still makes you smile',
        type: 'question',
        connectionLevel: 2,
        relationshipTypes: ['friends', 'family'],
        categories: ['childhood', 'memories'],
        metadata: {
          estimatedResponseTime: 120,
          drinkingConsequence: {
            onComplete: 0,
            onSkip: 1
          }
        },
        status: 'active',
        createdBy: 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Add initial cards
    for (const card of initialCards) {
      await db.collection('cards')
        .add(card);
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

initializeDatabase();
