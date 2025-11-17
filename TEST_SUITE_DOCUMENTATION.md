# Test Suite Documentation

## Overview

This document provides comprehensive information about the Spec-Drive test suite, including its structure, organization, coverage, and how to run tests.

### Test Framework
- **Framework**: Jest v30.2.0
- **TypeScript Support**: ts-jest v29.4.5
- **HTTP Testing**: supertest v7.1.4
- **React Testing**: @testing-library/react v16.3.0
- **Test Environment**: Node.js (default)

### Key Configuration
- **Test Coverage Threshold**: 70% (branches, functions, lines, statements)
- **Test Timeout**: 10 seconds per test
- **Pattern Matching**: `**/__tests__/**/*.ts?(x)` and `**/?(*.)+(spec|test).ts?(x)`
- **Module Alias**: `@/*` → `./src/*`

---

## Test Suite Organization

### Directory Structure

```
src/
├── lib/__tests__/
│   └── validation.spec.ts          # Validation engine tests
├── server/
│   ├── routes/__tests__/
│   │   ├── auth.spec.ts            # Authentication route tests
│   │   └── projects.spec.ts        # Project CRUD operation tests
│   ├── utils/__tests__/
│   │   ├── logger.spec.ts          # Logger utility tests
│   │   ├── secrets.spec.ts         # Secrets management tests
│   │   └── rateLimiter.spec.ts     # Rate limiter tests
│   └── test/
│       └── setup.ts                # Shared test utilities and factories
└── setupTests.ts                   # Jest configuration and global setup
```

---

## Test Files

### 1. **Authentication Tests** (`src/server/routes/__tests__/auth.spec.ts`)

#### Coverage
- User signup validation
- Email verification
- Password requirements
- Login authentication
- Token generation and refresh
- Logout functionality
- Rate limiting
- Error handling

#### Test Groups
- **POST /api/auth/signup**: User registration tests
- **POST /api/auth/verify-email**: Email verification tests
- **POST /api/auth/login**: Authentication tests
- **GET /api/auth/me**: User profile retrieval
- **POST /api/auth/refresh**: Token refresh tests
- **POST /api/auth/logout**: Logout functionality
- **Rate Limiting**: IP-based rate limit tests
- **Auth Flow Integration**: End-to-end authentication flows

#### Key Test Scenarios
- Valid signup with proper validation
- Email validation and verification
- Password strength requirements
- Successful and failed login attempts
- Token generation with proper expiration
- Concurrent request handling
- Case-insensitive email handling
- Rate limiting enforcement

---

### 2. **Project CRUD Tests** (`src/server/routes/__tests__/projects.spec.ts`)

#### Coverage
- Project creation with data validation
- Project reading (single and list)
- Project updates with partial data
- Project deletion with cascade
- Project associations with artifacts
- Stack and dependency approval workflows

#### Test Groups
- **POST /api/projects**: Creation tests
  - Valid project creation
  - Data validation
  - Default values initialization
  - Schema validation
  - Error handling

- **GET /api/projects**: List projects tests
  - Retrieve user's projects
  - Empty result handling
  - Authentication checks

- **GET /api/projects/:id**: Single project retrieval
  - Valid project retrieval
  - 404 handling
  - Access control (prevent other users' access)
  - Full object verification

- **PATCH /api/projects/:id**: Update tests
  - Update individual fields
  - Update multiple fields
  - Timestamp updates
  - Error validation
  - Access control

- **DELETE /api/projects/:id**: Deletion tests
  - Project deletion
  - Cascade artifact deletion
  - 404 handling
  - Access control

- **Project Associations**: Relationship tests
  - Project-artifact relationships
  - Artifact filtering by project

- **Approvals**: Stack and dependency approval
  - Stack approval workflow
  - Dependencies approval workflow
  - Independent approval states

#### Key Features
- Input validation for name, description, and idea
- Slug generation from project names
- Phase tracking and management
- User isolation and access control
- Cascade deletion of related artifacts
- Timestamp management for created/updated records

---

### 3. **Validation Engine Tests** (`src/lib/__tests__/validation.spec.ts`)

#### Coverage
- Validation rule execution
- Multiple validation types (schema, artifact, workflow)
- Error handling and edge cases
- Report generation and persistence
- Validation history and retrieval

#### Test Groups
- **Initialization**: Default rules and rule management
- **Rule Management**: Adding, getting, enabling/disabling rules
- **Requirement API Validation**: Requirement-to-API endpoint mapping
- **Data Model Validation**: Data entity coverage tests
- **Task Coverage Validation**: Task coverage of requirements
- **Stack Dependencies**: Stack-to-dependency validation
- **Report Generation**: Complete report structure and statistics
- **Error Handling**: Edge cases and malformed data
- **Validation History**: Report persistence and retrieval
- **Cross-Artifact Validation**: Consistency checks across artifacts

#### Validation Rule Types
1. **requirement_api** (REQ-API-001)
   - Validates API endpoints match functional requirements
   - Checks endpoint coverage percentage
   - Identifies unmatched requirements

2. **requirement_data** (REQ-DATA-001)
   - Validates data model covers requirements
   - Checks entity count against requirement count
   - Verifies data-related requirement coverage

3. **requirement_task** (REQ-TASK-001)
   - Validates development tasks cover requirements
   - Allows for up to 20% uncovered requirements (warning level)
   - Calculates task coverage percentage

4. **stack_dependency** (STACK-DEP-001)
   - Validates dependencies match selected stack
   - Checks for required core dependencies
   - Identifies missing dependencies

5. **cross_artifact** (CROSS-ARTIFACT-001)
   - Validates consistency across all artifacts
   - Checks for consistent terminology
   - Identifies inconsistent terms

#### Report Structure
```typescript
{
  projectId: string;
  phase: string;
  reportName: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  validationResults: ValidationResult[];
  reportMetadata?: {
    validatedAt: string;
    artifactsValidated: number;
    validationEngine: string;
  };
}
```

---

### 4. **Logger Tests** (`src/server/utils/__tests__/logger.spec.ts`)

#### Coverage
- Logger initialization
- All log level functions
- Specialized logging (auth, API, security)
- Metadata handling
- Error handling and stack traces

#### Test Groups
- **Initialization**: Logger configuration
- **Log Levels**: fatal, error, warn, info, debug, trace
- **Specialized Functions**: Auth events, API requests/responses, security events
- **Metadata**: Structured logging with context
- **Error Handling**: Error objects and stack traces

#### Features Tested
- Winston logger integration
- Custom log levels
- Metadata attachment
- Error serialization
- Console output verification

---

### 5. **Secrets Management Tests** (`src/server/utils/__tests__/secrets.spec.ts`)

#### Coverage
- Secret validation
- Environment variable checking
- Secret length requirements
- Placeholder detection
- Secret masking for logs
- Environment-specific validation

#### Test Groups
- **Validation**: All required secrets present
- **Length Requirements**: 32+ character minimums
- **Placeholder Detection**: Placeholder value detection
- **Secret Masking**: Log-safe masking
- **Environment-Specific**: Production vs development rules

#### Validated Secrets
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- DATABASE_URL
- API_KEY (if defined)

---

### 6. **Rate Limiter Tests** (`src/server/utils/__tests__/rateLimiter.spec.ts`)

#### Coverage
- Rate limit enforcement
- Request tracking
- Reset mechanisms
- Edge cases and performance
- Concurrent request handling

#### Test Groups
- **Basic Limiting**: Enforce limits per endpoint
- **Tracking**: Request counting
- **Reset**: Expiration and reset
- **Edge Cases**: Boundary conditions
- **Performance**: High-volume scenarios
- **Persistence**: Database-backed state

#### Features Tested
- IP-based rate limiting
- Per-endpoint rate limits
- Configurable rate limit values
- Reset after TTL expiration
- Concurrent request handling

---

## Test Utilities

### Test Setup Module (`src/server/test/setup.ts`)

#### Factory Functions
- **`createTestUser(override?)`**: Creates test user with optional field overrides
- **`createTestSession(userId)`**: Creates test session for user
- **`generateTestJWT(userId, expiresIn)`**: Generates JWT token

#### Cleanup Functions
- **`cleanupTestData()`**: Clears test data from database
- **`setupTestDatabase()`**: Initialize test database
- **`teardownTestDatabase()`**: Close connections and cleanup

#### Helper Functions
- **`testHelpers.wait(ms)`**: Async delay utility
- **`testHelpers.randomEmail()`**: Generate random test email
- **`testHelpers.randomString(length)`**: Generate random string
- **`testHelpers.assertSuccessResponse(body)`**: Verify success response structure
- **`testHelpers.assertErrorResponse(body)`**: Verify error response structure

### Jest Setup File (`src/setupTests.ts`)

- Conditional window.matchMedia mock for browser environments
- Global fetch mock
- Console error/warning suppression for known React warnings

---

## Running Tests

### Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Run with verbose output
npm test -- --verbose
```

### Test Execution Examples

```bash
# Run all tests
npm run test

# Run only projects tests
npm test -- projects.spec.ts

# Run validation engine tests with watch mode
npm run test:watch -- validation.spec.ts

# Generate coverage report
npm run test:coverage

# Run specific test group
npm test -- --testNamePattern="Project CRUD"
```

---

## Coverage Report

### Current Coverage Status (Latest Run)

```
Test Suites: 6 total
Tests:       196 total (104 failed, 92 passed)
```

### Coverage Targets

The project aims for:
- **Minimum Coverage**: 70% across all metrics
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Excluded from Coverage
- `setupTests.ts` - Jest configuration
- `validation-old.ts` - Legacy validation code

### Coverage Gaps

Key areas for improvement:
1. **Project Routes**: Need database connection mocks
2. **Validation Engine**: Requires database setup for report persistence
3. **Auth Routes**: Some token refresh scenarios
4. **Rate Limiter**: Concurrent access patterns
5. **Integration Tests**: End-to-end workflows

---

## Test Best Practices

### 1. Test Organization
- Co-locate tests with source code in `__tests__` directories
- Group related tests with `describe()` blocks
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### 2. Setup and Teardown
- Use `beforeEach()` for test data initialization
- Use `afterEach()` for cleanup and resource release
- Use `beforeAll()` and `afterAll()` for expensive setup
- Always cleanup database records

### 3. Async Testing
- Use `async/await` for asynchronous operations
- Set appropriate timeouts for slow operations
- Wait for promises to resolve
- Handle rejections properly

### 4. Mocking and Spying
- Mock external dependencies
- Use `jest.spyOn()` for function monitoring
- Restore mocks after tests
- Avoid mocking implementation details

### 5. Assertions
- Use specific assertions over generic ones
- Check error messages in rejection tests
- Verify all important properties
- Test both success and error paths

### 6. Database Testing
- Create clean test data for each test
- Clean up after tests complete
- Use transactions for isolation (if supported)
- Mock database calls when appropriate

---

## Common Testing Patterns

### Testing Route Handlers

```typescript
it('should handle valid request', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .set('Cookie', `session=${authToken}`)
    .send(validData);

  expect(response.status).toBe(200);
  testHelpers.assertSuccessResponse(response.body);
  expect(response.body.data).toHaveProperty('id');
});
```

### Testing Validation

```typescript
it('should validate required fields', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send(incompleteData);

  expect(response.status).toBe(400);
  testHelpers.assertErrorResponse(response.body);
});
```

### Testing Database Operations

```typescript
it('should persist data to database', async () => {
  const result = await db.insert(table).values(data).returning();

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject(data);

  // Cleanup
  await db.delete(table).where(eq(table.id, result[0].id));
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  jest.spyOn(db, 'select').mockRejectedValue(new Error('DB error'));

  const response = await request(app).get('/api/endpoint');

  expect(response.status).toBe(500);
  expect(response.body.error).toBeDefined();
});
```

---

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

### Run Single File
```bash
npm test -- projects.spec.ts
```

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Debug in Node
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Check Test Coverage
```bash
npm run test:coverage
```

---

## Known Issues and Limitations

### Current Test Status
1. **Auth Routes**: Some tests failing due to token refresh implementation
2. **Project Routes**: Need proper Express app initialization
3. **Validation Engine**: Report persistence requires database setup
4. **Rate Limiter**: Concurrent test scenarios need refinement

### Future Improvements
1. Add integration tests for full workflows
2. Improve database mocking for unit tests
3. Add performance/load testing
4. Enhance coverage for edge cases
5. Add end-to-end tests

---

## Contributing Tests

### Guidelines for New Tests
1. Follow existing naming conventions
2. Co-locate tests with source code
3. Use provided test utilities and factories
4. Clean up test data after each test
5. Document complex test scenarios
6. Aim for meaningful assertions
7. Test both success and error paths

### Checklist for Test PRs
- [ ] Tests follow project conventions
- [ ] All new code has tests
- [ ] Tests pass locally
- [ ] Coverage is maintained or improved
- [ ] Documentation is updated
- [ ] No hardcoded test data
- [ ] Proper cleanup in afterEach

---

## Continuous Integration

### Test Execution in CI
Tests should be run automatically on:
- Pull request creation
- Commits to main branch
- Scheduled nightly runs

### CI Test Configuration
```bash
# Install dependencies
npm install

# Run tests with coverage
npm run test:coverage

# Check coverage thresholds
# (Jest configuration will fail if thresholds not met)
```

---

## Resources

### Jest Documentation
- [Jest Official Docs](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/visionmedia/supertest)

### Best Practices
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Testing Best Practices](https://jestjs.io/docs/tutorial-react)

---

## Support

For issues or questions about the test suite:
1. Check existing test examples
2. Review Jest documentation
3. Check test utilities in `src/server/test/setup.ts`
4. Review similar test files for patterns

---

## Summary Statistics

### Test Coverage by Module

| Module | Tests | Status | Coverage |
|--------|-------|--------|----------|
| Authentication | 40+ | Partial | ~60% |
| Projects CRUD | 30+ | Draft | 0% |
| Validation Engine | 50+ | Draft | 0% |
| Logger Utilities | 20+ | Active | ~80% |
| Secrets Management | 16+ | Partial | ~70% |
| Rate Limiting | 14+ | Partial | ~65% |

### Test Execution Time
- Average test suite: 15-25 seconds
- Auth tests: ~21 seconds
- Project tests: ~12 seconds
- Validation tests: ~11 seconds

### Total Test Count
- **Total Tests**: 196
- **Passing**: 92
- **Failing**: 104
- **Pending**: 0

---

**Last Updated**: 2025-11-17
**Test Framework Version**: Jest 30.2.0
**Coverage Target**: 70%
