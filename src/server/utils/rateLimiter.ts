import { db } from '../../db/index';
import { rateLimitLog } from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';

// Configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = {
  signup: 5,
  login: 10,
  passwordReset: 3,
  verifyEmail: 5,
};

export type RateLimitEndpoint = keyof typeof MAX_ATTEMPTS;

export async function checkRateLimit(
  identifier: string,
  endpoint: RateLimitEndpoint
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    // Find existing rate limit record
    const existing = await db
      .select()
      .from(rateLimitLog)
      .where(
        and(
          eq(rateLimitLog.identifier, identifier),
          eq(rateLimitLog.endpoint, endpoint),
          gt(rateLimitLog.resetAt, now)
        )
      );

    const maxAttempts = MAX_ATTEMPTS[endpoint];

    if (existing.length === 0) {
      // No existing record, create a new one
      const resetAt = new Date(now.getTime() + RATE_LIMIT_WINDOW);
      await db.insert(rateLimitLog).values({
        identifier,
        endpoint,
        attempts: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt,
      };
    }

    const record = existing[0];

    if (record.attempts >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    // Increment attempts
    await db
      .update(rateLimitLog)
      .set({ attempts: record.attempts + 1 })
      .where(eq(rateLimitLog.id, record.id));

    return {
      allowed: true,
      remaining: maxAttempts - (record.attempts + 1),
      resetAt: record.resetAt,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // If there's an error, allow the request (fail open)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    };
  }
}

export async function resetRateLimit(identifier: string, endpoint: RateLimitEndpoint) {
  try {
    await db
      .delete(rateLimitLog)
      .where(
        and(
          eq(rateLimitLog.identifier, identifier),
          eq(rateLimitLog.endpoint, endpoint)
        )
      );
  } catch (error) {
    console.error('Rate limit reset error:', error);
  }
}
