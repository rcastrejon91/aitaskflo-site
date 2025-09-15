# AITaskFlo Security Documentation

## Overview

AITaskFlo has been enhanced with comprehensive security features to protect against modern web threats and vulnerabilities. This document outlines the security architecture, features, and best practices.

## Security Features

### 1. Enhanced Security Guardian Bot v2.0

**ML-Based Threat Detection**
- Behavioral analysis and user profiling
- Anomaly detection with adaptive thresholds
- Multi-layered threat assessment
- Real-time pattern recognition

**Threat Categories Detected:**
- SQL Injection attempts
- Cross-Site Scripting (XSS)
- Command injection
- Path traversal attacks
- Behavioral anomalies
- Time-based suspicious activity
- Network-based threats
- File upload anomalies

### 2. Input Validation & Sanitization

**Comprehensive Protection:**
- XSS prevention using DOMPurify
- SQL injection protection
- Parameter pollution prevention
- Deep object sanitization
- String length and complexity limits
- Email and URL validation

### 3. Authentication & Authorization

**Multi-Factor Authentication (MFA):**
- TOTP (Time-based One-Time Password) support
- QR code generation for easy setup
- Backup codes for recovery
- Account lockout after failed attempts

**JWT Security:**
- Strong token generation with configurable expiration
- Secure algorithm selection (HS256)
- Audience and issuer validation
- Token rotation support

### 4. Advanced Encryption

**Data Protection:**
- AES-256 encryption for sensitive data
- bcrypt password hashing (12 rounds)
- HMAC signatures for API authentication
- Secure random token generation

**Features:**
- Data anonymization for GDPR compliance
- Password reset tokens
- Email verification tokens
- File integrity verification

### 5. Security Headers & CSP

**Helmet.js Integration:**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-XSS-Protection
- X-Content-Type-Options
- Referrer Policy

### 6. Rate Limiting & DDoS Protection

**Intelligent Rate Limiting:**
- Global rate limits (100 req/15min)
- API-specific limits (20 req/min)
- Authentication limits (5 attempts/15min)
- Progressive penalties for repeat offenders

### 7. File Upload Security

**Secure File Handling:**
- MIME type validation
- File extension verification
- Size limitations (5MB default)
- Secure filename generation
- Upload directory protection

### 8. Advanced Logging & Monitoring

**Comprehensive Logging:**
- Security event logging
- Audit trail for compliance
- Log rotation and archival
- Real-time threat monitoring
- Integration points for SIEM systems

**Log Categories:**
- Security events and threats
- Authentication attempts
- File operations
- API usage tracking
- Performance metrics

### 9. Session Management

**Secure Sessions:**
- Secure session ID generation
- HttpOnly and Secure flags
- SameSite cookie protection
- Session timeout controls

### 10. API Security

**Enhanced API Protection:**
- Request signature validation
- API key management
- Version control with deprecation notices
- CORS configuration
- Request/response logging

## Configuration

### Environment Variables

Key security configurations via environment variables:

```bash
# Core Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-256-bit-encryption-key-32-chars-long
SESSION_SECRET=your-session-secret-key-change-this

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
API_RATE_LIMIT_MAX_REQUESTS=20

# File Upload Security
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,pdf,txt,docx

# Content Security Policy
CSP_SCRIPT_SRC=self,unsafe-inline,cdnjs.cloudflare.com
CSP_STYLE_SRC=self,unsafe-inline,fonts.googleapis.com

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
ADMIN_EMAIL=admin@yourdomain.com

# Security Monitoring
SECURITY_LOCKDOWN_THRESHOLD=100
LOG_LEVEL=info
SECURITY_LOG_ENABLED=true
```

### Security Configuration File

Located at `config/security-config.js`, this centralizes all security settings:

- JWT configuration
- Rate limiting rules
- Content Security Policy directives
- File upload restrictions
- Validation rules
- Logging configuration

## Security Endpoints

### Admin Security Management

**GET /security/status** (Admin only)
- Current security status
- Threat detection statistics
- ML model performance metrics

**GET /security/threats** (Admin only)
- Comprehensive threat report
- Recent threat analysis
- Security recommendations

**POST /security/unblock-ip** (Admin only)
- Manually unblock IP addresses
- Requires IP validation

**POST /security/emergency-lockdown** (Admin only)
- Emergency system lockdown
- Blocks all incoming traffic

**POST /security/activate** (Admin only)
- Reactivate security guardian
- Resume normal operations

## Best Practices

### For Developers

1. **Input Validation**
   - Always validate user input on both client and server side
   - Use the provided validation utilities
   - Never trust client-side validation alone

2. **Authentication**
   - Implement MFA for all admin accounts
   - Use strong passwords with complexity requirements
   - Rotate JWT secrets regularly

3. **API Security**
   - Implement proper rate limiting
   - Use HTTPS in production
   - Validate API keys and signatures

4. **File Uploads**
   - Validate file types using both MIME type and extension
   - Limit file sizes appropriately
   - Store uploaded files outside the web root

5. **Logging**
   - Log all security-relevant events
   - Implement log rotation to manage disk space
   - Monitor logs for suspicious patterns

### For System Administrators

1. **Environment Setup**
   - Use strong, unique secrets for all environment variables
   - Enable HTTPS with valid SSL certificates
   - Configure firewall rules appropriately

2. **Monitoring**
   - Set up alerts for security threshold breaches
   - Regularly review security logs
   - Monitor system performance metrics

3. **Updates**
   - Keep all dependencies up to date
   - Apply security patches promptly
   - Regularly review and update security configurations

4. **Backup & Recovery**
   - Implement secure backup procedures
   - Test disaster recovery plans
   - Encrypt sensitive data at rest

## Security Testing

### Automated Testing

The security test suite includes:

- Input validation tests
- Authentication flow tests
- Encryption/decryption tests
- Rate limiting tests
- File upload security tests

Run security tests:
```bash
npm run test:security
```

### Manual Testing

1. **Penetration Testing**
   - SQL injection attempts
   - XSS payload testing
   - Authentication bypass attempts
   - Rate limiting validation

2. **Security Scanning**
   - Dependency vulnerability scanning
   - Code security analysis
   - Configuration review

## Compliance

### GDPR Compliance

- Data anonymization utilities
- User data export capabilities
- Data retention policies
- Privacy policy enforcement
- Consent management

### Security Standards

- OWASP Top 10 protection
- Secure coding practices
- Regular security audits
- Incident response procedures

## Incident Response

### Security Event Handling

1. **Detection**
   - Automated threat detection
   - Real-time monitoring
   - Log analysis

2. **Response**
   - Automatic IP blocking for high threats
   - Alert notifications
   - Incident logging

3. **Recovery**
   - Threat analysis and remediation
   - System restoration procedures
   - Post-incident review

### Emergency Procedures

1. **Immediate Actions**
   - Activate emergency lockdown if needed
   - Block malicious IP addresses
   - Notify security team

2. **Investigation**
   - Analyze threat patterns
   - Review security logs
   - Assess impact and damage

3. **Remediation**
   - Apply security patches
   - Update security rules
   - Strengthen affected systems

## Support

For security-related questions or to report vulnerabilities:

- Email: security@aitaskflo.com
- Emergency: Use the emergency lockdown endpoint
- Documentation: Check this security guide

## Changelog

### Version 2.0.0 (Latest)
- Added ML-based anomaly detection
- Enhanced behavioral analysis
- Improved threat scoring
- Advanced security monitoring
- Comprehensive logging system

### Version 1.0.0
- Basic Security Guardian Bot
- Input validation and sanitization
- JWT authentication
- Rate limiting
- File upload security