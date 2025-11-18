---
description: Custom JWT + bcrypt authentication system for SpecDrive
globs: *.tsx, *.ts
alwaysApply: false
---

# SpecDrive Custom Authentication

## Overview

SpecDrive implements a custom authentication system using **JWT tokens**, **bcryptjs password hashing**, and **Neon PostgreSQL** for user storage. This approach provides full control over the authentication flow while maintaining security best practices.

**Key Components:**
- **Password Hashing**: bcryptjs (10 salt rounds)
- **Access Tokens**: JWT tokens (15-minute expiry)
- **Refresh Tokens**: JWT tokens (7-day expiry, stored in database)
- **Email Verification**: Token-based with email delivery
- **Password Reset**: Time-limited reset tokens (1-hour expiry)
- **Rate Limiting**: IP-based request throttling
- **Database**: Neon PostgreSQL with Drizzle ORM

## Architecture

### User Table Schema

```typescript
// src/db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```

### Auth Sessions Table

Stores active refresh tokens for token revocation and multi-device management:

```typescript
export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

## Authentication Flow

### Sign Up

**Endpoint**: `POST /api/auth/signup`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Flow:**
1. Validate input (email format, password length ≥6 chars)
2. Check rate limit (max 5 signup attempts per 15 minutes)
3. Verify email doesn't already exist
4. Hash password with bcryptjs (10 rounds)
5. Generate random email verification token
6. Create user in database
7. Send verification email
8. Generate JWT access token (15-min expiry)
9. Generate JWT refresh token (7-day expiry)
10. Store refresh token in `authSessions` table
11. Return user data + tokens

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Key Implementation**: [src/server/routes/auth.ts:23-143](src/server/routes/auth.ts#L23-L143)

### Login

**Endpoint**: `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Flow:**
1. Validate input (email and password required)
2. Check rate limit (max 5 login attempts per 15 minutes)
3. Query database for user by email
4. Compare provided password with stored hash using bcrypt
5. If match, generate new access + refresh tokens
6. Store refresh token in `authSessions`
7. Reset rate limit on success
8. Return user data + tokens

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Important Notes:**
- Email comparison is **case-sensitive** (always use lowercase)
- Passwords are hashed with bcryptjs using 10 salt rounds
- Failed login returns generic "Invalid email or password" (doesn't leak user existence)

**Key Implementation**: [src/server/routes/auth.ts:145-257](src/server/routes/auth.ts#L145-L257)

### Token Refresh

**Endpoint**: `POST /api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Flow:**
1. Verify refresh token signature and expiry
2. Check if token exists in `authSessions` table
3. Verify token hasn't expired
4. Look up user from token payload
5. Generate new access token
6. Return new access token (same refresh token still valid)

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

**Key Implementation**: [src/server/routes/auth.ts:289-364](src/server/routes/auth.ts#L289-L364)

### Email Verification

**Endpoint**: `POST /api/auth/verify-email`

**Request:**
```json
{
  "token": "random-verification-token"
}
```

**Flow:**
1. Validate verification token format
2. Check rate limit (max 5 verification attempts per 15 minutes)
3. Find user by email verification token
4. Mark email as verified
5. Clear verification token
6. Send welcome email
7. Reset rate limit on success

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Key Implementation**: [src/server/routes/auth.ts:367-435](src/server/routes/auth.ts#L367-L435)

### Password Reset Flow

#### Request Password Reset

**Endpoint**: `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Flow:**
1. Check rate limit (max 5 reset requests per 15 minutes)
2. Find user by email (doesn't leak whether email exists)
3. Generate random reset token
4. Set token expiry to 1 hour from now
5. Store token and expiry in database
6. Send password reset email
7. Always return success (security best practice)

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

**Key Implementation**: [src/server/routes/auth.ts:437-509](src/server/routes/auth.ts#L437-L509)

#### Complete Password Reset

**Endpoint**: `POST /api/auth/reset-password`

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Flow:**
1. Validate reset token and new password (≥6 chars)
2. Find user by reset token
3. Check token hasn't expired (1-hour window)
4. Hash new password with bcryptjs
5. Update password and clear reset token
6. Invalidate all existing refresh tokens (force re-login on all devices)
7. Return success

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Key Implementation**: [src/server/routes/auth.ts:511-581](src/server/routes/auth.ts#L511-L581)

### Logout

**Endpoint**: `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Flow:**
1. Authenticate user from JWT token
2. Delete all refresh tokens for user from `authSessions`
3. Return success

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Key Implementation**: [src/server/routes/auth.ts:263-286](src/server/routes/auth.ts#L263-L286)

## JWT Token Structure

### Access Token
- **Payload**: `{ userId, email, iat, exp }`
- **Expiry**: 15 minutes
- **Purpose**: Authenticate API requests
- **Usage**: Include in `Authorization: Bearer <token>` header

### Refresh Token
- **Payload**: `{ userId, iat, exp }`
- **Expiry**: 7 days
- **Purpose**: Obtain new access tokens
- **Storage**: Stored in `authSessions` table
- **Usage**: Sent in request body to `/api/auth/refresh`

**Token Generation**: [src/server/utils/tokenGenerator.ts](src/server/utils/tokenGenerator.ts)

## Security Features

### Password Security
- **Hashing**: bcryptjs with 10 salt rounds
- **Validation**: Minimum 6 characters (client-side validation ≥8 recommended)
- **Storage**: Never logged or transmitted in plain text
- **Comparison**: Constant-time comparison via bcrypt.compare()

### Rate Limiting
Implemented per IP address for:
- Signup attempts: max 5 per 15 minutes
- Login attempts: max 5 per 15 minutes
- Email verification: max 5 per 15 minutes
- Password reset requests: max 5 per 15 minutes

**Implementation**: [src/server/utils/rateLimiter.ts](src/server/utils/rateLimiter.ts)

### Token Security
- **HMAC-SHA256**: JWT tokens signed with secure secret
- **Storage**: Client stores tokens in localStorage (consider httpOnly for production)
- **Refresh**: Access tokens refreshed every 15 minutes
- **Revocation**: Refresh tokens stored in DB for revocation capability
- **Expiry**: Old refresh tokens deleted after 7 days

### Email Verification
- **Token Format**: Cryptographically random 32+ character strings
- **Expiry**: No explicit expiry (stays valid until verified)
- **One-Time Use**: Token cleared from database after verification
- **Delivery**: Via SendGrid (requires `SENDGRID_API_KEY`)

### Password Reset
- **Token Format**: Cryptographically random 32+ character strings
- **Expiry**: 1 hour from generation
- **One-Time Use**: Token cleared after successful reset
- **Session Invalidation**: All refresh tokens invalidated on reset
- **Delivery**: Via SendGrid

### Input Validation
- Email format validation: RFC 5322 basic pattern
- Password length: ≥6 characters
- Name length: required, non-empty
- Rate limit validation: Per-IP throttling

## Middleware & Utilities

### Authentication Middleware

**File**: [src/server/middleware/auth.ts](src/server/middleware/auth.ts)

Extracts and validates JWT from request headers:

```typescript
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
  }
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyAccessToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.user = decoded
  next()
}
```

**Usage**: Apply to protected routes:
```typescript
router.get('/me', authMiddleware, (req: AuthenticatedRequest) => {
  return res.json({ user: req.user })
})
```

### Token Generation

**File**: [src/server/utils/tokenGenerator.ts](src/server/utils/tokenGenerator.ts)

- `generateAccessToken(userId, email)`: Creates 15-min JWT
- `generateRefreshToken(userId)`: Creates 7-day JWT
- `verifyAccessToken(token)`: Validates and decodes JWT
- `verifyRefreshToken(token)`: Validates and decodes JWT
- `generateRandomToken()`: Creates cryptographically random token (email/reset)

### Rate Limiter

**File**: [src/server/utils/rateLimiter.ts](src/server/utils/rateLimiter.ts)

IP-based rate limiting with configurable windows:

```typescript
checkRateLimit(clientIp: string, endpoint: string): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}>
```

**Default Limits:**
- Signup: 5 attempts / 15 minutes
- Login: 5 attempts / 15 minutes
- Email verification: 5 attempts / 15 minutes
- Password reset: 5 attempts / 15 minutes

### Email Service

**File**: [src/server/utils/email.ts](src/server/utils/email.ts)

Sends transactional emails via SendGrid:

- `sendVerificationEmail(email, token)`: Sends verification link
- `sendPasswordResetEmail(email, token)`: Sends reset link
- `sendWelcomeEmail(email, name)`: Welcome after verification

**Requires**: `SENDGRID_API_KEY` environment variable

## Client-Side Integration

### Getting User from Storage

```typescript
// src/lib/auth.ts
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem('accessToken')
  if (!token) return null

  const response = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!response.ok) return null
  const data = await response.json()
  return data.data
}
```

### Auto-Refresh Access Tokens

Implement a token refresh interceptor:

```typescript
// Refresh token before it expires (e.g., at 14 minutes)
const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  const data = await response.json()
  localStorage.setItem('accessToken', data.data.accessToken)
}
```

### Sending Authenticated Requests

```typescript
const response = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
```

## Best Practices

### Do's ✅
- Always validate email format before signup/login
- Hash passwords with bcryptjs (never store plain text)
- Include Authorization header on protected endpoints
- Refresh access tokens automatically before expiry
- Invalidate all sessions on password change/reset
- Log authentication events for audit trails
- Use HTTPS in production (enforce with middleware)
- Implement rate limiting on all auth endpoints
- Use cryptographically random tokens (not simple UUIDs)
- Store refresh tokens in database (enables revocation)

### Don'ts ❌
- Don't accept user-provided salts for password hashing (use bcryptjs defaults)
- Don't expose whether an email exists (in login/reset flows)
- Don't send passwords in error messages or logs
- Don't trust client-side validation alone (validate on server)
- Don't store tokens in localStorage without considering XSS risks
- Don't use short token expiries for refresh tokens (causes UX friction)
- Don't skip email verification on signup
- Don't allow password reuse (consider adding history tracking)
- Don't hardcode JWT secrets (use environment variables)
- Don't log full tokens anywhere (only log token IDs if needed)

## Debugging & Troubleshooting

### Enable Detailed Logging

The authentication system includes detailed console logging with the `[LOGIN]`, `[SIGNUP]` prefixes:

```typescript
[LOGIN] Login attempt for email: user@example.com
[LOGIN] Querying database for user with email: user@example.com
[LOGIN] Database query returned 1 user(s)
[LOGIN] User found: user-id, email: user@example.com
[LOGIN] Attempting password verification for user user-id
[LOGIN] Password hash format check: { hashExists: true, hashLength: 60, hashPrefix: '$2a$' }
[LOGIN] Password match result: false
[LOGIN] Password mismatch for user user-id
```

**Check server logs** when authentication fails:
```bash
# Terminal
tail -f server.log | grep LOGIN
```

### Common Issues

**Issue**: "Invalid email or password" with correct credentials
- **Solution**: Check email case (queries are case-sensitive)
- **Debug**: Add log statement to see what email is being queried

**Issue**: Refresh token expired immediately
- **Solution**: Check server time synchronization (if using `new Date()`)
- **Debug**: Log token expiry times in response

**Issue**: Email verification token not working
- **Solution**: Verify email was sent correctly (check SendGrid logs)
- **Solution**: Check token wasn't cleared from database prematurely

**Issue**: Password reset token expired
- **Solution**: Tokens expire after 1 hour (user must request new one)
- **Debug**: Check `passwordResetExpiresAt` in database

**Issue**: Rate limit blocking legitimate users
- **Solution**: Rate limits are per IP (shared IPs may conflict)
- **Solution**: Can be adjusted in `src/server/utils/rateLimiter.ts`

## Environment Variables

```env
# Database
DATABASE_URL=postgres://user:pass@host:5432/db

# JWT Secrets (must be long, random strings)
JWT_SECRET=your-long-random-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=your-long-random-refresh-secret-key

# Email Service
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Environment
NODE_ENV=development|production
```

## Migration Notes

If migrating from another auth system:

1. **Hash existing passwords**: bcryptjs can hash legacy passwords
2. **Set email verification status**: Import verified state from old system
3. **Preserve user IDs**: Keep consistent IDs if possible (or map in migration)
4. **Test token generation**: Verify access/refresh tokens work as expected
5. **Validate rate limiting**: Ensure limits fit your traffic patterns
6. **Update environment variables**: Ensure all secrets are configured

## Testing Authentication

### Manual Testing with curl

```bash
# Signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Get current user (use token from login response)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJhbGc..."

# Refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGc..."}'

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer eyJhbGc..."
```

## References

- **bcryptjs Docs**: https://github.com/dcodeIO/bcrypt.js
- **JWT.io**: https://jwt.io
- **OWASP Auth Cheatsheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **SendGrid Docs**: https://sendgrid.com/docs
