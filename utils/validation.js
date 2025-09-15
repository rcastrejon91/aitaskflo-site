const validator = require('validator');
const { body, query, param, header } = require('express-validator');
const securityConfig = require('../config/security-config');

/**
 * Input validation helpers and common validation chains
 */
class ValidationUtils {
  constructor() {
    this.config = securityConfig.validation;
  }

  /**
   * Common validation chains
   */
  static validationChains = {
    // Email validation
    email: () => [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail(securityConfig.validation.email.normalizeEmail)
        .isLength({ max: 254 })
        .withMessage('Email must not exceed 254 characters')
    ],

    // Password validation
    password: () => [
      body('password')
        .isLength({ 
          min: securityConfig.validation.password.minLength,
          max: securityConfig.validation.password.maxLength 
        })
        .withMessage(`Password must be between ${securityConfig.validation.password.minLength} and ${securityConfig.validation.password.maxLength} characters`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        .custom((value) => {
          const forbiddenPatterns = securityConfig.validation.password.forbiddenPatterns;
          const lowerValue = value.toLowerCase();
          
          for (const pattern of forbiddenPatterns) {
            if (lowerValue.includes(pattern.toLowerCase())) {
              throw new Error(`Password contains forbidden pattern: ${pattern}`);
            }
          }
          return true;
        })
    ],

    // Username validation
    username: () => [
      body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
        .custom((value) => {
          const forbidden = ['admin', 'root', 'system', 'test', 'null', 'undefined'];
          if (forbidden.includes(value.toLowerCase())) {
            throw new Error('Username is not allowed');
          }
          return true;
        })
    ],

    // URL validation
    url: () => [
      body('url')
        .isURL({ require_protocol: true })
        .withMessage('Must be a valid URL with protocol')
        .isLength({ max: 2048 })
        .withMessage('URL must not exceed 2048 characters')
        .custom((value) => {
          // Block dangerous protocols
          const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
          const lowerUrl = value.toLowerCase();
          
          for (const protocol of dangerousProtocols) {
            if (lowerUrl.startsWith(protocol)) {
              throw new Error('URL protocol not allowed');
            }
          }
          return true;
        })
    ],

    // Phone number validation
    phone: () => [
      body('phone')
        .optional()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Must be a valid phone number')
    ],

    // Name validation
    name: () => [
      body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s\-'\.]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods')
        .custom((value) => {
          // Trim and check for excessive whitespace
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            throw new Error('Name cannot be empty');
          }
          if (/\s{2,}/.test(trimmed)) {
            throw new Error('Name cannot contain consecutive spaces');
          }
          return true;
        })
    ],

    // Text content validation
    textContent: (maxLength = 1000) => [
      body('content')
        .isLength({ min: 1, max: maxLength })
        .withMessage(`Content must be between 1 and ${maxLength} characters`)
        .custom((value) => {
          // Check for excessive HTML-like content
          const htmlTagCount = (value.match(/<[^>]*>/g) || []).length;
          if (htmlTagCount > 5) {
            throw new Error('Content contains too many HTML-like tags');
          }
          return true;
        })
    ],

    // File upload validation
    fileUpload: () => [
      body().custom((value, { req }) => {
        if (!req.file && !req.files) {
          throw new Error('No file uploaded');
        }

        const files = req.files || [req.file];
        const config = securityConfig.fileUpload;

        for (const file of files) {
          if (file.size > config.maxFileSize) {
            throw new Error(`File size exceeds maximum of ${config.maxFileSize / (1024 * 1024)}MB`);
          }

          if (!config.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} is not allowed`);
          }
        }

        return true;
      })
    ],

    // API key validation
    apiKey: () => [
      header('x-api-key')
        .matches(/^ak_[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid API key format')
        .isLength({ min: 20, max: 100 })
        .withMessage('API key length is invalid')
    ],

    // JWT token validation
    bearerToken: () => [
      header('authorization')
        .matches(/^Bearer\s[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
        .withMessage('Invalid Bearer token format')
    ],

    // UUID validation
    uuid: (field = 'id') => [
      param(field)
        .isUUID()
        .withMessage(`${field} must be a valid UUID`)
    ],

    // Pagination validation
    pagination: () => [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be a positive integer between 1 and 1000'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be a positive integer between 1 and 100')
    ],

    // Search query validation
    searchQuery: () => [
      query('q')
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
        .withMessage('Search query contains invalid characters')
    ],

    // Date range validation
    dateRange: () => [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO8601 date'),
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO8601 date')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            const start = new Date(req.query.startDate);
            const end = new Date(value);
            if (end <= start) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
        })
    ],

    // IP address validation
    ipAddress: () => [
      body('ip')
        .isIP()
        .withMessage('Must be a valid IP address')
    ],

    // JSON validation
    jsonData: () => [
      body('data')
        .custom((value) => {
          try {
            if (typeof value === 'string') {
              JSON.parse(value);
            }
            return true;
          } catch (error) {
            throw new Error('Data must be valid JSON');
          }
        })
    ]
  };

  /**
   * Sanitize string input
   */
  static sanitizeString(str, options = {}) {
    if (typeof str !== 'string') return str;

    const {
      maxLength = 1000,
      allowHtml = false,
      stripTags = true,
      escapeHtml = true
    } = options;

    let sanitized = str.trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Strip HTML tags if not allowed
    if (!allowHtml && stripTags) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Escape HTML entities
    if (escapeHtml) {
      sanitized = validator.escape(sanitized);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize object recursively
   */
  static sanitizeObject(obj, depth = 0) {
    if (depth > securityConfig.validation.general.maxObjectDepth) {
      throw new Error('Object depth exceeds maximum allowed');
    }

    if (Array.isArray(obj)) {
      if (obj.length > securityConfig.validation.general.maxArrayLength) {
        throw new Error('Array length exceeds maximum allowed');
      }
      return obj.map(item => ValidationUtils.sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = ValidationUtils.sanitizeString(key, { maxLength: 100 });
        sanitized[sanitizedKey] = ValidationUtils.sanitizeObject(value, depth + 1);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return ValidationUtils.sanitizeString(obj);
    }

    return obj;
  }

  /**
   * Custom validation for MFA token
   */
  static mfaToken() {
    return [
      body('mfaToken')
        .isLength({ min: 6, max: 6 })
        .withMessage('MFA token must be 6 digits')
        .isNumeric()
        .withMessage('MFA token must contain only numbers')
    ];
  }

  /**
   * Custom validation for backup codes
   */
  static backupCode() {
    return [
      body('backupCode')
        .matches(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
        .withMessage('Backup code must be in format XXXX-XXXX')
    ];
  }

  /**
   * Bot input validation
   */
  static botInput() {
    return [
      body('botName')
        .isString()
        .isLength({ min: 1, max: 50 })
        .withMessage('Bot name must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Bot name can only contain letters, numbers, underscores, and hyphens'),
      body('input')
        .isString()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Input must be between 1 and 1000 characters')
        .custom((value) => {
          // Check for potential injection attempts
          const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /eval\(/i,
            /exec\(/i,
            /system\(/i
          ];

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              throw new Error('Input contains potentially dangerous content');
            }
          }
          return true;
        })
    ];
  }

  /**
   * Weather API validation
   */
  static weatherQuery() {
    return [
      param('city')
        .isLength({ min: 1, max: 100 })
        .withMessage('City name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s\-,\.]+$/)
        .withMessage('City name contains invalid characters')
    ];
  }

  /**
   * Currency exchange validation
   */
  static currencyExchange() {
    return [
      param('from')
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency code must be 3 characters')
        .isAlpha()
        .withMessage('Currency code must contain only letters')
        .toUpperCase(),
      param('to')
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency code must be 3 characters')
        .isAlpha()
        .withMessage('Currency code must contain only letters')
        .toUpperCase(),
      param('amount')
        .optional()
        .isFloat({ min: 0.01, max: 1000000 })
        .withMessage('Amount must be between 0.01 and 1,000,000')
    ];
  }

  /**
   * QR code generation validation
   */
  static qrCodeGeneration() {
    return [
      body('text')
        .isLength({ min: 1, max: 2000 })
        .withMessage('Text must be between 1 and 2000 characters'),
      body('size')
        .optional()
        .matches(/^\d+x\d+$/)
        .withMessage('Size must be in format WIDTHxHEIGHT')
        .custom((value) => {
          const [width, height] = value.split('x').map(Number);
          if (width < 50 || height < 50 || width > 1000 || height > 1000) {
            throw new Error('Size dimensions must be between 50 and 1000 pixels');
          }
          return true;
        })
    ];
  }

  /**
   * Security configuration validation
   */
  static securityConfig() {
    return [
      body('config')
        .isObject()
        .withMessage('Config must be an object')
        .custom((value) => {
          const allowedKeys = [
            'rateLimiting',
            'fileUpload',
            'logging',
            'alertThresholds'
          ];

          const invalidKeys = Object.keys(value).filter(
            key => !allowedKeys.includes(key)
          );

          if (invalidKeys.length > 0) {
            throw new Error(`Invalid configuration keys: ${invalidKeys.join(', ')}`);
          }

          return true;
        })
    ];
  }
}

module.exports = ValidationUtils;