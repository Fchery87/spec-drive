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

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
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
app.use(errorHandler);

// Database connection check
async function checkDatabaseConnection() {
  try {
    // Simple query to test connection
    await db.select().from(projects).limit(1);
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('⚠️  Continuing without database connection for development');
  }
}

// Start server
async function startServer() {
  try {
    await checkDatabaseConnection();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, server };
