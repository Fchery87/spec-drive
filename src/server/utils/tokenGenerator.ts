import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-in-production';

/**
 * Generate a random token (for email verification and password reset)
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an access token (JWT)
 */
export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    {
      userId,
      email,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate a refresh token (JWT)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type === 'access') {
      return { userId: decoded.userId, email: decoded.email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as any;
    if (decoded.type === 'refresh') {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}
