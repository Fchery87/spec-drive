# Testing Quick Reference Guide

Quick commands and common tasks for testing in Spec-Drive.

---

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test auth.spec
pnpm test projects.spec
pnpm test validation.spec

# Run tests matching pattern
pnpm test -- --testNamePattern="signup"

# Watch mode (re-run on changes)
pnpm test:watch

# Coverage report
pnpm test:coverage

# Verbose output
pnpm test -- --verbose
```

### E2E Tests

```bash
# Install Playwright browsers (one-time setup)
npx playwright install

# Run all E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui

# Run specific E2E test
npx playwright test auth-flow
npx playwright test project-workflow

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

---

## Test File Locations

```
src/
├── server/
│   ├── routes/__tests__/
│   │   ├── auth.spec.ts          # Auth endpoint tests
│   │   └── projects.spec.ts      # Project CRUD tests
│   ├── utils/__tests__/
│   │   ├── logger.spec.ts        # Logger tests
│   │   ├── secrets.spec.ts       # Secrets validation tests
│   │   └── rateLimiter.spec.ts   # Rate limiter tests
│   └── test/
│       ├── testApp.ts            # Test Express app
│       └── setup.ts              # Test utilities
├── lib/__tests__/
│   └── validation.spec.ts        # Validation engine tests
└── __tests__/e2e/
    ├── 01-auth-flow.spec.ts      # E2E auth tests
    └── 02-project-workflow.spec.ts # E2E project tests
```

---

## Current Test Status

| Test Suite | Total | Passing | Failing |
|------------|-------|---------|---------|
| **Auth Routes** | 58 | 33 | 25 |
| **Projects** | 30+ | ~15 | ~15 |
| **Validation** | 50+ | ~40 | ~10 |
| **Logger** | 20+ | ~18 | ~2 |
| **Secrets** | 16+ | ~10 | ~6 |
| **Rate Limiter** | 14+ | ~2 | ~12 |
| **E2E Tests** | 17 | 0* | 0* |
| **TOTAL** | **196** | **118** | **78** |

*E2E tests not run yet (need browser setup)

---

## Common Test Patterns

### Writing a New Test

```typescript
import { test, expect } from '@playwright/test';

describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  test('should do something', async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await someFunction(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  // Navigate
  await page.goto('/login');

  // Interact
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'Password123');
  await page.click('button[type="submit"]');

  // Assert
  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## Debugging Tests

### Unit Tests

```bash
# Run single test
pnpm test -- --testNamePattern="specific test name"

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Add console.log in tests
test('debug test', () => {
  console.log('Value:', someValue);
  expect(someValue).toBe(expected);
});
```

### E2E Tests

```bash
# Debug mode (pauses execution)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Slow motion (easier to see actions)
npx playwright test --headed --slow-mo=1000

# Screenshots on failure (automatic)
# Check: test-results/ directory
```

---

## Test Utilities

### Creating Test User

```typescript
import { createTestUser } from '../../test/setup';

const user = await createTestUser({
  email: 'test@example.com',
  password: 'TestPassword123',
  name: 'Test User'
});
```

### Test Helpers

```typescript
import { testHelpers } from '../../test/setup';

// Generate random email
const email = testHelpers.randomEmail();

// Wait for async operation
await testHelpers.wait(1000);

// Assert response structure
testHelpers.assertSuccessResponse(response.body);
testHelpers.assertErrorResponse(response.body);
```

---

## Environment Variables for Testing

```bash
# Automatically set in setupTests.ts
NODE_ENV=test
JWT_SECRET=test-jwt-secret-minimum-32-characters-long
REFRESH_TOKEN_SECRET=test-refresh-token-secret-minimum-32-characters-long
DATABASE_URL=postgresql://test:test@localhost:5432/test
```

---

## Mocking

### Database Mock

```typescript
// Automatically mocked in tests via setupTests.ts
import { db } from '@/db';

// Mock is in-memory and resets between tests
// Use resetMockDb() if needed
import { resetMockDb } from '@/__mocks__/db';

beforeEach(() => {
  resetMockDb();
});
```

### Custom Mocks

```typescript
// Mock a module
jest.mock('../path/to/module', () => ({
  someFunction: jest.fn().mockReturnValue('mocked value'),
}));

// Mock implementation
const mockFn = jest.fn();
mockFn.mockImplementation(() => 'result');
mockFn.mockResolvedValue('async result');
mockFn.mockRejectedValue(new Error('error'));
```

---

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

```yaml
# .github/workflows/ci-cd.yml
- name: Run Tests
  run: pnpm test

- name: Run E2E Tests
  run: npx playwright test
```

---

## Troubleshooting

### Tests Won't Run

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Check Node version (should be 18+)
node --version
```

### E2E Tests Fail

```bash
# Reinstall browsers
npx playwright install --force

# Check server is running
pnpm dev:full

# Increase timeouts in playwright.config.ts
```

### Import Errors

```bash
# Check tsconfig paths
# Verify @/ alias is configured in jest.config.js

# Rebuild
pnpm build
```

---

## Performance Tips

### Speed Up Tests

```bash
# Run tests in parallel (default)
pnpm test

# Limit workers
pnpm test -- --maxWorkers=4

# Run only changed files
pnpm test -- --onlyChanged

# Skip coverage (faster)
pnpm test -- --coverage=false
```

### E2E Performance

```typescript
// Reuse authentication state
test.use({
  storageState: 'auth.json', // Saved login state
});

// Parallel execution (default)
test.describe.configure({ mode: 'parallel' });

// Sequential if needed
test.describe.configure({ mode: 'serial' });
```

---

## Coverage Reports

```bash
# Generate coverage
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Coverage thresholds (jest.config.js)
# - branches: 70%
# - functions: 70%
# - lines: 70%
# - statements: 70%
```

---

## Best Practices

✅ **DO**:
- Write descriptive test names
- Use AAA pattern (Arrange, Act, Assert)
- Clean up after tests (afterEach)
- Test one thing per test
- Use data-testid for E2E selectors
- Mock external dependencies

❌ **DON'T**:
- Test implementation details
- Share state between tests
- Use random data without seeding
- Skip cleanup
- Ignore failing tests
- Write overly complex tests

---

## Getting Help

- **Jest Docs**: https://jestjs.io/docs/getting-started
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Testing Library**: https://testing-library.com/docs/

---

## Quick Wins

```bash
# Run only fast tests
pnpm test -- --testPathPattern="utils"

# Watch mode for TDD
pnpm test:watch

# Debug a specific failing test
pnpm test -- --testNamePattern="should login" --verbose

# E2E with visual feedback
npx playwright test --headed --slow-mo=500
```

---

**Last Updated**: November 17, 2025
**Test Status**: 118/196 passing (60%)
**Next Goal**: 80% pass rate (157/196 tests)
