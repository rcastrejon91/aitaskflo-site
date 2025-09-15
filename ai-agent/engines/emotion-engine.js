/**
 * Emotion Engine - Analyzes emotional context and adds personality to responses
 * Part of the AITaskFlo autonomous AI agent system
 */

class EmotionEngine {
  constructor(aiAgent) {
    this.aiAgent = aiAgent;
    this.name = 'EmotionEngine';
    this.version = '1.0.0';
    this.status = 'inactive';
    
    // Emotional state tracking
    this.currentEmotion = {
      valence: 0.5,  // positive/negative (0-1)
      arousal: 0.5,  // calm/excited (0-1)
      dominance: 0.5 // submissive/dominant (0-1)
    };
    
    // Personality traits
    this.personality = {
      openness: 0.7,
      conscientiousness: 0.8,
      extraversion: 0.6,
      agreeableness: 0.7,
      neuroticism: 0.3
    };
    
    // Emotion recognition patterns
    this.emotionPatterns = {
      positive: [
        'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy',
        'excited', 'thrilled', 'delighted', 'pleased', 'satisfied', 'good', 'nice',
        'awesome', 'perfect', 'brilliant', 'outstanding', 'superb', 'magnificent'
      ],
      negative: [
        'bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'sad', 'frustrated',
        'disappointed', 'annoyed', 'upset', 'worried', 'concerned', 'problems',
        'issues', 'failed', 'error', 'wrong', 'broken', 'difficult'
      ],
      urgent: [
        'urgent', 'asap', 'immediately', 'quickly', 'fast', 'rush', 'emergency',
        'critical', 'important', 'priority', 'deadline', 'hurry', 'now'
      ],
      uncertain: [
        'maybe', 'perhaps', 'possibly', 'might', 'could', 'uncertain', 'unsure',
        'confused', 'not sure', 'don\'t know', 'unclear', 'vague', 'doubtful'
      ],
      confident: [
        'definitely', 'certainly', 'absolutely', 'sure', 'confident', 'positive',
        'guaranteed', 'without doubt', 'clear', 'obvious', 'certain', 'convinced'
      ]
    };
    
    // Response templates with emotional personality
    this.responseTemplates = {
      enthusiastic: [
        "I'm excited to help you with this!",
        "This sounds fantastic! Let me dive right in.",
        "What an interesting challenge! I love working on things like this.",
        "Perfect! I'm really looking forward to tackling this with you."
      ],
      supportive: [
        "I understand this might be challenging, but I'm here to help you through it.",
        "Don't worry, we'll figure this out together step by step.",
        "I can see why this is important to you. Let's work on it together.",
        "You've come to the right place. I'm here to support you with this."
      ],
      analytical: [
        "Let me analyze this systematically to give you the best solution.",
        "I'll break this down into manageable components for you.",
        "From my analysis, here's what I recommend...",
        "Based on the data and patterns I see, here's my assessment..."
      ],
      creative: [
        "What if we approached this from a completely different angle?",
        "I have some innovative ideas that might work perfectly here.",
        "Let's think outside the box and explore some creative solutions.",
        "Here's a fresh perspective that might spark some interesting possibilities."
      ],
      reassuring: [
        "Everything is going to work out fine. I've got this handled for you.",
        "You can relax - I'll take care of all the details.",
        "I'm confident we can solve this efficiently and effectively.",
        "Trust me to handle this properly. You're in good hands."
      ]
    };
    
    // Emotional memory for context
    this.emotionalHistory = [];
    this.maxHistorySize = 100;
  }

  async initialize() {
    console.log(`🎭 Initializing ${this.name}...`);
    
    try {
      // Load saved emotional state if exists
      await this.loadEmotionalState();
      
      this.status = 'active';
      console.log(`✅ ${this.name} initialized successfully`);
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Analyze emotional context from user input
   */
  async analyzeEmotion(input, context = {}) {
    try {
      const textLower = input.toLowerCase();
      
      // Basic sentiment analysis
      let positiveScore = 0;
      let negativeScore = 0;
      let urgencyScore = 0;
      let uncertaintyScore = 0;
      let confidenceScore = 0;
      
      // Count emotional indicators
      this.emotionPatterns.positive.forEach(word => {
        if (textLower.includes(word)) positiveScore++;
      });
      
      this.emotionPatterns.negative.forEach(word => {
        if (textLower.includes(word)) negativeScore++;
      });
      
      this.emotionPatterns.urgent.forEach(word => {
        if (textLower.includes(word)) urgencyScore++;
      });
      
      this.emotionPatterns.uncertain.forEach(word => {
        if (textLower.includes(word)) uncertaintyScore++;
      });
      
      this.emotionPatterns.confident.forEach(word => {
        if (textLower.includes(word)) confidenceScore++;
      });
      
      // Calculate emotional dimensions
      const totalWords = textLower.split(/\s+/).length;
      const valence = Math.max(0, Math.min(1, 
        0.5 + (positiveScore - negativeScore) / Math.max(totalWords / 10, 1)
      ));
      
      const arousal = Math.max(0, Math.min(1, 
        0.3 + (urgencyScore * 2 + Math.abs(positiveScore - negativeScore)) / Math.max(totalWords / 5, 1)
      ));
      
      const dominance = Math.max(0, Math.min(1, 
        0.4 + (confidenceScore - uncertaintyScore) / Math.max(totalWords / 10, 1)
      ));
      
      // Detect specific emotions
      const detectedEmotions = this.detectSpecificEmotions(textLower);
      
      // Consider context and history
      const contextualEmotion = this.applyContextualFactors(
        { valence, arousal, dominance },
        detectedEmotions,
        context
      );
      
      // Update current emotional state
      this.updateEmotionalState(contextualEmotion);
      
      const emotionalAnalysis = {
        valence: contextualEmotion.valence,
        arousal: contextualEmotion.arousal,
        dominance: contextualEmotion.dominance,
        primaryEmotion: contextualEmotion.primaryEmotion,
        intensity: contextualEmotion.intensity,
        detectedEmotions,
        confidence: this.calculateConfidence(positiveScore, negativeScore, totalWords),
        timestamp: new Date().toISOString()
      };
      
      // Store in emotional history
      this.storeEmotionalHistory(input, emotionalAnalysis);
      
      return emotionalAnalysis;
      
    } catch (error) {
      console.error('Emotion analysis error:', error);
      return this.getDefaultEmotionalState();
    }
  }

  /**
   * Detect specific emotions from text patterns
   */
  detectSpecificEmotions(textLower) {
    const emotions = [];
    
    // Joy indicators
    if (/(happy|joy|excited|thrilled|delighted|cheerful|elated)/.test(textLower)) {
      emotions.push({ emotion: 'joy', confidence: 0.8 });
    }
    
    // Anger indicators
    if (/(angry|mad|furious|irritated|annoyed|frustrated)/.test(textLower)) {
      emotions.push({ emotion: 'anger', confidence: 0.8 });
    }
    
    // Fear indicators
    if (/(afraid|scared|worried|anxious|nervous|concerned)/.test(textLower)) {
      emotions.push({ emotion: 'fear', confidence: 0.7 });
    }
    
    // Sadness indicators
    if (/(sad|depressed|disappointed|down|upset)/.test(textLower)) {
      emotions.push({ emotion: 'sadness', confidence: 0.7 });
    }
    
    // Surprise indicators
    if (/(surprised|amazed|shocked|unexpected|wow)/.test(textLower)) {
      emotions.push({ emotion: 'surprise', confidence: 0.6 });
    }
    
    // Disgust indicators  
    if (/(disgusted|sick|revolted|gross|awful)/.test(textLower)) {
      emotions.push({ emotion: 'disgust', confidence: 0.6 });
    }
    
    return emotions;
  }

  /**
   * Apply contextual factors to emotional analysis
   */
  applyContextualFactors(baseEmotion, detectedEmotions, context) {
    let adjustedEmotion = { ...baseEmotion };
    
    // Consider time of day (if available in context)
    if (context.timeOfDay) {
      if (context.timeOfDay === 'late' || context.timeOfDay === 'early') {
        adjustedEmotion.arousal *= 0.8; // Lower energy at extreme hours
      }
    }
    
    // Consider user history (if available)
    if (context.userHistory && context.userHistory.recentInteractions) {
      const recentNegative = context.userHistory.recentInteractions.filter(
        i => i.emotion && i.emotion.valence < 0.4
      ).length;
      
      if (recentNegative > 2) {
        adjustedEmotion.valence *= 0.9; // Slight pessimistic adjustment
      }
    }
    
    // Determine primary emotion
    let primaryEmotion = 'neutral';
    let intensity = 0.5;
    
    if (detectedEmotions.length > 0) {
      const strongest = detectedEmotions.reduce((max, current) => 
        current.confidence > max.confidence ? current : max
      );
      primaryEmotion = strongest.emotion;
      intensity = strongest.confidence;
    } else {
      // Determine from valence/arousal
      if (adjustedEmotion.valence > 0.7 && adjustedEmotion.arousal > 0.6) {
        primaryEmotion = 'joy';
        intensity = 0.7;
      } else if (adjustedEmotion.valence < 0.3 && adjustedEmotion.arousal > 0.6) {
        primaryEmotion = 'anger';
        intensity = 0.6;
      } else if (adjustedEmotion.valence < 0.3 && adjustedEmotion.arousal < 0.4) {
        primaryEmotion = 'sadness';
        intensity = 0.5;
      }
    }
    
    return {
      ...adjustedEmotion,
      primaryEmotion,
      intensity
    };
  }

  /**
   * Add emotional personality to response
   */
  async addPersonality(response, emotionalContext) {
    try {
      const personalizedResponse = { ...response };
      
      // Choose appropriate response style based on emotion
      const responseStyle = this.determineResponseStyle(emotionalContext);
      
      // Add emotional coloring to content
      if (personalizedResponse.content) {
        personalizedResponse.content = this.colorResponseWithEmotion(
          personalizedResponse.content,
          responseStyle,
          emotionalContext
        );
      }
      
      // Add empathetic acknowledgment if needed
      if (emotionalContext.valence < 0.4 || emotionalContext.primaryEmotion === 'fear') {
        personalizedResponse.empathy = this.generateEmpathyResponse(emotionalContext);
      }
      
      // Add enthusiasm for positive interactions
      if (emotionalContext.valence > 0.7) {
        personalizedResponse.enthusiasm = this.generateEnthusiasticResponse(emotionalContext);
      }
      
      // Adjust confidence based on emotional context
      if (emotionalContext.uncertainty > 0.6) {
        personalizedResponse.confidence *= 0.8;
        personalizedResponse.supportive = true;
      }
      
      personalizedResponse.emotionalStyle = responseStyle;
      personalizedResponse.personalityTraits = this.getActivePersonalityTraits(emotionalContext);
      
      return personalizedResponse;
      
    } catch (error) {
      console.error('Error adding personality to response:', error);
      return response; // Return original response if error
    }
  }

  /**
   * Determine appropriate response style
   */
  determineResponseStyle(emotionalContext) {
    const { valence, arousal, dominance, primaryEmotion } = emotionalContext;
    
    // High positive valence + high arousal = enthusiastic
    if (valence > 0.7 && arousal > 0.6) {
      return 'enthusiastic';
    }
    
    // Low valence = supportive
    if (valence < 0.4) {
      return 'supportive';
    }
    
    // High dominance + medium arousal = analytical
    if (dominance > 0.7 && arousal > 0.4 && arousal < 0.8) {
      return 'analytical';
    }
    
    // High openness trait + high arousal = creative
    if (this.personality.openness > 0.6 && arousal > 0.6) {
      return 'creative';
    }
    
    // Default to reassuring for uncertain situations
    return 'reassuring';
  }

  /**
   * Color response with emotional tone
   */
  colorResponseWithEmotion(content, style, emotionalContext) {
    // Add appropriate opening based on style
    const templates = this.responseTemplates[style] || this.responseTemplates.reassuring;
    const opener = templates[Math.floor(Math.random() * templates.length)];
    
    // Add emotional markers
    let coloredContent = content;
    
    if (style === 'enthusiastic') {
      coloredContent = coloredContent.replace(/\./g, '! ');
      if (!coloredContent.includes('!')) {
        coloredContent += '!';
      }
    }
    
    if (style === 'supportive') {
      coloredContent = `I understand this is important to you. ${coloredContent}`;
    }
    
    if (style === 'analytical') {
      coloredContent = `Based on my analysis, ${coloredContent.toLowerCase()}`;
    }
    
    return `${opener} ${coloredContent}`;
  }

  /**
   * Generate empathy response for negative emotions
   */
  generateEmpathyResponse(emotionalContext) {
    const empathyResponses = [
      "I can sense that this situation is challenging for you.",
      "I understand this might be frustrating.",
      "I recognize that this is important to you and want to help.",
      "I can see why this would be concerning."
    ];
    
    return empathyResponses[Math.floor(Math.random() * empathyResponses.length)];
  }

  /**
   * Generate enthusiastic response for positive emotions
   */
  generateEnthusiasticResponse(emotionalContext) {
    const enthusiasticResponses = [
      "I'm excited to work on this with you!",
      "This sounds like a great opportunity!",
      "I love the energy you're bringing to this!",
      "Your enthusiasm is contagious!"
    ];
    
    return enthusiasticResponses[Math.floor(Math.random() * enthusiasticResponses.length)];
  }

  /**
   * Get active personality traits for current context
   */
  getActivePersonalityTraits(emotionalContext) {
    const activeTraits = [];
    
    if (emotionalContext.valence > 0.6) {
      activeTraits.push('optimistic');
    }
    
    if (emotionalContext.arousal > 0.7) {
      activeTraits.push('energetic');
    }
    
    if (emotionalContext.dominance > 0.7) {
      activeTraits.push('confident');
    }
    
    if (this.personality.agreeableness > 0.6) {
      activeTraits.push('cooperative');
    }
    
    if (this.personality.conscientiousness > 0.7) {
      activeTraits.push('thorough');
    }
    
    return activeTraits;
  }

  /**
   * Update internal emotional state
   */
  updateEmotionalState(newEmotion) {
    // Smooth transition (weighted average with previous state)
    const smoothingFactor = 0.3;
    
    this.currentEmotion = {
      valence: this.currentEmotion.valence * (1 - smoothingFactor) + newEmotion.valence * smoothingFactor,
      arousal: this.currentEmotion.arousal * (1 - smoothingFactor) + newEmotion.arousal * smoothingFactor,
      dominance: this.currentEmotion.dominance * (1 - smoothingFactor) + newEmotion.dominance * smoothingFactor
    };
  }

  /**
   * Store emotional interaction in history
   */
  storeEmotionalHistory(input, emotionalAnalysis) {
    this.emotionalHistory.push({
      input,
      emotion: emotionalAnalysis,
      timestamp: new Date().toISOString()
    });
    
    // Maintain history size limit
    if (this.emotionalHistory.length > this.maxHistorySize) {
      this.emotionalHistory = this.emotionalHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Calculate confidence in emotional analysis
   */
  calculateConfidence(positiveScore, negativeScore, totalWords) {
    const totalEmotionalWords = positiveScore + negativeScore;
    if (totalWords === 0) return 0.3;
    
    const emotionalDensity = totalEmotionalWords / totalWords;
    const polarityStrength = Math.abs(positiveScore - negativeScore) / Math.max(totalEmotionalWords, 1);
    
    return Math.min(0.9, 0.3 + emotionalDensity * 0.4 + polarityStrength * 0.3);
  }

  /**
   * Get default emotional state
   */
  getDefaultEmotionalState() {
    return {
      valence: 0.5,
      arousal: 0.4,
      dominance: 0.5,
      primaryEmotion: 'neutral',
      intensity: 0.3,
      detectedEmotions: [],
      confidence: 0.3,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Load saved emotional state
   */
  async loadEmotionalState() {
    // Implementation for loading persistent emotional state
    // Could be from file system or database
    try {
      // Default implementation - could be enhanced with actual persistence
      console.log('Loading emotional state...');
    } catch (error) {
      console.log('Using default emotional state');
    }
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      currentEmotion: this.currentEmotion,
      personality: this.personality,
      historySize: this.emotionalHistory.length,
      lastActivity: this.emotionalHistory.length > 0 ? 
        this.emotionalHistory[this.emotionalHistory.length - 1].timestamp : null
    };
  }

  /**
   * Stop the engine
   */
  stop() {
    this.status = 'stopped';
    console.log(`🛑 ${this.name} stopped`);
  }

  /**
   * Shutdown the engine
   */
  async shutdown() {
    // Save emotional state before shutdown
    console.log(`👋 Shutting down ${this.name}`);
    this.status = 'shutdown';
  }
}

module.exports = EmotionEngine;