/**
 * Memory Manager - Session and long-term memory management
 * Part of the AITaskFlo autonomous AI agent system
 */

const fs = require('fs').promises;
const path = require('path');

class MemoryManager {
  constructor(config = {}) {
    this.agentId = config.agentId || 'default';
    this.name = 'MemoryManager';
    this.version = '1.0.0';
    this.status = 'inactive';
    
    // Memory storage
    this.shortTermMemory = new Map(); // Session-based memory
    this.longTermMemory = new Map();  // Persistent memory
    this.workingMemory = new Map();   // Current context memory
    this.episodicMemory = [];         // Interaction episodes
    this.semanticMemory = new Map();  // Factual knowledge
    this.proceduralMemory = new Map(); // Skills and procedures
    
    // Memory configuration
    this.config = {
      maxSessions: config.maxSessions || 1000,
      maxEpisodes: config.maxEpisodes || 5000,
      maxWorkingMemoryItems: 100,
      shortTermRetentionHours: 24,
      longTermThreshold: 0.7, // Importance threshold for long-term storage
      compressionInterval: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };
    
    // Memory consolidation
    this.consolidationQueue = [];
    this.lastConsolidation = Date.now();
    
    // Memory paths
    this.memoryDir = path.join(process.cwd(), 'ai-agent', 'memory', 'data');
    this.sessionFile = path.join(this.memoryDir, `sessions_${this.agentId}.json`);
    this.longTermFile = path.join(this.memoryDir, `longterm_${this.agentId}.json`);
    this.episodicFile = path.join(this.memoryDir, `episodic_${this.agentId}.json`);
    this.semanticFile = path.join(this.memoryDir, `semantic_${this.agentId}.json`);
    
    // Memory indexing
    this.memoryIndex = new Map();
    this.similarityThreshold = 0.8;
    
    // Statistics
    this.stats = {
      totalInteractions: 0,
      sessionsCreated: 0,
      longTermStorages: 0,
      consolidationRuns: 0,
      memoryRetrievals: 0,
      averageRetrievalTime: 0
    };
  }

  async initialize() {
    console.log(`🧠 Initializing ${this.name} for agent ${this.agentId}...`);
    
    try {
      // Create memory directory if it doesn't exist
      await this.ensureMemoryDirectory();
      
      // Load existing memory
      await this.loadMemory();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      this.status = 'active';
      console.log(`✅ ${this.name} initialized successfully`);
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Store an interaction in memory
   */
  async storeInteraction(interaction) {
    try {
      const memoryItem = {
        id: interaction.sessionId || `interaction_${Date.now()}`,
        ...interaction,
        timestamp: interaction.timestamp || new Date().toISOString(),
        importance: this.calculateImportance(interaction),
        embedding: await this.generateEmbedding(interaction),
        context: this.extractContext(interaction)
      };
      
      // Store in short-term memory
      this.shortTermMemory.set(memoryItem.id, memoryItem);
      
      // Add to episodic memory
      this.episodicMemory.push(memoryItem);
      
      // Update working memory if relevant to current context
      if (this.isRelevantToWorkingMemory(memoryItem)) {
        this.addToWorkingMemory(memoryItem);
      }
      
      // Queue for potential long-term storage
      if (memoryItem.importance >= this.config.longTermThreshold) {
        this.consolidationQueue.push(memoryItem);
      }
      
      // Update statistics
      this.stats.totalInteractions++;
      
      console.log(`💾 Stored interaction: ${memoryItem.id} (importance: ${memoryItem.importance})`);
      
      return memoryItem.id;
      
    } catch (error) {
      console.error('Error storing interaction:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories based on context or query
   */
  async retrieveMemories(query, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        memoryTypes = ['shortTerm', 'longTerm', 'episodic'],
        maxResults = 10,
        similarityThreshold = this.similarityThreshold,
        timeRange = null,
        includeContext = true
      } = options;
      
      const queryEmbedding = await this.generateEmbedding({ input: query });
      const results = [];
      
      // Search different memory types
      if (memoryTypes.includes('shortTerm')) {
        const shortTermResults = await this.searchShortTermMemory(queryEmbedding, similarityThreshold);
        results.push(...shortTermResults);
      }
      
      if (memoryTypes.includes('longTerm')) {
        const longTermResults = await this.searchLongTermMemory(queryEmbedding, similarityThreshold);
        results.push(...longTermResults);
      }
      
      if (memoryTypes.includes('episodic')) {
        const episodicResults = await this.searchEpisodicMemory(queryEmbedding, similarityThreshold);
        results.push(...episodicResults);
      }
      
      if (memoryTypes.includes('semantic')) {
        const semanticResults = await this.searchSemanticMemory(queryEmbedding, similarityThreshold);
        results.push(...semanticResults);
      }
      
      // Apply time range filter if specified
      let filteredResults = timeRange ? 
        this.filterByTimeRange(results, timeRange) : results;
      
      // Sort by relevance and importance
      filteredResults = this.rankMemories(filteredResults, queryEmbedding);
      
      // Limit results
      filteredResults = filteredResults.slice(0, maxResults);
      
      // Update statistics
      this.stats.memoryRetrievals++;
      const retrievalTime = Date.now() - startTime;
      this.stats.averageRetrievalTime = 
        (this.stats.averageRetrievalTime * (this.stats.memoryRetrievals - 1) + retrievalTime) / 
        this.stats.memoryRetrievals;
      
      console.log(`🔍 Retrieved ${filteredResults.length} memories for query in ${retrievalTime}ms`);
      
      return {
        memories: includeContext ? filteredResults : 
          filteredResults.map(m => ({ ...m, context: undefined })),
        totalFound: results.length,
        queryTime: retrievalTime,
        query
      };
      
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return { memories: [], totalFound: 0, queryTime: Date.now() - startTime, error: error.message };
    }
  }

  /**
   * Get recent interactions for context
   */
  async getRecentInteractions(count = 10) {
    const recentEpisodes = this.episodicMemory
      .slice(-count)
      .reverse(); // Most recent first
    
    return recentEpisodes;
  }

  /**
   * Store semantic knowledge
   */
  async storeSemanticKnowledge(fact, context = {}) {
    const knowledge = {
      id: `fact_${Date.now()}`,
      fact,
      context,
      confidence: context.confidence || 0.8,
      source: context.source || 'interaction',
      timestamp: new Date().toISOString(),
      embedding: await this.generateEmbedding({ input: fact })
    };
    
    this.semanticMemory.set(knowledge.id, knowledge);
    console.log(`📚 Stored semantic knowledge: ${fact.substring(0, 50)}...`);
    
    return knowledge.id;
  }

  /**
   * Store procedural knowledge (skills/procedures)
   */
  async storeProceduralKnowledge(procedure, context = {}) {
    const procedural = {
      id: `procedure_${Date.now()}`,
      name: procedure.name,
      steps: procedure.steps || [],
      conditions: procedure.conditions || [],
      expected_outcomes: procedure.expected_outcomes || [],
      success_rate: procedure.success_rate || 0.5,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.proceduralMemory.set(procedural.id, procedural);
    console.log(`⚙️ Stored procedural knowledge: ${procedure.name}`);
    
    return procedural.id;
  }

  /**
   * Consolidate memories (move important short-term to long-term)
   */
  async consolidateMemories() {
    console.log(`🔄 Starting memory consolidation...`);
    
    try {
      let consolidatedCount = 0;
      
      // Process consolidation queue
      while (this.consolidationQueue.length > 0) {
        const memory = this.consolidationQueue.shift();
        
        // Double-check importance
        if (memory.importance >= this.config.longTermThreshold) {
          // Move to long-term memory
          this.longTermMemory.set(memory.id, {
            ...memory,
            consolidatedAt: new Date().toISOString(),
            accessCount: 0,
            lastAccessed: null
          });
          
          consolidatedCount++;
        }
      }
      
      // Identify additional candidates from short-term memory
      const candidates = Array.from(this.shortTermMemory.values())
        .filter(memory => {
          const age = Date.now() - new Date(memory.timestamp).getTime();
          const isOldEnough = age > 2 * 60 * 60 * 1000; // 2 hours
          const isImportant = memory.importance >= this.config.longTermThreshold;
          return isOldEnough && isImportant;
        });
      
      for (const candidate of candidates) {
        this.longTermMemory.set(candidate.id, {
          ...candidate,
          consolidatedAt: new Date().toISOString(),
          accessCount: 0,
          lastAccessed: null
        });
        consolidatedCount++;
      }
      
      // Update statistics
      this.stats.consolidationRuns++;
      this.stats.longTermStorages += consolidatedCount;
      this.lastConsolidation = Date.now();
      
      console.log(`✅ Consolidated ${consolidatedCount} memories to long-term storage`);
      
    } catch (error) {
      console.error('Memory consolidation error:', error);
    }
  }

  /**
   * Clean up old memories
   */
  async cleanupMemories() {
    console.log(`🧹 Starting memory cleanup...`);
    
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      // Clean up short-term memory
      const shortTermCutoff = now - (this.config.shortTermRetentionHours * 60 * 60 * 1000);
      
      for (const [id, memory] of this.shortTermMemory) {
        const memoryAge = new Date(memory.timestamp).getTime();
        
        if (memoryAge < shortTermCutoff && memory.importance < this.config.longTermThreshold) {
          this.shortTermMemory.delete(id);
          cleanedCount++;
        }
      }
      
      // Clean up episodic memory (keep only recent episodes)
      if (this.episodicMemory.length > this.config.maxEpisodes) {
        const toRemove = this.episodicMemory.length - this.config.maxEpisodes;
        this.episodicMemory.splice(0, toRemove);
        cleanedCount += toRemove;
      }
      
      // Clean up working memory (keep only most relevant)
      if (this.workingMemory.size > this.config.maxWorkingMemoryItems) {
        const sortedWorking = Array.from(this.workingMemory.entries())
          .sort(([,a], [,b]) => b.relevance - a.relevance);
        
        this.workingMemory.clear();
        sortedWorking.slice(0, this.config.maxWorkingMemoryItems)
          .forEach(([id, memory]) => this.workingMemory.set(id, memory));
        
        cleanedCount += sortedWorking.length - this.config.maxWorkingMemoryItems;
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} old memories`);
      
    } catch (error) {
      console.error('Memory cleanup error:', error);
    }
  }

  /**
   * Save memory state to persistent storage
   */
  async saveState() {
    console.log('💾 Saving memory state...');
    
    try {
      // Save short-term memory (as sessions)
      const sessions = Array.from(this.shortTermMemory.values());
      await fs.writeFile(this.sessionFile, JSON.stringify(sessions, null, 2));
      
      // Save long-term memory
      const longTerm = Array.from(this.longTermMemory.values());
      await fs.writeFile(this.longTermFile, JSON.stringify(longTerm, null, 2));
      
      // Save episodic memory (last 1000 episodes)
      const recentEpisodes = this.episodicMemory.slice(-1000);
      await fs.writeFile(this.episodicFile, JSON.stringify(recentEpisodes, null, 2));
      
      // Save semantic memory
      const semantic = Array.from(this.semanticMemory.values());
      await fs.writeFile(this.semanticFile, JSON.stringify(semantic, null, 2));
      
      console.log('✅ Memory state saved successfully');
      
    } catch (error) {
      console.error('Error saving memory state:', error);
      throw error;
    }
  }

  /**
   * Load memory state from persistent storage
   */
  async loadMemory() {
    console.log('📂 Loading memory state...');
    
    try {
      // Load short-term memory
      try {
        const sessionsData = await fs.readFile(this.sessionFile, 'utf8');
        const sessions = JSON.parse(sessionsData);
        sessions.forEach(session => {
          this.shortTermMemory.set(session.id, session);
        });
        console.log(`📥 Loaded ${sessions.length} short-term memories`);
      } catch (error) {
        console.log('No existing short-term memory file found');
      }
      
      // Load long-term memory
      try {
        const longTermData = await fs.readFile(this.longTermFile, 'utf8');
        const longTermMemories = JSON.parse(longTermData);
        longTermMemories.forEach(memory => {
          this.longTermMemory.set(memory.id, memory);
        });
        console.log(`📥 Loaded ${longTermMemories.length} long-term memories`);
      } catch (error) {
        console.log('No existing long-term memory file found');
      }
      
      // Load episodic memory
      try {
        const episodicData = await fs.readFile(this.episodicFile, 'utf8');
        this.episodicMemory = JSON.parse(episodicData);
        console.log(`📥 Loaded ${this.episodicMemory.length} episodic memories`);
      } catch (error) {
        console.log('No existing episodic memory file found');
        this.episodicMemory = [];
      }
      
      // Load semantic memory
      try {
        const semanticData = await fs.readFile(this.semanticFile, 'utf8');
        const semanticMemories = JSON.parse(semanticData);
        semanticMemories.forEach(memory => {
          this.semanticMemory.set(memory.id, memory);
        });
        console.log(`📥 Loaded ${semanticMemories.length} semantic memories`);
      } catch (error) {
        console.log('No existing semantic memory file found');
      }
      
    } catch (error) {
      console.error('Error loading memory:', error);
      // Continue with empty memory if loading fails
    }
  }

  // Helper methods
  
  async ensureMemoryDirectory() {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  calculateImportance(interaction) {
    let importance = 0.5; // Base importance
    
    // Factors that increase importance:
    
    // User emotion intensity
    if (interaction.emotion) {
      importance += interaction.emotion.intensity * 0.2;
    }
    
    // Decision confidence
    if (interaction.decision && interaction.decision.confidence) {
      importance += interaction.decision.confidence * 0.15;
    }
    
    // Logic reasoning complexity
    if (interaction.logic && interaction.logic.conclusions) {
      importance += Math.min(0.2, interaction.logic.conclusions.main.length * 0.05);
    }
    
    // Response confidence
    if (interaction.response && interaction.response.confidence) {
      importance += interaction.response.confidence * 0.1;
    }
    
    // User feedback (if available)
    if (interaction.feedback) {
      importance += interaction.feedback.satisfaction * 0.15;
    }
    
    // Processing time (complex interactions are more important)
    if (interaction.processingTime > 5000) { // > 5 seconds
      importance += 0.1;
    }
    
    return Math.min(1.0, importance);
  }

  async generateEmbedding(interaction) {
    // Simplified embedding generation
    // In a real implementation, this would use a proper embedding model
    
    const text = JSON.stringify({
      input: interaction.input,
      response: interaction.response?.content,
      emotion: interaction.emotion?.primaryEmotion,
      decision: interaction.decision?.type
    });
    
    // Simple hash-based embedding (would be replaced with proper neural embeddings)
    const embedding = [];
    for (let i = 0; i < 100; i++) {
      let hash = 0;
      for (let j = 0; j < text.length; j++) {
        hash = ((hash << 5) - hash + text.charCodeAt(j) + i) & 0xffffffff;
      }
      embedding.push(hash / 0xffffffff);
    }
    
    return embedding;
  }

  extractContext(interaction) {
    return {
      sessionId: interaction.sessionId,
      userContext: interaction.context?.userHistory ? 'returning_user' : 'new_user',
      emotionalTone: interaction.emotion?.primaryEmotion || 'neutral',
      decisionType: interaction.decision?.type || 'unknown',
      complexity: this.assessComplexity(interaction),
      timestamp: interaction.timestamp
    };
  }

  assessComplexity(interaction) {
    let complexity = 0;
    
    if (interaction.input && interaction.input.split(' ').length > 20) complexity += 0.3;
    if (interaction.emotion && interaction.emotion.intensity > 0.7) complexity += 0.2;
    if (interaction.logic && interaction.logic.reasoning) complexity += 0.3;
    if (interaction.decision && interaction.decision.options?.length > 2) complexity += 0.2;
    
    return Math.min(1.0, complexity);
  }

  isRelevantToWorkingMemory(memoryItem) {
    // Check if memory item is relevant to current working context
    return memoryItem.importance > 0.6 || 
           memoryItem.context?.complexity > 0.7 ||
           this.isRecentEnough(memoryItem, 10 * 60 * 1000); // 10 minutes
  }

  isRecentEnough(memoryItem, threshold) {
    const age = Date.now() - new Date(memoryItem.timestamp).getTime();
    return age < threshold;
  }

  addToWorkingMemory(memoryItem) {
    this.workingMemory.set(memoryItem.id, {
      ...memoryItem,
      relevance: this.calculateRelevance(memoryItem),
      addedToWorkingAt: new Date().toISOString()
    });
  }

  calculateRelevance(memoryItem) {
    // Calculate relevance score for working memory
    let relevance = memoryItem.importance;
    
    // Boost relevance for recent items
    const age = Date.now() - new Date(memoryItem.timestamp).getTime();
    const recencyBoost = Math.max(0, 1 - age / (60 * 60 * 1000)); // 1 hour decay
    relevance += recencyBoost * 0.2;
    
    return Math.min(1.0, relevance);
  }

  async searchShortTermMemory(queryEmbedding, threshold) {
    const results = [];
    
    for (const memory of this.shortTermMemory.values()) {
      const similarity = this.calculateSimilarity(queryEmbedding, memory.embedding);
      if (similarity >= threshold) {
        results.push({
          ...memory,
          similarity,
          memoryType: 'shortTerm'
        });
      }
    }
    
    return results;
  }

  async searchLongTermMemory(queryEmbedding, threshold) {
    const results = [];
    
    for (const memory of this.longTermMemory.values()) {
      const similarity = this.calculateSimilarity(queryEmbedding, memory.embedding);
      if (similarity >= threshold) {
        // Update access tracking
        memory.accessCount = (memory.accessCount || 0) + 1;
        memory.lastAccessed = new Date().toISOString();
        
        results.push({
          ...memory,
          similarity,
          memoryType: 'longTerm'
        });
      }
    }
    
    return results;
  }

  async searchEpisodicMemory(queryEmbedding, threshold) {
    const results = [];
    
    // Search recent episodes
    const recentEpisodes = this.episodicMemory.slice(-500);
    
    for (const memory of recentEpisodes) {
      if (memory.embedding) {
        const similarity = this.calculateSimilarity(queryEmbedding, memory.embedding);
        if (similarity >= threshold) {
          results.push({
            ...memory,
            similarity,
            memoryType: 'episodic'
          });
        }
      }
    }
    
    return results;
  }

  async searchSemanticMemory(queryEmbedding, threshold) {
    const results = [];
    
    for (const memory of this.semanticMemory.values()) {
      const similarity = this.calculateSimilarity(queryEmbedding, memory.embedding);
      if (similarity >= threshold) {
        results.push({
          ...memory,
          similarity,
          memoryType: 'semantic'
        });
      }
    }
    
    return results;
  }

  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0;
    }
    
    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  filterByTimeRange(memories, timeRange) {
    if (!timeRange.start && !timeRange.end) return memories;
    
    const startTime = timeRange.start ? new Date(timeRange.start).getTime() : 0;
    const endTime = timeRange.end ? new Date(timeRange.end).getTime() : Date.now();
    
    return memories.filter(memory => {
      const memoryTime = new Date(memory.timestamp).getTime();
      return memoryTime >= startTime && memoryTime <= endTime;
    });
  }

  rankMemories(memories, queryEmbedding) {
    return memories.sort((a, b) => {
      // Primary sort by similarity
      if (Math.abs(a.similarity - b.similarity) > 0.1) {
        return b.similarity - a.similarity;
      }
      
      // Secondary sort by importance
      if (Math.abs(a.importance - b.importance) > 0.1) {
        return b.importance - a.importance;
      }
      
      // Tertiary sort by recency
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  startBackgroundProcesses() {
    // Memory consolidation
    setInterval(() => {
      if (this.status === 'active') {
        this.consolidateMemories();
      }
    }, this.config.compressionInterval);
    
    // Memory cleanup
    setInterval(() => {
      if (this.status === 'active') {
        this.cleanupMemories();
      }
    }, this.config.cleanupInterval);
    
    // Auto-save
    setInterval(() => {
      if (this.status === 'active') {
        this.saveState();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      agentId: this.agentId,
      memoryStats: {
        shortTerm: this.shortTermMemory.size,
        longTerm: this.longTermMemory.size,
        episodic: this.episodicMemory.length,
        semantic: this.semanticMemory.size,
        procedural: this.proceduralMemory.size,
        working: this.workingMemory.size
      },
      consolidationQueue: this.consolidationQueue.length,
      lastConsolidation: new Date(this.lastConsolidation).toISOString(),
      statistics: this.stats
    };
  }

  stop() {
    this.status = 'stopped';
    console.log(`🛑 ${this.name} stopped`);
  }

  async shutdown() {
    console.log(`👋 Shutting down ${this.name}`);
    
    // Save current state before shutdown
    await this.saveState();
    
    this.status = 'shutdown';
  }
}

module.exports = MemoryManager;