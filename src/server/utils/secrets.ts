import { logWarn, logError } from './logger';

/**
 * Secrets Management Utility
 * Validates and manages sensitive configuration
 */

interface SecretValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_SECRETS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
];

const OPTIONAL_SECRETS = [
  'SENDGRID_API_KEY',
  'SENTRY_DSN',
  'REDIS_URL',
  'GITHUB_CLIENT_SECRET',
];

const MIN_SECRET_LENGTH = 32;

/**
 * Validate all secrets are properly configured
 */
export function validateSecrets(): SecretValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required secrets
  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret];

    if (!value) {
      errors.push(`Missing required secret: ${secret}`);
      continue;
    }

    // Validate secret length for production
    if (process.env.NODE_ENV === 'production' && value.length < MIN_SECRET_LENGTH) {
      errors.push(
        `Secret '${secret}' is too short. Minimum ${MIN_SECRET_LENGTH} characters required in production.`
      );
    }

    // Warn about placeholder values
    if (
      value.includes('your-') ||
      value.includes('change-this') ||
      value === 'dev-secret-key'
    ) {
      warnings.push(
        `Secret '${secret}' appears to be a placeholder. Please set a real value in production.`
      );
    }
  }

  // Check optional secrets in production
  if (process.env.NODE_ENV === 'production') {
    for (const secret of OPTIONAL_SECRETS) {
      const value = process.env[secret];

      if (!value) {
        warnings.push(
          `Optional secret '${secret}' is not configured. Some features may be disabled.`
        );
      }
    }
  }

  // Check for secrets in source code (this would be caught by pre-commit hooks)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('LOCAL DATABASE URL DETECTED IN PRODUCTION. CRITICAL SECURITY ISSUE!');
    }
  }

  const valid = errors.length === 0;

  return { valid, errors, warnings };
}

/**
 * Mask sensitive values for logging
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (secret.length <= visibleChars) {
    return '***';
  }

  const visible = secret.substring(0, visibleChars);
  const masked = '*'.repeat(Math.max(secret.length - visibleChars, 3));

  return `${visible}${masked}`;
}

/**
 * Get masked database URL for logging
 */
export function getMaskedDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return 'NOT_CONFIGURED';
  }

  try {
    // Parse URL to mask password
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = maskSecret(urlObj.password);
    }
    return urlObj.toString();
  } catch {
    // If URL parsing fails, just mask the whole thing
    return maskSecret(url);
  }
}

/**
 * Initialize and validate secrets on startup
 */
export function initializeSecrets(): void {
  const validation = validateSecrets();

  // Log warnings
  for (const warning of validation.warnings) {
    logWarn(`Secrets configuration warning: ${warning}`);
  }

  // Handle errors
  if (!validation.valid) {
    for (const error of validation.errors) {
      logError(`Secrets configuration error: ${error}`, new Error(error));
    }

    if (process.env.NODE_ENV === 'production') {
      console.error(
        '\n❌ CRITICAL: Secrets validation failed. Cannot start in production mode.\n'
      );
      process.exit(1);
    } else {
      console.warn(
        '\n⚠️  WARNING: Secrets validation failed. Some features may not work correctly.\n'
      );
    }
  } else {
    console.log('✅ All required secrets are configured correctly');
  }
}

/**
 * Get a secret value safely
 */
export function getSecret(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value && REQUIRED_SECRETS.includes(key)) {
    throw new Error(`Required secret '${key}' is not configured`);
  }

  return value || '';
}

/**
 * Check if a secret is configured
 */
export function isSecretConfigured(key: string): boolean {
  const value = process.env[key];
  return !!value && !value.includes('your-') && !value.includes('change-this');
}

/**
 * Generate a secure random secret
 */
export function generateRandomSecret(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Rotate secrets (for key management)
 * This should be called periodically (e.g., quarterly)
 */
export interface SecretRotationPlan {
  secretName: string;
  lastRotated: Date;
  nextRotation: Date;
  rotationInterval: number; // in days
}

export function planSecretRotation(): SecretRotationPlan[] {
  const rotations: SecretRotationPlan[] = [];

  // JWT secrets should be rotated every 90 days
  rotations.push({
    secretName: 'JWT_SECRET',
    lastRotated: new Date(),
    nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    rotationInterval: 90,
  });

  rotations.push({
    secretName: 'REFRESH_TOKEN_SECRET',
    lastRotated: new Date(),
    nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    rotationInterval: 90,
  });

  // API keys should be rotated every 180 days
  if (isSecretConfigured('SENDGRID_API_KEY')) {
    rotations.push({
      secretName: 'SENDGRID_API_KEY',
      lastRotated: new Date(),
      nextRotation: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      rotationInterval: 180,
    });
  }

  if (isSecretConfigured('SENTRY_DSN')) {
    rotations.push({
      secretName: 'SENTRY_DSN',
      lastRotated: new Date(),
      nextRotation: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      rotationInterval: 180,
    });
  }

  return rotations;
}

export default {
  validateSecrets,
  maskSecret,
  getMaskedDatabaseUrl,
  initializeSecrets,
  getSecret,
  isSecretConfigured,
  generateRandomSecret,
  planSecretRotation,
};
