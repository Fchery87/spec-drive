import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index';
import { users, authSessions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  verifyRefreshToken,
} from '../utils/tokenGenerator';
import { checkRateLimit, resetRateLimit } from '../utils/rateLimiter';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../utils/email';

const router = Router();

// POST /api/auth/signup - User registration with email verification
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const clientIp = req.ip || 'unknown';

    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp, 'signup');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many signup attempts. Try again after ${new Date(rateLimit.resetAt).toISOString()}`,
      });
    }

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already in use',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerificationToken = generateRandomToken();

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        emailVerificationToken,
        emailVerified: false,
      })
      .returning();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
    }

    const user = newUser[0];

    // Send verification email
    try {
      await sendVerificationEmail(email, emailVerificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Continue anyway - user can request new email or verify later
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(authSessions).values({
      userId: user.id,
      refreshToken,
      expiresAt: refreshTokenExpiresAt,
    });

    // Reset rate limit on success
    await resetRateLimit(clientIp, 'signup');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({
      success: false,
      error: 'Sign up failed',
    });
  }
});

// POST /api/auth/login - User login with rate limiting
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || 'unknown';

    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp, 'login');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Try again after ${new Date(rateLimit.resetAt).toISOString()}`,
      });
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
      });
    }

    // Find user by email
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (foundUsers.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = foundUsers[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(authSessions).values({
      userId: user.id,
      refreshToken,
      expiresAt: refreshTokenExpiresAt,
    });

    // Reset rate limit on success
    await resetRateLimit(clientIp, 'login');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    // Delete all refresh tokens for this user
    await db.delete(authSessions).where(eq(authSessions.userId, req.user.id));

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Check if refresh token exists in database
    const sessions = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.refreshToken, refreshToken));

    if (sessions.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found',
      });
    }

    const session = sessions[0];

    // Check if token is expired
    if (new Date() > session.expiresAt) {
      await db.delete(authSessions).where(eq(authSessions.id, session.id));
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired',
      });
    }

    // Get user info
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (foundUsers.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = foundUsers[0];

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

// POST /api/auth/verify-email - Verify email address
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const clientIp = req.ip || 'unknown';

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token required',
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp, 'verifyEmail');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many verification attempts. Try again after ${new Date(rateLimit.resetAt).toISOString()}`,
      });
    }

    // Find user by verification token
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));

    if (foundUsers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    const user = foundUsers[0];

    // Update user
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name || 'User');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Continue anyway - verification was successful
    }

    // Reset rate limit on success
    await resetRateLimit(clientIp, 'verifyEmail');

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed',
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const clientIp = req.ip || 'unknown';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required',
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp, 'passwordReset');
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many password reset requests. Try again after ${new Date(rateLimit.resetAt).toISOString()}`,
      });
    }

    // Find user by email
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // Always return success (don't leak whether email exists)
    if (foundUsers.length === 0) {
      return res.json({
        success: true,
        message: 'Password reset email sent if account exists',
      });
    }

    const user = foundUsers[0];
    const resetToken = generateRandomToken();
    const resetExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Save reset token
    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Continue anyway - email will still be sent and user can try again
    }

    // Reset rate limit on success
    await resetRateLimit(clientIp, 'passwordReset');

    res.json({
      success: true,
      message: 'Password reset email sent if account exists',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset request failed',
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Find user by reset token
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));

    if (foundUsers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    const user = foundUsers[0];

    // Check if token is expired
    if (!user.passwordResetExpiresAt || new Date() > user.passwordResetExpiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Reset token expired',
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Invalidate all existing refresh tokens for this user
    await db.delete(authSessions).where(eq(authSessions.userId, user.id));

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
    });
  }
});

export { router as authRouter };
