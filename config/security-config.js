const path = require('path');

// Centralized security configuration
const securityConfig = {
  // Environment-based settings
  environment: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
    expiresIn: '24h',
    algorithm: 'HS256',
    audience: 'aitaskflo-users',
    issuer: 'aitaskflo-api'
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // Rate Limiting Configuration
  rateLimiting: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // seconds
      },
      standardHeaders: true,
      legacyHeaders: false
    },
    api: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 20,
      message: {
        error: 'API rate limit exceeded',
        retryAfter: 60
      }
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 15 * 60
      }
    }
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Consider removing this in production
        "cdnjs.cloudflare.com",
        "cdn.jsdelivr.net",
        "unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Consider removing this in production
        "fonts.googleapis.com",
        "cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "*.githubusercontent.com",
        "*.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "fonts.googleapis.com",
        "fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "api.openweathermap.org",
        "newsapi.org",
        "api.exchangerate-api.com"
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    },
    reportUri: process.env.CSP_REPORT_URI || null
  },

  // Helmet Configuration
  helmet: {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {} // Will be populated from csp config above
    },
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginOpenerPolicy: { policy: "cross-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  },

  // File Upload Security
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedExtensions: (process.env.ALLOWED_FILE_TYPES || 'jpeg,jpg,png,gif,pdf,txt,docx').split(','),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    quarantineDir: './quarantine'
  },

  // Input Validation Rules
  validation: {
    email: {
      normalizeEmail: {
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      }
    },
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      forbiddenPatterns: [
        'password',
        '123456',
        'qwerty',
        'admin',
        'root'
      ]
    },
    general: {
      maxStringLength: 1000,
      maxArrayLength: 100,
      maxObjectDepth: 5
    }
  },

  // Security Guardian Bot Configuration
  securityGuardian: {
    enabled: true,
    alertThresholds: {
      failedLogins: 5,
      rapidRequests: parseInt(process.env.SECURITY_LOCKDOWN_THRESHOLD) || 50,
      suspiciousPatterns: 3,
      fileUploadAnomalies: 3
    },
    blockDuration: {
      temporary: 15 * 60 * 1000, // 15 minutes
      extended: 24 * 60 * 60 * 1000, // 24 hours
      permanent: -1 // Never unblock automatically
    },
    monitoringInterval: 60000, // 1 minute
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    threatScoring: {
      sqlInjection: 25,
      xssAttempt: 20,
      suspiciousEndpoint: 20,
      rapidRequests: 30,
      botDetected: 10,
      fileUploadAnomaly: 15
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    securityLogEnabled: process.env.SECURITY_LOG_ENABLED !== 'false',
    auditLogEnabled: process.env.AUDIT_LOG_ENABLED !== 'false',
    logRotation: {
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '100m'
    },
    logPaths: {
      security: path.join(__dirname, '../logs/security.log'),
      audit: path.join(__dirname, '../logs/audit.log'),
      application: path.join(__dirname, '../logs/application.log'),
      error: path.join(__dirname, '../logs/error.log')
    }
  },

  // Multi-Factor Authentication
  mfa: {
    enabled: true,
    issuer: 'AITaskFlo',
    window: 2, // Allow 2 time-step window for TOTP
    algorithm: 'sha256',
    period: 30, // 30 seconds
    digits: 6,
    encoding: 'base32'
  },

  // API Security
  api: {
    keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
    signatureEnabled: true,
    versioningEnabled: true,
    currentVersion: 'v1',
    deprecatedVersions: [],
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001']
  },

  // Privacy and Compliance
  privacy: {
    gdprEnabled: process.env.GDPR_ENABLED === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 365,
    cookieConsentRequired: true,
    privacyPolicyUrl: process.env.PRIVACY_POLICY_URL,
    termsOfServiceUrl: process.env.TERMS_OF_SERVICE_URL
  },

  // External Security Services
  external: {
    threatIntelligence: {
      enabled: !!process.env.THREAT_INTELLIGENCE_API_KEY,
      apiKey: process.env.THREAT_INTELLIGENCE_API_KEY,
      endpoint: 'https://api.threatintelligence.com/v1'
    },
    securityMonitoring: {
      webhookUrl: process.env.SECURITY_MONITORING_WEBHOOK,
      enabled: !!process.env.SECURITY_MONITORING_WEBHOOK
    }
  }
};

// Populate CSP directives from config
securityConfig.helmet.contentSecurityPolicy.directives = securityConfig.csp.directives;

module.exports = securityConfig;