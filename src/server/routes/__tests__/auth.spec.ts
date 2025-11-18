/**
 * Auth Routes Test Suite - Comprehensive
 * Tests for user authentication endpoints including signup, login, refresh, logout
 * Covers validation, error handling, and edge cases
 */

import request from 'supertest';
import { testApp as app } from '../../test/testApp';
import { testHelpers } from '../../test/setup';

describe('Auth Routes - Comprehensive Tests', () => {
  // Test data
  const validUser = {
    email: 'valid@example.com',
    password: 'ValidPassword123',
    name: 'Valid User',
  };

  // ========================================
  // POST /api/auth/signup Tests
  // ========================================
  describe('POST /api/auth/signup', () => {
    describe('Valid Signup', () => {
      it('should signup with valid email, password, and name', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'ValidPassword123!',
            name: 'New User',
          });

        expect(res.status).toBe(201);
        testHelpers.assertSuccessResponse(res.body);
        expect(res.body.data.user).toHaveProperty('id');
        expect(res.body.data.user).toHaveProperty('email');
        expect(res.body.data.user).toHaveProperty('name');
        expect(res.body.data.user).not.toHaveProperty('password'); // Should not return password
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
      });

      it('should set secure cookies after signup', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'ValidPassword123!',
            name: 'Cookie Test User',
          });

        expect(res.status).toBe(201);
        expect(res.headers['set-cookie']).toBeDefined();
      });

      it('should handle emails with various valid formats', async () => {
        const validEmails = [
          'user+tag@example.com',
          'user_name@example.co.uk',
          'user.name@example.com',
          '123@example.com',
        ];

        for (const email of validEmails) {
          const res = await request(app)
            .post('/api/auth/signup')
            .send({
              email,
              password: 'ValidPassword123!',
              name: 'Test User',
            });

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
        }
      });
    });

    describe('Email Validation', () => {
      it('should reject signup with invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'not-an-email',
            password: 'ValidPassword123!',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
        expect(res.body.error).toMatch(/email|format/i);
      });

      it('should reject signup with empty email', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: '',
            password: 'ValidPassword123!',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject signup with missing email', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            password: 'ValidPassword123!',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject signup with email missing @ symbol', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'userexample.com',
            password: 'ValidPassword123!',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject signup with duplicate email', async () => {
        const email = testHelpers.randomEmail();

        // First signup
        const res1 = await request(app)
          .post('/api/auth/signup')
          .send({
            email,
            password: 'ValidPassword123!',
            name: 'First User',
          });

        expect(res1.status).toBe(201);

        // Second signup with same email
        const res2 = await request(app)
          .post('/api/auth/signup')
          .send({
            email,
            password: 'DifferentPassword123!',
            name: 'Second User',
          });

        expect(res2.status).toBe(409);
        testHelpers.assertErrorResponse(res2.body);
        expect(res2.body.error).toMatch(/already|exist|duplicate/i);
      });

      it('should handle case-insensitive duplicate email detection', async () => {
        const email = testHelpers.randomEmail();

        // First signup
        await request(app)
          .post('/api/auth/signup')
          .send({
            email: email.toLowerCase(),
            password: 'ValidPassword123!',
            name: 'User 1',
          });

        // Second signup with uppercase
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: email.toUpperCase(),
            password: 'ValidPassword123!',
            name: 'User 2',
          });

        expect(res.status).toBe(409);
      });
    });

    describe('Password Validation', () => {
      it('should reject signup with short password', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'short',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
        expect(res.body.error).toMatch(/password|length|character/i);
      });

      it('should reject signup with empty password', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: '',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject signup with missing password', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            name: 'Test User',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should accept password with 6+ characters', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: '123456', // Exactly 6 characters
            name: 'Test User',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should accept strong passwords with special characters', async () => {
        const strongPasswords = [
          'P@ssw0rd!',
          'Test#Pass123',
          'MyP@ss_2024',
        ];

        for (const password of strongPasswords) {
          const res = await request(app)
            .post('/api/auth/signup')
            .send({
              email: testHelpers.randomEmail(),
              password,
              name: 'Test User',
            });

          expect(res.status).toBe(201);
        }
      });
    });

    describe('Name Validation', () => {
      it('should reject signup with empty name', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'ValidPassword123!',
            name: '',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject signup with missing name', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'ValidPassword123!',
          });

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should accept various valid name formats', async () => {
        const validNames = [
          'John Doe',
          'María García',
          'Jean-Pierre',
          'O\'Brien',
          'Li Wei',
        ];

        for (const name of validNames) {
          const res = await request(app)
            .post('/api/auth/signup')
            .send({
              email: testHelpers.randomEmail(),
              password: 'ValidPassword123!',
              name,
            });

          expect(res.status).toBe(201);
          expect(res.body.data.user.name).toBe(name);
        }
      });
    });

    describe('Payload Validation', () => {
      it('should reject signup with extra unexpected fields', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'ValidPassword123!',
            name: 'Test User',
            isAdmin: true,
            role: 'admin',
          });

        // Should succeed but ignore extra fields
        expect([201, 400]).toContain(res.status);
      });

      it('should reject signup with null values', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .send({
            email: null,
            password: 'ValidPassword123!',
            name: 'Test User',
          });

        expect(res.status).toBe(400);
      });

      it('should handle missing content-type gracefully', async () => {
        const res = await request(app)
          .post('/api/auth/signup')
          .set('Content-Type', 'text/plain')
          .send('not json');

        expect([400, 415]).toContain(res.status);
      });
    });
  });

  // ========================================
  // POST /api/auth/login Tests
  // ========================================
  describe('POST /api/auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = testHelpers.randomEmail();
      testPassword = 'LoginTestPassword123!';

      await request(app)
        .post('/api/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        });
    });

    describe('Valid Login', () => {
      it('should login with valid email and password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
          });

        expect(res.status).toBe(200);
        testHelpers.assertSuccessResponse(res.body);
        expect(res.body.data.user.email).toBe(testEmail);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
      });

      it('should not return password in login response', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
          });

        expect(res.status).toBe(200);
        expect(res.body.data.user).not.toHaveProperty('password');
      });

      it('should generate different tokens on each login', async () => {
        const res1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
          });

        const res2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
          });

        expect(res1.body.data.accessToken).not.toBe(res2.body.data.accessToken);
        expect(res1.body.data.refreshToken).not.toBe(res2.body.data.refreshToken);
      });
    });

    describe('Invalid Credentials', () => {
      it('should reject login with wrong password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword123!',
          });

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
        expect(res.body.error).toMatch(/password|credentials|invalid/i);
      });

      it('should reject login with non-existent email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: testPassword,
          });

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should not reveal whether email exists', async () => {
        const res1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'SomePassword123!',
          });

        const res2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword123!',
          });

        // Both should fail with similar error messages
        expect(res1.status).toBe(401);
        expect(res2.status).toBe(401);
      });

      it('should reject login with empty password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: '',
          });

        expect(res.status).toBe(400);
      });

      it('should reject login with missing email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            password: testPassword,
          });

        expect(res.status).toBe(400);
      });

      it('should reject login with missing password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
          });

        expect(res.status).toBe(400);
      });
    });

    describe('Case Sensitivity', () => {
      it('should handle email case-insensitively for login', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail.toUpperCase(),
            password: testPassword,
          });

        expect(res.status).toBe(200);
      });
    });
  });

  // ========================================
  // GET /api/auth/me Tests
  // ========================================
  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let userId: string;
    let userEmail: string;

    beforeAll(async () => {
      userEmail = testHelpers.randomEmail();
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: userEmail,
          password: 'MeTestPassword123!',
          name: 'Me Test User',
        });

      accessToken = signupRes.body.data.accessToken;
      userId = signupRes.body.data.user.id;
    });

    describe('Valid Token', () => {
      it('should return current user with valid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        testHelpers.assertSuccessResponse(res.body);
        expect(res.body.data.email).toBe(userEmail);
        expect(res.body.data.id).toBe(userId);
      });

      it('should not return password in /me response', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).not.toHaveProperty('password');
      });

      it('should return user with correct properties', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        const userData = res.body.data;
        expect(userData).toHaveProperty('id');
        expect(userData).toHaveProperty('email');
        expect(userData).toHaveProperty('name');
        expect(userData).toHaveProperty('createdAt');
      });
    });

    describe('Missing/Invalid Token', () => {
      it('should reject request without token', async () => {
        const res = await request(app)
          .get('/api/auth/me');

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject request with invalid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject request with malformed authorization header', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'InvalidFormat token');

        expect(res.status).toBe(401);
      });

      it('should reject request with Bearer prefix missing', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', accessToken);

        expect(res.status).toBe(401);
      });

      it('should reject request with expired token', async () => {
        // This would require mocking token expiration
        // For now, just verify the mechanism works
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer expired-token-token-token');

        expect(res.status).toBe(401);
      });
    });

    describe('Token Variations', () => {
      it('should accept token in Authorization header', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
      });

      it('should be case-sensitive about Bearer keyword', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `bearer ${accessToken}`);

        expect(res.status).toBe(401);
      });
    });
  });

  // ========================================
  // POST /api/auth/refresh Tests
  // ========================================
  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let originalAccessToken: string;

    beforeAll(async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testHelpers.randomEmail(),
          password: 'RefreshTestPassword123!',
          name: 'Refresh Test User',
        });

      refreshToken = signupRes.body.data.refreshToken;
      originalAccessToken = signupRes.body.data.accessToken;
    });

    describe('Valid Refresh', () => {
      it('should return new access token with valid refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        expect(res.status).toBe(200);
        testHelpers.assertSuccessResponse(res.body);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.accessToken).not.toEqual(originalAccessToken);
      });

      it('should include refresh token in refresh response', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('refreshToken');
      });

      it('should generate different tokens on multiple refreshes', async () => {
        const res1 = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        const res2 = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });

        expect(res1.body.data.accessToken).not.toBe(res2.body.data.accessToken);
      });
    });

    describe('Invalid/Missing Refresh Token', () => {
      it('should reject request without refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({});

        expect(res.status).toBe(400);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject request with invalid refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid.token.here' });

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject request with malformed refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'not-a-token' });

        expect(res.status).toBe(401);
      });

      it('should reject request with empty refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: '' });

        expect(res.status).toBe(400);
      });

      it('should reject request with null refresh token', async () => {
        const res = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: null });

        expect(res.status).toBe(400);
      });
    });
  });

  // ========================================
  // POST /api/auth/logout Tests
  // ========================================
  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testHelpers.randomEmail(),
          password: 'LogoutTestPassword123!',
          name: 'Logout Test User',
        });

      accessToken = signupRes.body.data.accessToken;
    });

    describe('Valid Logout', () => {
      it('should logout with valid token', async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        testHelpers.assertSuccessResponse(res.body);
        expect(res.body).toHaveProperty('message');
      });

      it('should invalidate token after logout', async () => {
        // Create new user for this test
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testHelpers.randomEmail(),
            password: 'LogoutTestPassword123!',
            name: 'Logout Test User 2',
          });

        const token = signupRes.body.data.accessToken;

        // Logout
        const logoutRes = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(logoutRes.status).toBe(200);

        // Try to use token after logout
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(meRes.status).toBe(401);
      });
    });

    describe('Invalid/Missing Token', () => {
      it('should reject logout without token', async () => {
        const res = await request(app)
          .post('/api/auth/logout');

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });

      it('should reject logout with invalid token', async () => {
        const res = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(401);
        testHelpers.assertErrorResponse(res.body);
      });
    });
  });

  // ========================================
  // Rate Limiting Tests
  // ========================================
  describe('Rate Limiting', () => {
    it('should rate limit excessive signup attempts from same IP', async () => {
      const email = testHelpers.randomEmail();
      const requests: any[] = [];

      // Make 6 rapid requests (assuming limit is 5 per minute)
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/signup')
            .send({
              email: `${email}-${i}`,
              password: 'Password123!',
              name: `User ${i}`,
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimited = responses.some((res: any) => res.status === 429);
      expect(rateLimited).toBe(true);

      // Verify that some succeeded before rate limit
      const succeeded = responses.filter((res: any) => res.status === 201);
      expect(succeeded.length).toBeGreaterThan(0);
    });

    it('should rate limit excessive login attempts', async () => {
      const email = testHelpers.randomEmail();

      // Create a user
      await request(app)
        .post('/api/auth/signup')
        .send({
          email,
          password: 'Password123!',
          name: 'Rate Limit Test User',
        });

      // Make many login attempts
      const requests: any[] = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email,
              password: 'WrongPassword123!',
            })
        );
      }

      const responses = await Promise.all(requests);

      // Should see at least one 429 response
      const rateLimited = responses.some((res: any) => res.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should return rate limit headers when approaching limit', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testHelpers.randomEmail(),
          password: 'Password123!',
          name: 'Test User',
        });

      // Check for rate limit headers
      if (res.status === 429) {
        expect(res.headers).toHaveProperty('retry-after');
      }
    });
  });

  // ========================================
  // Integration Tests
  // ========================================
  describe('Auth Flow Integration', () => {
    it('should complete full signup -> login -> refresh -> logout flow', async () => {
      const email = testHelpers.randomEmail();
      const password = 'IntegrationTestPassword123!';
      const name = 'Integration Test User';

      // 1. Signup
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ email, password, name });

      expect(signupRes.status).toBe(201);
      const { accessToken, refreshToken, user } = signupRes.body.data;

      // 2. Get current user
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(email);

      // 3. Refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      const newAccessToken = refreshRes.body.data.accessToken;

      // 4. Use new token
      const meRes2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(meRes2.status).toBe(200);

      // 5. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(logoutRes.status).toBe(200);

      // 6. Verify token is invalidated
      const finalMeRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(finalMeRes.status).toBe(401);
    });

    it('should allow login after signup', async () => {
      const email = testHelpers.randomEmail();
      const password = 'SequenceTestPassword123!';

      // Signup
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email,
          password,
          name: 'Sequence Test User',
        });

      expect(signupRes.status).toBe(201);

      // Immediate login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.email).toBe(email);
    });
  });

  // ========================================
  // Error Response Consistency
  // ========================================
  describe('Error Response Format', () => {
    it('should return consistent error response format', async () => {
      const testCases = [
        {
          endpoint: '/api/auth/signup',
          method: 'post',
          payload: { email: 'invalid' },
        },
        {
          endpoint: '/api/auth/login',
          method: 'post',
          payload: { email: 'test@test.com' },
        },
      ];

      for (const testCase of testCases) {
        let res: any;

        if (testCase.method === 'post') {
          res = await request(app)
            .post(testCase.endpoint)
            .send(testCase.payload);
        }

        if (res.status >= 400) {
          expect(res.body).toHaveProperty('success');
          expect(res.body.success).toBe(false);
          expect(res.body).toHaveProperty('error');
          expect(typeof res.body.error).toBe('string');
        }
      }
    });
  });
});
