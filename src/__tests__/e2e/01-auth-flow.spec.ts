import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication Flow
 * Tests user registration, login, and logout workflows
 */

test.describe('Authentication Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
  });

  test('should complete full user registration flow', async ({ page }) => {
    // 1. Navigate to signup page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);

    // 2. Fill out signup form
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard or show success message
    await expect(page).toHaveURL(/.*dashboard|projects/, { timeout: 10000 });

    // 5. Verify user is logged in (check for logout button or user menu)
    await expect(page.locator('text=Logout, text=Sign Out')).toBeVisible({ timeout: 5000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register the user
    await page.goto('/signup');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/.*dashboard|projects/, { timeout: 10000 });

    // Logout
    await page.click('text=Logout, text=Sign Out');

    // Now test login
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should be logged in
    await expect(page).toHaveURL(/.*dashboard|projects/, { timeout: 10000 });
    await expect(page.locator('text=Logout, text=Sign Out')).toBeVisible();
  });

  test('should show error with invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed/i')).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/signup');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', `logout-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|projects/, { timeout: 10000 });

    // Logout
    await page.click('text=Logout, text=Sign Out');

    // Should redirect to login or home page
    await expect(page).toHaveURL(/.*login|^\/$/, { timeout: 5000 });

    // Should not see logout button
    await expect(page.locator('text=Logout, text=Sign Out')).not.toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
  });

  test('should validate email format on signup', async ({ page }) => {
    await page.goto('/signup');

    // Fill with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/invalid.*email|email.*format/i')).toBeVisible();
  });

  test('should require strong password', async ({ page }) => {
    await page.goto('/signup');

    // Fill with weak password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `weak-pass-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', '123');  // Too short
    await page.click('button[type="submit"]');

    // Should show password validation error
    await expect(page.locator('text=/password.*weak|password.*short|password.*strength/i')).toBeVisible();
  });
});
