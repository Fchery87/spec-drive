import Redis from 'ioredis';
import { logInfo, logError, logWarn } from './logger';

let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initializeRedis(): Redis | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logWarn('REDIS_URL not configured. Redis features will be disabled.');
    logInfo('To enable Redis, set REDIS_URL environment variable');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      // Connection options
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,

      // Retry strategy
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },

      // Error handler
      lazyConnect: false,
    });

    // Event handlers
    redisClient.on('connect', () => {
      logInfo('Connected to Redis');
    });

    redisClient.on('error', (error) => {
      logError('Redis connection error', error);
    });

    redisClient.on('ready', () => {
      logInfo('Redis is ready');
    });

    redisClient.on('close', () => {
      logInfo('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    logError('Failed to initialize Redis', error);
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Store CSRF token in Redis
 */
export async function storeCSRFToken(
  sessionId: string,
  token: string,
  expirationSeconds: number = 86400
): Promise<boolean> {
  if (!redisClient) {
    logWarn('Redis not available, CSRF tokens will not be stored persistently');
    return false;
  }

  try {
    const key = `csrf:${sessionId}`;
    await redisClient.setex(key, expirationSeconds, token);
    return true;
  } catch (error) {
    logError('Failed to store CSRF token in Redis', error);
    return false;
  }
}

/**
 * Retrieve CSRF token from Redis
 */
export async function getCSRFToken(sessionId: string): Promise<string | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const key = `csrf:${sessionId}`;
    const token = await redisClient.get(key);
    return token;
  } catch (error) {
    logError('Failed to retrieve CSRF token from Redis', error);
    return null;
  }
}

/**
 * Delete CSRF token from Redis
 */
export async function deleteCSRFToken(sessionId: string): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    const key = `csrf:${sessionId}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    logError('Failed to delete CSRF token from Redis', error);
    return false;
  }
}

/**
 * Cache user data in Redis
 */
export async function cacheUserData(
  userId: string,
  userData: any,
  expirationSeconds: number = 3600
): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    const key = `user:${userId}`;
    await redisClient.setex(key, expirationSeconds, JSON.stringify(userData));
    return true;
  } catch (error) {
    logError('Failed to cache user data in Redis', error);
    return false;
  }
}

/**
 * Get cached user data from Redis
 */
export async function getCachedUserData(userId: string): Promise<any | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const key = `user:${userId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logError('Failed to retrieve cached user data from Redis', error);
    return null;
  }
}

/**
 * Cache project data in Redis
 */
export async function cacheProjectData(
  projectId: string,
  projectData: any,
  expirationSeconds: number = 3600
): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    const key = `project:${projectId}`;
    await redisClient.setex(key, expirationSeconds, JSON.stringify(projectData));
    return true;
  } catch (error) {
    logError('Failed to cache project data in Redis', error);
    return false;
  }
}

/**
 * Get cached project data from Redis
 */
export async function getCachedProjectData(projectId: string): Promise<any | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const key = `project:${projectId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logError('Failed to retrieve cached project data from Redis', error);
    return null;
  }
}

/**
 * Invalidate all cache keys matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  if (!redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    const deleted = await redisClient.del(...keys);
    logInfo(`Invalidated ${deleted} cache entries matching pattern: ${pattern}`);
    return deleted;
  } catch (error) {
    logError('Failed to invalidate cache in Redis', error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<boolean> {
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.flushdb();
    logInfo('Cleared all Redis cache');
    return true;
  } catch (error) {
    logError('Failed to clear Redis cache', error);
    return false;
  }
}

/**
 * Get Redis statistics
 */
export async function getRedisStats(): Promise<any> {
  if (!redisClient) {
    return null;
  }

  try {
    const info = await redisClient.info();
    const dbSize = await redisClient.dbsize();

    return {
      connected: isRedisConnected(),
      dbSize,
      info: info.split('\r\n').slice(0, 10).join('\n'), // First 10 lines
    };
  } catch (error) {
    logError('Failed to get Redis stats', error);
    return null;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logInfo('Redis connection closed');
    } catch (error) {
      logError('Error closing Redis connection', error);
    }
  }
}

export default {
  initializeRedis,
  getRedisClient,
  isRedisConnected,
  storeCSRFToken,
  getCSRFToken,
  deleteCSRFToken,
  cacheUserData,
  getCachedUserData,
  cacheProjectData,
  getCachedProjectData,
  invalidateCache,
  clearCache,
  getRedisStats,
  closeRedis,
};
