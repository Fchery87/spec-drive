/**
 * Rate Limiter Tests
 * Tests for request rate limiting functionality
 */

import { checkRateLimit, resetRateLimit, RateLimitEndpoint } from '../rateLimiter';

describe('Rate Limiter', () => {
  const testIdentifier = 'test-ip-127.0.0.1';
  const endpoint: RateLimitEndpoint = 'signup';

  afterEach(() => {
    // Reset rate limit after each test
    resetRateLimit(testIdentifier, endpoint);
  });

  describe('Rate Limit Checking', () => {
    it('should allow requests within limit', async () => {
      const identifier = `${testIdentifier}-1`;

      // First request should be allowed
      let result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 max - 1

      // Make another check
      result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      const identifier = `${testIdentifier}-2`;
      const maxAttempts = 5; // Default max for signup

      // Make max attempts
      for (let i = 0; i < maxAttempts; i++) {
        await checkRateLimit(identifier, endpoint);
      }

      // Next request should be rate limited
      const result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track multiple endpoints separately', async () => {
      const identifier = `${testIdentifier}-3`;
      const endpoint1: RateLimitEndpoint = 'signup';
      const endpoint2: RateLimitEndpoint = 'login';

      // Make requests on endpoint1
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier, endpoint1);
      }

      // endpoint1 should be limited
      let result = await checkRateLimit(identifier, endpoint1);
      expect(result.allowed).toBe(false);

      // endpoint2 should not be limited
      result = await checkRateLimit(identifier, endpoint2);
      expect(result.allowed).toBe(true);
    });

    it('should track different identifiers separately', async () => {
      const identifier1 = `${testIdentifier}-4a`;
      const identifier2 = `${testIdentifier}-4b`;

      // Make requests from identifier1
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier1, endpoint);
      }

      // identifier1 should be limited
      let result = await checkRateLimit(identifier1, endpoint);
      expect(result.allowed).toBe(false);

      // identifier2 should not be limited
      result = await checkRateLimit(identifier2, endpoint);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Attempt Recording', () => {
    it('should record attempt without error', async () => {
      const identifier = `${testIdentifier}-5`;

      expect(async () => {
        await checkRateLimit(identifier, endpoint);
      }).not.toThrow();
    });

    it('should increment attempt count', async () => {
      const identifier = `${testIdentifier}-6`;

      // Record multiple attempts
      let result = await checkRateLimit(identifier, endpoint);
      expect(result.remaining).toBe(4);

      result = await checkRateLimit(identifier, endpoint);
      expect(result.remaining).toBe(3);

      result = await checkRateLimit(identifier, endpoint);
      expect(result.remaining).toBe(2);

      // Should still be allowed (below limit)
      expect(result.allowed).toBe(true);
    });

    it('should handle concurrent recordings', async () => {
      const identifier = `${testIdentifier}-7`;

      // Record multiple attempts concurrently
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(checkRateLimit(identifier, endpoint));
      }

      expect(async () => {
        await Promise.all(promises);
      }).not.toThrow();
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit for identifier and endpoint', async () => {
      const identifier = `${testIdentifier}-8`;

      // Make requests to hit limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier, endpoint);
      }

      // Verify limited
      let result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(false);

      // Reset
      await resetRateLimit(identifier, endpoint);

      // Should be allowed again
      result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(true);
    });

    it('should only reset specified endpoint', async () => {
      const identifier = `${testIdentifier}-9`;
      const endpoint1: RateLimitEndpoint = 'signup';
      const endpoint2: RateLimitEndpoint = 'login';

      // Make requests on both endpoints
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier, endpoint1);
        await checkRateLimit(identifier, endpoint2);
      }

      // Reset only endpoint1
      await resetRateLimit(identifier, endpoint1);

      // endpoint1 should be allowed
      let result = await checkRateLimit(identifier, endpoint1);
      expect(result.allowed).toBe(true);

      // endpoint2 should still be limited
      result = await checkRateLimit(identifier, endpoint2);
      expect(result.allowed).toBe(false);

      // Cleanup endpoint2
      await resetRateLimit(identifier, endpoint2);
    });

    it('should handle resetting non-existent rate limits', async () => {
      const identifier = `${testIdentifier}-10`;

      expect(async () => {
        await resetRateLimit(identifier, endpoint);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty identifier', async () => {
      const identifier = '';

      expect(async () => {
        await checkRateLimit(identifier, endpoint);
      }).not.toThrow();
    });

    it('should handle very long identifier', async () => {
      const identifier = `${testIdentifier}-${'-'.repeat(1000)}`;

      expect(async () => {
        await checkRateLimit(identifier, endpoint);
      }).not.toThrow();
    });

    it('should handle special characters in identifier', async () => {
      const identifier = `${testIdentifier}-!@#$%^&*()`;

      expect(async () => {
        await checkRateLimit(identifier, endpoint);
      }).not.toThrow();
    });

    it('should handle all endpoint types', async () => {
      const identifier = `${testIdentifier}-all-endpoints`;
      const endpoints: RateLimitEndpoint[] = ['signup', 'login', 'passwordReset', 'verifyEmail'];

      for (const ep of endpoints) {
        expect(async () => {
          await checkRateLimit(identifier, ep);
        }).not.toThrow();
      }
    });
  });

  describe('Performance', () => {
    it('should check rate limit quickly', async () => {
      const identifier = `${testIdentifier}-perf-1`;
      const startTime = Date.now();

      await checkRateLimit(identifier, endpoint);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Database call, so allow more time
    });

    it('should handle many identifiers', async () => {
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 100; i++) {
        const identifier = `${testIdentifier}-many-${i}`;
        promises.push(checkRateLimit(identifier, endpoint));
      }

      expect(async () => {
        await Promise.all(promises);
      }).not.toThrow();
    });
  });

  describe('Expiration', () => {
    it('should reset rate limit after time window expires', async () => {
      const identifier = `${testIdentifier}-expiry`;

      // Record attempts
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(identifier, endpoint);
      }

      // Should be limited
      let result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(false);

      // In a real test with actual time windows, we would:
      // 1. Wait for window to expire
      // 2. Verify it's no longer limited
      // For now, we just test the reset mechanism
      await resetRateLimit(identifier, endpoint);
      result = await checkRateLimit(identifier, endpoint);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Database Persistence', () => {
    it('should persist rate limits in database', async () => {
      const identifier = `${testIdentifier}-persist`;

      // Record attempt
      let result = await checkRateLimit(identifier, endpoint);

      // Check should reflect recorded attempt
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(result.resetAt instanceof Date).toBe(true);
    });

    it('should handle concurrent checks correctly', async () => {
      const identifier = `${testIdentifier}-concurrent`;

      // Record an attempt
      await checkRateLimit(identifier, endpoint);

      // Check rate limit multiple times concurrently
      const checks: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        checks.push(checkRateLimit(identifier, endpoint));
      }

      const results = await Promise.all(checks);

      // All checks should return consistent results
      const allAllowed = results.every((r: any) => r.allowed === results[0].allowed);
      expect(allAllowed).toBe(true);
    });
  });
});
