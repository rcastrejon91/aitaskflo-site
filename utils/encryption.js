const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const securityConfig = require('../config/security-config');

/**
 * Encryption utilities for secure data handling
 */
class EncryptionUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 32;
    
    // Derive encryption key from environment variable or use default (not recommended for production)
    this.encryptionKey = this.deriveKey(
      process.env.ENCRYPTION_KEY || 'your-256-bit-encryption-key-32-chars-long'
    );
  }

  /**
   * Derive a proper encryption key from a password/secret
   */
  deriveKey(secret, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.saltLength);
    }
    return crypto.pbkdf2Sync(secret, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text, key = null) {
    try {
      const encryptionKey = key || this.encryptionKey;
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc'
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData, key = null) {
    try {
      const encryptionKey = key || this.encryptionKey;
      const { encrypted } = encryptedData;
      
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Generate secure random tokens
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure API keys
   */
  generateApiKey(prefix = 'ak') {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(24).toString('base64url');
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * Hash passwords securely
   */
  async hashPassword(password, saltRounds = 12) {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed: ' + error.message);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password verification failed: ' + error.message);
    }
  }

  /**
   * Generate JWT tokens with enhanced security
   */
  generateJWT(payload, options = {}) {
    const defaultOptions = {
      expiresIn: securityConfig.jwt.expiresIn,
      algorithm: securityConfig.jwt.algorithm,
      audience: securityConfig.jwt.audience,
      issuer: securityConfig.jwt.issuer,
      jwtid: crypto.randomUUID()
    };

    const jwtOptions = { ...defaultOptions, ...options };
    
    try {
      return jwt.sign(payload, securityConfig.jwt.secret, jwtOptions);
    } catch (error) {
      throw new Error('JWT generation failed: ' + error.message);
    }
  }

  /**
   * Verify JWT tokens
   */
  verifyJWT(token, options = {}) {
    const defaultOptions = {
      algorithms: [securityConfig.jwt.algorithm],
      audience: securityConfig.jwt.audience,
      issuer: securityConfig.jwt.issuer
    };

    const jwtOptions = { ...defaultOptions, ...options };

    try {
      return jwt.verify(token, securityConfig.jwt.secret, jwtOptions);
    } catch (error) {
      throw new Error('JWT verification failed: ' + error.message);
    }
  }

  /**
   * Generate MFA secret for TOTP
   */
  generateMFASecret(userEmail, serviceName = 'AITaskFlo') {
    try {
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: serviceName,
        length: 32,
        algorithm: securityConfig.mfa.algorithm
      });

      return {
        secret: secret.base32,
        qrCode: secret.otpauth_url,
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      throw new Error('MFA secret generation failed: ' + error.message);
    }
  }

  /**
   * Generate QR code for MFA setup
   */
  async generateMFAQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('QR code generation failed: ' + error.message);
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token, secret) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: securityConfig.mfa.encoding,
        token: token,
        window: securityConfig.mfa.window,
        time: Math.floor(Date.now() / 1000)
      });
    } catch (error) {
      throw new Error('TOTP verification failed: ' + error.message);
    }
  }

  /**
   * Generate backup codes for MFA
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g).join('-'));
    }
    return codes;
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Create HMAC signature for request authentication
   */
  createHMACSignature(data, secret, algorithm = 'sha256') {
    try {
      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      throw new Error('HMAC signature creation failed: ' + error.message);
    }
  }

  /**
   * Verify HMAC signature
   */
  verifyHMACSignature(data, signature, secret, algorithm = 'sha256') {
    try {
      const expectedSignature = this.createHMACSignature(data, secret, algorithm);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure file hash for integrity verification
   */
  generateFileHash(fileBuffer, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(fileBuffer).digest('hex');
  }

  /**
   * Generate secure nonce for CSP
   */
  generateNonce(length = 16) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Create password reset token with expiration
   */
  createPasswordResetToken(userId) {
    const payload = {
      userId,
      purpose: 'password_reset',
      timestamp: Date.now()
    };

    const token = this.generateJWT(payload, { expiresIn: '1h' });
    
    return {
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token) {
    try {
      const decoded = this.verifyJWT(token);
      
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Generate secure email verification token
   */
  createEmailVerificationToken(email) {
    const payload = {
      email,
      purpose: 'email_verification',
      timestamp: Date.now()
    };

    return this.generateJWT(payload, { expiresIn: '24h' });
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token) {
    try {
      const decoded = this.verifyJWT(token);
      
      if (decoded.purpose !== 'email_verification') {
        throw new Error('Invalid token purpose');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired email verification token');
    }
  }

  /**
   * Secure data anonymization for GDPR compliance
   */
  anonymizeData(data) {
    if (typeof data === 'string') {
      // Simple anonymization - replace with hash
      return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
    }

    if (typeof data === 'object' && data !== null) {
      const anonymized = {};
      for (const [key, value] of Object.entries(data)) {
        if (['email', 'phone', 'name', 'address'].includes(key.toLowerCase())) {
          anonymized[key] = this.anonymizeData(value);
        } else {
          anonymized[key] = value;
        }
      }
      return anonymized;
    }

    return data;
  }

  /**
   * Generate data integrity checksum
   */
  generateChecksum(data) {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyChecksum(data, expectedChecksum) {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
}

module.exports = new EncryptionUtils();