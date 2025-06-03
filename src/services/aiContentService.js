const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const config = require('../config');

class AIContentService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = config.gemini.model || 'gemini-1.5-flash';

    // Session-level duplicate tracking
    this.sessionDuplicates = new Set();

    // Cost optimization: batch processing cache
    this.batchCache = new Map();

    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  /**
   * Generate cards using AI with comprehensive duplicate prevention
   * @param {Object} params - Generation parameters
   * @returns {Array} Generated cards
   */
  async generateCards(params) {
    const {
      relationshipType,
      connectionLevel,
      count = 5,
      theta = 0.5,
      targetLanguages = ['en'],
      deckId,
      userId
    } = params;

    try {
      // Validate inputs
      this.validateGenerationParams(params);

      // Get existing cards for database-level duplicate prevention
      const existingCards = await this.getExistingCardsForContext(relationshipType, connectionLevel);

      // Generate cards in batch for cost optimization
      const allGeneratedCards = [];

      for (const language of targetLanguages) {
        const languageCards = await this.generateCardsForLanguage({
          relationshipType,
          connectionLevel,
          count,
          theta,
          language,
          existingCards,
          deckId
        });

        allGeneratedCards.push(...languageCards);
      }

      // Final duplicate check and validation
      const uniqueCards = this.removeDuplicates(allGeneratedCards, existingCards);

      // Validate we have enough unique cards
      if (uniqueCards.length === 0) {
        throw new AppError('Unable to generate unique cards. Try different parameters.', 400);
      }

      // Add to session duplicates tracking
      uniqueCards.forEach(card => {
        this.sessionDuplicates.add(this.normalizeContent(card.content));
      });

      logger.info(`Generated ${uniqueCards.length} unique cards for ${relationshipType}, level ${connectionLevel}`);

      return uniqueCards;

    } catch (error) {
      logger.error('AI Generation error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 429) {
        throw new AppError('AI service rate limit exceeded. Please try again later.', 429);
      }

      if (error.response?.status === 403) {
        throw new AppError('AI service access denied. Check API configuration.', 403);
      }

      throw new AppError('AI generation failed. Please try again.', 500);
    }
  }

  /**
   * Generate cards for a specific language
   * @param {Object} params - Language-specific generation parameters
   * @returns {Array} Generated cards for the language
   * @private
   */
  async generateCardsForLanguage(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      language,
      existingCards,
      deckId
    } = params;

    // Build language-specific prompt
    const prompt = this.buildPrompt({
      relationshipType,
      connectionLevel,
      count,
      theta,
      language,
      existingCards
    });

    // Configure generation parameters based on theta
    const generationConfig = this.buildGenerationConfig(theta);

    // Make API call with retry logic
    const response = await this.callGeminiAPI(prompt, generationConfig);

    // Parse and validate response
    const parsedCards = this.parseAIResponse(response, language);

    // Apply additional validation and formatting
    return this.formatCards(parsedCards, {
      relationshipType,
      connectionLevel,
      theta,
      language,
      deckId
    });
  }

  /**
   * Build language-specific prompts optimized for each target language
   * @param {Object} params - Prompt parameters
   * @returns {string} Formatted prompt
   * @private
   */
  buildPrompt(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      language,
      existingCards
    } = params;

    // Language-specific prompt templates
    const prompts = {
      en: this.buildEnglishPrompt(params),
      vn: this.buildVietnamesePrompt(params)
    };

    const basePrompt = prompts[language] || prompts.en;

    // Add duplicate prevention context
    const duplicatePreventionContext = this.buildDuplicatePreventionContext(existingCards, language);

    return `${basePrompt}\n\n${duplicatePreventionContext}`;
  }

  /**
   * Build English-specific prompt
   * @param {Object} params - Parameters
   * @returns {string} English prompt
   * @private
   */
  buildEnglishPrompt(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta
    } = params;

    // Theta-based quality instructions
    const qualityInstructions = this.getQualityInstructions(theta, 'en');

    // Relationship-specific context
    const relationshipContext = this.getRelationshipContext(relationshipType, 'en');

    // Connection level context
    const levelContext = this.getConnectionLevelContext(connectionLevel, 'en');

    return `You are an expert content creator for a connection-building card game. Generate exactly ${count} unique, high-quality cards for ${relationshipType} at connection level ${connectionLevel}.

${qualityInstructions}

${relationshipContext}

${levelContext}

IMPORTANT REQUIREMENTS:
1. Each card must be completely unique and original
2. Content should be appropriate for in-person group settings
3. Questions should encourage meaningful conversation
4. Avoid generic or overly common questions
5. Consider cultural sensitivity and inclusivity
6. Format as valid JSON array with the exact structure shown below

Required JSON format:
[
  {
    "content": "Your thoughtful question or challenge here",
    "type": "question",
    "connectionLevel": ${connectionLevel},
    "relationshipTypes": ["${relationshipType}"],
    "categories": ["category1", "category2"],
    "contentWarnings": []
  }
]

Generate ${count} cards now:`;
  }

  /**
   * Build Vietnamese-specific prompt
   * @param {Object} params - Parameters
   * @returns {string} Vietnamese prompt
   * @private
   */
  buildVietnamesePrompt(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta
    } = params;

    const qualityInstructions = this.getQualityInstructions(theta, 'vn');
    const relationshipContext = this.getRelationshipContext(relationshipType, 'vn');
    const levelContext = this.getConnectionLevelContext(connectionLevel, 'vn');

    return `Bạn là chuyên gia tạo nội dung cho trò chơi bài kết nối. Tạo chính xác ${count} thẻ bài độc đáo, chất lượng cao cho ${relationshipType} ở mức kết nối ${connectionLevel}.

${qualityInstructions}

${relationshipContext}

${levelContext}

YÊU CẦU QUAN TRỌNG:
1. Mỗi thẻ bài phải hoàn toàn độc đáo và nguyên bản
2. Nội dung phù hợp với môi trường nhóm trực tiếp
3. Câu hỏi khuyến khích cuộc trò chuyện có ý nghĩa
4. Tránh câu hỏi chung chung hoặc quá phổ biến
5. Xem xét sự nhạy cảm văn hóa và tính bao gồm
6. Định dạng JSON hợp lệ theo cấu trúc chính xác bên dưới

Định dạng JSON yêu cầu:
[
  {
    "content": "Câu hỏi hoặc thách thức sâu sắc của bạn ở đây",
    "type": "question",
    "connectionLevel": ${connectionLevel},
    "relationshipTypes": ["${relationshipType}"],
    "categories": ["danh_muc1", "danh_muc2"],
    "contentWarnings": []
  }
]

Tạo ${count} thẻ bài ngay bây giờ:`;
  }

  /**
   * Get quality instructions based on theta value
   * @param {number} theta - Quality coefficient (0.1-1.0)
   * @param {string} language - Target language
   * @returns {string} Quality instructions
   * @private
   */
  getQualityInstructions(theta, language) {
    const instructions = {
      en: {
        low: 'Create straightforward, easy-to-answer questions that encourage basic sharing.',
        medium: 'Design thoughtful questions that require reflection and promote deeper conversation.',
        high: 'Craft sophisticated, nuanced questions that challenge participants to explore complex emotions and thoughts. Focus on psychological depth and meaningful vulnerability.'
      },
      vn: {
        low: 'Tạo các câu hỏi đơn giản, dễ trả lời khuyến khích chia sẻ cơ bản.',
        medium: 'Thiết kế các câu hỏi sâu sắc đòi hỏi suy ngẫm và thúc đẩy cuộc trò chuyện sâu hơn.',
        high: 'Tạo ra các câu hỏi tinh tế, phức tạp thách thức người tham gia khám phá cảm xúc và suy nghĩ phức tạp. Tập trung vào chiều sâu tâm lý và sự dễ bị tổn thương có ý nghĩa.'
      }
    };

    let level;
    if (theta <= 0.4) {
      level = 'low';
    }
    else if (theta <= 0.7) {
      level = 'medium';
    }
    else {
      level = 'high';
    }

    return instructions[language][level];
  }

  /**
   * Get relationship-specific context
   * @param {string} relationshipType - Relationship type
   * @param {string} language - Target language
   * @returns {string} Context
   * @private
   */
  getRelationshipContext(relationshipType, language) {
    const contexts = {
      en: {
        friends: 'Focus on shared experiences, mutual support, and deepening existing bonds through discovery of new aspects of each other.',
        colleagues: 'Maintain professional boundaries while building trust and understanding. Questions should be workplace-appropriate yet personal enough to build genuine connections.',
        new_couples: 'Facilitate discovery and compatibility exploration. Help partners learn about each other\'s values, dreams, and communication styles.',
        established_couples: 'Renew intimacy and rediscover each other. Address relationship growth, shared goals, and deeper emotional connection.',
        family: 'Bridge generational gaps and strengthen family bonds. Include questions that honor different perspectives and family dynamics.'
      },
      vn: {
        friends: 'Tập trung vào trải nghiệm chung, hỗ trợ lẫn nhau và củng cố mối quan hệ hiện có thông qua việc khám phá những khía cạnh mới của nhau.',
        colleagues: 'Duy trì ranh giới nghề nghiệp trong khi xây dựng lòng tin và sự hiểu biết. Câu hỏi phù hợp với nơi làm việc nhưng đủ cá nhân để xây dựng kết nối chân thành.',
        new_couples: 'Tạo điều kiện khám phá và tìm hiểu sự tương thích. Giúp các đối tác tìm hiểu về giá trị, ước mơ và phong cách giao tiếp của nhau.',
        established_couples: 'Đổi mới sự thân mật và khám phá lại nhau. Giải quyết sự phát triển của mối quan hệ, mục tiêu chung và kết nối cảm xúc sâu sắc hơn.',
        family: 'Kết nối khoảng cách thế hệ và củng cố mối quan hệ gia đình. Bao gồm các câu hỏi tôn trọng những quan điểm khác nhau và động lực gia đình.'
      }
    };

    return contexts[language][relationshipType] || contexts[language].friends;
  }

  /**
   * Get connection level context
   * @param {number} connectionLevel - Connection level (1-4)
   * @param {string} language - Target language
   * @returns {string} Context
   * @private
   */
  getConnectionLevelContext(connectionLevel, language) {
    const levels = {
      en: {
        1: 'SURFACE LEVEL: Light, fun topics that are easy to share. Focus on preferences, basic experiences, and comfortable subjects.',
        2: 'PERSONAL LEVEL: Sharing meaningful experiences and values. Encourage reflection on personal growth and important life moments.',
        3: 'VULNERABLE LEVEL: Deeper emotional sharing. Address fears, challenges, and personal struggles in a supportive way.',
        4: 'DEEP LEVEL: Core identity and life philosophy. Explore fundamental beliefs, transformative experiences, and deepest truths.'
      },
      vn: {
        1: 'CẤP ĐỘ BỀ MẶT: Chủ đề nhẹ nhàng, vui vẻ dễ chia sẻ. Tập trung vào sở thích, trải nghiệm cơ bản và chủ đề thoải mái.',
        2: 'CẤP ĐỘ CÁ NHÂN: Chia sẻ trải nghiệm và giá trị có ý nghĩa. Khuyến khích suy ngẫm về sự phát triển cá nhân và những khoảnh khắc quan trọng trong cuộc sống.',
        3: 'CẤP ĐỘ DỄ BỊ TỔN THƯƠNG: Chia sẻ cảm xúc sâu sắc hơn. Giải quyết nỗi sợ hãi, thách thức và đấu tranh cá nhân một cách hỗ trợ.',
        4: 'CẤP ĐỘ SÂU SẮC: Bản sắc cốt lõi và triết lý sống. Khám phá niềm tin cơ bản, trải nghiệm biến đổi và những sự thật sâu sắc nhất.'
      }
    };

    return levels[language][connectionLevel] || levels[language][1];
  }

  /**
   * Build generation configuration based on theta
   * @param {number} theta - Quality coefficient
   * @returns {Object} Generation configuration
   * @private
   */
  buildGenerationConfig(theta) {
    // Higher theta = higher quality, more deterministic
    // Lower theta = more creative, less deterministic

    const temperature = Math.max(0.1, Math.min(1.0, 1.0 - (theta * 0.8)));
    const topP = Math.max(0.1, Math.min(0.95, 0.95 - (theta * 0.3)));
    const topK = Math.max(1, Math.min(40, Math.round(40 - (theta * 30))));

    return {
      temperature,
      topP,
      topK,
      maxOutputTokens: 2048,
      candidateCount: 1,
      stopSequences: [],
      presencePenalty: 0,
      frequencyPenalty: 0.3 + (theta * 0.5) // Higher theta = more penalty for repetition
    };
  }

  /**
   * Call Gemini API with retry logic
   * @param {string} prompt - Generation prompt
   * @param {Object} config - Generation configuration
   * @returns {Object} API response
   * @private
   */
  async callGeminiAPI(prompt, config, retries = 3) {
    const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: config,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(url, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });

        if (response.data.candidates && response.data.candidates.length > 0) {
          return response.data.candidates[0].content.parts[0].text;
        }

        throw new Error('No valid response from AI service');

      } catch (error) {
        logger.error(`AI API attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Parse AI response and extract cards
   * @param {string} response - Raw AI response
   * @param {string} language - Target language
   * @returns {Array} Parsed cards
   * @private
   */
  parseAIResponse(response, language) {
    try {
      // Clean up response - remove markdown formatting if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '')
          .replace(/```$/, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '')
          .replace(/```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.filter(card => {
        return card &&
          typeof card.content === 'string' &&
          card.content.trim().length > 10 &&
          card.type &&
          card.connectionLevel;
      });

    } catch (error) {
      logger.error('Failed to parse AI response:', error.message);
      logger.debug('Raw response:', response);

      // Fallback: try to extract JSON from mixed content
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (fallbackError) {
          logger.error('Fallback parsing also failed:', fallbackError.message);
        }
      }

      throw new AppError('Failed to parse AI response. Please try again.', 500);
    }
  }

  /**
   * Format and validate generated cards
   * @param {Array} cards - Raw generated cards
   * @param {Object} metadata - Card metadata
   * @returns {Array} Formatted cards
   * @private
   */
  formatCards(cards, metadata) {
    const {
      relationshipType,
      connectionLevel,
      theta,
      language,
      deckId
    } = metadata;

    return cards.map(card => ({
      content: typeof card.content === 'string' ?
        { [language]: card.content.trim() } :
        card.content,
      type: card.type || 'question',
      connectionLevel: parseInt(connectionLevel),
      relationshipTypes: [relationshipType],
      deckIds: deckId ? [deckId] : [],
      tier: theta >= 0.6 ? 'PREMIUM' : 'FREE',
      theta: parseFloat(theta),
      categories: Array.isArray(card.categories) ? card.categories : ['ai-generated'],
      contentWarnings: Array.isArray(card.contentWarnings) ? card.contentWarnings : [],
      statistics: {
        timesDrawn: 0,
        skipRate: 0,
        languageUsage: {
          [language]: 0
        }
      },
      status: 'review', // AI generated cards need review
      createdBy: 'ai-system'
    }));
  }

  /**
   * Get existing cards for duplicate prevention
   * @param {string} relationshipType - Relationship type
   * @param {number} connectionLevel - Connection level
   * @returns {Array} Existing cards
   * @private
   */
  async getExistingCardsForContext(relationshipType, connectionLevel) {
    try {
      const CardRepository = require('../repositories/cardRepository');
      const cardRepository = new CardRepository();

      const existingCards = await cardRepository.findByFilters({
        relationshipType,
        connectionLevel,
        status: 'active'
      });

      return existingCards;
    } catch (error) {
      logger.error('Error fetching existing cards:', error);
      return []; // Continue without duplicate check if DB fails
    }
  }

  /**
   * Build duplicate prevention context
   * @param {Array} existingCards - Existing cards
   * @param {string} language - Target language
   * @returns {string} Context string
   * @private
   */
  buildDuplicatePreventionContext(existingCards, language) {
    if (!existingCards || existingCards.length === 0) {
      return '';
    }

    const sampleCards = existingCards
      .slice(0, 10) // Limit to avoid token overflow
      .map(card => {
        const content = typeof card.content === 'object' ?
          (card.content[language] || card.content.en || '') :
          card.content;
        return `"${content}"`;
      })
      .join(', ');

    const instructions = {
      en: `AVOID DUPLICATING these existing cards: ${sampleCards}. Create completely different questions that don't overlap in meaning or approach.`,
      vn: `TRÁNH SAO CHÉP các thẻ bài hiện có này: ${sampleCards}. Tạo các câu hỏi hoàn toàn khác nhau không trùng lặp về ý nghĩa hoặc cách tiếp cận.`
    };

    return instructions[language] || instructions.en;
  }

  /**
   * Remove duplicates from generated cards
   * @param {Array} newCards - Newly generated cards
   * @param {Array} existingCards - Existing cards from database
   * @returns {Array} Unique cards
   * @private
   */
  removeDuplicates(newCards, existingCards) {
    const existingContent = new Set();

    // Add existing cards to duplicate check
    existingCards.forEach(card => {
      const content = typeof card.content === 'object' ?
        Object.values(card.content)
          .join(' ') :
        card.content;
      existingContent.add(this.normalizeContent(content));
    });

    // Add session duplicates
    this.sessionDuplicates.forEach(content => {
      existingContent.add(content);
    });

    // Filter out duplicates from new cards
    const uniqueCards = [];
    const seenInBatch = new Set();

    for (const card of newCards) {
      const content = typeof card.content === 'object' ?
        Object.values(card.content)
          .join(' ') :
        card.content;

      const normalized = this.normalizeContent(content);

      if (!existingContent.has(normalized) && !seenInBatch.has(normalized)) {
        uniqueCards.push(card);
        seenInBatch.add(normalized);
      }
    }

    return uniqueCards;
  }

  /**
   * Normalize content for duplicate detection
   * @param {string} content - Content to normalize
   * @returns {string} Normalized content
   * @private
   */
  normalizeContent(content) {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Validate generation parameters
   * @param {Object} params - Parameters to validate
   * @private
   */
  validateGenerationParams(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      targetLanguages
    } = params;

    const validRelationshipTypes = ['friends', 'colleagues', 'new_couples', 'established_couples', 'family'];
    if (!validRelationshipTypes.includes(relationshipType)) {
      throw new AppError(`Invalid relationship type: ${relationshipType}`, 400);
    }

    if (!Number.isInteger(connectionLevel) || connectionLevel < 1 || connectionLevel > 4) {
      throw new AppError('Connection level must be between 1 and 4', 400);
    }

    if (!Number.isInteger(count) || count < 1 || count > 20) {
      throw new AppError('Count must be between 1 and 20', 400);
    }

    if (typeof theta !== 'number' || theta < 0.1 || theta > 1.0) {
      throw new AppError('Theta must be between 0.1 and 1.0', 400);
    }

    const validLanguages = ['en', 'vn'];
    if (!Array.isArray(targetLanguages) || !targetLanguages.every(lang => validLanguages.includes(lang))) {
      throw new AppError('Invalid target languages. Supported: en, vn', 400);
    }
  }

  /**
   * Clear session duplicates (call between different generation sessions)
   */
  clearSessionDuplicates() {
    this.sessionDuplicates.clear();
  }

  /**
   * Get generation statistics for monitoring
   * @returns {Object} Statistics
   */
  getGenerationStats() {
    return {
      sessionDuplicatesCount: this.sessionDuplicates.size,
      batchCacheSize: this.batchCache.size,
      model: this.model
    };
  }
}

module.exports = AIContentService;
