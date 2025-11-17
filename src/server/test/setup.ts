/**
 * Test Setup & Utilities
 * Provides database seeding, cleanup, and helper functions for tests
 */

import { db } from '@/db';
import { users, authSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Test user factory
 */
export async function createTestUser(override?: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const email = override?.email || `test-${Date.now()}@example.com`;
  const password = override?.password || 'TestPassword123';
  const name = override?.name || 'Test User';

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
    emailVerified: true, // Mark as verified for testing
    createdAt: new Date(),
  }).returning();

  return {
    id: result[0].id,
    email,
    password, // Return plaintext password for login tests
    name,
  };
}

/**
 * Create a test session for a user
 */
export async function createTestSession(userId: string) {
  const sessionToken = `test-session-${Date.now()}-${Math.random()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const result = await db.insert(authSessions).values({
    sessionToken,
    userId,
    expiresAt,
    createdAt: new Date(),
  }).returning();

  return {
    sessionToken,
    expiresAt,
  };
}

/**
 * Clean up all test data from database
 */
export async function cleanupTestData() {
  try {
    // Delete all test users (cascade will handle sessions)
    await db.delete(users).where(
      // Match test users created within this test run
      // In production, be more specific
    );
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Global test setup
 */
export async function setupTestDatabase() {
  // Initialize database connection if needed
  // In actual tests, ensure database is running
}

/**
 * Global test teardown
 */
export async function teardownTestDatabase() {
  // Close database connections
  // Clean up test data
  await cleanupTestData();
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestJWT(userId: string, expiresIn: string = '15m') {
  // This would use the actual JWT generation logic
  // For now, return a placeholder that tests can mock
  return `test-jwt-${userId}-${Date.now()}`;
}

/**
 * Test helpers
 */
export const testHelpers = {
  /**
   * Wait for async operation
   */
  async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate random email
   */
  randomEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  },

  /**
   * Generate random string
   */
  randomString(length: number = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Assert response structure
   */
  assertSuccessResponse(body: any) {
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    return body;
  },

  /**
   * Assert error response structure
   */
  assertErrorResponse(body: any) {
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('error');
    return body;
  },
};

export default {
  createTestUser,
  createTestSession,
  cleanupTestData,
  setupTestDatabase,
  teardownTestDatabase,
  generateTestJWT,
  testHelpers,
};
