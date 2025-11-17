import { Request, Response, NextFunction } from 'express';
import { logWarn } from '../utils/logger';

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS and sets security headers
 */
export function httpsEnforcementMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only enforce in production
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if the connection is secure (HTTPS)
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isSecure) {
    // Get the original host
    const host = req.headers.host || 'example.com';

    // Build redirect URL
    const redirectUrl = `https://${host}${req.url}`;

    logWarn(`Redirecting insecure request to HTTPS`, {
      originalUrl: req.originalUrl,
      redirectUrl,
    });

    // Redirect to HTTPS (307 preserves the method)
    return res.redirect(307, redirectUrl);
  }

  // Set HSTS (HTTP Strict Transport Security) header
  // This tells browsers to always use HTTPS for this domain
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Middleware to set secure cookie flags
 * Must be used before setting cookies
 */
export function secureCookieMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Override Express's res.cookie to add secure flags
  const originalCookie = res.cookie.bind(res);

  res.cookie = function (name: string, value: any, options: any = {}) {
    // Only in production - require secure cookies
    if (process.env.NODE_ENV === 'production') {
      options.secure = true; // Only send over HTTPS
      options.httpOnly = true; // Don't allow JavaScript access
      options.sameSite = 'strict'; // CSRF protection
    } else {
      // Development - allow non-secure cookies
      options.httpOnly = options.httpOnly !== false;
      options.sameSite = options.sameSite || 'lax';
    }

    return originalCookie(name, value, options);
  };

  next();
}

/**
 * Middleware to validate and enforce CSP (Content Security Policy)
 */
export function contentSecurityPolicyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cspHeader = process.env.NODE_ENV === 'production'
    ? // Production CSP - strict
      "default-src 'self'; " +
      "script-src 'self' 'wasm-unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    : // Development CSP - more permissive
      "default-src *; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src * data:; " +
      "font-src * data:";

  res.setHeader('Content-Security-Policy', cspHeader);

  next();
}

/**
 * Middleware to handle HTTPS proxy headers
 * Required when running behind a reverse proxy (Nginx, Cloudflare, etc.)
 */
export function httpsProxyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Trust proxy if configured - the app.set('trust proxy') in server/index.ts handles this
  // This middleware is informational - Express already handles X-Forwarded-* headers
  // when trust proxy is enabled
  next();
}

export default {
  httpsEnforcementMiddleware,
  secureCookieMiddleware,
  contentSecurityPolicyMiddleware,
  httpsProxyMiddleware,
};
