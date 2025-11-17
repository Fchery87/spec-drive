import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logApiRequest, logApiResponse, logError, LogMetadata } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to attach unique request ID and timestamp
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-Id', req.requestId);

  next();
}

/**
 * Middleware to log HTTP requests and responses
 */
export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const { method, url, requestId, startTime } = req;
  const userId = (req as AuthenticatedRequest).user?.id;

  // Log incoming request
  const metadata: LogMetadata = {
    requestId,
    method,
    endpoint: url,
    userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  logApiRequest(method, url, userId, metadata);

  // Capture response
  const originalSend = res.send;

  res.send = function (data) {
    const duration = startTime ? Date.now() - startTime : 0;
    const statusCode = res.statusCode;

    // Log response
    logApiResponse(method, url, statusCode, duration, userId, {
      ...metadata,
      duration,
      statusCode,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware to log errors
 */
export function errorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { requestId, method, url, startTime } = req;
  const userId = (req as AuthenticatedRequest).user?.id;
  const duration = startTime ? Date.now() - startTime : 0;

  const metadata: LogMetadata = {
    requestId,
    method,
    endpoint: url,
    userId,
    duration,
    ip: req.ip,
    error: error.message,
    stack: error.stack,
  };

  logError(`Unhandled error in ${method} ${url}`, error, metadata);

  // Pass to error handler
  next(error);
}

/**
 * Middleware to sanitize logs (remove sensitive data)
 */
export function sanitizeLogsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Sanitize request body if it exists
  if (req.body) {
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'refreshToken'];
    const sanitizedBody = { ...req.body };

    sensitiveFields.forEach((field) => {
      if (field in sanitizedBody) {
        sanitizedBody[field] = '[REDACTED]';
      }
    });

    // Replace body with sanitized version for logging purposes
    const originalLoggingBody = req.body;
    req.body = sanitizedBody;

    // Restore original body before processing
    setImmediate(() => {
      req.body = originalLoggingBody;
    });
  }

  next();
}

export default {
  requestIdMiddleware,
  httpLoggingMiddleware,
  errorLoggingMiddleware,
  sanitizeLogsMiddleware,
};
