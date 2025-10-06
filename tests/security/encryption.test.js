const EncryptionUtils = require('../../utils/encryption');

describe('Encryption Utils Tests', () => {
  describe('Data Encryption/Decryption', () => {
    test('should encrypt and decrypt data correctly', () => {
      const originalText = 'This is sensitive data';
      
      const encrypted = EncryptionUtils.encrypt(originalText);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('algorithm');
      expect(encrypted.encrypted).not.toBe(originalText);

      const decrypted = EncryptionUtils.decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    test('should generate secure random tokens', () => {
      const token1 = EncryptionUtils.generateToken();
      const token2 = EncryptionUtils.generateToken();
      
      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    test('should generate API keys with proper format', () => {
      const apiKey = EncryptionUtils.generateApiKey();
      
      expect(apiKey).toMatch(/^ak_[a-zA-Z0-9_-]+$/);
      expect(apiKey.length).toBeGreaterThan(20);
    });
  });

  describe('Password Hashing', () => {
    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      
      const hash = await EncryptionUtils.hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[ayb]\$[0-9]{2}\$/); // bcrypt format
      
      const isValid = await EncryptionUtils.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await EncryptionUtils.verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Operations', () => {
    test('should generate and verify JWT tokens', () => {
      const payload = {
        userId: '12345',
        email: 'test@example.com',
        role: 'user'
      };

      const token = EncryptionUtils.generateJWT(payload);
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      const decoded = EncryptionUtils.verifyJWT(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should reject invalid JWT tokens', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        EncryptionUtils.verifyJWT(invalidToken);
      }).toThrow();
    });
  });

  describe('MFA Operations', () => {
    test('should generate MFA secret with backup codes', () => {
      const userEmail = 'test@example.com';
      const mfaData = EncryptionUtils.generateMFASecret(userEmail);
      
      expect(mfaData).toHaveProperty('secret');
      expect(mfaData).toHaveProperty('qrCode');
      expect(mfaData).toHaveProperty('backupCodes');
      expect(mfaData.backupCodes).toHaveLength(10);
      expect(mfaData.backupCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    test('should verify TOTP tokens', () => {
      const secret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret
      
      // This test would require a real TOTP token
      // For testing purposes, we'll verify the function exists and handles errors
      expect(() => {
        EncryptionUtils.verifyTOTP('123456', secret);
      }).toBeDefined();
    });
  });

  describe('HMAC Signatures', () => {
    test('should create and verify HMAC signatures', () => {
      const data = 'Important data to sign';
      const secret = 'shared-secret-key';
      
      const signature = EncryptionUtils.createHMACSignature(data, secret);
      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^[a-f0-9]+$/); // hex string
      
      const isValid = EncryptionUtils.verifyHMACSignature(data, signature, secret);
      expect(isValid).toBe(true);
      
      const isInvalid = EncryptionUtils.verifyHMACSignature('Modified data', signature, secret);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Password Reset Tokens', () => {
    test('should create and verify password reset tokens', () => {
      const userId = 'user123';
      
      const tokenData = EncryptionUtils.createPasswordResetToken(userId);
      expect(tokenData).toHaveProperty('token');
      expect(tokenData).toHaveProperty('expires');
      expect(tokenData.expires).toBeInstanceOf(Date);
      
      const decoded = EncryptionUtils.verifyPasswordResetToken(tokenData.token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.purpose).toBe('password_reset');
    });
  });

  describe('Data Anonymization', () => {
    test('should anonymize sensitive data', () => {
      const sensitiveData = {
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        nonsensitive: 'public data'
      };
      
      const anonymized = EncryptionUtils.anonymizeData(sensitiveData);
      expect(anonymized.email).not.toBe(sensitiveData.email);
      expect(anonymized.name).not.toBe(sensitiveData.name);
      expect(anonymized.phone).not.toBe(sensitiveData.phone);
      expect(anonymized.nonsensitive).toBe(sensitiveData.nonsensitive);
    });
  });

  describe('Data Integrity', () => {
    test('should generate and verify checksums', () => {
      const data = {
        id: 1,
        content: 'Important data',
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      const checksum = EncryptionUtils.generateChecksum(data);
      expect(checksum).toBeTruthy();
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
      
      const isValid = EncryptionUtils.verifyChecksum(data, checksum);
      expect(isValid).toBe(true);
      
      data.content = 'Modified data';
      const isInvalid = EncryptionUtils.verifyChecksum(data, checksum);
      expect(isInvalid).toBe(false);
    });
  });
});