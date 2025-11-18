/**
 * Test Application Setup
 * Simplified Express app for testing without server startup issues
 */

import express from 'express';
import cors from 'cors';
import { authRouter } from '../routes/auth';
import { projectsRouter } from '../routes/projects';
import { artifactsRouter } from '../routes/artifacts';
import { validationRouter } from '../routes/validation';
import { errorHandler } from '../middleware/errorHandler';

// Create Express app for testing
export function createTestApp() {
  const app = express();

  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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
      environment: 'test',
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/artifacts', artifactsRouter);
  app.use('/api/validation', validationRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}

// Export singleton instance for tests
export const testApp = createTestApp();
