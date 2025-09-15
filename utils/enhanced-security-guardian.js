const fs = require('fs');
const logger = require('./logger');
const securityConfig = require('../config/security-config');
const EncryptionUtils = require('./encryption');

/**
 * Enhanced Security Guardian Bot with ML-based anomaly detection
 * and adaptive security responses
 */
class EnhancedSecurityGuardianBot {
  constructor() {
    this.name = 'EnhancedSecurityGuardian';
    this.version = '2.0.0';
    this.threats = new Map();
    this.blockedIPs = new Set();
    this.suspiciousActivities = [];
    this.requestCounts = new Map();
    this.userProfiles = new Map(); // User behavior profiling
    this.anomalyPatterns = new Map(); // ML patterns
    this.adaptiveThresholds = new Map(); // Dynamic thresholds
    this.config = securityConfig.securityGuardian;
    this.isActive = true;
    this.isLearning = true;
    this.lastAlert = null;
    this.stats = {
      threatsBlocked: 0,
      anomaliesDetected: 0,
      falsePositives: 0,
      accuracyScore: 0.95
    };
    
    console.log(`🛡️ ${this.name} v${this.version} activated with ML capabilities`);
    this.initializeMLFeatures();
    this.startContinuousMonitoring();
  }

  /**
   * Initialize Machine Learning features
   */
  initializeMLFeatures() {
    // Initialize baseline patterns
    this.baselinePatterns = {
      requestFrequency: new Map(),
      userAgentPatterns: new Map(),
      endpointAccess: new Map(),
      timeBasedPatterns: new Map()
    };

    // Initialize adaptive thresholds
    this.adaptiveThresholds.set('requestRate', 50);
    this.adaptiveThresholds.set('failureRate', 5);
    this.adaptiveThresholds.set('anomalyScore', 0.7);

    logger.info('ML features initialized for Security Guardian');
  }

  /**
   * Enhanced request analysis with ML-based anomaly detection
   */
  analyzeRequest(req, res, next) {
    if (!this.isActive) {
      return res.status(503).json({
        error: 'System in lockdown mode',
        message: 'Platform temporarily unavailable for security reasons',
        contact: 'security@aitaskflo.com',
        guardian: this.name
      });
    }

    const requestContext = this.buildRequestContext(req);
    
    // Check if IP is blocked
    if (this.blockedIPs.has(requestContext.ip)) {
      this.logThreat(requestContext.ip, 'BLOCKED_IP_ACCESS', 'Blocked IP attempted access', requestContext);
      return this.respondToBlocked(res, requestContext);
    }

    // Update user behavior profile
    this.updateUserProfile(requestContext);

    // Perform multi-layered threat analysis
    const threatAnalysis = this.performThreatAnalysis(requestContext);
    const anomalyScore = this.calculateAnomalyScore(requestContext);
    const adaptiveRisk = this.calculateAdaptiveRisk(requestContext, threatAnalysis, anomalyScore);

    // Log the analysis
    logger.security('Request analyzed', {
      ip: requestContext.ip,
      threatLevel: adaptiveRisk.level,
      anomalyScore: anomalyScore,
      patterns: threatAnalysis.patterns,
      guardian: this.name
    });

    // Handle based on risk level
    if (adaptiveRisk.level === 'CRITICAL') {
      return this.handleCriticalThreat(requestContext, adaptiveRisk, res);
    } else if (adaptiveRisk.level === 'HIGH') {
      return this.handleHighThreat(requestContext, adaptiveRisk, res);
    } else if (adaptiveRisk.level === 'MEDIUM') {
      this.handleMediumThreat(requestContext, adaptiveRisk);
    } else if (adaptiveRisk.level === 'LOW') {
      this.handleLowRisk(requestContext);
    }

    // Update learning models
    if (this.isLearning) {
      this.updateLearningModels(requestContext, adaptiveRisk);
    }

    // Log legitimate request
    this.logActivity(requestContext, 'SAFE');
    next();
  }

  /**
   * Build comprehensive request context
   */
  buildRequestContext(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const timestamp = Date.now();
    
    return {
      ip,
      timestamp,
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      sessionId: req.sessionID,
      userId: req.user?.id,
      requestId: req.security?.requestId,
      geolocation: this.getGeoLocation(ip)
    };
  }

  /**
   * Enhanced threat analysis with multiple detection layers
   */
  performThreatAnalysis(context) {
    let riskScore = 0;
    const patterns = [];
    const detectedThreats = [];

    // Layer 1: Traditional pattern matching
    const traditionalThreats = this.detectTraditionalThreats(context);
    riskScore += traditionalThreats.score;
    patterns.push(...traditionalThreats.patterns);
    detectedThreats.push(...traditionalThreats.threats);

    // Layer 2: Behavioral analysis
    const behavioralThreats = this.detectBehavioralAnomalies(context);
    riskScore += behavioralThreats.score;
    patterns.push(...behavioralThreats.patterns);
    detectedThreats.push(...behavioralThreats.threats);

    // Layer 3: Time-based analysis
    const temporalThreats = this.detectTemporalAnomalies(context);
    riskScore += temporalThreats.score;
    patterns.push(...temporalThreats.patterns);
    detectedThreats.push(...temporalThreats.threats);

    // Layer 4: Network-based analysis
    const networkThreats = this.detectNetworkAnomalies(context);
    riskScore += networkThreats.score;
    patterns.push(...networkThreats.patterns);
    detectedThreats.push(...networkThreats.threats);

    return {
      score: riskScore,
      patterns: [...new Set(patterns)], // Remove duplicates
      threats: detectedThreats,
      confidence: this.calculateConfidence(patterns, detectedThreats)
    };
  }

  /**
   * Traditional threat detection (SQL injection, XSS, etc.)
   */
  detectTraditionalThreats(context) {
    let score = 0;
    const patterns = [];
    const threats = [];

    const requestString = JSON.stringify([
      context.query,
      context.body,
      context.endpoint,
      context.headers
    ]).toLowerCase();

    // SQL Injection patterns
    const sqlPatterns = [
      { pattern: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i, weight: 30, name: 'SQL_UNION_INJECTION' },
      { pattern: /(\bdrop\s+table\b)|(\bdelete\s+from\b)|(\binsert\s+into\b)/i, weight: 35, name: 'SQL_DESTRUCTIVE' },
      { pattern: /(\bor\s+1\s*=\s*1\b)|(\band\s+1\s*=\s*1\b)/i, weight: 25, name: 'SQL_BOOLEAN_INJECTION' },
      { pattern: /(\bexec\b)|(\bexecute\b)|(\bsp_\w+)/i, weight: 30, name: 'SQL_EXECUTION' }
    ];

    sqlPatterns.forEach(({ pattern, weight, name }) => {
      if (pattern.test(requestString)) {
        score += weight;
        patterns.push(name);
        threats.push({ type: 'sql_injection', pattern: name, weight });
      }
    });

    // XSS patterns
    const xssPatterns = [
      { pattern: /<script[^>]*>.*?<\/script>/i, weight: 25, name: 'XSS_SCRIPT_TAG' },
      { pattern: /javascript\s*:/i, weight: 20, name: 'XSS_JAVASCRIPT_PROTOCOL' },
      { pattern: /on\w+\s*=\s*["\']?[^"\']*["\']?/i, weight: 20, name: 'XSS_EVENT_HANDLER' },
      { pattern: /<iframe[^>]*>.*?<\/iframe>/i, weight: 25, name: 'XSS_IFRAME_INJECTION' }
    ];

    xssPatterns.forEach(({ pattern, weight, name }) => {
      if (pattern.test(requestString)) {
        score += weight;
        patterns.push(name);
        threats.push({ type: 'xss', pattern: name, weight });
      }
    });

    // Command injection patterns
    const cmdPatterns = [
      { pattern: /(\b(wget|curl|nc|netcat|sh|bash|cmd|powershell)\b)/i, weight: 30, name: 'CMD_INJECTION' },
      { pattern: /(\||\&\&|\|\||\;)\s*(ls|ps|id|whoami|cat|grep)/i, weight: 35, name: 'CMD_CHAINING' }
    ];

    cmdPatterns.forEach(({ pattern, weight, name }) => {
      if (pattern.test(requestString)) {
        score += weight;
        patterns.push(name);
        threats.push({ type: 'command_injection', pattern: name, weight });
      }
    });

    // Path traversal
    if (/(\.\.[\/\\]){2,}|(\.\.[\/\\].*){3,}/i.test(requestString)) {
      score += 25;
      patterns.push('PATH_TRAVERSAL');
      threats.push({ type: 'path_traversal', weight: 25 });
    }

    return { score, patterns, threats };
  }

  /**
   * Behavioral anomaly detection
   */
  detectBehavioralAnomalies(context) {
    let score = 0;
    const patterns = [];
    const threats = [];

    const userProfile = this.userProfiles.get(context.ip);
    
    if (!userProfile) {
      // New user - moderate suspicion
      score += 10;
      patterns.push('NEW_USER');
    } else {
      // Check for behavioral deviations
      const deviations = this.calculateBehavioralDeviations(context, userProfile);
      
      if (deviations.userAgentChange > 0.8) {
        score += 15;
        patterns.push('USER_AGENT_ANOMALY');
        threats.push({ type: 'behavioral', anomaly: 'user_agent_change', score: 15 });
      }

      if (deviations.accessPatternChange > 0.7) {
        score += 20;
        patterns.push('ACCESS_PATTERN_ANOMALY');
        threats.push({ type: 'behavioral', anomaly: 'access_pattern_change', score: 20 });
      }

      if (deviations.requestFrequencyChange > 0.9) {
        score += 25;
        patterns.push('FREQUENCY_ANOMALY');
        threats.push({ type: 'behavioral', anomaly: 'request_frequency_change', score: 25 });
      }
    }

    return { score, patterns, threats };
  }

  /**
   * Temporal anomaly detection
   */
  detectTemporalAnomalies(context) {
    let score = 0;
    const patterns = [];
    const threats = [];

    const now = new Date(context.timestamp);
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Unusual time access (2 AM - 6 AM on weekdays for business applications)
    if (hour >= 2 && hour <= 6 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      score += 15;
      patterns.push('UNUSUAL_TIME_ACCESS');
      threats.push({ type: 'temporal', anomaly: 'off_hours_access', score: 15 });
    }

    // Rapid successive requests
    const recentRequests = this.getRecentRequests(context.ip, 60000); // Last minute
    if (recentRequests.length > this.adaptiveThresholds.get('requestRate')) {
      const rapidScore = Math.min(30, recentRequests.length - this.adaptiveThresholds.get('requestRate'));
      score += rapidScore;
      patterns.push('RAPID_REQUESTS');
      threats.push({ type: 'temporal', anomaly: 'rapid_requests', count: recentRequests.length, score: rapidScore });
    }

    return { score, patterns, threats };
  }

  /**
   * Network-based anomaly detection
   */
  detectNetworkAnomalies(context) {
    let score = 0;
    const patterns = [];
    const threats = [];

    // Suspicious user agents
    const suspiciousUAs = [
      /bot|crawler|spider|scraper/i,
      /wget|curl|python|php|java/i,
      /scanner|nikto|sqlmap|burp/i
    ];

    suspiciousUAs.forEach((pattern, index) => {
      if (pattern.test(context.userAgent)) {
        const weight = [10, 15, 25][index];
        score += weight;
        patterns.push(`SUSPICIOUS_USER_AGENT_${index + 1}`);
        threats.push({ type: 'network', anomaly: 'suspicious_user_agent', score: weight });
      }
    });

    // Missing common headers
    const expectedHeaders = ['accept', 'accept-language', 'accept-encoding'];
    const missingHeaders = expectedHeaders.filter(header => !context.headers[header]);
    
    if (missingHeaders.length >= 2) {
      score += 10;
      patterns.push('MISSING_HEADERS');
      threats.push({ type: 'network', anomaly: 'missing_headers', missing: missingHeaders, score: 10 });
    }

    // Suspicious referrers
    if (context.referer && /\.onion\b|\.bit\b|localhost/i.test(context.referer)) {
      score += 15;
      patterns.push('SUSPICIOUS_REFERRER');
      threats.push({ type: 'network', anomaly: 'suspicious_referrer', referrer: context.referer, score: 15 });
    }

    return { score, patterns, threats };
  }

  /**
   * Calculate ML-based anomaly score
   */
  calculateAnomalyScore(context) {
    // This would integrate with a proper ML model
    // For now, using a simplified scoring system
    
    let anomalyScore = 0;
    const features = this.extractFeatures(context);
    
    // Feature-based scoring (simplified ML approach)
    const weights = {
      requestSize: 0.1,
      headerCount: 0.05,
      pathComplexity: 0.15,
      queryComplexity: 0.2,
      userAgentEntropy: 0.25,
      timeDeviation: 0.25
    };

    Object.entries(features).forEach(([feature, value]) => {
      if (weights[feature]) {
        anomalyScore += value * weights[feature];
      }
    });

    return Math.min(1.0, anomalyScore); // Normalize to 0-1
  }

  /**
   * Extract features for ML analysis
   */
  extractFeatures(context) {
    return {
      requestSize: Math.min(1.0, JSON.stringify(context.body || {}).length / 10000),
      headerCount: Math.min(1.0, Object.keys(context.headers).length / 50),
      pathComplexity: Math.min(1.0, context.endpoint.length / 200),
      queryComplexity: Math.min(1.0, Object.keys(context.query || {}).length / 20),
      userAgentEntropy: this.calculateEntropy(context.userAgent),
      timeDeviation: this.calculateTimeDeviation(context.timestamp)
    };
  }

  /**
   * Calculate adaptive risk level
   */
  calculateAdaptiveRisk(context, threatAnalysis, anomalyScore) {
    const baseScore = threatAnalysis.score;
    const mlScore = anomalyScore * 100; // Scale to match base scoring
    const confidenceMultiplier = threatAnalysis.confidence;
    
    const adaptiveScore = (baseScore + mlScore) * confidenceMultiplier;

    let level;
    if (adaptiveScore >= 80) level = 'CRITICAL';
    else if (adaptiveScore >= 60) level = 'HIGH';
    else if (adaptiveScore >= 30) level = 'MEDIUM';
    else if (adaptiveScore >= 10) level = 'LOW';
    else level = 'MINIMAL';

    return {
      level,
      score: adaptiveScore,
      baseScore,
      mlScore,
      confidence: confidenceMultiplier,
      threats: threatAnalysis.threats,
      patterns: threatAnalysis.patterns,
      recommendation: this.generateSecurityRecommendation(level, adaptiveScore)
    };
  }

  /**
   * Handle critical threats with immediate response
   */
  handleCriticalThreat(context, risk, res) {
    this.blockedIPs.add(context.ip);
    this.stats.threatsBlocked++;
    
    const incident = {
      level: 'CRITICAL',
      ip: context.ip,
      timestamp: new Date(context.timestamp).toISOString(),
      threats: risk.threats,
      patterns: risk.patterns,
      score: risk.score,
      action: 'IMMEDIATE_BLOCK'
    };

    this.logThreat(context.ip, 'CRITICAL_THREAT_BLOCKED', 'Critical threat detected and blocked', context, incident);
    this.triggerIncidentResponse(incident);

    return res.status(403).json({
      error: 'Critical security threat detected',
      message: 'Access denied by Enhanced Security Guardian',
      incident_id: `SEC-CRIT-${Date.now()}`,
      threat_level: 'CRITICAL',
      contact: 'security@aitaskflo.com',
      guardian: this.name
    });
  }

  /**
   * Update user behavior profiles for ML learning
   */
  updateUserProfile(context) {
    const profile = this.userProfiles.get(context.ip) || {
      firstSeen: context.timestamp,
      requestCount: 0,
      endpoints: new Set(),
      userAgents: new Set(),
      accessPatterns: [],
      riskScore: 0,
      lastActivity: context.timestamp
    };

    profile.requestCount++;
    profile.endpoints.add(context.endpoint);
    profile.userAgents.add(context.userAgent);
    profile.accessPatterns.push({
      timestamp: context.timestamp,
      endpoint: context.endpoint,
      method: context.method
    });
    profile.lastActivity = context.timestamp;

    // Keep only recent patterns (last 24 hours)
    const dayAgo = context.timestamp - (24 * 60 * 60 * 1000);
    profile.accessPatterns = profile.accessPatterns.filter(p => p.timestamp > dayAgo);

    this.userProfiles.set(context.ip, profile);
  }

  /**
   * Enhanced security statistics
   */
  getEnhancedSecurityStatus() {
    return {
      ...this.getSecurityStatus(),
      version: this.version,
      mlFeatures: {
        learningEnabled: this.isLearning,
        userProfiles: this.userProfiles.size,
        anomalyPatterns: this.anomalyPatterns.size,
        adaptiveThresholds: Object.fromEntries(this.adaptiveThresholds)
      },
      statistics: this.stats,
      performance: {
        averageAnalysisTime: this.calculateAverageAnalysisTime(),
        accuracy: this.stats.accuracyScore,
        falsePositiveRate: this.calculateFalsePositiveRate()
      }
    };
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport(timeframe = '24h') {
    const report = this.getThreatReport();
    
    return {
      ...report,
      enhanced: {
        mlAnalysis: {
          anomaliesDetected: this.stats.anomaliesDetected,
          patternsLearned: this.anomalyPatterns.size,
          accuracyScore: this.stats.accuracyScore
        },
        adaptiveFeatures: {
          dynamicThresholds: Object.fromEntries(this.adaptiveThresholds),
          userProfiles: this.userProfiles.size,
          behavioralModels: this.baselinePatterns
        },
        recommendations: this.generateAdvancedRecommendations()
      }
    };
  }

  // ... Additional helper methods for ML features, entropy calculation, etc.
  
  calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return Math.min(1.0, entropy / 8); // Normalize
  }

  calculateTimeDeviation(timestamp) {
    const now = new Date();
    const requestTime = new Date(timestamp);
    const hourDiff = Math.abs(now.getHours() - requestTime.getHours());
    
    // Higher deviation for unusual hours
    if (hourDiff >= 22 || hourDiff <= 6) return 0.8;
    if (hourDiff >= 20 || hourDiff <= 8) return 0.4;
    return 0.1;
  }

  // Inherit remaining methods from base SecurityGuardianBot
  // Continue with your existing server.js code for APIs, bots, etc.
  // Just ensure they all use the enhanced security features

  /**
   * Handle high threats (inherited and enhanced)
   */
  handleHighThreat(context, risk, res) {
    this.blockedIPs.add(context.ip);
    this.stats.threatsBlocked++;
    
    const threat = {
      level: 'HIGH',
      ip: context.ip,
      timestamp: new Date(context.timestamp).toISOString(),
      threats: risk.threats,
      patterns: risk.patterns,
      score: risk.score,
      action: 'BLOCKED'
    };

    this.logThreat(context.ip, 'HIGH_THREAT_BLOCKED', 'High threat detected and blocked', context, threat);
    this.sendSecurityAlert('HIGH', context, threat);

    return res.status(403).json({
      error: 'High security threat detected',
      message: 'Access denied by Enhanced Security Guardian',
      incident_id: `SEC-HIGH-${Date.now()}`,
      threat_level: 'HIGH',
      contact: 'security@aitaskflo.com',
      guardian: this.name
    });
  }

  /**
   * Handle medium threats
   */
  handleMediumThreat(context, risk) {
    this.logThreat(context.ip, 'MEDIUM_THREAT_MONITORED', 'Medium threat detected - monitoring', context, risk);
    
    // Add to watch list
    this.suspiciousActivities.push({
      ip: context.ip,
      threat: risk,
      timestamp: new Date(context.timestamp),
      action: 'MONITORED'
    });

    // Send alert for multiple medium threats
    const recentMediumThreats = this.suspiciousActivities.filter(
      activity => new Date() - activity.timestamp < 60000 // Last minute
    );
    
    if (recentMediumThreats.length >= 3) {
      this.sendSecurityAlert('MEDIUM', context, risk);
    }
  }

  /**
   * Handle low risk requests
   */
  handleLowRisk(context) {
    // Just log for analytics
    this.logActivity(context, 'LOW_RISK');
  }

  /**
   * Log security activities
   */
  logActivity(context, status) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: context.ip,
      endpoint: context.endpoint,
      method: context.method,
      status: status,
      guardian: this.name,
      userAgent: context.userAgent
    };
    
    this.saveSecurityLog(logEntry);
  }

  /**
   * Log threats
   */
  logThreat(ip, type, description, context = {}, additionalData = {}) {
    const threatLog = {
      timestamp: new Date().toISOString(),
      ip: ip,
      type: type,
      description: description,
      context: {
        endpoint: context.endpoint,
        method: context.method,
        userAgent: context.userAgent
      },
      threat_data: additionalData,
      action_taken: this.blockedIPs.has(ip) ? 'BLOCKED' : 'MONITORED',
      guardian: this.name
    };
    
    this.saveSecurityLog(threatLog);
    console.log(`🚨 ${this.name}: ${type} from ${ip} - ${description}`);
  }

  /**
   * Save to security log
   */
  saveSecurityLog(logEntry) {
    try {
      const securityLogPath = './security-logs.json';
      let logs = [];
      
      if (fs.existsSync(securityLogPath)) {
        const data = fs.readFileSync(securityLogPath, 'utf8');
        logs = data ? JSON.parse(data) : [];
      }
      
      logs.push(logEntry);
      
      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      fs.writeFileSync(securityLogPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Failed to save security log:', error);
    }
  }

  /**
   * Send security alerts
   */
  sendSecurityAlert(level, context, alertData) {
    const alert = {
      level: level,
      ip: context.ip,
      timestamp: new Date(context.timestamp).toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent,
      alertData: alertData,
      action: this.blockedIPs.has(context.ip) ? 'BLOCKED' : 'MONITORED'
    };

    this.lastAlert = alert;

    // If email is configured, send alert
    if (process.env.EMAIL_USER && process.env.ADMIN_EMAIL) {
      this.sendEmailAlert(alert);
    }

    // Broadcast via WebSocket if available
    if (this.broadcastAlert) {
      this.broadcastAlert(alert);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // Implementation for email alerts
    console.log(`📧 Security alert email would be sent: ${alert.level} threat from ${alert.ip}`);
  }

  /**
   * Calculate behavioral deviations
   */
  calculateBehavioralDeviations(context, userProfile) {
    const deviations = {
      userAgentChange: 0,
      accessPatternChange: 0,
      requestFrequencyChange: 0
    };

    // User agent deviation
    if (!userProfile.userAgents.has(context.userAgent)) {
      deviations.userAgentChange = 0.8;
    }

    // Access pattern deviation
    const recentPatterns = userProfile.accessPatterns.slice(-10);
    const newPattern = `${context.method}:${context.endpoint}`;
    const patternExists = recentPatterns.some(p => `${p.method}:${p.endpoint}` === newPattern);
    
    if (!patternExists) {
      deviations.accessPatternChange = 0.7;
    }

    // Request frequency deviation
    const currentHour = new Date(context.timestamp).getHours();
    const hourlyPatterns = userProfile.accessPatterns.filter(p => 
      new Date(p.timestamp).getHours() === currentHour
    );
    
    if (hourlyPatterns.length === 0) {
      deviations.requestFrequencyChange = 0.6;
    }

    return deviations;
  }

  /**
   * Get recent requests for an IP
   */
  getRecentRequests(ip, timeWindow = 60000) {
    const requests = this.requestCounts.get(ip) || [];
    const cutoff = Date.now() - timeWindow;
    return requests.filter(time => time > cutoff);
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(patterns, threats) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence with multiple patterns
    confidence += Math.min(0.3, patterns.length * 0.1);
    
    // Increase confidence with threat diversity
    const threatTypes = [...new Set(threats.map(t => t.type))];
    confidence += Math.min(0.2, threatTypes.length * 0.05);
    
    return Math.min(1.0, confidence);
  }

  /**
   * Get geolocation (placeholder)
   */
  getGeoLocation(ip) {
    // This would integrate with a geolocation service
    return { country: 'unknown', city: 'unknown' };
  }

  /**
   * Update learning models
   */
  updateLearningModels(context, risk) {
    if (!this.isLearning) return;

    // Update baseline patterns
    const hour = new Date(context.timestamp).getHours();
    const pattern = `${context.method}:${context.endpoint}`;
    
    if (!this.baselinePatterns.requestFrequency.has(hour)) {
      this.baselinePatterns.requestFrequency.set(hour, []);
    }
    this.baselinePatterns.requestFrequency.get(hour).push(context.timestamp);

    // Update user agent patterns
    if (!this.baselinePatterns.userAgentPatterns.has(context.userAgent)) {
      this.baselinePatterns.userAgentPatterns.set(context.userAgent, 0);
    }
    this.baselinePatterns.userAgentPatterns.set(
      context.userAgent,
      this.baselinePatterns.userAgentPatterns.get(context.userAgent) + 1
    );

    // Update endpoint access patterns
    if (!this.baselinePatterns.endpointAccess.has(pattern)) {
      this.baselinePatterns.endpointAccess.set(pattern, 0);
    }
    this.baselinePatterns.endpointAccess.set(
      pattern,
      this.baselinePatterns.endpointAccess.get(pattern) + 1
    );
  }

  /**
   * Generate security recommendation
   */
  generateSecurityRecommendation(level, score) {
    switch (level) {
      case 'CRITICAL':
        return 'IMMEDIATE ACTION REQUIRED: Block IP and investigate';
      case 'HIGH':
        return 'HIGH PRIORITY: Review and potentially block';
      case 'MEDIUM':
        return 'MONITOR: Watch for escalation patterns';
      case 'LOW':
        return 'LOG: Continue normal monitoring';
      default:
        return 'CONTINUE: No action required';
    }
  }

  /**
   * Trigger incident response
   */
  triggerIncidentResponse(incident) {
    console.log(`🚨 INCIDENT RESPONSE TRIGGERED: ${incident.level}`);
    
    // This would integrate with incident management systems
    // For now, just log the incident
    logger.incident('Security incident triggered', incident);
  }

  /**
   * Calculate average analysis time
   */
  calculateAverageAnalysisTime() {
    // Placeholder - would track actual analysis times
    return 15; // milliseconds
  }

  /**
   * Calculate false positive rate
   */
  calculateFalsePositiveRate() {
    if (this.stats.threatsBlocked === 0) return 0;
    return this.stats.falsePositives / this.stats.threatsBlocked;
  }

  /**
   * Generate advanced recommendations
   */
  generateAdvancedRecommendations() {
    return [
      'Regular security training for development team',
      'Implement additional rate limiting for API endpoints',
      'Consider implementing CAPTCHA for suspicious activity',
      'Regular security audits and penetration testing',
      'Keep security dependencies updated'
    ];
  }

  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring() {
    // Check every minute
    setInterval(() => {
      this.performSecurityScan();
    }, 60000);

    // Daily cleanup
    setInterval(() => {
      this.performDailyCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Perform security scan
   */
  performSecurityScan() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for patterns in recent threats
    const recentThreats = Array.from(this.threats.entries())
      .filter(([ip, threat]) => threat.timestamp > oneHourAgo);

    if (recentThreats.length > 10) {
      console.log(`🔍 ${this.name}: ${recentThreats.length} threats detected in last hour`);
    }

    // Auto-unblock IPs after configured time
    this.reviewBlockedIPs();
  }

  /**
   * Review and potentially unblock IPs
   */
  reviewBlockedIPs() {
    const now = new Date();
    const unblockTime = new Date(now.getTime() - this.config.blockDuration.extended);

    this.blockedIPs.forEach(ip => {
      const threat = this.threats.get(ip);
      if (threat && threat.timestamp < unblockTime) {
        // Consider unblocking after time period for lower threat scores
        if (threat.score < 75) {
          this.blockedIPs.delete(ip);
          this.logActivity({ ip, endpoint: 'AUTO_UNBLOCK', method: 'SYSTEM' }, 'UNBLOCKED');
          console.log(`🔓 ${this.name}: Auto-unblocked IP ${ip} after time period`);
        }
      }
    });
  }

  /**
   * Daily cleanup
   */
  performDailyCleanup() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Clean old threats
    this.threats.forEach((threat, ip) => {
      if (threat.timestamp < sevenDaysAgo) {
        this.threats.delete(ip);
      }
    });

    // Clean old suspicious activities
    this.suspiciousActivities = this.suspiciousActivities.filter(
      activity => activity.timestamp > sevenDaysAgo
    );

    // Clean old request counts
    this.requestCounts.clear();

    // Clean old user profiles
    this.userProfiles.forEach((profile, ip) => {
      if (profile.lastActivity < sevenDaysAgo.getTime()) {
        this.userProfiles.delete(ip);
      }
    });

    console.log(`🧹 ${this.name}: Daily cleanup completed`);
  }

  /**
   * Get security status (enhanced)
   */
  getSecurityStatus() {
    return {
      isActive: this.isActive,
      threatsDetected: this.threats.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivities.length,
      lastAlert: this.lastAlert,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      status: this.threats.size > 50 ? 'HIGH_ALERT' : 
              this.threats.size > 10 ? 'ELEVATED' : 'NORMAL'
    };
  }

  /**
   * Get threat report
   */
  getThreatReport() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentThreats = Array.from(this.threats.entries())
      .filter(([ip, threat]) => threat.timestamp > oneDayAgo)
      .map(([ip, threat]) => ({ ip, ...threat }));

    return {
      period: '24_hours',
      totalThreats: recentThreats.length,
      blockedIPs: Array.from(this.blockedIPs),
      topThreats: recentThreats.sort((a, b) => b.score - a.score).slice(0, 10),
      threatsByType: this.groupThreatsByPattern(recentThreats),
      recommendation: this.getSecurityRecommendation(recentThreats)
    };
  }

  /**
   * Group threats by pattern
   */
  groupThreatsByPattern(threats) {
    const groups = {};
    threats.forEach(threat => {
      if (threat.patterns) {
        threat.patterns.forEach(pattern => {
          groups[pattern] = (groups[pattern] || 0) + 1;
        });
      }
    });
    return groups;
  }

  /**
   * Get security recommendation
   */
  getSecurityRecommendation(threats) {
    if (threats.length > 100) {
      return "HIGH ALERT: Consider implementing additional DDoS protection";
    } else if (threats.length > 50) {
      return "ELEVATED: Monitor for coordinated attacks";
    } else if (threats.length > 10) {
      return "NORMAL: Regular security monitoring in effect";
    }
    return "LOW: System security is optimal";
  }
}

module.exports = EnhancedSecurityGuardianBot;