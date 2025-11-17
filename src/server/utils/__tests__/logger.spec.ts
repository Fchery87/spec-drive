/**
 * Logger Utility Tests
 * Tests for Winston logger configuration and helper functions
 */

import {
  logger,
  logFatal,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logTrace,
  logAuthEvent,
  logApiRequest,
  logApiResponse,
  logSecurityEvent,
  LogMetadata,
} from '../logger';

describe('Logger Utilities', () => {
  // Mock console to verify output
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Logger Initialization', () => {
    it('should initialize logger with proper configuration', () => {
      expect(logger).toBeDefined();
      expect(logger.level).toBeDefined();
    });

    it('should have all required log methods', () => {
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
    });
  });

  describe('Log Level Functions', () => {
    it('should call logFatal with fatal level', () => {
      const logSpy = jest.spyOn(logger, 'log');
      logFatal('Fatal error occurred', { error: 'Test error' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should call logError with error level', () => {
      const logSpy = jest.spyOn(logger, 'error');
      logError('Error occurred', new Error('Test error'));
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should call logWarn with warn level', () => {
      const logSpy = jest.spyOn(logger, 'warn');
      logWarn('Warning message');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should call logInfo with info level', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logInfo('Info message');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should call logDebug with debug level', () => {
      const logSpy = jest.spyOn(logger, 'debug');
      logDebug('Debug message');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should call logTrace with trace level', () => {
      const logSpy = jest.spyOn(logger, 'debug');
      logTrace('Trace message');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('Specialized Logging Functions', () => {
    it('should log auth events with appropriate context', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logAuthEvent('signup', '123', { email: 'test@example.com' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log auth login events', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logAuthEvent('login', '456', { ip: '127.0.0.1' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log API requests with metadata', () => {
      const logSpy = jest.spyOn(logger, 'debug');
      logApiRequest('GET', '/api/users', '789', { ip: '127.0.0.1' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log API responses with status codes', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logApiResponse('GET', '/api/users', 200, 45, '789', { duration: 45 });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log security events', () => {
      const logSpy = jest.spyOn(logger, 'warn');
      logSecurityEvent('rate_limit', { ip: '192.168.1.1', reason: 'Rate limit exceeded' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('Metadata Handling', () => {
    it('should handle metadata without errors', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logInfo('Test message', { key: 'value', nested: { deep: 'data' } });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle null metadata', () => {
      const logSpy = jest.spyOn(logger, 'info');
      expect(() => {
        logInfo('Test message', null as any);
      }).not.toThrow();
      logSpy.mockRestore();
    });

    it('should handle undefined metadata', () => {
      const logSpy = jest.spyOn(logger, 'info');
      expect(() => {
        logInfo('Test message', undefined);
      }).not.toThrow();
      logSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle Error objects properly', () => {
      const logSpy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      logError('Error occurred', error);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle error with stack trace', () => {
      const logSpy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      logError('Error with stack', error, { context: 'test' });
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle non-Error objects gracefully', () => {
      const logSpy = jest.spyOn(logger, 'error');
      expect(() => {
        logError('Error message', 'not an error object' as any);
      }).not.toThrow();
      logSpy.mockRestore();
    });
  });
});
