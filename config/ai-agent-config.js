// Enhanced AI Agent Configuration
// Configuration settings for all AI agent components

module.exports = {
  // Main Agent Settings
  agent: {
    discoveryEnabled: process.env.AI_DISCOVERY_ENABLED !== 'false',
    learningEnabled: process.env.AI_LEARNING_ENABLED !== 'false',
    proactiveIntelligenceEnabled: process.env.AI_PROACTIVE_ENABLED !== 'false',
    persistenceEnabled: process.env.AI_PERSISTENCE_ENABLED !== 'false',
    integrateWithExistingMemory: true,
    enhanceSecurityProtocols: true
  },

  // Information Discovery Engine
  discovery: {
    discoveryInterval: parseInt(process.env.AI_DISCOVERY_INTERVAL) || 60000, // 1 minute
    maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT) || 5,
    relationshipThreshold: parseFloat(process.env.AI_RELATIONSHIP_THRESHOLD) || 0.5,
    webScrapingEnabled: process.env.AI_WEB_SCRAPING_ENABLED !== 'false',
    apiMonitoringEnabled: process.env.AI_API_MONITORING_ENABLED !== 'false',
    newsAnalysisEnabled: process.env.AI_NEWS_ANALYSIS_ENABLED !== 'false',
    socialMediaEnabled: process.env.AI_SOCIAL_MEDIA_ENABLED === 'true',
    researchTrackingEnabled: process.env.AI_RESEARCH_TRACKING_ENABLED !== 'false'
  },

  // Continuous Learning System
  learning: {
    processingBatchSize: parseInt(process.env.AI_PROCESSING_BATCH_SIZE) || 10,
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.7,
    biasDetectionEnabled: process.env.AI_BIAS_DETECTION_ENABLED !== 'false',
    crossValidationEnabled: process.env.AI_CROSS_VALIDATION_ENABLED !== 'false',
    patternExtractionEnabled: process.env.AI_PATTERN_EXTRACTION_ENABLED !== 'false',
    knowledgeGraphEnabled: process.env.AI_KNOWLEDGE_GRAPH_ENABLED !== 'false',
    learningRate: parseFloat(process.env.AI_LEARNING_RATE) || 0.1
  },

  // Knowledge Graph
  knowledgeGraph: {
    maxNodes: parseInt(process.env.AI_MAX_KNOWLEDGE_NODES) || 10000,
    maxRelationships: parseInt(process.env.AI_MAX_RELATIONSHIPS) || 50000,
    relationshipThreshold: parseFloat(process.env.AI_RELATIONSHIP_THRESHOLD) || 0.5,
    semanticAnalysisEnabled: process.env.AI_SEMANTIC_ANALYSIS_ENABLED !== 'false',
    autoClusteringEnabled: process.env.AI_AUTO_CLUSTERING_ENABLED !== 'false',
    persistenceEnabled: process.env.AI_GRAPH_PERSISTENCE_ENABLED !== 'false'
  },

  // Proactive Intelligence
  proactiveIntelligence: {
    insightGenerationEnabled: process.env.AI_INSIGHT_GENERATION_ENABLED !== 'false',
    predictionEnabled: process.env.AI_PREDICTION_ENABLED !== 'false',
    recommendationEnabled: process.env.AI_RECOMMENDATION_ENABLED !== 'false',
    trendAnalysisEnabled: process.env.AI_TREND_ANALYSIS_ENABLED !== 'false',
    anomalyDetectionEnabled: process.env.AI_ANOMALY_DETECTION_ENABLED !== 'false',
    insightThreshold: parseFloat(process.env.AI_INSIGHT_THRESHOLD) || 0.7,
    updateInterval: parseInt(process.env.AI_INSIGHT_UPDATE_INTERVAL) || 300000, // 5 minutes
    maxInsightsPerSession: parseInt(process.env.AI_MAX_INSIGHTS_PER_SESSION) || 50
  },

  // Data Sources Configuration
  sources: {
    // Default information sources - can be overridden
    default: [
      {
        type: 'news',
        name: 'TechCrunch RSS',
        url: 'https://techcrunch.com/feed/',
        method: 'rss',
        priority: 'high',
        tags: ['technology', 'startups', 'ai'],
        reliability: 0.85
      },
      {
        type: 'news',
        name: 'Hacker News',
        url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        method: 'api',
        priority: 'high',
        tags: ['technology', 'programming', 'startups'],
        reliability: 0.80
      },
      {
        type: 'research',
        name: 'ArXiv AI Papers',
        url: 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10',
        method: 'xml',
        priority: 'high',
        tags: ['ai', 'research', 'machine-learning'],
        reliability: 0.95
      },
      {
        type: 'web',
        name: 'OpenAI Blog',
        url: 'https://openai.com/blog',
        method: 'scrape',
        priority: 'high',
        tags: ['ai', 'research', 'technology'],
        reliability: 0.90
      },
      {
        type: 'api',
        name: 'GitHub Trending',
        url: 'https://api.github.com/search/repositories?q=language:javascript&sort=stars&order=desc',
        method: 'api',
        priority: 'medium',
        tags: ['programming', 'open-source', 'trends'],
        reliability: 0.75
      }
    ],

    // Source reliability thresholds
    reliability: {
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      minimum: 0.3
    }
  },

  // Performance Settings
  performance: {
    memoryWarningThreshold: 0.8,
    memoryCriticalThreshold: 0.9,
    cpuWarningThreshold: 0.7,
    cpuCriticalThreshold: 0.9,
    diskWarningThreshold: 0.8,
    diskCriticalThreshold: 0.95,
    
    // Cleanup settings
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    maxLogAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxDiscoveryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxInsightAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  },

  // Security Settings
  security: {
    validateSources: process.env.AI_VALIDATE_SOURCES !== 'false',
    sanitizeContent: process.env.AI_SANITIZE_CONTENT !== 'false',
    biasDetection: process.env.AI_BIAS_DETECTION_ENABLED !== 'false',
    contentFiltering: process.env.AI_CONTENT_FILTERING_ENABLED !== 'false',
    
    // Blocked patterns and sources
    blockedPatterns: [
      'malware',
      'phishing',
      'spam',
      'explicit'
    ],
    
    blockedSources: [],
    
    // Content validation
    maxContentLength: parseInt(process.env.AI_MAX_CONTENT_LENGTH) || 10000,
    minContentLength: parseInt(process.env.AI_MIN_CONTENT_LENGTH) || 20,
    allowedContentTypes: [
      'text/html',
      'text/plain',
      'application/json',
      'application/xml',
      'application/rss+xml'
    ]
  },

  // Storage Settings
  storage: {
    dataDirectory: process.env.AI_DATA_DIRECTORY || './data',
    backupEnabled: process.env.AI_BACKUP_ENABLED !== 'false',
    backupInterval: parseInt(process.env.AI_BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
    compressionEnabled: process.env.AI_COMPRESSION_ENABLED !== 'false',
    encryptionEnabled: process.env.AI_ENCRYPTION_ENABLED === 'true'
  },

  // Logging Settings
  logging: {
    level: process.env.AI_LOG_LEVEL || 'info',
    enableConsole: process.env.AI_CONSOLE_LOG_ENABLED !== 'false',
    enableFile: process.env.AI_FILE_LOG_ENABLED === 'true',
    logDirectory: process.env.AI_LOG_DIRECTORY || './logs',
    maxLogSize: parseInt(process.env.AI_MAX_LOG_SIZE) || 10 * 1024 * 1024, // 10MB
    maxLogFiles: parseInt(process.env.AI_MAX_LOG_FILES) || 5
  },

  // API Settings
  api: {
    rateLimitEnabled: process.env.AI_API_RATE_LIMIT_ENABLED !== 'false',
    maxRequestsPerMinute: parseInt(process.env.AI_API_MAX_REQUESTS_PER_MINUTE) || 60,
    authenticationRequired: process.env.AI_API_AUTH_REQUIRED === 'true',
    corsEnabled: process.env.AI_API_CORS_ENABLED !== 'false',
    
    // External API keys and settings
    weatherApiKey: process.env.WEATHER_API_KEY,
    newsApiKey: process.env.NEWS_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
    
    // Request timeouts
    requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 10000,
    longRequestTimeout: parseInt(process.env.AI_LONG_REQUEST_TIMEOUT) || 30000
  },

  // Development and Debug Settings
  development: {
    debugMode: process.env.NODE_ENV === 'development',
    verboseLogging: process.env.AI_VERBOSE_LOGGING === 'true',
    mockExternalApis: process.env.AI_MOCK_EXTERNAL_APIS === 'true',
    skipRealTimeOperations: process.env.AI_SKIP_REALTIME === 'true',
    testDataEnabled: process.env.AI_TEST_DATA_ENABLED === 'true'
  },

  // Integration Settings
  integration: {
    database: {
      enabled: process.env.AI_DATABASE_ENABLED === 'true',
      type: process.env.AI_DATABASE_TYPE || 'json', // json, mysql, postgres, mongodb
      host: process.env.AI_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.AI_DATABASE_PORT) || 3306,
      database: process.env.AI_DATABASE_NAME || 'aitaskflo_knowledge',
      username: process.env.AI_DATABASE_USER,
      password: process.env.AI_DATABASE_PASSWORD
    },
    
    redis: {
      enabled: process.env.AI_REDIS_ENABLED === 'true',
      host: process.env.AI_REDIS_HOST || 'localhost',
      port: parseInt(process.env.AI_REDIS_PORT) || 6379,
      password: process.env.AI_REDIS_PASSWORD
    },
    
    webhooks: {
      enabled: process.env.AI_WEBHOOKS_ENABLED === 'true',
      endpoints: (process.env.AI_WEBHOOK_ENDPOINTS || '').split(',').filter(Boolean)
    }
  }
};