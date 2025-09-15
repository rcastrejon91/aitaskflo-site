// Enhanced AI Agent: Continuous Learning System
// Processes and integrates new knowledge intelligently

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class ContinuousLearner extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      learningEnabled: true,
      processingBatchSize: 10,
      confidenceThreshold: 0.7,
      biasDetectionEnabled: true,
      crossValidationEnabled: true,
      patternExtractionEnabled: true,
      knowledgeGraphEnabled: true,
      ...config
    };
    
    this.learningSession = {
      id: null,
      startTime: null,
      processed: 0,
      integrated: 0,
      rejected: 0,
      patterns: [],
      insights: []
    };
    
    this.knowledgeBase = {
      facts: new Map(),
      patterns: new Map(),
      relationships: new Map(),
      confidence: new Map(),
      sources: new Map()
    };
    
    this.learningHistory = [];
    this.performanceMetrics = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      learningRate: 0
    };
    
    console.log('🧠 Continuous Learning System initialized');
    this.loadExistingKnowledge();
  }

  // Start a new learning session
  async startLearningSession() {
    this.learningSession = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      processed: 0,
      integrated: 0,
      rejected: 0,
      patterns: [],
      insights: []
    };
    
    console.log(`🎓 Starting learning session: ${this.learningSession.id}`);
    this.emit('learning-session-started', this.learningSession);
    
    return this.learningSession.id;
  }

  // Process new information from discoveries
  async processNewInformation(discoveries) {
    if (!this.learningSession.id) {
      await this.startLearningSession();
    }

    console.log(`🔄 Processing ${discoveries.length} new discoveries for learning...`);
    const results = {
      processed: [],
      integrated: [],
      rejected: [],
      patterns: [],
      insights: []
    };

    // Process in batches
    for (let i = 0; i < discoveries.length; i += this.config.processingBatchSize) {
      const batch = discoveries.slice(i, i + this.config.processingBatchSize);
      const batchResults = await this.processBatch(batch);
      
      results.processed.push(...batchResults.processed);
      results.integrated.push(...batchResults.integrated);
      results.rejected.push(...batchResults.rejected);
      results.patterns.push(...batchResults.patterns);
      results.insights.push(...batchResults.insights);
    }

    // Update session stats
    this.learningSession.processed += results.processed.length;
    this.learningSession.integrated += results.integrated.length;
    this.learningSession.rejected += results.rejected.length;
    this.learningSession.patterns.push(...results.patterns);
    this.learningSession.insights.push(...results.insights);

    // Emit learning results
    this.emit('learning-completed', results);
    
    console.log(`✅ Learning complete: ${results.integrated.length} items integrated, ${results.rejected.length} rejected`);
    return results;
  }

  // Process a batch of discoveries
  async processBatch(batch) {
    const results = {
      processed: [],
      integrated: [],
      rejected: [],
      patterns: [],
      insights: []
    };

    for (const discovery of batch) {
      try {
        // Score information relevance and quality
        const relevanceScore = await this.scoreRelevance(discovery);
        
        if (relevanceScore < this.config.confidenceThreshold) {
          results.rejected.push({
            ...discovery,
            rejectionReason: 'Low relevance score',
            relevanceScore
          });
          continue;
        }

        // Validate information across sources if enabled
        let validationResult = { passed: true, confidence: 1.0 };
        if (this.config.crossValidationEnabled) {
          validationResult = await this.crossValidate(discovery);
        }

        if (!validationResult.passed) {
          results.rejected.push({
            ...discovery,
            rejectionReason: 'Failed cross-validation',
            validationResult
          });
          continue;
        }

        // Extract meaningful patterns
        const patterns = await this.extractPatterns(discovery);
        results.patterns.push(...patterns);

        // Detect potential bias
        const biasCheck = this.config.biasDetectionEnabled 
          ? await this.detectBias(discovery)
          : { biasDetected: false, confidence: 1.0 };

        // Create processed knowledge item
        const processedItem = {
          ...discovery,
          relevanceScore,
          validationResult,
          patterns,
          biasCheck,
          processedAt: new Date().toISOString(),
          sessionId: this.learningSession.id
        };

        results.processed.push(processedItem);

        // Integrate with existing knowledge
        const integrationResult = await this.integrateKnowledge(processedItem);
        
        if (integrationResult.success) {
          results.integrated.push({
            ...processedItem,
            integrationResult
          });
          
          // Generate insights from integration
          const insights = await this.generateInsights(processedItem, integrationResult);
          results.insights.push(...insights);
        } else {
          results.rejected.push({
            ...processedItem,
            rejectionReason: 'Integration failed',
            integrationResult
          });
        }

      } catch (error) {
        console.error(`❌ Failed to process discovery:`, error.message);
        results.rejected.push({
          ...discovery,
          rejectionReason: `Processing error: ${error.message}`
        });
      }
    }

    return results;
  }

  // Score information relevance and quality
  async scoreRelevance(discovery) {
    let score = 0;
    const weights = {
      sourceReliability: 0.3,
      contentQuality: 0.2,
      topicRelevance: 0.2,
      freshness: 0.1,
      uniqueness: 0.1,
      externalValidation: 0.1
    };

    // Source reliability score
    const sourceReliability = this.assessSourceReliability(discovery.source);
    score += sourceReliability * weights.sourceReliability;

    // Content quality score
    const contentQuality = this.assessContentQuality(discovery);
    score += contentQuality * weights.contentQuality;

    // Topic relevance score
    const topicRelevance = this.assessTopicRelevance(discovery);
    score += topicRelevance * weights.topicRelevance;

    // Freshness score
    const freshness = this.assessFreshness(discovery);
    score += freshness * weights.freshness;

    // Uniqueness score
    const uniqueness = await this.assessUniqueness(discovery);
    score += uniqueness * weights.uniqueness;

    // External validation score
    const externalValidation = discovery.score ? Math.min(Math.log10(discovery.score + 1) / 4, 1) : 0.5;
    score += externalValidation * weights.externalValidation;

    return Math.min(Math.max(score, 0), 1);
  }

  // Assess source reliability
  assessSourceReliability(sourceName) {
    const reliabilityScores = {
      'TechCrunch RSS': 0.85,
      'Hacker News': 0.8,
      'ArXiv AI Papers': 0.95,
      'OpenAI Blog': 0.9,
      'GitHub Trending': 0.75
    };
    
    return reliabilityScores[sourceName] || 0.5;
  }

  // Assess content quality
  assessContentQuality(discovery) {
    let score = 0.5; // Base score
    
    const content = discovery.title + ' ' + discovery.content;
    const wordCount = content.split(' ').length;
    
    // Length score
    if (wordCount > 50 && wordCount < 1000) score += 0.2;
    else if (wordCount >= 1000) score += 0.1;
    
    // Technical terms bonus
    const technicalTerms = [
      'algorithm', 'data', 'analysis', 'research', 'study', 'experiment',
      'artificial intelligence', 'machine learning', 'neural network',
      'automation', 'optimization', 'innovation'
    ];
    
    const termCount = technicalTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    
    score += Math.min(termCount * 0.05, 0.3);
    
    return Math.min(score, 1);
  }

  // Assess topic relevance
  assessTopicRelevance(discovery) {
    const content = (discovery.title + ' ' + discovery.content).toLowerCase();
    
    const relevantTopics = {
      'artificial intelligence': 1.0,
      'machine learning': 1.0,
      'automation': 0.9,
      'technology': 0.7,
      'innovation': 0.8,
      'software': 0.7,
      'data science': 0.9,
      'programming': 0.6,
      'algorithm': 0.8,
      'neural network': 1.0
    };
    
    let maxRelevance = 0;
    Object.entries(relevantTopics).forEach(([topic, relevance]) => {
      if (content.includes(topic)) {
        maxRelevance = Math.max(maxRelevance, relevance);
      }
    });
    
    return maxRelevance || 0.3; // Default relevance for unmatched content
  }

  // Assess information freshness
  assessFreshness(discovery) {
    const now = new Date();
    const discoveryTime = new Date(discovery.timestamp);
    const ageInHours = (now - discoveryTime) / (1000 * 60 * 60);
    
    if (ageInHours <= 24) return 1.0;      // Within 24 hours
    if (ageInHours <= 168) return 0.8;     // Within a week
    if (ageInHours <= 720) return 0.6;     // Within a month
    return 0.4;                             // Older content
  }

  // Assess information uniqueness
  async assessUniqueness(discovery) {
    const contentHash = require('crypto')
      .createHash('md5')
      .update(discovery.content)
      .digest('hex');
    
    // Check against existing knowledge
    if (this.knowledgeBase.facts.has(contentHash)) {
      return 0.1; // Very low uniqueness for duplicate content
    }
    
    // Check for similar content (simplified)
    const similarityThreshold = 0.8;
    for (const [hash, existingFact] of this.knowledgeBase.facts) {
      const similarity = this.calculateTextSimilarity(discovery.content, existingFact.content);
      if (similarity > similarityThreshold) {
        return 0.3; // Low uniqueness for similar content
      }
    }
    
    return 1.0; // High uniqueness for new content
  }

  // Calculate text similarity (simplified)
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Cross-validate information across sources
  async crossValidate(discovery) {
    // Simplified cross-validation logic
    const result = {
      passed: true,
      confidence: 1.0,
      sources: [discovery.source],
      conflicts: []
    };
    
    // Check for conflicting information in knowledge base
    const relatedFacts = this.findRelatedFacts(discovery);
    
    for (const fact of relatedFacts) {
      const conflict = this.detectConflict(discovery, fact);
      if (conflict) {
        result.conflicts.push(conflict);
        result.confidence *= 0.8; // Reduce confidence for each conflict
      }
    }
    
    // Fail validation if confidence drops too low
    if (result.confidence < 0.5) {
      result.passed = false;
    }
    
    return result;
  }

  // Find related facts in knowledge base
  findRelatedFacts(discovery) {
    const related = [];
    const discoveryKeywords = this.extractKeywords(discovery.content);
    
    for (const [hash, fact] of this.knowledgeBase.facts) {
      const factKeywords = this.extractKeywords(fact.content);
      const commonKeywords = discoveryKeywords.filter(kw => factKeywords.includes(kw));
      
      if (commonKeywords.length >= 2) {
        related.push(fact);
      }
    }
    
    return related;
  }

  // Extract keywords from text
  extractKeywords(text) {
    // Simplified keyword extraction
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'been', 'from'].includes(word))
      .slice(0, 10); // Top 10 keywords
  }

  // Detect conflicts between discoveries and existing facts
  detectConflict(discovery, existingFact) {
    // Simplified conflict detection
    // In a real implementation, this would use NLP to detect semantic conflicts
    
    const discoveryContent = discovery.content.toLowerCase();
    const factContent = existingFact.content.toLowerCase();
    
    // Look for direct contradictions
    const contradictionPairs = [
      ['not', 'is'],
      ['false', 'true'],
      ['impossible', 'possible'],
      ['never', 'always']
    ];
    
    for (const [neg, pos] of contradictionPairs) {
      if (discoveryContent.includes(neg) && factContent.includes(pos)) {
        return {
          type: 'contradiction',
          description: `Discovery contains "${neg}" while existing fact contains "${pos}"`,
          severity: 'medium'
        };
      }
    }
    
    return null;
  }

  // Extract patterns from information
  async extractPatterns(discovery) {
    const patterns = [];
    
    // Topic patterns
    const topics = this.extractTopics(discovery);
    topics.forEach(topic => {
      patterns.push({
        type: 'topic',
        value: topic,
        confidence: 0.8,
        source: discovery.source
      });
    });
    
    // Temporal patterns
    if (discovery.timestamp) {
      const timePattern = this.extractTimePattern(discovery);
      if (timePattern) {
        patterns.push(timePattern);
      }
    }
    
    // Source patterns
    const sourcePattern = {
      type: 'source_reliability',
      value: this.assessSourceReliability(discovery.source),
      confidence: 0.9,
      source: discovery.source
    };
    patterns.push(sourcePattern);
    
    return patterns;
  }

  // Extract topics from discovery
  extractTopics(discovery) {
    const content = (discovery.title + ' ' + discovery.content).toLowerCase();
    const topics = [];
    
    const topicKeywords = {
      'artificial_intelligence': ['ai', 'artificial intelligence', 'machine learning', 'neural'],
      'technology': ['technology', 'tech', 'software', 'hardware'],
      'automation': ['automation', 'automated', 'automatic'],
      'research': ['research', 'study', 'experiment', 'analysis'],
      'innovation': ['innovation', 'breakthrough', 'advancement'],
      'programming': ['programming', 'coding', 'development', 'software']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  // Extract time-based patterns
  extractTimePattern(discovery) {
    const hour = new Date(discovery.timestamp).getHours();
    const dayOfWeek = new Date(discovery.timestamp).getDay();
    
    return {
      type: 'temporal',
      value: {
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      },
      confidence: 0.7,
      source: discovery.source
    };
  }

  // Detect potential bias in information
  async detectBias(discovery) {
    const result = {
      biasDetected: false,
      confidence: 1.0,
      biasTypes: [],
      explanation: ''
    };
    
    const content = (discovery.title + ' ' + discovery.content).toLowerCase();
    
    // Source bias detection
    const sourceBias = this.detectSourceBias(discovery.source);
    if (sourceBias.detected) {
      result.biasDetected = true;
      result.biasTypes.push('source');
      result.confidence *= 0.9;
    }
    
    // Language bias detection (simplified)
    const biasIndicators = [
      'always', 'never', 'best', 'worst', 'everyone', 'nobody',
      'obviously', 'clearly', 'definitely', 'impossible'
    ];
    
    const biasCount = biasIndicators.filter(indicator => content.includes(indicator)).length;
    if (biasCount > 2) {
      result.biasDetected = true;
      result.biasTypes.push('language');
      result.confidence *= 0.8;
      result.explanation = `Found ${biasCount} bias indicators in content`;
    }
    
    return result;
  }

  // Detect source-specific bias
  detectSourceBias(sourceName) {
    const sourceBiases = {
      'TechCrunch RSS': { detected: false, type: 'commercial' },
      'Hacker News': { detected: true, type: 'tech_community' },
      'ArXiv AI Papers': { detected: false, type: 'academic' },
      'OpenAI Blog': { detected: true, type: 'corporate' },
      'GitHub Trending': { detected: false, type: 'popularity' }
    };
    
    return sourceBiases[sourceName] || { detected: false, type: 'unknown' };
  }

  // Integrate knowledge into the knowledge base
  async integrateKnowledge(processedItem) {
    try {
      const result = {
        success: false,
        method: '',
        conflicts: [],
        updates: []
      };
      
      const contentHash = require('crypto')
        .createHash('md5')
        .update(processedItem.content)
        .digest('hex');
      
      // Check if knowledge already exists
      if (this.knowledgeBase.facts.has(contentHash)) {
        // Update existing knowledge
        const existing = this.knowledgeBase.facts.get(contentHash);
        existing.sources.push(processedItem.source);
        existing.lastUpdated = new Date().toISOString();
        existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
        
        result.success = true;
        result.method = 'update';
        result.updates.push('Reinforced existing knowledge');
      } else {
        // Add new knowledge
        const knowledgeItem = {
          id: contentHash,
          content: processedItem.content,
          title: processedItem.title,
          type: processedItem.type,
          sources: [processedItem.source],
          tags: processedItem.tags || [],
          confidence: processedItem.relevanceScore,
          relevanceScore: processedItem.relevanceScore,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sessionId: processedItem.sessionId,
          patterns: processedItem.patterns || []
        };
        
        this.knowledgeBase.facts.set(contentHash, knowledgeItem);
        
        // Update source tracking
        if (!this.knowledgeBase.sources.has(processedItem.source)) {
          this.knowledgeBase.sources.set(processedItem.source, {
            name: processedItem.source,
            totalContributions: 0,
            reliability: this.assessSourceReliability(processedItem.source),
            lastContribution: new Date().toISOString()
          });
        }
        
        const sourceStats = this.knowledgeBase.sources.get(processedItem.source);
        sourceStats.totalContributions++;
        sourceStats.lastContribution = new Date().toISOString();
        
        result.success = true;
        result.method = 'create';
        result.updates.push('Added new knowledge item');
      }
      
      // Store patterns
      processedItem.patterns.forEach(pattern => {
        const patternKey = `${pattern.type}_${pattern.value}`;
        if (!this.knowledgeBase.patterns.has(patternKey)) {
          this.knowledgeBase.patterns.set(patternKey, {
            type: pattern.type,
            value: pattern.value,
            occurrences: 0,
            sources: new Set(),
            confidence: 0
          });
        }
        
        const patternData = this.knowledgeBase.patterns.get(patternKey);
        patternData.occurrences++;
        patternData.sources.add(pattern.source);
        patternData.confidence = Math.min(patternData.confidence + 0.1, 1.0);
      });
      
      // Save knowledge base periodically
      await this.saveKnowledgeBase();
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'failed'
      };
    }
  }

  // Generate insights from integrated knowledge
  async generateInsights(processedItem, integrationResult) {
    const insights = [];
    
    // Pattern-based insights
    if (processedItem.patterns.length > 0) {
      const patternInsight = {
        type: 'pattern_discovery',
        content: `Discovered ${processedItem.patterns.length} patterns in ${processedItem.source}`,
        confidence: 0.8,
        patterns: processedItem.patterns,
        timestamp: new Date().toISOString()
      };
      insights.push(patternInsight);
    }
    
    // Source reliability insights
    const sourceStats = this.knowledgeBase.sources.get(processedItem.source);
    if (sourceStats && sourceStats.totalContributions > 10) {
      const reliabilityInsight = {
        type: 'source_reliability',
        content: `${processedItem.source} has contributed ${sourceStats.totalContributions} knowledge items`,
        confidence: 0.9,
        data: sourceStats,
        timestamp: new Date().toISOString()
      };
      insights.push(reliabilityInsight);
    }
    
    // Knowledge growth insights
    if (this.knowledgeBase.facts.size > 0 && this.knowledgeBase.facts.size % 100 === 0) {
      const growthInsight = {
        type: 'knowledge_growth',
        content: `Knowledge base reached ${this.knowledgeBase.facts.size} facts`,
        confidence: 1.0,
        milestone: this.knowledgeBase.facts.size,
        timestamp: new Date().toISOString()
      };
      insights.push(growthInsight);
    }
    
    return insights;
  }

  // Save knowledge base to disk
  async saveKnowledgeBase() {
    try {
      const dataDir = './data/knowledge';
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      
      // Convert Maps to objects for JSON serialization
      const serializable = {
        facts: Object.fromEntries(this.knowledgeBase.facts),
        patterns: Object.fromEntries(this.knowledgeBase.patterns),
        relationships: Object.fromEntries(this.knowledgeBase.relationships),
        confidence: Object.fromEntries(this.knowledgeBase.confidence),
        sources: Object.fromEntries(this.knowledgeBase.sources),
        lastSaved: new Date().toISOString(),
        totalFacts: this.knowledgeBase.facts.size,
        totalPatterns: this.knowledgeBase.patterns.size
      };
      
      const filename = path.join(dataDir, 'knowledge-base.json');
      fs.writeFileSync(filename, JSON.stringify(serializable, null, 2));
      
      console.log(`💾 Knowledge base saved: ${this.knowledgeBase.facts.size} facts, ${this.knowledgeBase.patterns.size} patterns`);
    } catch (error) {
      console.error('Failed to save knowledge base:', error.message);
    }
  }

  // Load existing knowledge base
  async loadExistingKnowledge() {
    try {
      const filename = './data/knowledge/knowledge-base.json';
      if (!fs.existsSync(filename)) {
        console.log('📚 No existing knowledge base found, starting fresh');
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      
      // Convert objects back to Maps
      this.knowledgeBase.facts = new Map(Object.entries(data.facts || {}));
      this.knowledgeBase.patterns = new Map(Object.entries(data.patterns || {}));
      this.knowledgeBase.relationships = new Map(Object.entries(data.relationships || {}));
      this.knowledgeBase.confidence = new Map(Object.entries(data.confidence || {}));
      this.knowledgeBase.sources = new Map(Object.entries(data.sources || {}));
      
      console.log(`📚 Loaded existing knowledge base: ${this.knowledgeBase.facts.size} facts, ${this.knowledgeBase.patterns.size} patterns`);
    } catch (error) {
      console.error('Failed to load existing knowledge base:', error.message);
    }
  }

  // Get learning statistics
  getStats() {
    return {
      learningSession: this.learningSession,
      knowledgeBase: {
        totalFacts: this.knowledgeBase.facts.size,
        totalPatterns: this.knowledgeBase.patterns.size,
        totalSources: this.knowledgeBase.sources.size,
        averageConfidence: this.calculateAverageConfidence()
      },
      performanceMetrics: this.performanceMetrics,
      totalSessions: this.learningHistory.length
    };
  }

  // Calculate average confidence across knowledge base
  calculateAverageConfidence() {
    if (this.knowledgeBase.facts.size === 0) return 0;
    
    let totalConfidence = 0;
    for (const [id, fact] of this.knowledgeBase.facts) {
      totalConfidence += fact.confidence || 0;
    }
    
    return totalConfidence / this.knowledgeBase.facts.size;
  }

  // Get knowledge by topic
  getKnowledgeByTopic(topic, limit = 20) {
    const results = [];
    
    for (const [id, fact] of this.knowledgeBase.facts) {
      if (fact.tags && fact.tags.includes(topic)) {
        results.push(fact);
      }
    }
    
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // Search knowledge base
  searchKnowledge(query, limit = 20) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const [id, fact] of this.knowledgeBase.facts) {
      const relevance = this.calculateSearchRelevance(fact, queryLower);
      if (relevance > 0) {
        results.push({ ...fact, searchRelevance: relevance });
      }
    }
    
    return results
      .sort((a, b) => b.searchRelevance - a.searchRelevance)
      .slice(0, limit);
  }

  // Calculate search relevance
  calculateSearchRelevance(fact, query) {
    let relevance = 0;
    
    const title = (fact.title || '').toLowerCase();
    const content = (fact.content || '').toLowerCase();
    const tags = (fact.tags || []).join(' ').toLowerCase();
    
    // Title matches
    if (title.includes(query)) relevance += 1.0;
    
    // Content matches
    if (content.includes(query)) relevance += 0.7;
    
    // Tag matches
    if (tags.includes(query)) relevance += 0.8;
    
    // Boost by confidence
    relevance *= (fact.confidence || 0.5);
    
    return relevance;
  }
}

module.exports = ContinuousLearner;