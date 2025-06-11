const config = require('../config/index');

class PromptTemplateService {

  /**
   * Get relationship-specific context templates
   */
  getRelationshipContexts() {
    return {
      friends: {
        description: `Focus on shared experiences, humor, and deepening existing bonds. Encourage storytelling, shared memories, and discovering new aspects of friendship. Maintain playful energy while allowing for meaningful moments.`,

        characteristics: [
          'Shared history and common experiences',
          'Mutual support and understanding',
          'Humor and playful interaction',
          'Comfortable vulnerability',
          'Future planning and shared goals'
        ],

        avoidTopics: [
          'Overly intimate personal details',
          'Financial obligations between friends',
          'Romantic relationship advice'
        ]
      },

      colleagues: {
        description: `Maintain professional boundaries while building workplace rapport. Focus on work-life balance, professional goals, communication styles, and team dynamics. Avoid overly personal topics.`,

        characteristics: [
          'Professional respect and boundaries',
          'Career development and goals',
          'Team collaboration skills',
          'Work-life balance perspectives',
          'Industry insights and expertise'
        ],

        avoidTopics: [
          'Personal financial situations',
          'Intimate relationship details',
          'Political or controversial opinions',
          'Personal family problems'
        ]
      },

      new_couples: {
        description: `Facilitate discovery and compatibility exploration. Focus on values, life goals, preferences, and getting to know each other. Build emotional intimacy gradually and appropriately.`,

        characteristics: [
          'Value system exploration',
          'Future compatibility assessment',
          'Personal preference discovery',
          'Communication style understanding',
          'Emotional intimacy building'
        ],

        avoidTopics: [
          'Ex-relationship details',
          'Deeply traumatic experiences',
          'Financial obligations',
          'Family drama or conflicts'
        ]
      },

      established_couples: {
        description: `Refresh and deepen long-term relationships. Address relationship growth, shared dreams, intimacy, and reconnection. Include both fun and serious relationship-building content.`,

        characteristics: [
          'Relationship renewal and growth',
          'Shared future visioning',
          'Intimacy deepening (appropriate)',
          'Conflict resolution skills',
          'Appreciation and gratitude'
        ],

        avoidTopics: [
          'Comparison with other couples',
          'Past relationship mistakes (unless constructive)',
          'Financial stress (unless supportive)'
        ]
      },

      family: {
        description: `Bridge generational gaps and strengthen family bonds. Include traditions, heritage, family history, and intergenerational understanding. Respect diverse family structures and dynamics.`,

        characteristics: [
          'Intergenerational understanding',
          'Family history and traditions',
          'Cultural heritage sharing',
          'Value transmission',
          'Conflict resolution and forgiveness'
        ],

        avoidTopics: [
          'Divisive political topics',
          'Personal financial details',
          'Romantic relationship details',
          'Substance abuse (unless supportive)'
        ]
      }
    };
  }

  /**
   * Get connection level templates
   */
  getConnectionLevelTemplates() {
    return {
      1: {
        name: 'Surface',
        description: 'Light, fun, low-vulnerability topics',
        guidelines: [
          'Focus on preferences and opinions',
          'External observations and experiences',
          'Entertainment and leisure topics',
          'Safe, comfortable sharing',
          'Easy conversation starters'
        ],
        examplePrompts: [
          'What\'s your favorite...',
          'If you could choose any...',
          'What do you think about...',
          'Describe your ideal...',
          'What makes you laugh...'
        ]
      },

      2: {
        name: 'Personal',
        description: 'Share experiences, background stories, and personal preferences',
        guidelines: [
          'Background stories and formative experiences',
          'Personal values on non-controversial topics',
          'Meaningful but safe personal topics',
          'Goals and aspirations',
          'Life experiences and lessons learned'
        ],
        examplePrompts: [
          'Tell me about a time when...',
          'What shaped your perspective on...',
          'Describe a meaningful experience...',
          'What are you most proud of...',
          'How did you learn to...'
        ]
      },

      3: {
        name: 'Vulnerable',
        description: 'Encourage deeper emotional sharing',
        guidelines: [
          'Fears and insecurities (appropriate to relationship)',
          'Unresolved questions or curiosities',
          'Personal growth areas and challenges',
          'Emotional responses to life events',
          'Meaningful beliefs and values'
        ],
        examplePrompts: [
          'What\'s something you\'re working to overcome...',
          'When have you felt most vulnerable...',
          'What fear would you like to conquer...',
          'Describe a time you changed your mind about...',
          'What do you wish people understood about you...'
        ]
      },

      4: {
        name: 'Deep',
        description: 'Core values, life philosophy, and transformative experiences',
        guidelines: [
          'Transformative life experiences',
          'Core identity elements and life philosophy',
          'Profound hopes and dreams',
          'Relationship-specific deep vulnerability',
          'Life-changing realizations or insights'
        ],
        examplePrompts: [
          'What experience most shaped who you are...',
          'What do you believe is your purpose...',
          'Describe your deepest hope for...',
          'What would you want to be remembered for...',
          'What truth have you discovered about life...'
        ]
      }
    };
  }

  /**
   * Get card type templates
   */
  getCardTypeTemplates() {
    return {
      question: {
        description: 'Direct prompts requiring verbal responses',
        formats: [
          'Open-ended inquiry',
          'Choice-based question',
          'Hypothetical scenario question',
          'Reflection prompt',
          'Values exploration'
        ],
        examples: [
          'What\'s the most important lesson you\'ve learned about friendship?',
          'If you could have dinner with anyone, living or dead, who would it be and why?',
          'Describe a moment when you felt truly understood.',
          'What belief do you hold that others might find surprising?'
        ]
      },

      challenge: {
        description: 'Interactive activities requiring action or demonstration',
        formats: [
          'Physical demonstration',
          'Creative expression',
          'Social interaction',
          'Problem-solving activity',
          'Skill demonstration'
        ],
        examples: [
          'Show everyone your best dance move and teach it to the group.',
          'Draw a picture that represents your current mood and explain it.',
          'Give each person a genuine compliment about something you\'ve noticed today.',
          'Create a 30-second commercial for your favorite childhood memory.'
        ]
      },

      scenario: {
        description: 'Hypothetical situations prompting discussion or role-play',
        formats: [
          'What would you do if...',
          'Imagine you are...',
          'Picture this situation...',
          'If you had to choose between...',
          'In an alternate reality where...'
        ],
        examples: [
          'You find a wallet with $500 cash and no ID. What do you do?',
          'You\'re offered your dream job, but it means moving far from everyone you know. How do you decide?',
          'You discover you have one day left to live. How do you spend it?'
        ]
      },

      connection: {
        description: 'Direct relationship-building exercises',
        formats: [
          'Appreciation expression',
          'Future planning together',
          'Boundary discussion',
          'Shared goal setting',
          'Relationship reflection'
        ],
        examples: [
          'Share three things you appreciate about each other and why.',
          'Plan a perfect day you\'d spend together and discuss what makes it special.',
          'Discuss one way you could better support each other.',
          'Share a hope you have for your relationship/friendship.'
        ]
      },

      wild: {
        description: 'Game-changing mechanics that alter standard play',
        formats: [
          'Group activity',
          'Rule change',
          'Special challenge',
          'Unexpected twist',
          'Everyone participates'
        ],
        examples: [
          'Everyone switch seats and answer the next question as if you were the person who was sitting there.',
          'For the next three rounds, answer every question while standing on one foot.',
          'Create a group story where each person adds one sentence.',
          'Everyone must speak in rhyme for the next five minutes.'
        ]
      }
    };
  }

  /**
   * Build a comprehensive prompt for AI generation
   * @param {Object} params - Generation parameters
   * @returns {string} Complete prompt
   */
  buildComprehensivePrompt(params) {
    const {
      relationshipType,
      connectionLevel,
      count,
      theta,
      targetLanguages,
      batchIndex = 0
    } = params;

    const relationships = this.getRelationshipContexts();
    const levels = this.getConnectionLevelTemplates();
    const cardTypes = this.getCardTypeTemplates();

    const relationship = relationships[relationshipType];
    const level = levels[connectionLevel];

    // Build the prompt
    const prompt = `
# AI Card Generation Request

## Quality Level: ${this.getQualityDescription(theta)} (θ=${theta})
${this.getQualityInstructions(theta)}

## Relationship Type: ${relationshipType.toUpperCase()}
**Context**: ${relationship.description}

**Key Characteristics**:
${relationship.characteristics.map(char => `- ${char}`).join('\n')}

**Avoid These Topics**:
${relationship.avoidTopics.map(topic => `- ${topic}`).join('\n')}

## Connection Level: ${connectionLevel}/4 - ${level.name}
**Description**: ${level.description}

**Guidelines**:
${level.guidelines.map(guide => `- ${guide}`).join('\n')}

## Anti-Duplication Requirements
🚫 **CRITICAL**: Each card must be completely unique. Avoid:
- Similar question patterns or phrasings seen in existing cards
- Repetitive scenarios or themes
- Common conversation starters or generic prompts
- Overlapping content with previously generated cards
${batchIndex > 0 ? `- This is batch ${batchIndex + 1}, ensure complete novelty from previous batches` : ''}

## Content Requirements
- **Count**: Generate exactly ${count} unique cards
- **Language**: ${targetLanguages.join(', ')}
- **Card Types**: ${this.getCardTypeDistribution(count)}
- **Tier**: ${theta >= 0.6 ? 'Mix of FREE and PREMIUM (bias toward PREMIUM)' : 'Primarily FREE tier'}

## Output Format
Provide your response in valid JSON format:

\`\`\`json
{
  "cards": [
    {
      "content": {
        "en": "Card content in English"
      },
      "type": "question|challenge|scenario|connection|wild",
      "connectionLevel": ${connectionLevel},
      "relationshipTypes": ["${relationshipType}"],
      "tier": "FREE|PREMIUM",
      "categories": ["category1", "category2"],
      "contentWarnings": [] // only if applicable
    }
  ]
}
\`\`\`

## Examples of Card Types:

**Question Example**:
${this.getExampleByType('question', relationshipType, connectionLevel)}

**Challenge Example**:
${this.getExampleByType('challenge', relationshipType, connectionLevel)}

**Scenario Example**:
${this.getExampleByType('scenario', relationshipType, connectionLevel)}

Generate ${count} unique, engaging cards that create meaningful ${relationship.description.toLowerCase()}:
`;

    return prompt;
  }

  /**
   * Get quality-specific instructions
   */
  getQualityInstructions(theta) {
    if (theta >= 0.8) {
      return `
**PREMIUM QUALITY MODE**: Create highly sophisticated, nuanced content that:
- Uses advanced psychological insights and emotional intelligence
- Includes multi-layered questions that evolve during discussion
- Incorporates cultural awareness and diverse perspectives
- Generates transformative, memorable experiences that participants will reference long after
- Demonstrates deep understanding of relationship dynamics and human psychology`;
    } else if (theta >= 0.6) {
      return `
**HIGH QUALITY MODE**: Develop thoughtful, engaging content that:
- Balances emotional depth with broad accessibility
- Includes creative and unexpected elements that surprise participants
- Shows understanding of relationship psychology and communication patterns
- Creates meaningful connection opportunities with lasting impact`;
    } else if (theta >= 0.4) {
      return `
**STANDARD QUALITY MODE**: Create clear, engaging content that:
- Uses proven conversation techniques and relationship-building methods
- Balances fun interaction with meaningful sharing
- Ensures broad appeal while respecting individual comfort zones
- Focuses on reliable connection-building strategies`;
    } else {
      return `
**BASIC QUALITY MODE**: Generate simple, accessible content that:
- Uses straightforward language and familiar concepts
- Focuses on light, comfortable interactions that build rapport
- Prioritizes ease of use and immediate engagement
- Appeals to diverse groups without requiring deep vulnerability`;
    }
  }

  /**
   * Get quality description from theta
   */
  getQualityDescription(theta) {
    if (theta >= 0.8) return 'Premium';
    if (theta >= 0.6) return 'High';
    if (theta >= 0.4) return 'Standard';
    return 'Basic';
  }

  /**
   * Get card type distribution description
   */
  getCardTypeDistribution(count) {
    const distributions = config.quality.typeDistribution;
    const dist = distributions[count] || distributions.default;

    return Object.entries(dist)
      .map(([type, percentage]) => `${Math.round(percentage * 100)}% ${type}`)
      .join(', ');
  }

  /**
   * Get example card by type
   */
  getExampleByType(type, relationshipType, connectionLevel) {
    const examples = {
      question: {
        friends: {
          1: 'What\'s your go-to karaoke song and why does it represent you?',
          2: 'What\'s a skill you learned as a kid that still serves you today?',
          3: 'What\'s a fear you had as a child that you\'ve since overcome?',
          4: 'What moment in our friendship changed how you see relationships?'
        },
        colleagues: {
          1: 'What\'s the most unusual job you\'ve ever had or heard of?',
          2: 'What professional skill do you wish you could master instantly?',
          3: 'What work challenge taught you the most about yourself?',
          4: 'What legacy do you want to leave in your career?'
        }
      },
      challenge: {
        friends: {
          1: 'Show everyone your best "thinking face" and explain what you\'re pondering.',
          2: 'Demonstrate how you would explain your job to a 5-year-old.',
          3: 'Share a vulnerable moment by showing your most embarrassing photo.',
          4: 'Express your gratitude to each person here without using words.'
        }
      },
      scenario: {
        friends: {
          1: 'You win a free weekend trip for two. Where do you go and who do you take?',
          2: 'You can give your younger self one piece of advice. What is it?',
          3: 'You discover you have a secret admirer. How do you handle the situation?',
          4: 'You can change one decision from your past. What is it and why?'
        }
      }
    };

    return examples[type]?.[relationshipType]?.[connectionLevel] ||
           `[${type} example for ${relationshipType} level ${connectionLevel}]`;
  }
}

module.exports = new PromptTemplateService();
