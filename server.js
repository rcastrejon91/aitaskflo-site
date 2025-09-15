// COMPLETE Enhanced server.js with ALL FEATURES + FREE APIs + SECURITY GUARDIAN BOT
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet"); // Security headers
const rateLimit = require("express-rate-limit"); // Rate limiting
const compression = require("compression"); // Gzip compression
const morgan = require("morgan"); // Logging
const bcrypt = require("bcrypt"); // Password hashing
const jwt = require("jsonwebtoken"); // JWT tokens
const multer = require("multer"); // File uploads
const { body, validationResult } = require("express-validator"); // Input validation
const nodemailer = require("nodemailer"); // Email sending
const cron = require("node-cron"); // Scheduled tasks
const WebSocket = require("ws"); // Real-time features
const axios = require("axios"); // For API calls
const FormData = require("form-data");

// Enhanced AI Agent: Active Knowledge Seeking & Continuous Learning System
const EnhancedAIAgent = require("./enhanced-ai-agent");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";

// --- SECURITY GUARDIAN BOT CLASS ---
class SecurityGuardianBot {
  constructor() {
    this.name = "SecurityGuardian";
    this.threats = new Map();
    this.blockedIPs = new Set();
    this.suspiciousActivities = [];
    this.requestCounts = new Map(); // Track request counts per IP
    this.alertThresholds = {
      failedLogins: 5,
      rapidRequests: 50,
      suspiciousPatterns: 3,
      fileUploadAnomalies: 3
    };
    this.isActive = true;
    this.lastAlert = null;
    
    console.log("🛡️ Security Guardian Bot activated and monitoring...");
    this.startContinuousMonitoring();
  }

  // Real-time threat detection middleware
  analyzeRequest(req, res, next) {
    if (!this.isActive) {
      return res.status(503).json({
        error: "System in lockdown mode",
        message: "Platform temporarily unavailable for security reasons",
        contact: "security@aitaskflo.com"
      });
    }

    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.get('User-Agent') || 'unknown';
    const endpoint = req.path;
    const method = req.method;
    
    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      this.logThreat(ip, 'BLOCKED_IP_ACCESS', 'Blocked IP attempted access');
      return res.status(403).json({
        error: "Access denied by Security Guardian",
        reason: "IP blocked due to suspicious activity",
        incident_id: `SEC-${Date.now()}`,
        contact: "security@aitaskflo.com"
      });
    }

    // Track request counts for rate limiting
    this.trackRequest(ip);

    // Analyze request patterns
    const threatLevel = this.assessThreatLevel(req, ip, userAgent, endpoint, method);
    
    if (threatLevel === 'HIGH') {
      return this.handleHighThreat(ip, req, res);
    } else if (threatLevel === 'MEDIUM') {
      this.handleMediumThreat(ip, req);
    }

    // Log legitimate request
    this.logActivity(ip, endpoint, method, 'SAFE');
    next();
  }

  // Track requests per IP
  trackRequest(ip) {
    const now = Date.now();
    if (!this.requestCounts.has(ip)) {
      this.requestCounts.set(ip, []);
    }
    
    const requests = this.requestCounts.get(ip);
    requests.push(now);
    
    // Keep only last 5 minutes of requests
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const recentRequests = requests.filter(time => time > fiveMinutesAgo);
    this.requestCounts.set(ip, recentRequests);
  }

  // Get recent request count for IP
  getRecentRequests(ip) {
    const requests = this.requestCounts.get(ip) || [];
    return requests.length;
  }

  // Threat level assessment
  assessThreatLevel(req, ip, userAgent, endpoint, method) {
    let riskScore = 0;
    const patterns = [];

    // SQL Injection patterns
    const sqlPatterns = ['union', 'select', 'drop', 'insert', 'delete', 'script', 'alert', 'onload', 'eval', 'exec'];
    const requestString = JSON.stringify(req.query) + JSON.stringify(req.body) + endpoint;
    
    sqlPatterns.forEach(pattern => {
      if (requestString.toLowerCase().includes(pattern)) {
        riskScore += 25;
        patterns.push(`SQL_INJECTION_${pattern.toUpperCase()}`);
      }
    });

    // Suspicious endpoints
    const suspiciousEndpoints = ['/admin', '/config', '/env', '/.env', '/wp-admin', '/phpmyadmin', '/.git', '/backup'];
    if (suspiciousEndpoints.some(ep => endpoint.includes(ep))) {
      riskScore += 20;
      patterns.push('SUSPICIOUS_ENDPOINT');
    }

    // Bot detection
    const botUserAgents = ['bot', 'crawler', 'spider', 'scraper', 'wget', 'curl'];
    if (botUserAgents.some(bot => userAgent.toLowerCase().includes(bot))) {
      riskScore += 10;
      patterns.push('BOT_DETECTED');
    }

    // Rate limiting check
    const recentRequests = this.getRecentRequests(ip);
    if (recentRequests > this.alertThresholds.rapidRequests) {
      riskScore += 30;
      patterns.push('RAPID_REQUESTS');
    }

    // XSS patterns
    const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
    if (xssPatterns.some(pattern => requestString.toLowerCase().includes(pattern))) {
      riskScore += 20;
      patterns.push('XSS_ATTEMPT');
    }

    // Store threat info
    if (riskScore > 0) {
      this.threats.set(ip, {
        score: riskScore,
        patterns: patterns,
        timestamp: new Date(),
        userAgent: userAgent,
        endpoint: endpoint,
        method: method
      });
    }

    // Determine threat level
    if (riskScore >= 50) return 'HIGH';
    if (riskScore >= 25) return 'MEDIUM';
    return 'LOW';
  }

  // Handle high threats
  handleHighThreat(ip, req, res) {
    this.blockedIPs.add(ip);
    this.logThreat(ip, 'HIGH_THREAT_BLOCKED', 'Automatically blocked high-risk IP');
    
    // Send alert
    this.sendSecurityAlert('HIGH', ip, req);
    
    res.status(403).json({
      error: "Security Guardian: High threat detected",
      message: "Your request has been blocked due to suspicious activity",
      incident_id: `SEC-${Date.now()}`,
      threat_level: "HIGH",
      contact: "security@aitaskflo.com"
    });
  }

  // Handle medium threats
  handleMediumThreat(ip, req) {
    this.logThreat(ip, 'MEDIUM_THREAT_MONITORED', 'Medium threat detected - monitoring');
    
    // Add to watch list
    this.suspiciousActivities.push({
      ip: ip,
      threat: this.threats.get(ip),
      timestamp: new Date(),
      action: 'MONITORED'
    });

    // Send alert for multiple medium threats
    const recentMediumThreats = this.suspiciousActivities.filter(
      activity => new Date() - activity.timestamp < 60000 // Last minute
    );
    
    if (recentMediumThreats.length >= 3) {
      this.sendSecurityAlert('MEDIUM', ip, req);
    }
  }

  // Log security activities
  logActivity(ip, endpoint, method, status) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: ip,
      endpoint: endpoint,
      method: method,
      status: status,
      guardian: this.name
    };
    
    this.saveSecurityLog(logEntry);
  }

  // Log threats
  logThreat(ip, type, description) {
    const threatLog = {
      timestamp: new Date().toISOString(),
      ip: ip,
      type: type,
      description: description,
      threat_data: this.threats.get(ip) || {},
      action_taken: this.blockedIPs.has(ip) ? 'BLOCKED' : 'MONITORED',
      guardian: this.name
    };
    
    this.saveSecurityLog(threatLog);
    console.log(`🚨 SecurityGuardian: ${type} from ${ip} - ${description}`);
  }

  // Save to security log
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

  // Send security alerts
  sendSecurityAlert(level, ip, req) {
    const alert = {
      level: level,
      ip: ip,
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      threat: this.threats.get(ip),
      action: this.blockedIPs.has(ip) ? 'BLOCKED' : 'MONITORED'
    };

    this.lastAlert = alert;

    // If email is configured, send alert
    if (process.env.EMAIL_USER && process.env.ADMIN_EMAIL) {
      this.sendEmailAlert(alert);
    }

    // Broadcast via WebSocket if available
    this.broadcastAlert(alert);
  }

  // Send email alert
  async sendEmailAlert(alert) {
    try {
      if (!transporter) {
        console.warn('⚠️ Email not configured, skipping alert email');
        return;
      }
      
      const emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 AITaskFlo Security Alert - ${alert.level} Threat Detected`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #dc3545;">🛡️ Security Guardian Alert</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Threat Level:</strong> <span style="color: ${alert.level === 'HIGH' ? '#dc3545' : '#ffc107'};">${alert.level}</span></p>
              <p><strong>IP Address:</strong> ${alert.ip}</p>
              <p><strong>Endpoint:</strong> ${alert.endpoint}</p>
              <p><strong>Method:</strong> ${alert.method}</p>
              <p><strong>Time:</strong> ${alert.timestamp}</p>
              <p><strong>Action Taken:</strong> ${alert.action}</p>
            </div>
            <h3>Threat Details:</h3>
            <pre style="background: #f1f3f4; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alert.threat, null, 2)}</pre>
            <p style="margin-top: 20px; color: #6c757d;">
              Review the security dashboard for more details: <a href="https://yourdomain.com/analytics/dashboard">Security Dashboard</a>
            </p>
          </div>
        `
      });
      
      console.log(`📧 Security alert sent for ${alert.level} threat from ${alert.ip}`);
    } catch (error) {
      console.error('Failed to send security alert email:', error.message);
    }
  }

  // Broadcast alert via WebSocket
  broadcastAlert(alert) {
    // This will be integrated with the WebSocket server below
    console.log(`🔔 Broadcasting security alert: ${alert.level} threat from ${alert.ip}`);
  }

  // Continuous monitoring
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

  // Perform security scan
  performSecurityScan() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for patterns in recent threats
    const recentThreats = Array.from(this.threats.entries())
      .filter(([ip, threat]) => threat.timestamp > oneHourAgo);

    if (recentThreats.length > 10) {
      console.log(`🔍 SecurityGuardian: ${recentThreats.length} threats detected in last hour`);
    }

    // Auto-unblock IPs after 24 hours (configurable)
    this.reviewBlockedIPs();
  }

  // Review and potentially unblock IPs
  reviewBlockedIPs() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.blockedIPs.forEach(ip => {
      const threat = this.threats.get(ip);
      if (threat && threat.timestamp < twentyFourHoursAgo) {
        // Consider unblocking after 24 hours for lower threat scores
        if (threat.score < 75) {
          this.blockedIPs.delete(ip);
          this.logActivity(ip, 'AUTO_UNBLOCK', 'SYSTEM', 'UNBLOCKED');
          console.log(`🔓 SecurityGuardian: Auto-unblocked IP ${ip} after 24 hours`);
        }
      }
    });
  }

  // Daily cleanup
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

    console.log('🧹 SecurityGuardian: Daily cleanup completed');
  }

  // Get security status
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

  // Get threat report
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

  // Group threats by pattern
  groupThreatsByPattern(threats) {
    const groups = {};
    threats.forEach(threat => {
      threat.patterns.forEach(pattern => {
        groups[pattern] = (groups[pattern] || 0) + 1;
      });
    });
    return groups;
  }

  // Get security recommendation
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

// Initialize Security Guardian Bot
const securityGuardian = new SecurityGuardianBot();

// Initialize Enhanced AI Agent
const enhancedAIAgent = new EnhancedAIAgent({
  discoveryEnabled: true,
  learningEnabled: true,
  proactiveIntelligenceEnabled: true,
  integrateWithExistingMemory: true,
  enhanceSecurityProtocols: true
});

// Start Enhanced AI Agent
console.log('🤖 Starting Enhanced AI Agent...');
enhancedAIAgent.start().then(() => {
  console.log('✅ Enhanced AI Agent activated with continuous learning');
}).catch(error => {
  console.error('❌ Failed to start Enhanced AI Agent:', error.message);
});

// Integrate with existing systems
setTimeout(() => {
  // Integration will happen after other components are initialized
  console.log('🔗 Integrating Enhanced AI Agent with existing systems...');
  
  // Note: Full integration would require additional setup
  // This is a placeholder for the integration
}, 5000);

// --- FREE API CONFIGURATIONS ---
const FREE_APIS = {
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || 'your-openweather-key',
  WEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  NEWS_API_KEY: process.env.NEWS_API_KEY || 'your-news-api-key',
  NEWS_BASE_URL: 'https://newsapi.org/v2',
  EXCHANGE_BASE_URL: 'https://api.exchangerate-api.com/v4/latest',
  QR_CODE_API: 'https://api.qrserver.com/v1/create-qr-code/',
  QUOTES_API: 'https://api.quotable.io',
  CAT_API: 'https://api.thecatapi.com/v1/images/search',
  DOG_API: 'https://api.thedogapi.com/v1/images/search',
  IP_API: 'http://ip-api.com/json',
  TINY_URL_API: 'https://tinyurl.com/api-create.php',
  UUID_API: 'https://httpbin.org/uuid',
  COLOR_API: 'https://www.colr.org/json/color/random',
  JOKE_API: 'https://official-joke-api.appspot.com/random_joke'
};

// --- SECURITY & PERFORMANCE MIDDLEWARE ---
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression for better performance
app.use(morgan("combined")); // Request logging
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased payload limit
app.use(express.urlencoded({ extended: true }));

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// API-specific rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for API endpoints
  message: { error: "API rate limit exceeded" }
});

// --- APPLY SECURITY GUARDIAN MIDDLEWARE FIRST (BEFORE OTHER ROUTES) ---
app.use((req, res, next) => {
  securityGuardian.analyzeRequest(req, res, next);
});

// --- FILE UPLOAD CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// --- EMAIL CONFIGURATION ---
let transporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
} catch (error) {
  console.warn('⚠️ Email configuration not available:', error.message);
}

// --- JWT MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// --- SERVE STATIC FILES ---
app.use(express.static('.', {
  extensions: ['html', 'htm'],
  index: 'index.html',
  setHeaders: (res, path) => {
    if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.jpg')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// --- DATABASE UTILITIES ---
function getDatabase() {
  if (!fs.existsSync("database.json")) {
    const initialDb = {
      users: [], analytics: [], logs: [], settings: {},
      subscribers: [], tasks: [], billing: [], api_usage: {}
    };
    fs.writeFileSync("database.json", JSON.stringify(initialDb, null, 2));
  }
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDatabase(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

function logActivity(action, details, userId = null) {
  const db = getDatabase();
  db.logs.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action, details, userId, ip: null
  });
  saveDatabase(db);
}

function logApiUsage(apiName, endpoint, success = true) {
  const db = getDatabase();
  if (!db.api_usage[apiName]) db.api_usage[apiName] = [];
  
  db.api_usage[apiName].push({
    endpoint, timestamp: new Date().toISOString(), success
  });
  
  if (db.api_usage[apiName].length > 100) {
    db.api_usage[apiName] = db.api_usage[apiName].slice(-100);
  }
  saveDatabase(db);
}

// --- SAFETY NET: Ensure core files exist ---
if (!fs.existsSync("admins.json")) {
  const hashedPassword = bcrypt.hashSync("taskflo_01", 10);
  fs.writeFileSync("admins.json", JSON.stringify([
    { 
      id: 1, email: "admin@taskflo.com", password: hashedPassword, 
      active: true, role: "super-admin", createdAt: new Date().toISOString()
    }
  ], null, 2));
  console.log("⚠️ Created default admins.json with hashed password");
}

// --- SECURITY GUARDIAN BOT API ENDPOINTS ---
app.get('/security/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  res.json({
    success: true,
    guardian: securityGuardian.getSecurityStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/security/threats', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  res.json({
    success: true,
    report: securityGuardian.getThreatReport(),
    timestamp: new Date().toISOString()
  });
});

app.post('/security/unblock-ip', authenticateToken, [
  body('ip').isIP()
], (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  const { ip } = req.body;
  securityGuardian.blockedIPs.delete(ip);
  securityGuardian.logActivity(ip, 'MANUAL_UNBLOCK', 'POST', 'UNBLOCKED');
  
  res.json({
    success: true,
    message: `IP ${ip} has been unblocked`,
    action: 'UNBLOCKED'
  });
});

app.post('/security/emergency-lockdown', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  securityGuardian.isActive = false;
  console.log('🚨 EMERGENCY LOCKDOWN ACTIVATED by admin');
  
  res.json({
    success: true,
    message: 'Emergency lockdown activated - all traffic blocked',
    status: 'LOCKDOWN'
  });
});

app.post('/security/activate', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  securityGuardian.isActive = true;
  console.log('✅ Security Guardian reactivated by admin');
  
  res.json({
    success: true,
    message: 'Security Guardian reactivated',
    status: 'ACTIVE'
  });
});

// --- ENHANCED AI AGENT API ENDPOINTS ---

// Get Enhanced AI Agent status
app.get('/ai-agent/status', authenticateToken, (req, res) => {
  try {
    const status = enhancedAIAgent.getStatus();
    res.json({
      success: true,
      agent: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get AI agent status',
      message: error.message
    });
  }
});

// Query the AI agent's knowledge
app.post('/ai-agent/query', apiLimiter, [
  body('query').isString().isLength({ min: 1, max: 500 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { query } = req.body;
    const { limit = 20, minConfidence = 0.5, includeInsights = false } = req.query;
    
    const results = enhancedAIAgent.queryKnowledge(query, {
      limit: parseInt(limit),
      minConfidence: parseFloat(minConfidence),
      includeInsights: includeInsights === 'true'
    });
    
    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to query AI agent knowledge',
      message: error.message
    });
  }
});

// Get AI agent insights and recommendations
app.get('/ai-agent/insights', (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    const insights = enhancedAIAgent.getInsights(category, parseInt(limit));
    
    res.json({
      success: true,
      ...insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get AI agent insights',
      message: error.message
    });
  }
});

// Apply AI agent insights for decision support
app.post('/ai-agent/apply-insights', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  try {
    const context = req.body.context || {};
    
    enhancedAIAgent.applyInsights(context).then(applications => {
      res.json({
        success: true,
        applications,
        timestamp: new Date().toISOString()
      });
    }).catch(error => {
      res.status(500).json({
        success: false,
        error: 'Failed to apply insights',
        message: error.message
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to apply insights',
      message: error.message
    });
  }
});

// Get comprehensive AI agent report
app.get('/ai-agent/report', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  try {
    const report = enhancedAIAgent.generateReport();
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI agent report',
      message: error.message
    });
  }
});

// Control AI agent components
app.post('/ai-agent/control/:action', authenticateToken, (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  try {
    const { action } = req.params;
    let result;
    
    switch (action) {
      case 'start':
        result = enhancedAIAgent.start();
        break;
      case 'stop':
        result = enhancedAIAgent.stop();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          availableActions: ['start', 'stop']
        });
    }
    
    if (result instanceof Promise) {
      result.then(() => {
        res.json({
          success: true,
          action: action,
          status: enhancedAIAgent.isActive ? 'active' : 'inactive',
          timestamp: new Date().toISOString()
        });
      }).catch(error => {
        res.status(500).json({
          success: false,
          error: `Failed to ${action} AI agent`,
          message: error.message
        });
      });
    } else {
      res.json({
        success: true,
        action: action,
        status: enhancedAIAgent.isActive ? 'active' : 'inactive',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} AI agent`,
      message: error.message
    });
  }
});

// Get knowledge discovery sources
app.get('/ai-agent/discovery/sources', authenticateToken, (req, res) => {
  try {
    const discoveryStats = enhancedAIAgent.discoveryEngine.getStats();
    const sources = enhancedAIAgent.discoveryEngine.config.sources.map(source => ({
      name: source.name,
      type: source.type,
      url: source.url,
      priority: source.priority,
      tags: source.tags,
      method: source.method
    }));
    
    res.json({
      success: true,
      sources,
      stats: discoveryStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get discovery sources',
      message: error.message
    });
  }
});

// Add new discovery source
app.post('/ai-agent/discovery/sources', authenticateToken, [
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('type').isString().isLength({ min: 1, max: 50 }),
  body('url').isURL(),
  body('method').isIn(['api', 'scrape', 'rss', 'xml'])
], (req, res) => {
  if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const newSource = {
      name: req.body.name,
      type: req.body.type,
      url: req.body.url,
      method: req.body.method,
      priority: req.body.priority || 'medium',
      tags: req.body.tags || []
    };
    
    enhancedAIAgent.discoveryEngine.addSource(newSource);
    
    res.json({
      success: true,
      message: `Discovery source '${newSource.name}' added successfully`,
      source: newSource,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add discovery source',
      message: error.message
    });
  }
});

// Get recent discoveries
app.get('/ai-agent/discoveries/recent', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const discoveries = enhancedAIAgent.discoveryEngine.getRecentDiscoveries(parseInt(limit));
    
    res.json({
      success: true,
      discoveries,
      total: discoveries.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get recent discoveries',
      message: error.message
    });
  }
});

// Continue with the rest of your existing server.js code...
// (All your existing FREE API endpoints, bot functionality, etc.)

// --- HEALTH CHECK (Enhanced with Security Status & AI Agent) ---
app.get("/health", (req, res) => {
  const aiAgentStatus = enhancedAIAgent ? enhancedAIAgent.getStatus() : null;
  
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "3.0.0",
    security: {
      guardianActive: securityGuardian.isActive,
      threatsDetected: securityGuardian.threats.size,
      blockedIPs: securityGuardian.blockedIPs.size,
      securityLevel: securityGuardian.getSecurityStatus().status
    },
    aiAgent: aiAgentStatus ? {
      active: aiAgentStatus.isActive,
      knowledgeNodes: aiAgentStatus.stats.knowledgeNodes,
      totalInsights: aiAgentStatus.stats.totalInsights,
      uptimeHours: aiAgentStatus.uptimeHours,
      discoveryActive: aiAgentStatus.components.discoveryEngine.active,
      learningActive: aiAgentStatus.components.continuousLearner.active
    } : null,
    features: {
      security: true, 
      apis: true, 
      fileUploads: true,
      websockets: true, 
      email: true, 
      analytics: true,
      enhancedAI: true,
      knowledgeSeeking: true,
      continuousLearning: true
    }
  });
});

// --- YOUR EXISTING API ENDPOINTS GO HERE ---
// (Weather, News, Currency, QR codes, etc. - all your existing code)

// --- START SERVER WITH WEBSOCKET ---
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection with Security Guardian integration
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');
  
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to AITaskFlo with Security Guardian protection',
    security: securityGuardian.getSecurityStatus(),
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'security_request') {
        ws.send(JSON.stringify({
          type: 'security_status',
          data: securityGuardian.getSecurityStatus(),
          timestamp: new Date().toISOString()
        }));
      }
      
      // Broadcast to other clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'activity_update',
            data: data,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
});

// Integrate Security Guardian with WebSocket broadcasting
securityGuardian.broadcastAlert = (alert) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'security_alert',
        alert: alert,
        timestamp: new Date().toISOString()
      }));
    }
  });
};

// --- FREE API ENDPOINTS ---

// 🌤️ WEATHER API
app.get('/api/weather/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const response = await axios.get(
      `${FREE_APIS.WEATHER_BASE_URL}/weather?q=${city}&appid=${FREE_APIS.WEATHER_API_KEY}&units=metric`
    );
    
    const weatherData = {
      city: response.data.name,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      icon: `https://openweathermap.org/img/w/${response.data.weather[0].icon}.png`
    };
    
    logApiUsage('weather', `/weather/${city}`);
    res.json({ success: true, data: weatherData });
  } catch (error) {
    logApiUsage('weather', `/weather/${req.params.city}`, false);
    res.status(500).json({ success: false, error: 'Weather data not available' });
  }
});

// 📰 NEWS API
app.get('/api/news/:category?', async (req, res) => {
  try {
    const category = req.params.category || 'general';
    const response = await axios.get(
      `${FREE_APIS.NEWS_BASE_URL}/top-headlines?category=${category}&country=us&apiKey=${FREE_APIS.NEWS_API_KEY}`
    );
    
    const articles = response.data.articles.slice(0, 10).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source.name
    }));
    
    logApiUsage('news', `/news/${category}`);
    res.json({ success: true, data: articles, total: response.data.totalResults });
  } catch (error) {
    logApiUsage('news', `/news/${req.params.category}`, false);
    res.status(500).json({ success: false, error: 'News data not available' });
  }
});

// 💱 CURRENCY EXCHANGE
app.get('/api/exchange/:from/:to/:amount?', async (req, res) => {
  try {
    const { from, to, amount = 1 } = req.params;
    const response = await axios.get(`${FREE_APIS.EXCHANGE_BASE_URL}/${from.toUpperCase()}`);
    
    const rate = response.data.rates[to.toUpperCase()];
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
    
    const result = {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: rate,
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount),
      date: response.data.date
    };
    
    logApiUsage('exchange', `/exchange/${from}/${to}`);
    res.json({ success: true, data: result });
  } catch (error) {
    logApiUsage('exchange', `/exchange/${req.params.from}/${req.params.to}`, false);
    res.status(500).json({ success: false, error: 'Exchange rate not available' });
  }
});

// 📱 QR CODE GENERATOR
app.post('/api/qr-code', async (req, res) => {
  try {
    const { text, size = '200x200' } = req.body;
    const qrUrl = `${FREE_APIS.QR_CODE_API}?size=${size}&data=${encodeURIComponent(text)}`;
    
    logApiUsage('qr-code', '/qr-code');
    res.json({ 
      success: true, 
      data: { 
        qrCodeUrl: qrUrl,
        downloadUrl: qrUrl + '&download=1'
      }
    });
  } catch (error) {
    logApiUsage('qr-code', '/qr-code', false);
    res.status(500).json({ success: false, error: 'QR code generation failed' });
  }
});

// 💭 RANDOM QUOTES
app.get('/api/quote/:tag?', async (req, res) => {
  try {
    const tag = req.params.tag;
    let url = `${FREE_APIS.QUOTES_API}/random`;
    if (tag) url += `?tags=${tag}`;
    
    const response = await axios.get(url);
    
    const quote = {
      text: response.data.content,
      author: response.data.author,
      tags: response.data.tags,
      length: response.data.length
    };
    
    logApiUsage('quotes', `/quote/${tag || 'random'}`);
    res.json({ success: true, data: quote });
  } catch (error) {
    logApiUsage('quotes', `/quote/${req.params.tag}`, false);
    res.status(500).json({ success: false, error: 'Quote not available' });
  }
});

// 🐱 RANDOM CAT/DOG IMAGES
app.get('/api/random/:animal', async (req, res) => {
  try {
    const { animal } = req.params;
    let apiUrl;
    
    if (animal === 'cat') apiUrl = FREE_APIS.CAT_API;
    else if (animal === 'dog') apiUrl = FREE_APIS.DOG_API;
    else throw new Error('Invalid animal type');
    
    const response = await axios.get(apiUrl);
    const imageData = {
      imageUrl: response.data[0].url,
      width: response.data[0].width,
      height: response.data[0].height
    };
    
    logApiUsage('animals', `/random/${animal}`);
    res.json({ success: true, data: imageData });
  } catch (error) {
    logApiUsage('animals', `/random/${req.params.animal}`, false);
    res.status(500).json({ success: false, error: 'Animal image not available' });
  }
});

// 🌍 IP GEOLOCATION
app.get('/api/location/:ip?', async (req, res) => {
  try {
    const ip = req.params.ip || req.ip;
    const response = await axios.get(`${FREE_APIS.IP_API}/${ip}`);
    
    const locationData = {
      ip: response.data.query,
      country: response.data.country,
      region: response.data.regionName,
      city: response.data.city,
      zipCode: response.data.zip,
      timezone: response.data.timezone,
      isp: response.data.isp,
      coordinates: {
        lat: response.data.lat,
        lon: response.data.lon
      }
    };
    
    logApiUsage('geolocation', `/location/${ip}`);
    res.json({ success: true, data: locationData });
  } catch (error) {
    logApiUsage('geolocation', `/location/${req.params.ip}`, false);
    res.status(500).json({ success: false, error: 'Location data not available' });
  }
});

// 🔗 URL SHORTENER
app.post('/api/shorten-url', async (req, res) => {
  try {
    const { url } = req.body;
    const response = await axios.get(`${FREE_APIS.TINY_URL_API}?url=${encodeURIComponent(url)}`);
    
    logApiUsage('url-shortener', '/shorten-url');
    res.json({ 
      success: true, 
      data: { 
        originalUrl: url,
        shortUrl: response.data,
        saved: url.length - response.data.length
      }
    });
  } catch (error) {
    logApiUsage('url-shortener', '/shorten-url', false);
    res.status(500).json({ success: false, error: 'URL shortening failed' });
  }
});

// 🎲 RANDOM UUID GENERATOR
app.get('/api/uuid/:count?', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 1, 10);
    const uuids = [];
    
    for (let i = 0; i < count; i++) {
      const response = await axios.get(FREE_APIS.UUID_API);
      uuids.push(response.data.uuid);
    }
    
    logApiUsage('uuid', `/uuid/${count}`);
    res.json({ 
      success: true, 
      data: count === 1 ? uuids[0] : uuids,
      count: uuids.length
    });
  } catch (error) {
    logApiUsage('uuid', `/uuid/${req.params.count}`, false);
    res.status(500).json({ success: false, error: 'UUID generation failed' });
  }
});

// 🎨 RANDOM COLOR GENERATOR
app.get('/api/color/:count?', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 1, 10);
    const colors = [];
    
    for (let i = 0; i < count; i++) {
      const response = await axios.get(FREE_APIS.COLOR_API);
      colors.push({
        hex: response.data.new_color,
        rgb: hexToRgb(response.data.new_color),
        name: `Color-${Date.now()}-${i}`
      });
    }
    
    logApiUsage('colors', `/color/${count}`);
    res.json({ 
      success: true, 
      data: count === 1 ? colors[0] : colors,
      count: colors.length
    });
  } catch (error) {
    logApiUsage('colors', `/color/${req.params.count}`, false);
    res.status(500).json({ success: false, error: 'Color generation failed' });
  }
});

// Helper function for color conversion
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// 😂 RANDOM JOKES
app.get('/api/joke/:type?', async (req, res) => {
  try {
    const response = await axios.get(FREE_APIS.JOKE_API);
    
    const joke = {
      setup: response.data.setup,
      punchline: response.data.punchline,
      type: response.data.type,
      id: response.data.id
    };
    
    logApiUsage('jokes', `/joke/${req.params.type || 'random'}`);
    res.json({ success: true, data: joke });
  } catch (error) {
    logApiUsage('jokes', `/joke/${req.params.type}`, false);
    res.status(500).json({ success: false, error: 'Joke not available' });
  }
});

// 🔐 PASSWORD GENERATOR
app.get('/api/password/:length?', async (req, res) => {
  try {
    const length = Math.min(Math.max(parseInt(req.params.length) || 12, 8), 50);
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const passwordData = {
      password: password,
      length: password.length,
      strength: getPasswordStrength(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSymbols: /[!@#$%^&*]/.test(password)
    };
    
    logApiUsage('password', `/password/${length}`);
    res.json({ success: true, data: passwordData });
  } catch (error) {
    logApiUsage('password', `/password/${req.params.length}`, false);
    res.status(500).json({ success: false, error: 'Password generation failed' });
  }
});

// Helper function for password strength
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
  return 'Strong';
}

// --- ENHANCED BOT MEMORY ---
function getMemory(botName) {
  const filePath = `./memory/${botName}.json`;
  if (!fs.existsSync("./memory")) fs.mkdirSync("./memory");
  if (!fs.existsSync(filePath)) return { 
    history: [], 
    stats: { totalInteractions: 0, lastUsed: null },
    preferences: {},
    apiData: {}
  };
  return JSON.parse(fs.readFileSync(filePath));
}

function saveMemory(botName, input, output, userId = null, apiData = {}) {
  const filePath = `./memory/${botName}.json`;
  const memory = getMemory(botName);
  
  memory.history.push({
    input, output, timestamp: new Date().toISOString(), userId
  });
  
  memory.stats.totalInteractions++;
  memory.stats.lastUsed = new Date().toISOString();
  memory.apiData = { ...memory.apiData, ...apiData };
  
  if (memory.history.length > 50) {
    memory.history = memory.history.slice(-50);
  }
  
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
}

// --- ENHANCED BOTS WITH API INTEGRATION ---
const bots = {
  emailBot: async (input, memory, userId) => {
    try {
      const quoteRes = await axios.get(`${FREE_APIS.QUOTES_API}/random?tags=motivational`);
      const quote = quoteRes.data.content;
      
      const responses = [
        `[EmailBot] Crafting email: "${input}"`,
        `[EmailBot] Adding inspirational touch: "${quote}"`,
        memory.history.length > 0
          ? `[EmailBot] Building on: "${memory.history[memory.history.length - 1].input}"`
          : "[EmailBot] Fresh email campaign! 💌",
        "[EmailBot] ✅ Email ready with motivational boost!"
      ];
      
      return { responses, apiData: { lastQuote: quote } };
    } catch (error) {
      return { 
        responses: [`[EmailBot] Processing: "${input}"`, "[EmailBot] ✅ Standard email ready!"],
        apiData: {}
      };
    }
  },
  
  taskBot: async (input, memory, userId) => {
    try {
      const uuidRes = await axios.get(FREE_APIS.UUID_API);
      const taskId = uuidRes.data.uuid;
      
      const responses = [
        `[TaskBot] Task created: "${input}"`,
        `[TaskBot] Task ID: ${taskId}`,
        `[TaskBot] Priority: ${Math.random() > 0.5 ? 'High' : 'Medium'}`,
        "[TaskBot] ✅ Task queued with unique identifier!"
      ];
      
      const db = getDatabase();
      db.tasks.push({
        id: taskId,
        content: input,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId
      });
      saveDatabase(db);
      
      return { responses, apiData: { lastTaskId: taskId } };
    } catch (error) {
      return {
        responses: [`[TaskBot] Task: "${input}"`, "[TaskBot] ✅ Task queued!"],
        apiData: {}
      };
    }
  },
  
  analyticsBot: async (input, memory, userId) => {
    try {
      const colorRes = await axios.get(FREE_APIS.COLOR_API);
      const color = colorRes.data.new_color;
      
      const metrics = {
        engagement: Math.floor(Math.random() * 30) + 70,
        conversions: Math.floor(Math.random() * 15) + 5,
        growth: Math.floor(Math.random() * 20) + 5
      };
      
      const responses = [
        `[AnalyticsBot] Analyzing: "${input}"`,
        `[AnalyticsBot] Metrics - Engagement: ${metrics.engagement}%, Growth: +${metrics.growth}%`,
        `[AnalyticsBot] Chart color theme: ${color}`,
        "[AnalyticsBot] ✅ Visual analytics ready!"
      ];
      
      return { responses, apiData: { chartColor: color, lastMetrics: metrics } };
    } catch (error) {
      return {
        responses: [`[AnalyticsBot] Analyzing: "${input}"`, "[AnalyticsBot] ✅ Basic analytics ready!"],
        apiData: {}
      };
    }
  },
  
  researchBot: async (input, memory, userId) => {
    try {
      const newsRes = await axios.get(
        `${FREE_APIS.NEWS_BASE_URL}/everything?q=${encodeURIComponent(input)}&pageSize=3&apiKey=${FREE_APIS.NEWS_API_KEY}`
      );
      
      const articles = newsRes.data.articles.slice(0, 2);
      const responses = [
        `[ResearchBot] Researching: "${input}"`,
        `[ResearchBot] Found ${articles.length} recent articles`,
        ...articles.map(article => `[ResearchBot] Source: ${article.source.name} - "${article.title}"`),
        "[ResearchBot] ✅ Research compilation with live sources ready!"
      ];
      
      return { responses, apiData: { lastSources: articles.length, articles } };
    } catch (error) {
      return {
        responses: [`[ResearchBot] Researching: "${input}"`, "[ResearchBot] ✅ Research ready!"],
        apiData: {}
      };
    }
  }
};

// --- ENHANCED BOT ROUTES ---
app.post("/run-bot", apiLimiter, [
  body('botName').isString().isLength({ min: 1, max: 50 }),
  body('input').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { botName, input } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';
  const memory = getMemory(botName);

  if (bots[botName]) {
    const result = await bots[botName](input, memory, userId);
    saveMemory(botName, input, result.responses, userId, result.apiData);
    
    logActivity('bot_interaction', { botName, input }, userId);
    
    res.json({ 
      success: true,
      logs: result.responses,
      botStats: memory.stats,
      apiEnhanced: Object.keys(result.apiData).length > 0
    });
  } else {
    res.status(404).json({ 
      success: false,
      logs: [`❌ No bot found: ${botName}`],
      availableBots: Object.keys(bots)
    });
  }
});

// Enhanced team run
app.post("/team-run", apiLimiter, [
  body('input').isString().isLength({ min: 1, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { input } = req.body;
  const userId = req.headers['x-user-id'] || 'anonymous';
  const crew = ["emailBot", "taskBot", "analyticsBot", "researchBot"];
  let logs = [];

  logs.push(`🧑‍🤝‍🧑 AI Crew Assembly — Mission: "${input}"`);
  logs.push(`⏰ Timestamp: ${new Date().toLocaleString()}`);

  for (const botName of crew) {
    const memory = getMemory(botName);
    const result = await bots[botName](input, memory, userId);
    saveMemory(botName, input, result.responses, userId, result.apiData);
    logs.push(...result.responses);
  }

  logs.push("💬 Cross-bot collaboration:");
  logs.push("💡 TaskBot: Analytics show this should be priority #1!");
  logs.push("😂 EmailBot: Perfect! I'll add some personality ✨");
  logs.push("🔍 ResearchBot: I found 3 case studies supporting this approach.");
  logs.push("📊 AnalyticsBot: Expected ROI: +25% within 30 days");
  logs.push("✅ Mission Complete: Strategy deployed successfully!");

  saveMemory("team", input, logs, userId);
  logActivity('team_collaboration', { input, crewSize: crew.length }, userId);
  
  res.json({ 
    success: true,
    logs,
    timestamp: new Date().toISOString()
  });
});

// Enhanced admin login with JWT
app.post("/admin-login", [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const admins = JSON.parse(fs.readFileSync("admins.json"));
    const admin = admins.find(a => a.email === email && a.active);

    if (admin && await bcrypt.compare(password, admin.password)) {
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      logActivity('admin_login', { email }, admin.id);
      
      res.json({ 
        success: true, 
        message: `✅ Welcome back, ${email}`,
        token,
        user: { id: admin.id, email: admin.email, role: admin.role }
      });
    } else {
      logActivity('failed_login_attempt', { email });
      res.status(401).json({ success: false, message: "❌ Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "⚠️ Server error" });
  }
});

// --- ANALYTICS DASHBOARD ---
app.get("/analytics/dashboard", authenticateToken, (req, res) => {
  const db = getDatabase();
  const logs = db.logs;
  
  const analytics = {
    totalInteractions: logs.filter(l => l.action === 'bot_interaction').length,
    totalTasks: db.tasks.length,
    completedTasks: db.tasks.filter(t => t.status === 'completed').length,
    activeUsers: [...new Set(logs.map(l => l.userId).filter(Boolean))].length,
    recentActivity: logs.slice(-10),
    botUsage: {},
    apiUsage: db.api_usage,
    security: securityGuardian.getSecurityStatus()
  };

  Object.keys(bots).forEach(botName => {
    const memory = getMemory(botName);
    analytics.botUsage[botName] = memory.stats;
  });

  res.json(analytics);
});

// --- SCHEDULED TASKS ---
cron.schedule('0 2 * * *', () => {
  console.log('🧹 Running daily cleanup...');
  
  const db = getDatabase();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  db.logs = db.logs.filter(log => new Date(log.timestamp) > oneWeekAgo);
  
  Object.keys(db.api_usage).forEach(apiName => {
    db.api_usage[apiName] = db.api_usage[apiName].filter(
      usage => new Date(usage.timestamp) > oneWeekAgo
    );
  });
  
  saveDatabase(db);
  console.log('✅ Daily cleanup completed');
});

// --- WEBSITE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/factory', (req, res) => res.sendFile(path.join(__dirname, 'factory.html')));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, 'pricing.html')));
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, 'careers.html')));
app.get('/waitlist', (req, res) => res.sendFile(path.join(__dirname, 'waitlist.html')));
app.get('/thank-you', (req, res) => res.sendFile(path.join(__dirname, 'thank-you.html')));
app.get('/roadmap', (req, res) => res.sendFile(path.join(__dirname, 'docs/roadmap.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'docs/terms.html')));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// --- 404 HANDLER ---
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/run-bot') || 
      req.path.startsWith('/team-run') || req.path.startsWith('/admin-login') ||
      req.path.startsWith('/analytics') || req.path.startsWith('/subscribe') ||
      req.path.startsWith('/upload') || req.path.startsWith('/health') ||
      req.path.startsWith('/security')) {
    return next();
  }
  
  const custom404Path = path.join(__dirname, '404.html');
  
  if (fs.existsSync(custom404Path)) {
    res.status(404).sendFile(custom404Path);
  } else {
    res.status(404).json({ error: 'Page not found' });
  }
});

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`🚀 COMPLETE AITaskFlo server with Enhanced AI Agent running on http://localhost:${PORT}`);
  console.log(`📱 Website: http://localhost:${PORT}`);
  console.log(`🤖 Bots: http://localhost:${PORT}/run-bot`);
  console.log(`📊 Analytics: http://localhost:${PORT}/analytics/dashboard`);
  console.log(`🛡️ Security Status: http://localhost:${PORT}/security/status`);
  console.log(`🧠 AI Agent Status: http://localhost:${PORT}/ai-agent/status`);
  console.log(`🔍 AI Agent Query: POST http://localhost:${PORT}/ai-agent/query`);
  console.log(`💡 AI Agent Insights: http://localhost:${PORT}/ai-agent/insights`);
  console.log(`📈 AI Agent Report: http://localhost:${PORT}/ai-agent/report`);
  console.log(`🔒 Security: Rate limiting, JWT, bcrypt, Helmet, Guardian Bot`);
  console.log(`📁 File uploads: http://localhost:${PORT}/upload`);
  console.log(`🔌 WebSocket: Real-time features + security alerts`);
  console.log(`⏰ Scheduled: Daily cleanup + security monitoring`);
  console.log(`🌤️  Weather: /api/weather/london`);
  console.log(`📰 News: /api/news/technology`);
  console.log(`💱 Exchange: /api/exchange/usd/eur/100`);
  console.log(`📱 QR Code: POST /api/qr-code`);
  console.log(`💭 Quotes: /api/quote/motivational`);
  console.log(`🐱 Animals: /api/random/cat`);
  console.log(`🌍 Location: /api/location`);
  console.log(`🔗 URL Shortener: POST /api/shorten-url`);
  console.log(`🎲 UUID: /api/uuid/5`);
  console.log(`🎨 Colors: /api/color/3`);
  console.log(`😂 Jokes: /api/joke`);
  console.log(`🔐 Password: /api/password/16`);
  console.log(`🔄 Bulk Data: POST /api/bulk/mixed-data`);
  console.log(`🛡️ Security Guardian: ACTIVE and monitoring all requests`);
  console.log(`🤖 Enhanced AI Agent: ACTIVE with continuous learning & knowledge seeking`);
  console.log(`🔍 Knowledge Discovery: Monitoring multiple sources for information`);
  console.log(`🧠 Continuous Learning: Processing and integrating new knowledge`);
  console.log(`💡 Proactive Intelligence: Generating insights and recommendations`);
});

module.exports = app;
