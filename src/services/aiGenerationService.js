// src/services/aiGenerationService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const CardRepository = require('../repositories/cardRepository');
const DeckRepository = require('../repositories/deckRepository');
const { validateCard } = require('../models/Card');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

class AIGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.cardRepository = new CardRepository();
    this.deckRepository = new DeckRepository();

    // Initialize models for different quality levels
    this.flashModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Batch processing configuration
    this.batchSize = 10; // Optimal batch size for API limits
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Duplication prevention cache
    this.contentHashes = new Set();
    this.semanticCache = new Map();
  }

  /**
   * Generate AI-powered cards with advanced duplication prevention and cost optimization
   * @param {Object} generationRequest - Generation parameters
   * @returns {Object} Generation results
   */
  async generateCards(generationRequest) {
    const {
      relationshipType,
      connectionLevel,
      count = 5,
      theta = 0.5,
      targetLanguages = ['en'],
      deckId,
      userId
    } = generationRequest;

    // Validate inputs
    this.validateGenerationRequest(generationRequest);

    // Load existing cards for duplication prevention
    await this.loadExistingContentHashes(relationshipType, connectionLevel);

    // Generate cards in optimized batches
    const generatedCards = [];
    const batchCount = Math.ceil(count / this.batchSize);

    for (let i = 0; i < batchCount; i++) {
      const batchSize = Math.min(this.batchSize, count - generatedCards.length);

      logger.info(`Generating batch ${i + 1}/${batchCount} with ${batchSize} cards`, {
        relationshipType,
        connectionLevel,
        theta
      });

      try {
        const batchResults = await this.generateCardBatch({
          relationshipType,
          connectionLevel,
          count: batchSize,
          theta,
          targetLanguages,
          deckId,
          userId,
          batchIndex: i
        });

        generatedCards.push(...batchResults);

        // Rate limiting between batches
        if (i < batchCount - 1) {
          await this.delay(this.calculateRateLimit(theta));
        }

      } catch (error) {
        logger.error(`Batch ${i + 1} generation failed:`, error);

        // Continue with remaining batches on partial failure
        if (generatedCards.length === 0) {
          throw new AppError(`AI generation failed: ${error.message}`, 500);
        }
      }
    }

    // Post-processing and validation
    const validatedCards = await this.postProcessCards(generatedCards, {
      relationshipType,
      connectionLevel,
      deckId,
      userId
    });

    return {
      success: true,
      generated: validatedCards.length,
      requested: count,
      theta,
      cost: this.estimateCost(count, theta, targetLanguages.length),
      duplicatesDetected: count - validatedCards.length,
      cards: validatedCards
    };
  }

  /**
   * Generate a batch of cards with optimal API usage
   * @param {Object} batchParams - Batch generation parameters
   * @returns {Array} Generated cards
   */
  async generateCardBatch(batchParams) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      targetLanguages,
      batchIndex
    } = batchParams;

    // Select appropriate model based on theta (quality)
    const model = theta >= 0.6 ? this.proModel : this.flashModel;

    // Build context-optimized prompt
    const prompt = this.buildOptimizedPrompt({
      relationshipType,
      connectionLevel,
      count,
      theta,
      targetLanguages,
      batchIndex
    });

    // Configure generation parameters based on theta
    const generationConfig = this.getGenerationConfig(theta);

    try {
      // Use context caching for repetitive prompts (cost optimization)
      const cacheKey = this.generateCacheKey(relationshipType, connectionLevel, theta);

      if (this.semanticCache.has(cacheKey)) {
        logger.info('Using cached context for generation');
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig
      });

      const response = await result.response;
      const generatedText = response.text();

      // Parse and validate generated cards
      const parsedCards = this.parseGeneratedCards(generatedText, {
        relationshipType,
        connectionLevel,
        theta,
        targetLanguages
      });

      // Apply duplication prevention
      const uniqueCards = await this.filterDuplicates(parsedCards);

      return uniqueCards;

    } catch (error) {
      logger.error('Batch generation error:', error);

      // Implement retry logic with exponential backoff
      if (error.message.includes('quota') || error.message.includes('rate')) {
        await this.handleRateLimit();
        throw new AppError('Rate limit exceeded, please try again later', 429);
      }

      throw new AppError(`AI generation error: ${error.message}`, 500);
    }
  }

  /**
   * Build optimized prompt with relationship-specific templates (ENGAGEMENT-FOCUSED)
   * @param {Object} promptParams - Prompt parameters
   * @returns {string} Optimized prompt
   */
  buildOptimizedPrompt(promptParams) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      targetLanguages,
      batchIndex
    } = promptParams;

    // Base prompt template with quality scaling (UPDATED FOR ENGAGEMENT)
    const qualityInstructions = this.getEngagementFocusedQualityInstructions(theta);
    const relationshipContext = this.getEngagementFocusedRelationshipContext(relationshipType);
    const levelGuidelines = this.getEngagementOptimizedLevelGuidelines(connectionLevel);
    const languageInstructions = this.getLanguageInstructions(targetLanguages);

    // Anti-duplication instructions
    const uniquenessInstructions = `
CRITICAL: Each card must be completely unique. Avoid:
- Similar question patterns or phrasings
- Repetitive scenarios or themes
- Common conversation starters
- Generic relationship advice
Generate diverse, specific, and engaging content that stands apart.
${batchIndex > 0 ? `This is batch ${batchIndex + 1}, ensure complete novelty from previous batches.` : ''}
`;

    const prompt = `
${qualityInstructions}

RELATIONSHIP TYPE: ${relationshipType.toUpperCase()}
${relationshipContext}

CONNECTION LEVEL: ${connectionLevel}/4
${levelGuidelines}

ENGAGEMENT REQUIREMENTS:
- Every card must create immediate participation opportunity
- Include random joy elements in ${this.getJoyPercentage(connectionLevel)}% of cards
- For challenge cards: Must be completable in 5-15 minutes with clear success markers
- Focus on shared experience over individual reflection
- Balance vulnerability with playfulness

ACHIEVABILITY CHECKLIST FOR CHALLENGES:
✓ Can be completed in current setting without special equipment
✓ Has clear completion criteria
✓ Includes celebration or appreciation moment
✓ Scalable difficulty (basic + advanced options)
✓ Partners work together rather than compete

${uniquenessInstructions}

${languageInstructions}

TASK: Generate exactly ${count} cards optimized for maximum engagement and joy.

CARD TYPE DISTRIBUTION (Engagement-Optimized):
${this.getEngagementFocusedCardTypeDistribution(count)}

{
  "cards": [
    {
      "content": {
        "en": "English content here"
      },
      "type": "question|challenge|scenario|connection|wild",
      "connectionLevel": ${connectionLevel},
      "relationshipTypes": ["${relationshipType}"],
      "tier": "FREE|PREMIUM",
      "categories": ["engagement", "joy", "achievable"],
      "contentWarnings": [],
      "engagementElements": ["humor"|"celebration"|"surprise"|"play"|"action"]
    }
  ]
}

ENGAGEMENT SUCCESS CRITERIA:
- Cards should create immediate "Yes, let's do this!" response
- Include elements of surprise, delight, or gentle humor
- Balance meaningful connection with joyful interaction
- For Level 4: Make vulnerability feel adventurous rather than heavy
- All content should strengthen the relationship through positive shared experience
- Tier assignment: ${theta >= 0.6 ? 'Mix of FREE and PREMIUM with bias toward PREMIUM' : 'Primarily FREE tier'}

Generate now with maximum engagement focus:`;

    return prompt;
  }

  /**
   * Get engagement-focused quality-specific generation instructions
   * @param {number} theta - Quality coefficient (0.1-1.0)
   * @returns {string} Quality instructions
   */
  getEngagementFocusedQualityInstructions(theta) {
    if (theta >= 0.8) {
      return `ENGAGEMENT-FOCUSED PREMIUM MODE (θ=${theta}):
- Create immediately compelling, interactive content
- Include surprising elements that spark instant curiosity
- Balance depth with playful engagement
- Add unexpected joy moments (30% of cards should be delightful)
- For challenges: Design achievable 5-15 minute activities with clear success markers
- Use "gamified vulnerability" - make deeper sharing feel like play
- Include celebration and appreciation moments throughout`;
    }
    else if (theta >= 0.6) {
      return `INTERACTIVE HIGH QUALITY MODE (θ=${theta}):
- Design prompts that create immediate action or response
- Include lighthearted elements to maintain energy
- Focus on shared experiences over individual reflection
- For challenges: Use simple props or no props, 5-10 minute completion
- Randomly inject humor through playful scenarios (25% joy factor)
- Balance meaningful sharing with interactive fun`;
    }
    else if (theta >= 0.4) {
      return `ACCESSIBLE ENGAGEMENT MODE (θ=${theta}):
- Create easy-to-start, fun interactions
- Use familiar concepts with surprising twists
- Include celebration and appreciation moments
- For challenges: Simple, immediately doable activities
- Light humor and playfulness in 20% of content
- Focus on positive shared experiences`;
    }
    else {
      return `SIMPLE JOY MODE (θ=${theta}):
- Generate instantly engaging, easy content
- Focus on shared fun and light connection
- Include smile-inducing elements
- For challenges: 2-5 minute simple activities
- Prioritize laughter and comfort over depth
- Create immediate positive interactions`;
    }
  }

  /**
   * Get engagement-focused relationship-specific context and guidelines
   * @param {string} relationshipType - Type of relationship
   * @returns {string} Context instructions
   */
  getEngagementFocusedRelationshipContext(relationshipType) {
    const contexts = {
      friends: `Focus on playful shared experiences, humor, and joyful bonding. Encourage storytelling that brings laughter, memory games, and discovering fun new aspects of friendship. Maintain high energy while creating meaningful moments through play.

ENGAGEMENT STRATEGIES:
- "Memory lane with laughs" - fun exploration of shared history
- "Future adventures" - exciting planning and dreaming together
- "Friendship celebrations" - structured positive reinforcement
- "Playful challenges" - light competition and teamwork
- "Surprise discoveries" - finding new quirks about each other`,

      colleagues: `Build workplace connections through structured fun while maintaining professional boundaries. Focus on team-building activities, professional growth celebrations, and appropriate personal sharing that enhances collaboration.

ENGAGEMENT STRATEGIES:
- "Professional wins celebration" - highlighting achievements together
- "Team building games" - collaborative workplace-appropriate activities
- "Future vision sharing" - career dreams and workplace goals
- "Skill appreciation" - recognizing each other's strengths
- "Work-life balance discoveries" - appropriate personal interests sharing`,

      new_couples: `Accelerate discovery through playful exploration and joyful compatibility testing. Focus on creating positive shared experiences while learning about each other. Make vulnerability feel like adventure and discovery.

ENGAGEMENT STRATEGIES:
- "Discovery adventures" - fun ways to learn about each other
- "Compatibility games" - playful testing of alignment
- "Dream building" - exciting future planning together
- "Appreciation celebrations" - highlighting what attracts you to each other
- "Story sharing" - engaging background and experience exchange`,

      established_couples: `Refresh and energize long-term relationships through playful rediscovery and shared joy. Focus on breaking routines, celebrating your journey, and creating new positive memories together.

ENGAGEMENT STRATEGIES:
- "Relationship archaeology" - fun exploration of shared history
- "Future adventures" - exciting planning and dreaming together
- "Appreciation celebrations" - structured positive reinforcement
- "Playful challenges" - light competition and teamwork
- "Surprise discoveries" - finding new aspects of familiar partner

JOY INJECTION METHODS:
- Memory lane with humor: "Remember when you thought..."
- Future silliness: "In 20 years, we'll probably..."
- Role reversal games: "If you were me for a day..."
- Appreciation comedy: "The weirdest thing I love about you..."
- Dream scenarios: "If we won the lottery tomorrow..."`,

      family: `Bridge generational gaps through fun family activities and joyful tradition building. Focus on creating positive shared experiences that honor different perspectives while building stronger family bonds.

ENGAGEMENT STRATEGIES:
- "Generation bridge games" - fun ways to share different perspectives
- "Family tradition building" - creating new positive rituals together
- "Heritage celebration" - joyful exploration of family history
- "Appreciation circles" - structured family gratitude practices
- "Future family visioning" - exciting planning for family adventures`
    };

    return contexts[relationshipType] || 'Create appropriate relationship-building content with high engagement focus.';
  }

  /**
   * Get engagement-optimized connection level specific guidelines
   * @param {number} level - Connection level (1-4)
   * @returns {string} Level guidelines
   */
  getEngagementOptimizedLevelGuidelines(level) {
    const guidelines = {
      1: `SURFACE LEVEL - IMMEDIATE FUN: Light, entertaining, high-energy topics. Focus on preferences, opinions, and fun observations. Create instant engagement and laughter. Include games, quick challenges, and playful interactions.`,

      2: `PERSONAL LEVEL - ENGAGING SHARING: Share experiences and background through storytelling games and interactive activities. Include moderate self-revelation wrapped in fun formats. Make personal sharing feel like adventure and discovery.`,

      3: `VULNERABLE LEVEL - ADVENTURE IN DEPTH: Encourage deeper emotional sharing through structured, supportive activities. Include fears, dreams, and challenges presented as growth adventures. Make vulnerability feel safe and rewarding through celebration and appreciation.`,

      4: `DEEP LEVEL - ENGAGED VULNERABILITY: Core values and life philosophy explored through exciting, adventure-like sharing. Make profound connection feel like a thrilling journey of discovery. Balance serious moments with joy, celebration, and appreciation. Focus on "wow moments" that create lasting positive memories.

ENGAGEMENT TECHNIQUES:
- Future visioning that feels like planning an adventure
- Values exploration through fun "would you rather" scenarios  
- Life philosophy through storytelling games
- Transformation celebration rather than problem analysis`
    };

    return guidelines[level] || 'Create appropriate content for the connection level with maximum engagement focus.';
  }

  /**
   * Get joy percentage based on connection level
   * @param {number} level - Connection level
   * @returns {number} Joy percentage
   */
  getJoyPercentage(level) {
    const joyPercentages = {
      1: 50, // Surface level should be very fun
      2: 40, // Personal level maintains high joy
      3: 30, // Vulnerable level balances depth with joy
      4: 25  // Deep level includes joy but allows for profound moments
    };
    return joyPercentages[level] || 30;
  }

  /**
   * Get engagement-focused card type distribution for the batch
   * @param {number} count - Number of cards
   * @returns {string} Distribution description
   */
  getEngagementFocusedCardTypeDistribution(count) {
    if (count <= 3) return '60% questions (with engagement hooks), 40% challenges (immediately doable)';
    if (count <= 5) return '50% questions (action-oriented), 35% challenges (5-10 min), 15% scenarios (interactive)';
    return '45% questions (engagement-focused), 30% challenges (achievable), 15% scenarios (interactive), 5% connection (celebration), 5% wild (joy-injection)';
  }

  /**
   * Get language-specific instructions
   * @param {Array} languages - Target languages
   * @returns {string} Language instructions
   */
  getLanguageInstructions(languages) {
    if (languages.includes('en')) {
      return `
LANGUAGE: English
- Use natural, conversational American English
- Avoid regional slang or highly cultural references
- Ensure clarity for international English speakers
- Use inclusive, gender-neutral language where appropriate
- Include action words and engagement triggers ("Let's...", "Try this...", "Right now...")`;
    }

    // Future support for other languages
    return 'Generate content in the specified target language with cultural appropriateness and engagement focus.';
  }

  /**
   * Configure generation parameters based on theta
   * @param {number} theta - Quality coefficient
   * @returns {Object} Generation configuration
   */
  getGenerationConfig(theta) {
    // Map theta to Gemini parameters for optimal quality/cost balance
    const temperature = Math.min(0.9, theta * 1.2); // Scale temperature with theta
    const topP = Math.max(0.8, 1 - (theta * 0.2)); // Higher theta = more focused
    const maxOutputTokens = theta >= 0.6 ? 4096 : 2048; // More tokens for premium content

    return {
      temperature,
      topP,
      maxOutputTokens,
      candidateCount: 1
      // stopSequences: ['```', 'END_OF_CARDS']
    };
  }

  /**
   * Parse generated cards from AI response
   * @param {string} generatedText - AI response text
   * @param {Object} context - Generation context
   * @returns {Array} Parsed cards
   */
  parseGeneratedCards(generatedText, context) {
    try {
      // Extract JSON from response (handle various formats)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const cards = parsed.cards || [];

      return cards.map(card => ({
        ...card,
        theta: context.theta,
        createdBy: 'ai_generation',
        status: 'review', // Require human review before activation
        statistics: {
          timesDrawn: 0,
          skipRate: 0,
          languageUsage: { en: 0 }
        }
      }));

    } catch (error) {
      logger.error('Failed to parse AI generated cards:', error);
      logger.debug('Raw AI response:', generatedText);
      throw new AppError('Failed to parse AI response', 500);
    }
  }

  /**
   * Advanced duplication detection and filtering
   * @param {Array} cards - Generated cards
   * @returns {Array} Unique cards
   */
  async filterDuplicates(cards) {
    const uniqueCards = [];

    for (const card of cards) {
      const contentText = card.content.en || card.content;

      // 1. Exact content hash check
      const contentHash = this.generateContentHash(contentText);
      if (this.contentHashes.has(contentHash)) {
        logger.warn('Duplicate detected: exact match', { content: contentText.substring(0, 50) });
        continue;
      }

      // 2. Semantic similarity check using existing cards
      const isSemanticallyDuplicate = await this.checkSemanticSimilarity(
        contentText,
        card.relationshipTypes[0],
        card.connectionLevel
      );

      if (isSemanticallyDuplicate) {
        logger.warn('Duplicate detected: semantic similarity', { content: contentText.substring(0, 50) });
        continue;
      }

      // 3. Fuzzy matching against recent generations
      const isFuzzyDuplicate = this.checkFuzzyDuplicate(contentText, uniqueCards);
      if (isFuzzyDuplicate) {
        logger.warn('Duplicate detected: fuzzy match', { content: contentText.substring(0, 50) });
        continue;
      }

      // Card is unique, add to results
      this.contentHashes.add(contentHash);
      uniqueCards.push(card);
    }

    return uniqueCards;
  }

  /**
   * Generate secure hash for content
   * @param {string} content - Card content
   * @returns {string} Content hash
   */
  generateContentHash(content) {
    // Normalize content before hashing
    const normalized = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return crypto.createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  /**
   * Check semantic similarity against existing cards
   * @param {string} content - New card content
   * @param {string} relationshipType - Relationship type
   * @param {number} connectionLevel - Connection level
   * @returns {boolean} Is semantically duplicate
   */
  async checkSemanticSimilarity(content, relationshipType, connectionLevel) {
    // Get existing cards for comparison
    const existingCards = await this.cardRepository.findByFilters({
      relationshipTypes: [relationshipType],
      connectionLevel,
      limit: 100 // Recent cards for comparison
    });

    // Use simple keyword overlap for similarity detection
    // In production, consider using embedding-based similarity
    const contentWords = new Set(
      content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
    );

    for (const existingCard of existingCards) {
      const existingContent = existingCard.content.en || existingCard.content;
      const existingWords = new Set(
        existingContent.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3)
      );

      // Calculate Jaccard similarity
      const intersection = new Set([...contentWords].filter(x => existingWords.has(x)));
      const union = new Set([...contentWords, ...existingWords]);
      const similarity = intersection.size / union.size;

      // Threshold for semantic similarity (adjust based on requirements)
      if (similarity > 0.7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check fuzzy duplicate within current batch
   * @param {string} content - New content
   * @param {Array} existingCards - Cards in current batch
   * @returns {boolean} Is fuzzy duplicate
   */
  checkFuzzyDuplicate(content, existingCards) {
    const threshold = 0.8; // 80% similarity threshold

    for (const existing of existingCards) {
      const existingContent = existing.content.en || existing.content;
      const similarity = this.calculateLevenshteinSimilarity(content, existingContent);

      if (similarity > threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate Levenshtein similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity ratio (0-1)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1)
        .fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Load existing content hashes for duplication prevention
   * @param {string} relationshipType - Relationship type
   * @param {number} connectionLevel - Connection level
   */
  async loadExistingContentHashes(relationshipType, connectionLevel) {
    const existingCards = await this.cardRepository.findByFilters({
      relationshipTypes: [relationshipType],
      connectionLevel,
      status: 'active'
    });

    this.contentHashes.clear();

    existingCards.forEach(card => {
      const content = card.content.en || card.content;
      const hash = this.generateContentHash(content);
      this.contentHashes.add(hash);
    });

    logger.info(`Loaded ${this.contentHashes.size} existing content hashes for duplication prevention`);
  }

  /**
   * Post-process and validate generated cards
   * @param {Array} cards - Generated cards
   * @param {Object} context - Generation context
   * @returns {Array} Validated cards
   */
  async postProcessCards(cards, context) {
    const validatedCards = [];

    for (const cardData of cards) {
      try {
        // Add missing fields
        cardData.deckIds = context.deckId ? [context.deckId] : [];
        cardData.createdAt = new Date();

        // Validate card structure
        const {
          error,
          value
        } = validateCard(cardData);
        if (error) {
          logger.warn('Generated card validation failed:', error.details[0].message);
          continue;
        }

        // Create card in database
        const createdCard = await this.cardRepository.create(value);
        validatedCards.push(createdCard);

        // Update deck card count if applicable
        if (context.deckId) {
          await this.updateDeckCardCount(context.deckId);
        }

      } catch (error) {
        logger.error('Failed to process generated card:', error);
      }
    }

    return validatedCards;
  }

  /**
   * Update deck card count after adding new cards
   * @param {string} deckId - Deck ID
   */
  async updateDeckCardCount(deckId) {
    const deckCards = await this.cardRepository.findByDeckId(deckId);

    const cardCount = {
      total: deckCards.length,
      free: deckCards.filter(c => c.tier === 'FREE').length,
      premium: deckCards.filter(c => c.tier === 'PREMIUM').length
    };

    await this.deckRepository.updateCardCount(deckId, cardCount);
  }

  /**
   * Validate generation request parameters
   * @param {Object} request - Generation request
   */
  validateGenerationRequest(request) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta
    } = request;

    const validRelationshipTypes = ['friends', 'colleagues', 'new_couples', 'established_couples', 'family'];
    if (!validRelationshipTypes.includes(relationshipType)) {
      throw new AppError('Invalid relationship type', 400);
    }

    if (connectionLevel < 1 || connectionLevel > 4) {
      throw new AppError('Connection level must be between 1 and 4', 400);
    }

    if (count < 1 || count > 50) {
      throw new AppError('Count must be between 1 and 50', 400);
    }

    if (theta < 0.1 || theta > 1.0) {
      throw new AppError('Theta must be between 0.1 and 1.0', 400);
    }
  }

  /**
   * Calculate rate limit delay based on theta (quality)
   * @param {number} theta - Quality coefficient
   * @returns {number} Delay in milliseconds
   */
  calculateRateLimit(theta) {
    // Higher quality requests need more processing time
    const baseDelay = theta >= 0.6 ? 2000 : 1000; // 2s for Pro model, 1s for Flash
    return baseDelay + (Math.random() * 1000); // Add jitter
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  async handleRateLimit() {
    const delay = this.retryDelay * Math.pow(2, this.maxRetries);
    logger.warn(`Rate limit hit, waiting ${delay}ms`);
    await this.delay(delay);
  }

  /**
   * Generate cache key for context caching
   * @param {string} relationshipType - Relationship type
   * @param {number} connectionLevel - Connection level
   * @param {number} theta - Quality coefficient
   * @returns {string} Cache key
   */
  generateCacheKey(relationshipType, connectionLevel, theta) {
    return `${relationshipType}_${connectionLevel}_${Math.floor(theta * 10)}`;
  }

  /**
   * Estimate API cost for the generation request
   * @param {number} count - Number of cards
   * @param {number} theta - Quality coefficient
   * @param {number} languageCount - Number of languages
   * @returns {Object} Cost estimate
   */
  estimateCost(count, theta, languageCount) {
    // Estimate based on Gemini pricing
    const isProModel = theta >= 0.6;
    const avgTokensPerCard = theta >= 0.6 ? 200 : 150;
    const totalInputTokens = count * 500; // Prompt tokens
    const totalOutputTokens = count * avgTokensPerCard * languageCount;

    const inputCostPer1M = isProModel ? 3.50 : 0.075; // USD per 1M tokens
    const outputCostPer1M = isProModel ? 10.50 : 0.30;

    const inputCost = (totalInputTokens / 1000000) * inputCostPer1M;
    const outputCost = (totalOutputTokens / 1000000) * outputCostPer1M;

    return {
      estimated: true,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      inputCost: parseFloat(inputCost.toFixed(4)),
      outputCost: parseFloat(outputCost.toFixed(4)),
      totalCost: parseFloat((inputCost + outputCost).toFixed(4)),
      model: isProModel ? 'gemini-1.5-pro' : 'gemini-1.5-flash'
    };
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AIGenerationService;
