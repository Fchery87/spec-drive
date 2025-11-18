/**
 * Jest setup file for configuring testing environment
 */

// Mock database module to avoid ESM/CommonJS conflicts
jest.mock('@/db', () => require('./__mocks__/db'));
jest.mock('./db', () => require('./__mocks__/db'));

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-minimum-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Only mock window.matchMedia if window is defined (browser/jsdom environment)
if (typeof window !== 'undefined') {
  import('@testing-library/jest-dom')

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn()
}

// Suppress console errors and warnings in tests (optional)
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: useLayoutEffect')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
