import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { storeCSRFToken, getCSRFToken, deleteCSRFToken, isRedisConnected } from '../utils/redis';
import { logWarn, logError } from '../utils/logger';

// Fallback in-memory storage for CSRF tokens (used when Redis is not available)
const csrfTokens = new Map<string, { token: string; expiresAt: Date }>();

// Clean up expired tokens periodically (only in fallback mode)
setInterval(() => {
  if (isRedisConnected()) {
    return; // Skip cleanup when using Redis
  }
  const now = new Date();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Generate a CSRF token
 * Stores in Redis if available, falls back to in-memory storage
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expirationSeconds = 24 * 60 * 60; // 24 hours

  // Try Redis first
  if (isRedisConnected()) {
    const stored = await storeCSRFToken(sessionId, token, expirationSeconds);
    if (stored) {
      return token;
    }
    logWarn('Failed to store CSRF token in Redis, falling back to memory');
  }

  // Fallback to in-memory storage
  const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
  csrfTokens.set(sessionId, { token, expiresAt });
  return token;
}

/**
 * Verify CSRF token
 * Checks Redis first, then falls back to in-memory storage
 */
async function verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
  // Try Redis first
  if (isRedisConnected()) {
    try {
      const stored = await getCSRFToken(sessionId);
      return stored === token;
    } catch (error) {
      logError('Error retrieving CSRF token from Redis', error);
      // Continue to fallback
    }
  }

  // Fallback to in-memory storage
  const stored = csrfTokens.get(sessionId);
  if (!stored) {
    return false;
  }

  const now = new Date();
  if (stored.expiresAt < now) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * CSRF protection middleware
 * Protects against CSRF attacks on state-changing requests
 */
export async function csrfProtectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get session ID from cookie or header
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  const token = req.headers['x-csrf-token'] as string || req.body?.csrfToken;

  if (!sessionId || !token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
    });
  }

  try {
    const isValid = await verifyCsrfToken(sessionId, token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
      });
    }
  } catch (error) {
    logError('Error verifying CSRF token', error);
    return res.status(403).json({
      success: false,
      error: 'CSRF verification failed',
    });
  }

  next();
}

/**
 * Middleware to set CSRF token on responses
 */
export async function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string ||
                   req.ip ||
                   'default-session';

  try {
    const token = await generateCsrfToken(sessionId);

    // Add token to response headers
    res.setHeader('X-CSRF-Token', token);

    // Store session ID in response for client
    if (!req.cookies?.sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    next();
  } catch (error) {
    logError('Error generating CSRF token', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
    });
  }
}
