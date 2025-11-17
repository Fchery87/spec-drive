import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Store CSRF tokens in memory (in production, use Redis or a database)
const csrfTokens = new Map<string, { token: string; expiresAt: Date }>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  csrfTokens.set(sessionId, { token, expiresAt });
  return token;
}

/**
 * Verify CSRF token
 */
function verifyCsrfToken(sessionId: string, token: string): boolean {
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
export function csrfProtectionMiddleware(
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

  if (!verifyCsrfToken(sessionId, token)) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
    });
  }

  next();
}

/**
 * Middleware to set CSRF token on responses
 */
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string ||
                   req.ip ||
                   'default-session';

  const token = generateCsrfToken(sessionId);

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
}
