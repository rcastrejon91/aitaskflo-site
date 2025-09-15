const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const securityConfig = require('../config/security-config');

// Ensure logs directory exists
const logsDir = path.dirname(securityConfig.logging.logPaths.application);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log formats
 */
const logFormats = {
  security: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, meta, ...rest }) => {
      return JSON.stringify({
        timestamp,
        level,
        type: 'security',
        message,
        meta: meta || {},
        ...rest
      });
    })
  ),

  audit: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, meta, ...rest }) => {
      return JSON.stringify({
        timestamp,
        level,
        type: 'audit',
        message,
        meta: meta || {},
        ...rest
      });
    })
  ),

  application: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [${level}]: ${message}`;
      
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      if (stack) {
        log += `\n${stack}`;
      }
      
      return log;
    })
  ),

  error: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, meta, ...rest }) => {
      return JSON.stringify({
        timestamp,
        level,
        type: 'error',
        message,
        stack,
        meta: meta || {},
        ...rest
      });
    })
  )
};

/**
 * Transport configurations
 */
const createDailyRotateTransport = (filename, format) => {
  return new DailyRotateFile({
    filename: filename.replace('.log', '-%DATE%.log'),
    datePattern: securityConfig.logging.logRotation.datePattern,
    maxFiles: securityConfig.logging.logRotation.maxFiles,
    maxSize: securityConfig.logging.logRotation.maxSize,
    format: format,
    zippedArchive: true,
    auditFile: path.join(logsDir, 'audit-hash.json')
  });
};

/**
 * Security Logger - for security events, threats, and violations
 */
const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormats.security,
  transports: [
    createDailyRotateTransport(securityConfig.logging.logPaths.security, logFormats.security),
    new winston.transports.Console({
      level: 'warn',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  exceptionHandlers: [
    createDailyRotateTransport(
      securityConfig.logging.logPaths.security.replace('.log', '-exceptions.log'),
      logFormats.security
    )
  ],
  rejectionHandlers: [
    createDailyRotateTransport(
      securityConfig.logging.logPaths.security.replace('.log', '-rejections.log'),
      logFormats.security
    )
  ]
});

/**
 * Audit Logger - for compliance and user activity tracking
 */
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormats.audit,
  transports: [
    createDailyRotateTransport(securityConfig.logging.logPaths.audit, logFormats.audit)
  ]
});

/**
 * Application Logger - for general application events
 */
const applicationLogger = winston.createLogger({
  level: securityConfig.logging.level,
  format: logFormats.application,
  transports: [
    createDailyRotateTransport(securityConfig.logging.logPaths.application, winston.format.json()),
    new winston.transports.Console({
      format: logFormats.application
    })
  ]
});

/**
 * Error Logger - for application errors and exceptions
 */
const errorLogger = winston.createLogger({
  level: 'error',
  format: logFormats.error,
  transports: [
    createDailyRotateTransport(securityConfig.logging.logPaths.error, logFormats.error)
  ],
  exceptionHandlers: [
    createDailyRotateTransport(
      securityConfig.logging.logPaths.error.replace('.log', '-exceptions.log'),
      logFormats.error
    )
  ],
  rejectionHandlers: [
    createDailyRotateTransport(
      securityConfig.logging.logPaths.error.replace('.log', '-rejections.log'),
      logFormats.error
    )
  ]
});

/**
 * Enhanced Logger Class with security-focused methods
 */
class SecurityLogger {
  constructor() {
    this.securityLogger = securityLogger;
    this.auditLogger = auditLogger;
    this.applicationLogger = applicationLogger;
    this.errorLogger = errorLogger;
  }

  /**
   * Log security events (threats, violations, blocks)
   */
  security(message, meta = {}) {
    if (!securityConfig.logging.securityLogEnabled) return;

    const logEntry = {
      message,
      meta: {
        ...meta,
        severity: meta.severity || 'medium',
        category: meta.category || 'security',
        source: meta.source || 'system'
      }
    };

    this.securityLogger.info(logEntry);

    // Also send to external security monitoring if configured
    this.sendToExternalMonitoring('security', logEntry);
  }

  /**
   * Log high-severity security threats
   */
  threat(message, meta = {}) {
    const threatEntry = {
      message,
      meta: {
        ...meta,
        severity: 'high',
        category: 'threat',
        alertRequired: true
      }
    };

    this.securityLogger.warn(threatEntry);
    this.sendToExternalMonitoring('threat', threatEntry);
    
    // Trigger immediate alert for high-severity threats
    this.triggerSecurityAlert(threatEntry);
  }

  /**
   * Log critical security incidents
   */
  incident(message, meta = {}) {
    const incidentEntry = {
      message,
      meta: {
        ...meta,
        severity: 'critical',
        category: 'incident',
        alertRequired: true,
        escalate: true
      }
    };

    this.securityLogger.error(incidentEntry);
    this.sendToExternalMonitoring('incident', incidentEntry);
    this.triggerSecurityAlert(incidentEntry);
  }

  /**
   * Log authentication events
   */
  auth(message, meta = {}) {
    const authEntry = {
      message,
      meta: {
        ...meta,
        category: 'authentication',
        userId: meta.userId || 'anonymous',
        sessionId: meta.sessionId,
        ip: meta.ip,
        userAgent: meta.userAgent
      }
    };

    this.securityLogger.info(authEntry);
    
    // Failed auth attempts get special handling
    if (meta.success === false) {
      this.threat(`Failed authentication attempt: ${message}`, meta);
    }
  }

  /**
   * Log access control events
   */
  access(message, meta = {}) {
    const accessEntry = {
      message,
      meta: {
        ...meta,
        category: 'access_control',
        resource: meta.resource,
        action: meta.action,
        allowed: meta.allowed
      }
    };

    this.securityLogger.info(accessEntry);

    // Log unauthorized access attempts as threats
    if (meta.allowed === false) {
      this.threat(`Unauthorized access attempt: ${message}`, meta);
    }
  }

  /**
   * Log file operations
   */
  fileOperation(message, meta = {}) {
    const fileEntry = {
      message,
      meta: {
        ...meta,
        category: 'file_operation',
        filename: meta.filename,
        operation: meta.operation,
        size: meta.size,
        mimetype: meta.mimetype
      }
    };

    this.securityLogger.info(fileEntry);

    // Suspicious file operations
    if (meta.suspicious) {
      this.threat(`Suspicious file operation: ${message}`, meta);
    }
  }

  /**
   * Log data privacy events (GDPR compliance)
   */
  privacy(message, meta = {}) {
    if (!securityConfig.privacy.gdprEnabled) return;

    const privacyEntry = {
      message,
      meta: {
        ...meta,
        category: 'privacy',
        dataType: meta.dataType,
        operation: meta.operation,
        legalBasis: meta.legalBasis
      }
    };

    this.auditLogger.info(privacyEntry);
  }

  /**
   * Log audit events for compliance
   */
  audit(message, meta = {}) {
    if (!securityConfig.logging.auditLogEnabled) return;

    const auditEntry = {
      message,
      meta: {
        ...meta,
        category: 'audit',
        actor: meta.actor || 'system',
        action: meta.action,
        resource: meta.resource,
        outcome: meta.outcome
      }
    };

    this.auditLogger.info(auditEntry);
  }

  /**
   * Log API usage for monitoring
   */
  api(message, meta = {}) {
    const apiEntry = {
      message,
      meta: {
        ...meta,
        category: 'api',
        endpoint: meta.endpoint,
        method: meta.method,
        statusCode: meta.statusCode,
        responseTime: meta.responseTime,
        apiKey: meta.apiKey ? '***masked***' : undefined
      }
    };

    this.applicationLogger.info(apiEntry);

    // Log suspicious API usage
    if (meta.suspicious || meta.statusCode >= 400) {
      this.security(`API security event: ${message}`, meta);
    }
  }

  /**
   * Log performance metrics
   */
  performance(message, meta = {}) {
    const perfEntry = {
      message,
      meta: {
        ...meta,
        category: 'performance',
        duration: meta.duration,
        memoryUsage: meta.memoryUsage,
        cpuUsage: meta.cpuUsage
      }
    };

    this.applicationLogger.info(perfEntry);

    // Alert on performance issues
    if (meta.duration > 5000 || meta.memoryUsage > 80) {
      this.security(`Performance alert: ${message}`, meta);
    }
  }

  /**
   * Log application errors
   */
  error(message, error = null, meta = {}) {
    const errorEntry = {
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null,
      meta: {
        ...meta,
        category: 'error'
      }
    };

    this.errorLogger.error(errorEntry);

    // Security-related errors
    if (meta.security || error?.name === 'SecurityError') {
      this.security(`Security error: ${message}`, { ...meta, error: error?.message });
    }
  }

  /**
   * Log general application info
   */
  info(message, meta = {}) {
    this.applicationLogger.info(message, meta);
  }

  /**
   * Log warnings
   */
  warn(message, meta = {}) {
    this.applicationLogger.warn(message, meta);
  }

  /**
   * Log debug information (only in development)
   */
  debug(message, meta = {}) {
    if (securityConfig.environment === 'development') {
      this.applicationLogger.debug(message, meta);
    }
  }

  /**
   * Send logs to external monitoring service
   */
  async sendToExternalMonitoring(type, entry) {
    if (!securityConfig.external.securityMonitoring.enabled) return;

    try {
      const webhook = securityConfig.external.securityMonitoring.webhookUrl;
      
      // This would integrate with your external monitoring service
      // Example: send to webhook, SIEM, or security platform
      console.log(`📡 External monitoring: ${type}`, entry.message);
      
    } catch (error) {
      console.error('Failed to send to external monitoring:', error);
    }
  }

  /**
   * Trigger immediate security alerts
   */
  async triggerSecurityAlert(entry) {
    try {
      // This would integrate with your alerting system
      // Example: send to Slack, email, SMS, or incident management platform
      console.log(`🚨 SECURITY ALERT: ${entry.message}`);
      
      // Could also trigger automated responses
      if (entry.meta.severity === 'critical') {
        console.log('🔒 Consider activating automated security responses');
      }
      
    } catch (error) {
      console.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Get log statistics for dashboard
   */
  async getLogStatistics(timeframe = '24h') {
    try {
      // This would query your log storage for statistics
      // For now, return mock data
      return {
        security: {
          total: 0,
          threats: 0,
          incidents: 0,
          blocked: 0
        },
        audit: {
          total: 0,
          privacy: 0,
          access: 0
        },
        errors: {
          total: 0,
          critical: 0
        },
        timeframe
      };
    } catch (error) {
      this.error('Failed to get log statistics', error);
      return null;
    }
  }

  /**
   * Search logs for forensic analysis
   */
  async searchLogs(query, options = {}) {
    try {
      // This would implement log search functionality
      console.log(`🔍 Log search: ${query}`, options);
      return [];
    } catch (error) {
      this.error('Failed to search logs', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new SecurityLogger();