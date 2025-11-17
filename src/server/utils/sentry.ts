import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { httpIntegration } from '@sentry/node';

/**
 * Initialize Sentry error tracking and performance monitoring
 * Only initializes if SENTRY_DSN is configured
 */
export function initializeSentry() {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Only initialize Sentry in production or if explicitly configured
  if (!sentryDsn) {
    console.log('Sentry not configured. Set SENTRY_DSN environment variable to enable error tracking.');
    return;
  }

  Sentry.init({
    // Sentry DSN (Data Source Name)
    dsn: sentryDsn,

    // Environment
    environment,

    // Release version (optional, can be set from your build process)
    release: process.env.RELEASE_VERSION || 'unknown',

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // Sample 10% of transactions in production
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0, // Sample 10% of profiles in production

    // Integrations
    integrations: [
      httpIntegration(),
      nodeProfilingIntegration(),
    ],

    // Capture all 5xx server errors automatically
    beforeSend(event, hint) {
      // Filter out health checks and other noise
      if (event.request?.url?.includes('/health')) {
        return null;
      }

      // Don't send 4xx client errors to Sentry (unless they're important)
      if (event.exception) {
        const statusCode = (event as any).statusCode;
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          // Still capture specific client errors
          const errorMessage = hint.originalException as any;
          if (errorMessage?.includes?.('critical') || errorMessage?.includes?.('severe')) {
            return event;
          }
          return null;
        }
      }

      return event;
    },

    // Ignored errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // See http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Network errors
      'NetworkError',
      'Network request failed',
      'ERR_NETWORK',
      // Request aborted
      'The user aborted a request',
    ],

    // Denylist common user agent patterns
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      // Native app
      /^file:\/\//i,
    ],

    // Maximum breadcrumb count
    maxBreadcrumbs: 50,

    // Attach stack traces to all messages
    attachStacktrace: true,
  });

  console.log(`✅ Sentry initialized for environment: ${environment}`);
}

/**
 * Capture exceptions to Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  }
}

/**
 * Capture messages to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, name?: string) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email,
      username: name,
    });
  }
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for tracking events
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * Middleware for Express to capture errors
 */
export function sentryErrorHandler() {
  return (
    err: Error,
    _req: any,
    res: any,
    next: any
  ) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
    next(err);
  };
}

/**
 * Middleware for Express to initialize request tracking
 */
export function sentryRequestHandler() {
  return (req: any, res: any, next: any) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`${req.method} ${req.url}`, 'debug');
    }
    next();
  };
}

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setSentryUser,
  clearSentryUser,
  addSentryBreadcrumb,
  sentryErrorHandler,
  sentryRequestHandler,
};
