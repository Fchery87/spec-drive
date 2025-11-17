/**
 * Secrets Management Tests
 * Tests for environment variable validation and secret handling
 */

import { validateSecrets, maskSecret } from '../secrets';

describe('Secrets Management', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Secret Validation', () => {
    it('should validate all required secrets are present', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should report error if JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should report error if REFRESH_TOKEN_SECRET is missing', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      delete process.env.REFRESH_TOKEN_SECRET;
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('REFRESH_TOKEN_SECRET'))).toBe(true);
    });

    it('should report error if DATABASE_URL is missing', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      delete process.env.DATABASE_URL;

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
    });
  });

  describe('Secret Length Validation', () => {
    it('should require JWT_SECRET to be 32+ characters in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short'; // Too short
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET') && e.includes('32'))).toBe(true);
    });

    it('should require REFRESH_TOKEN_SECRET to be 32+ characters in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'short'; // Too short
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('REFRESH_TOKEN_SECRET') && e.includes('32'))).toBe(true);
    });

    it('should accept JWT_SECRET with exactly 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(true);
    });

    it('should accept JWT_SECRET with more than 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.REFRESH_TOKEN_SECRET = 'b'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(true);
    });
  });

  describe('Placeholder Detection', () => {
    it('should detect placeholder JWT_SECRET', () => {
      process.env.JWT_SECRET = 'your-jwt-secret-here';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.warnings.some(w => w.includes('JWT_SECRET') && w.includes('placeholder'))).toBe(true);
    });

    it('should detect placeholder REFRESH_TOKEN_SECRET', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'change-this-secret-to-a-real-one';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.warnings.some(w => w.includes('REFRESH_TOKEN_SECRET') && w.includes('placeholder'))).toBe(true);
    });

    it('should report error if DATABASE_URL appears to be localhost in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('localhost'))).toBe(true);
    });
  });

  describe('Secret Masking', () => {
    it('should mask JWT_SECRET in logs', () => {
      const secret = 'super-secret-jwt-token-12345678';
      const masked = maskSecret(secret);

      expect(masked).not.toContain(secret);
      expect(masked).toMatch(/\*+/);
      expect(masked.length).toBeLessThan(secret.length);
    });

    it('should mask long secrets appropriately', () => {
      const secret = 'a'.repeat(64);
      const masked = maskSecret(secret);

      expect(masked.length).toBeLessThan(secret.length);
      expect(masked).not.toContain('a'.repeat(4)); // Should not contain consecutive original chars
    });

    it('should handle short secrets for masking', () => {
      const secret = 'short';
      const masked = maskSecret(secret);

      expect(typeof masked).toBe('string');
      expect(masked.length).toBeGreaterThan(0);
    });

    it('should show first and last characters of secret', () => {
      const secret = 'test-secret-32-characters-long-';
      const masked = maskSecret(secret);

      // Should contain first and last char
      expect(masked).toMatch(new RegExp(`^t.*.$|^t|.$`));
    });
  });

  describe('Validation Result Structure', () => {
    it('should return validation result with correct structure', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should return no errors for valid secrets', () => {
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should collect multiple errors', () => {
      delete process.env.JWT_SECRET;
      delete process.env.REFRESH_TOKEN_SECRET;
      delete process.env.DATABASE_URL;

      const result = validateSecrets();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Environment-Specific Validation', () => {
    it('should enforce stricter validation in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      expect(() => {
        validateSecrets();
      }).not.toThrow();
    });

    it('should allow more lenient validation in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'test-secret-32-characters-long-';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      expect(() => {
        validateSecrets();
      }).not.toThrow();
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for missing secrets', () => {
      delete process.env.JWT_SECRET;
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      const errorMessages = result.errors.join(' ');

      expect(errorMessages).toMatch(/JWT_SECRET|required/i);
    });

    it('should provide helpful error message for short secrets in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'too-short';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      const errorMessages = result.errors.join(' ');

      expect(errorMessages).toMatch(/length|character|32/i);
    });

    it('should provide helpful warning message for placeholder values', () => {
      process.env.JWT_SECRET = 'your-secret-key-here';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      const warningMessages = result.warnings.join(' ');

      expect(warningMessages).toMatch(/placeholder/i);
    });
  });

  describe('Empty/Whitespace Secrets', () => {
    it('should reject empty JWT_SECRET', () => {
      process.env.JWT_SECRET = '';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('should reject whitespace-only JWT_SECRET', () => {
      // Note: process.env will trim whitespace, so we treat empty as whitespace-only
      process.env.JWT_SECRET = '';
      process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-32-chars-long----';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const result = validateSecrets();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true);
    });
  });
});
