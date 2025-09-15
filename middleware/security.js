const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const validator = require('validator');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const securityConfig = require('../config/security-config');
const logger = require('../utils/logger');

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Comprehensive input validation and sanitization middleware
 */
const inputValidation = (req, res, next) => {
  try {
    // Sanitize against NoSQL injection attacks
    req.body = mongoSanitize.sanitize(req.body);
    req.query = mongoSanitize.sanitize(req.query);
    req.params = mongoSanitize.sanitize(req.params);

    // Deep sanitization function
    const deepSanitize = (obj, depth = 0) => {
      if (depth > securityConfig.validation.general.maxObjectDepth) {
        throw new Error('Object depth exceeds maximum allowed');
      }

      if (Array.isArray(obj)) {
        if (obj.length > securityConfig.validation.general.maxArrayLength) {
          throw new Error('Array length exceeds maximum allowed');
        }
        return obj.map(item => deepSanitize(item, depth + 1));
      }

      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          const sanitizedKey = validator.escape(key);
          sanitized[sanitizedKey] = deepSanitize(value, depth + 1);
        }
        return sanitized;
      }

      if (typeof obj === 'string') {
        if (obj.length > securityConfig.validation.general.maxStringLength) {
          throw new Error('String length exceeds maximum allowed');
        }
        
        // XSS protection using DOMPurify
        const purified = purify.sanitize(obj);
        
        // Additional escape for special characters
        return validator.escape(purified);
      }

      return obj;
    };

    // Apply deep sanitization
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = deepSanitize(req.body);
    }

    // Validate and sanitize specific common fields
    if (req.body.email) {
      req.body.email = validator.normalizeEmail(req.body.email, securityConfig.validation.email.normalizeEmail);
      if (!validator.isEmail(req.body.email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          field: 'email'
        });
      }
    }

    // URL validation
    if (req.body.url && !validator.isURL(req.body.url, { require_protocol: true })) {
      return res.status(400).json({
        error: 'Invalid URL format',
        field: 'url'
      });
    }

    next();
  } catch (error) {
    logger.security('Input validation error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    res.status(400).json({
      error: 'Invalid input data',
      message: 'Please check your input and try again'
    });
  }
};

/**
 * Advanced password validation
 */
const passwordValidation = (password) => {
  const config = securityConfig.validation.password;
  const errors = [];

  if (!password || password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  if (password && password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for forbidden patterns
  const passwordLower = password.toLowerCase();
  for (const pattern of config.forbiddenPatterns) {
    if (passwordLower.includes(pattern.toLowerCase())) {
      errors.push(`Password contains forbidden pattern: ${pattern}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  if (!password) return { score: 0, level: 'Very Weak', feedback: ['Password is required'] };

  // Length score
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  else feedback.push('Use 12+ characters for better security');

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 10;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score += 10;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
  else feedback.push('Add special characters');

  // Bonus for very long passwords
  if (password.length >= 16) score += 10;

  // Penalty for common patterns
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 15; // Sequential patterns

  let level;
  if (score < 30) level = 'Very Weak';
  else if (score < 50) level = 'Weak';
  else if (score < 70) level = 'Fair';
  else if (score < 90) level = 'Good';
  else level = 'Excellent';

  return { score: Math.max(0, score), level, feedback };
};

/**
 * Request signature validation middleware
 */
const requestSignature = (req, res, next) => {
  if (!securityConfig.api.signatureEnabled) {
    return next();
  }

  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const apiKey = req.headers['x-api-key'];

  if (!signature || !timestamp || !apiKey) {
    return res.status(401).json({
      error: 'Missing required signature headers',
      required: ['x-signature', 'x-timestamp', 'x-api-key']
    });
  }

  // Check timestamp to prevent replay attacks
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > 5 * 60 * 1000) { // 5 minutes tolerance
    return res.status(401).json({
      error: 'Request timestamp is too old',
      maxAge: '5 minutes'
    });
  }

  // Validate signature (implementation depends on your signature algorithm)
  // This is a placeholder - implement your signature validation logic here
  
  next();
};

/**
 * Enhanced rate limiting with progressive penalties
 */
const createRateLimiter = (options = {}) => {
  const config = { ...securityConfig.rateLimiting.global, ...options };
  
  return rateLimit({
    ...config,
    handler: (req, res) => {
      logger.security('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        remainingPoints: req.rateLimit.remaining,
        resetTime: new Date(req.rateLimit.resetTime)
      });

      res.status(429).json({
        error: config.message.error,
        retryAfter: config.message.retryAfter,
        limit: config.max,
        remaining: 0,
        resetTime: new Date(Date.now() + config.windowMs).toISOString()
      });
    },
    skip: (req) => {
      // Skip rate limiting for security endpoints in emergency
      if (req.path.startsWith('/security/emergency') && req.user?.role === 'super-admin') {
        return true;
      }
      return false;
    }
  });
};

/**
 * File upload security middleware
 */
const fileUploadSecurity = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  const config = securityConfig.fileUpload;

  for (const file of files) {
    if (!file) continue;

    // Check file size
    if (file.size > config.maxFileSize) {
      return res.status(400).json({
        error: 'File size exceeds maximum allowed',
        maxSize: `${config.maxFileSize / (1024 * 1024)}MB`,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
      });
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'File type not allowed',
        allowedTypes: config.allowedMimeTypes,
        receivedType: file.mimetype
      });
    }

    // Check file extension
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: 'File extension not allowed',
        allowedExtensions: config.allowedExtensions,
        receivedExtension: ext
      });
    }

    // Log file upload for security monitoring
    logger.security('File upload', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  next();
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const version = req.headers['api-version'] || req.query.version || securityConfig.api.currentVersion;
  
  if (securityConfig.api.deprecatedVersions.includes(version)) {
    res.set('X-API-Deprecated', 'true');
    res.set('X-API-Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
    
    logger.audit('Deprecated API version used', {
      version,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
  }

  req.apiVersion = version;
  next();
};

/**
 * Security headers middleware (enhanced helmet configuration)
 */
const securityHeaders = (req, res, next) => {
  // Add custom security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });

  // Add CSP nonce for inline scripts if needed
  if (securityConfig.csp.directives.scriptSrc.includes("'nonce-'")) {
    const nonce = require('crypto').randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    res.set('Content-Security-Policy', 
      res.get('Content-Security-Policy')?.replace("'nonce-'", `'nonce-${nonce}'`)
    );
  }

  next();
};

/**
 * Request context middleware for security logging
 */
const requestContext = (req, res, next) => {
  req.security = {
    requestId: require('crypto').randomUUID(),
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer')
  };

  // Add request ID to response headers for tracking
  res.set('X-Request-ID', req.security.requestId);

  next();
};

/**
 * Parameter pollution protection
 */
const parameterPollution = hpp({
  whitelist: ['tags', 'fields', 'sort'] // Allow arrays for these parameters
});

/**
 * Export all middleware functions
 */
module.exports = {
  inputValidation,
  passwordValidation,
  calculatePasswordStrength,
  requestSignature,
  createRateLimiter,
  fileUploadSecurity,
  apiVersioning,
  securityHeaders,
  requestContext,
  parameterPollution,
  
  // Pre-configured rate limiters
  globalRateLimit: createRateLimiter(securityConfig.rateLimiting.global),
  apiRateLimit: createRateLimiter(securityConfig.rateLimiting.api),
  authRateLimit: createRateLimiter(securityConfig.rateLimiting.auth)
};