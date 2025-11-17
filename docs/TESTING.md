# Testing Guide

Comprehensive testing framework with Jest, React Testing Library, and Playwright for unit, integration, and E2E tests.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e -- --ui
```

## Test Structure

```
src/
├── __tests__/
│   ├── unit/
│   │   └── lib/
│   │       ├── validation.test.ts
│   │       ├── orchestrator.test.ts
│   │       └── traceability.test.ts
│   ├── components/
│   │   ├── Dashboard.test.tsx
│   │   ├── ProjectWizard.test.tsx
│   │   └── ValidationDashboard.test.tsx
│   ├── integration/
│   │   ├── api.test.ts
│   │   ├── database.test.ts
│   │   └── authentication.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── projects.spec.ts
│       └── orchestration.spec.ts
```

## Unit Testing

### Testing Utilities

```typescript
// src/__tests__/unit/lib/validation.test.ts
import { ValidationEngine } from '@/lib/validation'

describe('ValidationEngine', () => {
  let engine: ValidationEngine

  beforeEach(() => {
    engine = new ValidationEngine()
  })

  describe('validateArtifacts', () => {
    it('should validate artifact consistency', async () => {
      const artifacts = {
        'PRD.md': 'REQ-1: Test requirement',
        'api-spec.json': '{"paths": {}}',
        'data-model.md': '## User Entity',
      }

      const result = await engine.validateArtifacts('proj-1', 'SPEC', artifacts)

      expect(result).toBeDefined()
      expect(result.totalRules).toBeGreaterThan(0)
    })

    it('should handle missing artifacts gracefully', async () => {
      const result = await engine.validateArtifacts('proj-1', 'SPEC', {})

      expect(result).toBeDefined()
      expect(result.validationResults).toEqual([])
    })
  })
})
```

### Testing API Routes

```typescript
// src/__tests__/unit/server/projects.test.ts
import request from 'supertest'
import app from '@/server/index'

describe('Projects API', () => {
  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          description: 'A test project',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe('Test Project')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/projects/:id', () => {
    it('should retrieve a project by ID', async () => {
      const response = await request(app)
        .get('/api/projects/valid-id')

      expect(response.status).toBeOneOf([200, 404])
    })
  })
})
```

## Component Testing

### Testing React Components

```typescript
// src/__tests__/components/Dashboard.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '@/components/pages/Dashboard'

describe('Dashboard', () => {
  it('should render dashboard title', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )

    expect(screen.getByText(/projects/i)).toBeInTheDocument()
  })

  it('should display project list', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })
  })

  it('should handle loading state', () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )

    // Check for loading indicators
    expect(container).toBeInTheDocument()
  })
})
```

### Testing Forms

```typescript
// src/__tests__/components/ProjectForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectForm from '@/components/ProjectForm'

describe('ProjectForm', () => {
  it('should submit form with valid data', async () => {
    const handleSubmit = jest.fn()
    render(<ProjectForm onSubmit={handleSubmit} />)

    await userEvent.type(screen.getByLabelText(/project name/i), 'New Project')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  it('should display validation errors', async () => {
    render(<ProjectForm onSubmit={jest.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument()
    })
  })
})
```

## Integration Testing

### Testing API Integration

```typescript
// src/__tests__/integration/api.test.ts
import { api } from '@/lib/api'

describe('API Integration', () => {
  beforeEach(() => {
    // Mock API responses
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ id: '1', name: 'Test Project' }),
        { status: 200 }
      )
    )
  })

  it('should fetch projects', async () => {
    const result = await api.get('/projects')

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id')
  })
})
```

### Testing Database Operations

```typescript
// src/__tests__/integration/database.test.ts
import { db } from '@/db'
import { projects } from '@/db/schema'

describe('Database Operations', () => {
  it('should insert and retrieve project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'Test',
      status: 'active',
    }

    // Insert
    const [inserted] = await db.insert(projects).values(projectData).returning()

    // Verify
    expect(inserted).toBeDefined()
    expect(inserted.name).toBe('Test Project')

    // Cleanup
    await db.delete(projects).where(/* match inserted */)
  })
})
```

## End-to-End Testing

### Testing User Workflows

```typescript
// src/__tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should sign up and log in', async ({ page }) => {
    // Navigate to signup
    await page.goto('/auth/signup')

    // Fill form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')

    // Submit
    await page.click('button[type="submit"]')

    // Verify redirect
    await expect(page).toHaveURL('/dashboard')

    // Verify logged in state
    await expect(page.locator('text=Logout')).toBeVisible()
  })

  test('should login with existing account', async ({ page }) => {
    await page.goto('/auth/login')

    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })

  test('should logout', async ({ page, context }) => {
    // Login first
    await page.goto('/dashboard')

    // Find and click logout
    await page.click('text=Logout')

    // Verify redirect
    await expect(page).toHaveURL('/auth/login')

    // Verify session cleared
    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'auth-token')).toBeUndefined()
  })
})
```

### Testing Project Workflows

```typescript
// src/__tests__/e2e/projects.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should create a new project', async ({ page }) => {
    await page.click('text=New Project')

    // Fill project details
    await page.fill('input[name="projectName"]', 'E2E Test Project')
    await page.fill('input[name="description"]', 'Test project for E2E')

    // Submit
    await page.click('button:has-text("Create")')

    // Verify success
    await expect(page).toHaveURL(/\/projects\/\w+/)
    await expect(page.locator('h1')).toContainText('E2E Test Project')
  })

  test('should view project details', async ({ page }) => {
    // Navigate to existing project
    const projectLink = page.locator('a:has-text("Test Project")').first()
    await projectLink.click()

    // Verify page loaded
    await expect(page.locator('text=Project Details')).toBeVisible()
  })

  test('should update project', async ({ page }) => {
    // Navigate to project
    const projectLink = page.locator('a:has-text("Test Project")').first()
    await projectLink.click()

    // Click edit
    await page.click('button:has-text("Edit")')

    // Update field
    await page.fill('input[name="description"]', 'Updated description')

    // Save
    await page.click('button:has-text("Save")')

    // Verify update
    await expect(page.locator('text=Updated description')).toBeVisible()
  })
})
```

## Coverage Requirements

### Coverage Targets

- **Unit Tests:** 80% coverage for utility functions
- **Component Tests:** 70% coverage for React components
- **Integration Tests:** 60% coverage for API/Database
- **Overall:** 70% minimum code coverage

### Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Coverage output
# ✓ Statements: 75%
# ✓ Branches: 68%
# ✓ Functions: 72%
# ✓ Lines: 75%
```

## Mock Data

### Creating Fixtures

```typescript
// src/__tests__/fixtures/projects.ts
export const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active',
  createdAt: new Date(),
}

export const mockProjects = [
  mockProject,
  {
    ...mockProject,
    id: 'proj-2',
    name: 'Another Project',
  },
]
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

## Best Practices

1. **Test Behavior, Not Implementation** - Test what users see, not how code works
2. **Use Meaningful Assertions** - Clear expectations make failures obvious
3. **Keep Tests Focused** - One concept per test
4. **Use Fixtures for Setup** - Reusable test data reduces duplication
5. **Mock External Services** - Don't depend on real APIs in tests
6. **Test Error Cases** - Include unhappy paths
7. **Clean Up After Tests** - Ensure no test pollution
8. **Use Descriptive Names** - Test names should explain what's being tested

## Common Patterns

### Mocking Fetch

```typescript
jest.mock('global', () => ({
  fetch: jest.fn(),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test' }),
  })
)
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Testing Errors

```typescript
it('should throw on invalid input', () => {
  expect(() => functionUnderTest(null)).toThrow('Invalid input')
})
```

## Debugging Tests

```bash
# Run single test file
npm test -- validation.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Watch mode with filter
npm test -- --watch --testNamePattern="API"
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

---

For more information on testing, see the examples in `src/__tests__/`.
