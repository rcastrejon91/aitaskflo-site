// Enhanced AI Agent: Active Knowledge Seeking & Continuous Learning System
// Main orchestrator that coordinates all learning and intelligence components

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// Core Components
const InformationDiscoveryEngine = require('./knowledge/discovery-engine');
const ContinuousLearner = require('./learning/continuous-learner');
const KnowledgeGraph = require('./knowledge/knowledge-graph');
const ProactiveIntelligence = require('./application/proactive-insights');

class EnhancedAIAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Discovery settings
      discoveryEnabled: true,
      discoveryInterval: 60000, // 1 minute
      
      // Learning settings
      learningEnabled: true,
      continuousLearning: true,
      confidenceThreshold: 0.7,
      
      // Intelligence settings
      proactiveIntelligenceEnabled: true,
      insightGenerationInterval: 300000, // 5 minutes
      
      // Performance settings
      maxKnowledgeNodes: 10000,
      maxInsightsPerSession: 50,
      persistenceEnabled: true,
      
      // Integration settings
      integrateWithExistingMemory: true,
      enhanceSecurityProtocols: true,
      
      ...config
    };
    
    // Initialize core components
    this.knowledgeGraph = new KnowledgeGraph({
      maxNodes: this.config.maxKnowledgeNodes,
      persistenceEnabled: this.config.persistenceEnabled
    });
    
    this.continuousLearner = new ContinuousLearner({
      confidenceThreshold: this.config.confidenceThreshold,
      knowledgeGraphEnabled: true
    });
    
    this.discoveryEngine = new InformationDiscoveryEngine({
      discoveryInterval: this.config.discoveryInterval
    });
    
    this.proactiveIntelligence = new ProactiveIntelligence(
      this.knowledgeGraph,
      this.continuousLearner,
      {
        updateInterval: this.config.insightGenerationInterval,
        maxInsightsPerSession: this.config.maxInsightsPerSession
      }
    );
    
    // Agent state
    this.isActive = false;
    this.currentSession = null;
    this.stats = {
      totalDiscoveries: 0,
      totalLearningItems: 0,
      totalInsights: 0,
      uptime: 0,
      lastActivity: null,
      performanceMetrics: {}
    };
    
    // Memory integration
    this.memoryManager = null;
    this.guardianProtocols = null;
    
    console.log('🤖 Enhanced AI Agent initialized');
    this.setupEventHandlers();
  }

  // Setup event handlers for component coordination
  setupEventHandlers() {
    // Discovery Engine Events
    this.discoveryEngine.on('discoveries-found', async (discoveries) => {
      console.log(`📡 Processing ${discoveries.length} new discoveries`);
      await this.processDiscoveries(discoveries);
    });
    
    this.discoveryEngine.on('discovery-started', () => {
      console.log('🔍 Information discovery activated');
      this.emit('discovery-activated');
    });
    
    // Learning Events
    this.continuousLearner.on('learning-completed', async (results) => {
      console.log(`🧠 Learning completed: ${results.integrated.length} items integrated`);
      
      // Add integrated knowledge to graph
      for (const item of results.integrated) {
        await this.knowledgeGraph.addKnowledge(item);
      }
      
      this.stats.totalLearningItems += results.integrated.length;
      this.emit('learning-progress', results);
    });
    
    // Knowledge Graph Events
    this.knowledgeGraph.on('node-added', (node) => {
      console.log(`🕸️ Knowledge node added: ${node.title.substring(0, 50)}...`);
      this.emit('knowledge-expanded', node);
    });
    
    this.knowledgeGraph.on('cluster-created', (cluster) => {
      console.log(`🎯 Knowledge cluster created: ${cluster.name}`);
      this.emit('knowledge-clustered', cluster);
    });
    
    // Proactive Intelligence Events
    this.proactiveIntelligence.on('insights-generated', (session) => {
      console.log(`🔮 Generated ${session.insights.length} new insights`);
      this.stats.totalInsights += session.insights.length;
      this.emit('insights-ready', session);
    });
    
    // Error handling
    this.setupErrorHandling();
  }

  // Setup error handling for all components
  setupErrorHandling() {
    const components = [
      this.discoveryEngine,
      this.continuousLearner,
      this.knowledgeGraph,
      this.proactiveIntelligence
    ];
    
    components.forEach(component => {
      component.on('error', (error) => {
        console.error(`❌ Component error:`, error);
        this.emit('component-error', { component: component.constructor.name, error });
      });
    });
  }

  // Start the Enhanced AI Agent
  async start() {
    if (this.isActive) {
      console.log('⚠️ Enhanced AI Agent already active');
      return;
    }

    console.log('🚀 Starting Enhanced AI Agent...');
    this.isActive = true;
    this.stats.uptime = Date.now();
    
    try {
      // Start core components in sequence
      if (this.config.discoveryEnabled) {
        await this.discoveryEngine.startDiscovery();
      }
      
      if (this.config.learningEnabled) {
        await this.continuousLearner.startLearningSession();
      }
      
      if (this.config.proactiveIntelligenceEnabled) {
        await this.proactiveIntelligence.startProactiveIntelligence();
      }
      
      // Start monitoring and maintenance
      this.startSystemMonitoring();
      
      console.log('✅ Enhanced AI Agent fully activated');
      this.emit('agent-activated');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start Enhanced AI Agent:', error);
      this.isActive = false;
      throw error;
    }
  }

  // Stop the Enhanced AI Agent
  async stop() {
    if (!this.isActive) return;

    console.log('🔄 Stopping Enhanced AI Agent...');
    this.isActive = false;
    
    try {
      // Stop components
      this.discoveryEngine.stopDiscovery();
      this.proactiveIntelligence.stopProactiveIntelligence();
      
      // Stop monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      // Save final state
      await this.saveAgentState();
      
      console.log('🔄 Enhanced AI Agent stopped');
      this.emit('agent-deactivated');
    } catch (error) {
      console.error('❌ Error stopping Enhanced AI Agent:', error);
    }
  }

  // Process new discoveries through the learning pipeline
  async processDiscoveries(discoveries) {
    try {
      // Filter and validate discoveries
      const validDiscoveries = discoveries.filter(d => 
        d && d.content && d.content.length > 20
      );
      
      if (validDiscoveries.length === 0) return;
      
      // Process through continuous learner
      const learningResults = await this.continuousLearner.processNewInformation(validDiscoveries);
      
      // Update statistics
      this.stats.totalDiscoveries += validDiscoveries.length;
      this.stats.lastActivity = new Date().toISOString();
      
      // Emit progress update
      this.emit('discoveries-processed', {
        total: validDiscoveries.length,
        integrated: learningResults.integrated.length,
        rejected: learningResults.rejected.length
      });
      
      return learningResults;
    } catch (error) {
      console.error('❌ Error processing discoveries:', error);
      throw error;
    }
  }

  // Get comprehensive agent status
  getStatus() {
    const now = Date.now();
    const uptimeMs = this.isActive ? now - this.stats.uptime : 0;
    
    return {
      isActive: this.isActive,
      uptime: uptimeMs,
      uptimeHours: Math.round(uptimeMs / (1000 * 60 * 60) * 100) / 100,
      
      // Component status
      components: {
        discoveryEngine: {
          active: this.discoveryEngine.isRunning,
          stats: this.discoveryEngine.getStats()
        },
        continuousLearner: {
          active: this.config.learningEnabled,
          stats: this.continuousLearner.getStats()
        },
        knowledgeGraph: {
          stats: this.knowledgeGraph.getStats()
        },
        proactiveIntelligence: {
          active: this.proactiveIntelligence.isRunning,
          metrics: this.proactiveIntelligence.getPerformanceMetrics()
        }
      },
      
      // Overall statistics
      stats: {
        ...this.stats,
        knowledgeNodes: this.knowledgeGraph.stats.totalNodes,
        knowledgeRelationships: this.knowledgeGraph.stats.totalRelationships,
        knowledgeClusters: this.knowledgeGraph.stats.totalClusters
      },
      
      // Performance metrics
      performance: this.getPerformanceMetrics(),
      
      // Recent activity
      recentActivity: this.getRecentActivity(),
      
      timestamp: new Date().toISOString()
    };
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        utilization: Math.round(memoryUsage.heapUsed / memoryUsage.heapTotal * 100)
      },
      
      processing: {
        discoveriesPerMinute: this.calculateDiscoveryRate(),
        learningEfficiency: this.calculateLearningEfficiency(),
        insightGenerationRate: this.calculateInsightRate()
      },
      
      quality: {
        averageKnowledgeConfidence: this.knowledgeGraph.stats.totalNodes > 0 
          ? this.continuousLearner.calculateAverageConfidence() 
          : 0,
        knowledgeConnectivity: this.knowledgeGraph.stats.averageConnectivity
      }
    };
  }

  // Calculate discovery rate
  calculateDiscoveryRate() {
    const discoveryStats = this.discoveryEngine.getStats();
    const uptimeMinutes = this.isActive 
      ? (Date.now() - this.stats.uptime) / (1000 * 60) 
      : 1;
    
    return Math.round(discoveryStats.totalDiscoveries / uptimeMinutes * 100) / 100;
  }

  // Calculate learning efficiency
  calculateLearningEfficiency() {
    const learningStats = this.continuousLearner.getStats();
    
    if (!learningStats.learningSession || learningStats.learningSession.processed === 0) {
      return 0;
    }
    
    return Math.round(
      (learningStats.learningSession.integrated / learningStats.learningSession.processed) * 100
    );
  }

  // Calculate insight generation rate
  calculateInsightRate() {
    const uptimeHours = this.isActive 
      ? (Date.now() - this.stats.uptime) / (1000 * 60 * 60) 
      : 1;
    
    return Math.round(this.stats.totalInsights / uptimeHours * 100) / 100;
  }

  // Get recent activity summary
  getRecentActivity() {
    return {
      lastDiscovery: this.discoveryEngine.stats.lastDiscoveryTime,
      lastLearning: this.stats.lastActivity,
      recentInsights: this.proactiveIntelligence.getCurrentInsights('', 5),
      recentKnowledge: this.knowledgeGraph.query({ limit: 5 })
        .map(node => ({
          title: node.title,
          confidence: node.confidence,
          createdAt: node.createdAt
        }))
    };
  }

  // Query the agent's knowledge
  queryKnowledge(query, options = {}) {
    const {
      limit = 20,
      minConfidence = 0.5,
      includeInsights = false,
      includeRelationships = false
    } = options;
    
    // Search knowledge graph
    const knowledgeResults = this.knowledgeGraph.searchKnowledge(query, limit)
      .filter(item => item.confidence >= minConfidence);
    
    // Search continuous learner knowledge base
    const learnerResults = this.continuousLearner.searchKnowledge(query, limit)
      .filter(item => item.confidence >= minConfidence);
    
    // Combine and deduplicate results
    const allResults = [...knowledgeResults, ...learnerResults];
    const uniqueResults = allResults.filter((item, index, arr) => 
      arr.findIndex(other => other.id === item.id) === index
    );
    
    // Sort by relevance and confidence
    const sortedResults = uniqueResults
      .sort((a, b) => (b.searchRelevance || b.confidence) - (a.searchRelevance || a.confidence))
      .slice(0, limit);
    
    const response = {
      query,
      results: sortedResults,
      totalFound: sortedResults.length,
      timestamp: new Date().toISOString()
    };
    
    // Include insights if requested
    if (includeInsights) {
      response.relatedInsights = this.proactiveIntelligence.getCurrentInsights()
        .filter(insight => 
          insight.content.toLowerCase().includes(query.toLowerCase()) ||
          insight.title.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
    }
    
    return response;
  }

  // Get insights and recommendations
  getInsights(category = null, limit = 20) {
    const insights = this.proactiveIntelligence.getCurrentInsights(category, limit);
    const trends = this.proactiveIntelligence.insights.trends.slice(0, 10);
    const predictions = this.proactiveIntelligence.insights.predictions.slice(0, 10);
    const recommendations = this.proactiveIntelligence.insights.recommendations.slice(0, 10);
    
    return {
      insights,
      trends,
      predictions,
      recommendations,
      summary: {
        totalInsights: insights.length,
        highPriorityCount: insights.filter(i => i.priority === 'high').length,
        actionableCount: insights.filter(i => i.actionable).length
      },
      timestamp: new Date().toISOString()
    };
  }

  // Apply insights to improve decision making
  async applyInsights(context = {}) {
    const insights = this.getInsights();
    const applications = [];
    
    // Apply high-priority insights
    for (const insight of insights.insights.filter(i => i.priority === 'high')) {
      const application = await this.applyInsight(insight, context);
      if (application) {
        applications.push(application);
      }
    }
    
    // Apply relevant recommendations
    for (const recommendation of insights.recommendations.slice(0, 5)) {
      const application = await this.applyRecommendation(recommendation, context);
      if (application) {
        applications.push(application);
      }
    }
    
    return {
      applicationsAttempted: applications.length,
      applications,
      timestamp: new Date().toISOString()
    };
  }

  // Apply a specific insight
  async applyInsight(insight, context) {
    try {
      const application = {
        insightId: insight.title,
        type: insight.type,
        actions: [],
        results: []
      };
      
      // Process actionable insights
      if (insight.actionable && insight.actions) {
        for (const action of insight.actions) {
          const result = await this.executeAction(action, insight, context);
          application.actions.push(action);
          application.results.push(result);
        }
      }
      
      return application;
    } catch (error) {
      console.error(`❌ Failed to apply insight: ${insight.title}`, error);
      return null;
    }
  }

  // Apply a specific recommendation
  async applyRecommendation(recommendation, context) {
    try {
      const application = {
        recommendationId: recommendation.title,
        type: recommendation.type,
        actions: [],
        results: []
      };
      
      if (recommendation.actions) {
        for (const action of recommendation.actions) {
          const result = await this.executeAction(action, recommendation, context);
          application.actions.push(action);
          application.results.push(result);
        }
      }
      
      return application;
    } catch (error) {
      console.error(`❌ Failed to apply recommendation: ${recommendation.title}`, error);
      return null;
    }
  }

  // Execute a specific action
  async executeAction(action, source, context) {
    try {
      // Parse action type and parameters
      const actionType = this.parseActionType(action);
      
      switch (actionType) {
        case 'adjust_threshold':
          return await this.adjustSystemThreshold(action, source);
          
        case 'increase_monitoring':
          return await this.adjustMonitoring(action, source);
          
        case 'review_content':
          return await this.scheduleContentReview(action, source);
          
        case 'optimize_process':
          return await this.optimizeProcess(action, source);
          
        default:
          return {
            action,
            status: 'not_implemented',
            message: `Action type ${actionType} not yet implemented`
          };
      }
    } catch (error) {
      return {
        action,
        status: 'error',
        error: error.message
      };
    }
  }

  // Parse action type from action string
  parseActionType(action) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('threshold')) return 'adjust_threshold';
    if (actionLower.includes('monitoring') || actionLower.includes('monitor')) return 'increase_monitoring';
    if (actionLower.includes('review')) return 'review_content';
    if (actionLower.includes('optimize')) return 'optimize_process';
    
    return 'generic';
  }

  // Adjust system thresholds based on insights
  async adjustSystemThreshold(action, source) {
    // Example implementation for threshold adjustments
    if (source.metadata && source.metadata.recommendedThreshold) {
      const newThreshold = source.metadata.recommendedThreshold;
      
      if (source.type === 'learning_efficiency') {
        this.continuousLearner.config.confidenceThreshold = newThreshold;
        return {
          action,
          status: 'applied',
          change: `Confidence threshold adjusted to ${newThreshold}`
        };
      }
    }
    
    return {
      action,
      status: 'no_change',
      message: 'No applicable threshold found'
    };
  }

  // Adjust monitoring based on insights
  async adjustMonitoring(action, source) {
    if (source.metadata && source.metadata.source) {
      const sourceName = source.metadata.source;
      // This would adjust discovery engine monitoring
      return {
        action,
        status: 'scheduled',
        change: `Increased monitoring for ${sourceName}`
      };
    }
    
    return {
      action,
      status: 'no_change',
      message: 'No source specified for monitoring adjustment'
    };
  }

  // Schedule content review
  async scheduleContentReview(action, source) {
    return {
      action,
      status: 'scheduled',
      message: 'Content review scheduled for manual processing'
    };
  }

  // Optimize processes
  async optimizeProcess(action, source) {
    return {
      action,
      status: 'analyzed',
      message: 'Process optimization recommendations noted'
    };
  }

  // Start system monitoring
  startSystemMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.performSystemCheck();
    }, 60000); // Every minute
  }

  // Perform system health check
  performSystemCheck() {
    const status = this.getStatus();
    
    // Check memory usage
    if (status.performance.memory.utilization > 90) {
      console.warn('⚠️ High memory usage detected');
      this.emit('system-warning', {
        type: 'high_memory_usage',
        value: status.performance.memory.utilization
      });
    }
    
    // Check component health
    if (!status.components.discoveryEngine.active && this.config.discoveryEnabled) {
      console.warn('⚠️ Discovery engine inactive');
      this.emit('component-warning', {
        type: 'discovery_engine_inactive'
      });
    }
    
    // Update performance metrics
    this.stats.performanceMetrics = status.performance;
  }

  // Save agent state
  async saveAgentState() {
    try {
      const dataDir = './data/agent';
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      
      const agentState = {
        config: this.config,
        stats: this.stats,
        status: this.getStatus(),
        timestamp: new Date().toISOString()
      };
      
      const filename = path.join(dataDir, 'enhanced-ai-agent-state.json');
      fs.writeFileSync(filename, JSON.stringify(agentState, null, 2));
      
      console.log('💾 Enhanced AI Agent state saved');
    } catch (error) {
      console.error('Failed to save agent state:', error.message);
    }
  }

  // Integration with existing memory manager
  integrateWithMemoryManager(memoryManager) {
    this.memoryManager = memoryManager;
    
    // Enhance memory manager with knowledge
    if (memoryManager && typeof memoryManager.log === 'function') {
      const originalLog = memoryManager.log.bind(memoryManager);
      
      memoryManager.log = async (sessionId, source, data) => {
        // Original logging
        const result = await originalLog(sessionId, source, data);
        
        // Extract knowledge from logged data
        if (data && typeof data === 'string' && data.length > 50) {
          const knowledgeItem = {
            title: `Memory Log: ${source}`,
            content: data,
            type: 'memory_log',
            sources: [source],
            tags: ['memory', 'interaction'],
            confidence: 0.6,
            sessionId: sessionId,
            createdAt: new Date().toISOString()
          };
          
          // Process through learning system
          await this.processDiscoveries([knowledgeItem]);
        }
        
        return result;
      };
      
      console.log('🔗 Integrated with Memory Manager');
    }
  }

  // Integration with security guardian protocols
  integrateWithGuardianProtocols(guardianProtocols) {
    this.guardianProtocols = guardianProtocols;
    
    // Enhance security validation for learned information
    if (guardianProtocols) {
      const originalAnalyzeRequest = guardianProtocols.analyzeRequest.bind(guardianProtocols);
      
      guardianProtocols.analyzeRequest = (req, res, next) => {
        // Original security analysis
        const result = originalAnalyzeRequest(req, res, next);
        
        // Learn from security patterns
        if (guardianProtocols.threats.size > 0) {
          this.learnFromSecurityEvents(guardianProtocols.threats);
        }
        
        return result;
      };
      
      console.log('🛡️ Integrated with Security Guardian Protocols');
    }
  }

  // Learn from security events
  async learnFromSecurityEvents(threats) {
    const securityKnowledge = [];
    
    threats.forEach((threat, ip) => {
      securityKnowledge.push({
        title: `Security Threat Pattern: ${threat.patterns.join(', ')}`,
        content: `Detected threat from ${ip} with patterns: ${threat.patterns.join(', ')}`,
        type: 'security_intelligence',
        sources: ['SecurityGuardian'],
        tags: ['security', 'threat', 'pattern'],
        confidence: threat.score / 100,
        metadata: {
          ip: ip,
          patterns: threat.patterns,
          score: threat.score,
          timestamp: threat.timestamp
        },
        createdAt: new Date().toISOString()
      });
    });
    
    if (securityKnowledge.length > 0) {
      await this.processDiscoveries(securityKnowledge);
    }
  }

  // Get comprehensive agent report
  generateReport() {
    const status = this.getStatus();
    const insights = this.getInsights();
    
    return {
      executiveSummary: {
        agentActive: this.isActive,
        uptimeHours: status.uptimeHours,
        knowledgeNodes: status.stats.knowledgeNodes,
        totalInsights: insights.summary.totalInsights,
        highPriorityInsights: insights.summary.highPriorityCount
      },
      
      performance: status.performance,
      
      knowledgeOverview: {
        totalFacts: status.stats.knowledgeNodes,
        totalRelationships: status.stats.knowledgeRelationships,
        totalClusters: status.stats.knowledgeClusters,
        averageConfidence: status.performance.quality.averageKnowledgeConfidence,
        connectivity: status.performance.quality.knowledgeConnectivity
      },
      
      learningProgress: {
        totalDiscoveries: status.stats.totalDiscoveries,
        totalLearningItems: status.stats.totalLearningItems,
        learningEfficiency: status.performance.processing.learningEfficiency,
        discoveryRate: status.performance.processing.discoveriesPerMinute
      },
      
      intelligenceInsights: {
        currentInsights: insights.insights.length,
        trends: insights.trends.length,
        predictions: insights.predictions.length,
        recommendations: insights.recommendations.length,
        topInsights: insights.insights.slice(0, 5)
      },
      
      systemHealth: {
        memoryUsage: status.performance.memory,
        componentStatus: Object.keys(status.components).map(name => ({
          name,
          active: status.components[name].active !== false
        }))
      },
      
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = EnhancedAIAgent;