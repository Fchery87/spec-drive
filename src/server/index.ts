import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { projectsRouter } from './routes/projects';
import { artifactsRouter } from './routes/artifacts';
import { orchestrationRouter } from './routes/orchestration';
import { validationRouter } from './routes/validation';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import {
  requestIdMiddleware,
  httpLoggingMiddleware,
  errorLoggingMiddleware,
  sanitizeLogsMiddleware,
} from './middleware/logging';
import { logger, logInfo, logError } from './utils/logger';
import {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
} from './utils/sentry';
import {
  httpsEnforcementMiddleware,
  secureCookieMiddleware,
  contentSecurityPolicyMiddleware,
  httpsProxyMiddleware,
} from './middleware/https';
import { initializeSecrets } from './utils/secrets';
import { initializeRedis, closeRedis } from './utils/redis';

// Initialize security checks before anything else
initializeSecrets(); // Validate secrets configuration
initializeSentry(); // Initialize error tracking
initializeRedis(); // Initialize Redis for caching and persistent storage

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Trust proxy if behind a reverse proxy (Nginx, Cloudflare, etc.)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Middleware - Security and HTTPS (must be early)
app.use(httpsProxyMiddleware); // Handle proxy headers
app.use(httpsEnforcementMiddleware); // Enforce HTTPS in production
app.use(contentSecurityPolicyMiddleware); // Set CSP headers
app.use(secureCookieMiddleware); // Secure cookie flags
app.use(helmet());

// Sentry request handler (must be before other middleware)
app.use(sentryRequestHandler());

// Request ID and timing middleware
app.use(requestIdMiddleware);

// Sanitize logs before logging
app.use(sanitizeLogsMiddleware);

// Request/Response logging middleware
app.use(httpLoggingMiddleware);

// Morgan logging (production-friendly)
app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : ':method :url :status :response-time ms - :res[content-length]'
  )
);

app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/artifacts', authMiddleware, artifactsRouter);
app.use('/api/orchestration', authMiddleware, orchestrationRouter);
app.use('/api/validation', authMiddleware, validationRouter);

// Error handling
// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());
app.use(errorHandler);

// Database connection check
async function checkDatabaseConnection() {
  try {
    // Simple query to test connection
    await db.select().from(projects).limit(1);
    logInfo('Database connection established', {
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
    });
  } catch (error) {
    logError('Database connection failed', error, {
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
    });
    logInfo('Continuing without database connection for development');
  }
}

// Start server
async function startServer() {
  try {
    logInfo('Starting server...', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
    });

    await checkDatabaseConnection();

    server.listen(PORT, () => {
      logInfo('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      logInfo('Graceful shutdown started');
      server.close(async () => {
        logInfo('HTTP server closed');
        await closeRedis();
        logInfo('All connections closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logError('Unhandled Rejection at:', new Error('Unhandled Rejection'), {
        reason,
        promise: String(promise),
      });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError('Uncaught Exception:', error, {});
      process.exit(1);
    });
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

export { app, server };
