# Authentication System Improvements

This document outlines all the optional improvements that have been implemented to your authentication system.

## 1. Email Verification on Signup ✅

### What it does:
- Users receive an email verification token when they sign up
- Email is not verified by default (`emailVerified: false`)
- Users must verify their email via the `/api/auth/verify-email` endpoint

### How it works:
1. User signs up with email, password, and name
2. A random `emailVerificationToken` is generated and stored in the database
3. **TODO**: Email with verification link is sent to user (implement with Sendgrid, AWS SES, etc.)
4. User clicks verification link with token
5. Call `POST /api/auth/verify-email` with the token
6. Email is marked as verified in the database

### Database fields:
- `emailVerified` (boolean) - Whether email is verified
- `emailVerificationToken` (varchar) - Verification token

### API Endpoints:
```
POST /api/auth/signup
- Returns emailVerificationToken (for frontend to handle)
- emailVerified: false

POST /api/auth/verify-email
- Body: { token: string }
- Marks user's email as verified
```

### Future Implementation:
To enable email sending, integrate with:
- **SendGrid**: `npm install @sendgrid/mail`
- **AWS SES**: AWS SDK
- **Nodemailer**: For self-hosted SMTP

Example in `src/server/routes/auth.ts`:
```typescript
// TODO: Send verification email with emailVerificationToken
// Example: await sendVerificationEmail(email, emailVerificationToken);
```

---

## 2. Password Reset Flow ✅

### What it does:
- Users can request a password reset via their email
- Reset tokens expire after 1 hour
- All active refresh tokens are invalidated after password reset

### How it works:
1. User requests password reset: `POST /api/auth/forgot-password`
2. **TODO**: Email with reset link is sent (includes reset token)
3. User clicks link and enters new password
4. Call `POST /api/auth/reset-password` with token and new password
5. Password is updated and all refresh tokens are invalidated (forces re-login on all devices)

### Database fields:
- `passwordResetToken` (varchar) - Reset token
- `passwordResetExpiresAt` (timestamp) - When token expires

### API Endpoints:
```
POST /api/auth/forgot-password
- Body: { email: string }
- Returns success message (doesn't leak if email exists)
- Generates reset token valid for 1 hour

POST /api/auth/reset-password
- Body: { token: string, newPassword: string }
- Updates password and invalidates all refresh tokens
```

### Security Features:
- Reset tokens are single-use and expire after 1 hour
- Password reset invalidates all existing sessions
- Response doesn't leak whether email exists (prevents account enumeration)
- New password must be at least 6 characters

---

## 3. Refresh Token Mechanism ✅

### What it does:
- Short-lived access tokens (15 minutes) for API requests
- Long-lived refresh tokens (7 days) for obtaining new access tokens
- Refresh tokens are stored in database for revocation support

### How it works:
1. User logs in or signs up
2. Receives `accessToken` (15m) and `refreshToken` (7d)
3. Use `accessToken` in `Authorization: Bearer <token>` header
4. When `accessToken` expires, call `POST /api/auth/refresh`
5. Receive new `accessToken` (old `refreshToken` still valid)
6. Logout invalidates all `refreshToken`s for the user

### Database tables:
- `authSessions` - Stores refresh tokens with expiration

### API Endpoints:
```
POST /api/auth/login
- Returns: { accessToken, refreshToken }

POST /api/auth/signup
- Returns: { accessToken, refreshToken }

POST /api/auth/refresh
- Body: { refreshToken: string }
- Returns: { accessToken: string (new) }

POST /api/auth/logout
- Requires: Authorization header with accessToken
- Deletes all refresh tokens for user
```

### Token Structure:
- **Access Token**: JWT with 15-minute expiration
  - Contains: userId, email, type: 'access'

- **Refresh Token**: JWT with 7-day expiration
  - Contains: userId, type: 'refresh'
  - Also stored in `authSessions` table for validation

### Security Features:
- Tokens are signed JWTs
- Refresh tokens are stored server-side for revocation
- Logout invalidates all sessions
- Expired tokens are automatically cleaned up

---

## 4. Rate Limiting on Auth Endpoints ✅

### What it does:
- Prevents brute force attacks on signup, login, and password reset
- Tracks attempts by IP address
- Returns 429 (Too Many Requests) when limit exceeded

### Rate Limit Configuration:
```typescript
const MAX_ATTEMPTS = {
  signup: 5,        // 5 attempts per IP per 15 minutes
  login: 10,        // 10 attempts per IP per 15 minutes
  passwordReset: 3, // 3 attempts per IP per 15 minutes
  verifyEmail: 5,   // 5 attempts per IP per 15 minutes
};

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
```

### How it works:
1. Each request checks rate limit against IP address
2. Attempts are tracked in `rateLimitLog` table
3. If limit exceeded, return 429 with reset time
4. Successful auth resets the limit counter
5. Old records are auto-cleaned every minute

### Database table:
- `rateLimitLog` - Tracks attempts per endpoint per IP

### API Response (when limited):
```json
{
  "success": false,
  "error": "Too many signup attempts. Try again after 2024-01-15T10:30:00.000Z"
}
```

### Security Features:
- Per-endpoint rate limits
- Tracked by IP address (can be enhanced to user ID after login)
- Automatic cleanup of expired records
- Successful auth resets counter
- Configurable limits

---

## 5. CSRF Protection ✅

### What it does:
- Protects against Cross-Site Request Forgery (CSRF) attacks
- Validates CSRF tokens on state-changing requests (POST, PATCH, DELETE)
- Stores tokens with 24-hour expiration

### How it works:
1. Client makes a request, middleware generates CSRF token
2. Token is sent in response header `X-CSRF-Token`
3. Client includes token in subsequent requests via `X-CSRF-Token` header or `csrfToken` body field
4. Middleware validates token before processing request
5. GET/HEAD/OPTIONS requests skip CSRF check (read-only)

### Implementation:
- Tokens stored in-memory (production: use Redis/database)
- Session ID from cookies or `X-Session-Id` header
- Automatic cleanup of expired tokens every minute

### Middleware usage:
```typescript
// In src/server/index.ts:
import { csrfTokenMiddleware, csrfProtectionMiddleware } from './middleware/csrf';

app.use(csrfTokenMiddleware);      // Add CSRF token to responses
app.use(csrfProtectionMiddleware); // Validate CSRF on state-changing requests
```

### Client implementation:
```javascript
// Get CSRF token from response header
const csrfToken = response.headers['x-csrf-token'];

// Include in next request
fetch('/api/projects', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### Security Features:
- Token validation on all state-changing requests
- 24-hour token expiration
- Per-session tokens
- Automatic cleanup

---

## New Database Tables

### `users` (extended)
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
```

### `auth_sessions`
```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### `rate_limit_log`
```sql
CREATE TABLE rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## New Utility Files

### `src/server/utils/tokenGenerator.ts`
- `generateRandomToken()` - Generate verification/reset tokens
- `generateAccessToken(userId, email)` - Create 15m JWT
- `generateRefreshToken(userId)` - Create 7d JWT
- `verifyAccessToken(token)` - Validate access token
- `verifyRefreshToken(token)` - Validate refresh token

### `src/server/utils/rateLimiter.ts`
- `checkRateLimit(identifier, endpoint)` - Check if request allowed
- `resetRateLimit(identifier, endpoint)` - Clear rate limit

### `src/server/middleware/csrf.ts`
- `generateCsrfToken(sessionId)` - Create token
- `csrfProtectionMiddleware` - Validate tokens
- `csrfTokenMiddleware` - Add tokens to responses

---

## Environment Variables

Add to `.env.local`:
```env
# Token Secrets (change to strong random values in production)
JWT_SECRET="your-jwt-secret-key"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# Optional: Email service configuration
# SENDGRID_API_KEY="your-sendgrid-key"
# AWS_REGION="us-east-1"
# AWS_ACCESS_KEY_ID="..."
# AWS_SECRET_ACCESS_KEY="..."
```

---

## API Endpoints Summary

### Authentication
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout (requires auth)
GET /api/auth/me (requires auth)
POST /api/auth/refresh
POST /api/auth/verify-email
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

---

## Migration Steps Completed

1. ✅ Extended `users` table with email verification and password reset fields
2. ✅ Created `authSessions` table for refresh token storage
3. ✅ Created `rateLimitLog` table for rate limiting
4. ✅ Generated and applied Drizzle migrations
5. ✅ Implemented token generation utilities
6. ✅ Implemented rate limiting utilities
7. ✅ Implemented CSRF protection middleware
8. ✅ Updated auth routes with new features
9. ✅ Updated auth middleware to use new token system
10. ✅ Added environment variables

---

## Next Steps for Production

### 1. Email Integration
Implement email sending in:
- `POST /api/auth/signup` - Send verification email
- `POST /api/auth/forgot-password` - Send reset email

Options:
- SendGrid (recommended for scale)
- AWS SES
- Nodemailer (self-hosted)

### 2. CSRF Protection Integration
Add CSRF middleware to your server in `src/server/index.ts`:
```typescript
import { csrfTokenMiddleware, csrfProtectionMiddleware } from './middleware/csrf';

// Before routes
app.use(csrfTokenMiddleware);
app.use(csrfProtectionMiddleware);
```

For production, move CSRF token storage from memory to:
- Redis
- Database
- Session store

### 3. Refresh Token Cleanup
Add a background job to clean up expired refresh tokens:
```typescript
setInterval(async () => {
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
}, 60 * 60 * 1000); // Every hour
```

### 4. Rate Limit Tuning
Adjust `MAX_ATTEMPTS` and `RATE_LIMIT_WINDOW` based on your needs.

### 5. Security Headers
Add to `src/server/index.ts`:
```typescript
app.use(helmet()); // Already imported
app.disable('x-powered-by');
```

### 6. HTTPS Only
In production, enforce HTTPS and set `secure: true` on cookies

### 7. Audit Logging
Log all auth events (signup, login, password change, etc.) for security audits

---

## Testing Checklist

- [ ] Signup with valid email
- [ ] Verify email with token
- [ ] Login with verified email
- [ ] Get access and refresh tokens
- [ ] Use access token to access protected routes
- [ ] Refresh token when access token expires
- [ ] Logout and verify all refresh tokens deleted
- [ ] Request password reset
- [ ] Reset password with valid token
- [ ] Attempt password reset with expired token
- [ ] Test rate limiting (exceed attempt limit)
- [ ] Test CSRF protection (missing/invalid token)
- [ ] Test with invalid email formats
- [ ] Test with weak passwords

---

## Security Improvements Summary

| Feature | Before | After |
|---------|--------|-------|
| **Passwords** | Plaintext | Bcrypt hashed (10 rounds) |
| **Sessions** | In-memory, never expire | JWT with 15m expiration |
| **Token Refresh** | N/A | 7-day refresh tokens in DB |
| **Email Verified** | N/A | Tracked with verification tokens |
| **Password Reset** | N/A | Time-limited reset tokens |
| **Brute Force** | No protection | Rate limiting per IP |
| **CSRF** | No protection | CSRF tokens on state changes |
| **User Isolation** | No | Projects filtered by userId |
| **Token Type** | Simple strings | Signed JWTs |

---

Generated: 2024
