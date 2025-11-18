# E2E Testing Setup Guide

This guide will help you set up and run End-to-End (E2E) tests using Playwright.

---

## Quick Setup (Recommended)

### Option 1: Automated Setup Script

```bash
sudo bash scripts/setup-e2e.sh
```

This script will:
1. Install system dependencies (libavif16)
2. Install Playwright browsers
3. Verify the installation

### Option 2: Manual Setup

```bash
# 1. Install system dependency
sudo apt-get update
sudo apt-get install -y libavif16

# 2. Install Playwright browsers
npx playwright install
```

---

## Running E2E Tests

### Prerequisites

Make sure your development server is running:

```bash
# Terminal 1: Start the full stack
pnpm dev:full
```

This starts both:
- Frontend (Vite) on http://localhost:5173
- Backend (Express) on http://localhost:3001

### Run Tests

```bash
# Terminal 2: Run E2E tests
npx playwright test
```

### Test Modes

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test auth-flow
npx playwright test project-workflow

# Run with UI (interactive mode)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode (step through tests)
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Slow motion (easier to observe)
npx playwright test --headed --slow-mo=500
```

---

## E2E Test Files

We have 17 E2E tests covering critical workflows:

### 1. Authentication Flow (8 tests)
**File**: [src/__tests__/e2e/01-auth-flow.spec.ts](src/__tests__/e2e/01-auth-flow.spec.ts)

Tests:
- ✅ User registration flow
- ✅ Login with valid credentials
- ✅ Login with invalid credentials (error handling)
- ✅ Logout functionality
- ✅ Protected route access control
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Session management

### 2. Project Workflow (9 tests)
**File**: [src/__tests__/e2e/02-project-workflow.spec.ts](src/__tests__/e2e/02-project-workflow.spec.ts)

Tests:
- ✅ Create new project
- ✅ View project details
- ✅ Update project information
- ✅ Delete project
- ✅ List all user projects
- ✅ Empty state handling
- ✅ Required field validation
- ✅ Phase navigation
- ✅ Multi-project handling

---

## Viewing Test Results

### HTML Report

After running tests, view the detailed HTML report:

```bash
npx playwright show-report
```

This opens a browser with:
- Test execution timeline
- Screenshots of failures
- Trace files for debugging
- Step-by-step breakdown

### Console Output

```bash
# Verbose output
npx playwright test --reporter=list

# JSON output
npx playwright test --reporter=json

# Multiple reporters
npx playwright test --reporter=html --reporter=list
```

---

## Troubleshooting

### Issue: "sudo npx: command not found"

**Solution**: Use the full path to npx:

```bash
sudo /home/nochaserz/.nvm/versions/node/v*/bin/npx playwright install-deps
```

Or install the dependency directly:

```bash
sudo apt-get install libavif16
```

### Issue: "Cannot find browser"

**Solution**: Install browsers:

```bash
npx playwright install
```

### Issue: "Connection refused" or "Target page closed"

**Solution**: Make sure your dev server is running:

```bash
# Check if server is running
curl http://localhost:5173
curl http://localhost:3001/health

# If not, start it
pnpm dev:full
```

### Issue: Tests timeout

**Solution**: Increase timeout in [playwright.config.ts](playwright.config.ts):

```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds
  use: {
    actionTimeout: 15000, // 15 seconds per action
  },
});
```

### Issue: "Address already in use"

**Solution**: Kill processes on ports 5173 or 3001:

```bash
# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

---

## CI/CD Integration

E2E tests are configured to run in GitHub Actions automatically.

### Configuration

File: `.github/workflows/ci-cd.yml`

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npx playwright test

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Writing New E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform action', async ({ page }) => {
    // Navigate
    await page.goto('/path');

    // Interact
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Assert
    await expect(page).toHaveURL(/.*success/);
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes**
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Wait for elements properly**
   ```typescript
   await page.waitForSelector('[data-testid="content"]');
   await expect(page.locator('text=Loaded')).toBeVisible();
   ```

3. **Use unique test data**
   ```typescript
   const email = `test-${Date.now()}@example.com`;
   ```

4. **Clean up after tests**
   ```typescript
   test.afterEach(async ({ page }) => {
     // Logout, delete test data, etc.
   });
   ```

---

## Configuration

### Playwright Config

File: [playwright.config.ts](playwright.config.ts)

Key settings:
- **Base URL**: http://localhost:5174 (update to 5173 if needed)
- **Timeout**: 120 seconds for server startup
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Screenshots**: Captured on failure
- **Traces**: Recorded on first retry

### Update Base URL

If your dev server runs on a different port:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173', // Changed from 5174
  },
  webServer: {
    url: 'http://localhost:5173',
  },
});
```

---

## Performance Tips

### Run Tests in Parallel

```bash
# Default (parallel)
npx playwright test

# Limit workers
npx playwright test --workers=2
```

### Run Specific Tests Only

```bash
# Run only auth tests
npx playwright test auth-flow

# Run tests matching pattern
npx playwright test --grep "login"

# Skip tests matching pattern
npx playwright test --grep-invert "slow"
```

### Headless Mode (Faster)

```bash
# Headless (default, faster)
npx playwright test

# Headed (slower, but visual)
npx playwright test --headed
```

---

## Debugging Tests

### Debug Mode

```bash
# Opens Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test --debug auth-flow
```

### Trace Viewer

```bash
# Generate trace (automatic on failure)
npx playwright test

# View trace
npx playwright show-trace trace.zip
```

### Screenshots

Screenshots are automatically saved in `test-results/` on failure.

```bash
# View screenshots
ls test-results/*/test-failed-1.png
```

---

## Common Selectors

```typescript
// By text
page.locator('text=Login')

// By role
page.locator('role=button[name="Submit"]')

// By data-testid
page.locator('[data-testid="submit-btn"]')

// By CSS selector
page.locator('button.primary')

// By placeholder
page.locator('input[placeholder="Email"]')

// By label text
page.locator('input[name="email"]')
```

---

## Example: Adding a New E2E Test

Let's add a test for artifact upload:

```typescript
// src/__tests__/e2e/03-artifact-upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Artifact Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
  });

  test('should upload requirement artifact', async ({ page }) => {
    // Navigate to project
    await page.click('text=My Project');

    // Go to requirements phase
    await page.click('text=Requirements');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/requirements.json');

    // Verify upload
    await expect(page.locator('text=Upload successful')).toBeVisible();
  });
});
```

---

## Next Steps

1. ✅ Install Playwright dependencies (run setup script)
2. ✅ Start your dev server (`pnpm dev:full`)
3. ✅ Run E2E tests (`npx playwright test`)
4. ⏳ Review test results
5. ⏳ Add more E2E tests as needed

---

## Additional Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Best Practices**: https://playwright.dev/docs/best-practices
- **Playwright API**: https://playwright.dev/docs/api/class-playwright
- **Selector Guide**: https://playwright.dev/docs/selectors

---

**Status**: ✅ E2E Framework Ready
**Tests Created**: 17 comprehensive tests
**Coverage**: Authentication + Project Workflows

Run `sudo bash scripts/setup-e2e.sh` to get started! 🚀
