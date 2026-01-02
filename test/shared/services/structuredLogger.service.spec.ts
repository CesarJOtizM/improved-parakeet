// Structured Logger Service Tests
// Unit tests for StructuredLoggerService following AAA and Given-When-Then patterns

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StructuredLoggerService } from '@shared/services/structuredLogger.service';
import { Request } from 'express';

describe('StructuredLoggerService', () => {
  let service: StructuredLoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new StructuredLoggerService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      // Mock implementation
    });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    });
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      // Mock implementation
    });
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
      // Mock implementation
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setContext', () => {
    it('Given: logger service When: setting context Then: should store context', () => {
      // Arrange
      const context = 'TestContext';

      // Act
      service.setContext(context);

      // Assert
      service.log('test message');
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.context).toBe(context);
    });
  });

  describe('log', () => {
    it('Given: simple message When: logging Then: should output structured JSON log', () => {
      // Arrange
      const message = 'Test log message';

      // Act
      service.log(message);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.level).toBe('info');
      expect(logData.message).toBe(message);
      expect(logData.timestamp).toBeDefined();
    });

    it('Given: message with string context When: logging Then: should include context in log', () => {
      // Arrange
      const message = 'Test log message';
      const context = 'Additional context';

      // Act
      service.log(message, context);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.additionalContext).toBe(context);
    });

    it('Given: message with object context When: logging Then: should merge context into log', () => {
      // Arrange
      const message = 'Test log message';
      const context = { userId: 'user-123', action: 'create' };

      // Act
      service.log(message, context);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.userId).toBe('user-123');
      expect(logData.action).toBe('create');
    });

    it('Given: message with request When: logging Then: should include request context', () => {
      // Arrange
      const message = 'Test log message';
      const mockRequest = {
        correlationId: 'corr-123',
        method: 'POST',
        path: '/api/products',
        user: { id: 'user-123', orgId: 'org-456' },
        orgId: 'org-456',
      } as unknown as Request;

      // Act
      service.log(message, undefined, mockRequest);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.correlationId).toBe('corr-123');
      expect(logData.userId).toBe('user-123');
      expect(logData.orgId).toBe('org-456');
      expect(logData.method).toBe('POST');
      expect(logData.path).toBe('/api/products');
    });

    it('Given: message with service context When: logging Then: should include service context', () => {
      // Arrange
      const message = 'Test log message';
      service.setContext('ProductService');

      // Act
      service.log(message);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.context).toBe('ProductService');
    });
  });

  describe('error', () => {
    it('Given: error message When: logging error Then: should output error level log', () => {
      // Arrange
      const message = 'Error occurred';

      // Act
      service.error(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.level).toBe('error');
      expect(logData.message).toBe(message);
    });

    it('Given: error with trace When: logging error Then: should include trace in log', () => {
      // Arrange
      const message = 'Error occurred';
      const trace = 'Error: Stack trace here';

      // Act
      service.error(message, trace);

      // Assert
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.trace).toBe(trace);
    });

    it('Given: error with context When: logging error Then: should include context in log', () => {
      // Arrange
      const message = 'Error occurred';
      const context = { errorCode: 'ERR001', component: 'ProductService' };

      // Act
      service.error(message, undefined, context);

      // Assert
      const logCall = consoleErrorSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.errorCode).toBe('ERR001');
      expect(logData.component).toBe('ProductService');
    });
  });

  describe('warn', () => {
    it('Given: warning message When: logging warning Then: should output warn level log', () => {
      // Arrange
      const message = 'Warning message';

      // Act
      service.warn(message);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleWarnSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.level).toBe('warn');
      expect(logData.message).toBe(message);
    });

    it('Given: warning with context When: logging warning Then: should include context in log', () => {
      // Arrange
      const message = 'Warning message';
      const context = { threshold: 80, current: 95 };

      // Act
      service.warn(message, context);

      // Assert
      const logCall = consoleWarnSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.threshold).toBe(80);
      expect(logData.current).toBe(95);
    });
  });

  describe('debug', () => {
    it('Given: debug message When: logging debug Then: should output debug level log', () => {
      // Arrange
      const message = 'Debug message';

      // Act
      service.debug(message);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleDebugSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.level).toBe('debug');
      expect(logData.message).toBe(message);
    });

    it('Given: debug with context When: logging debug Then: should include context in log', () => {
      // Arrange
      const message = 'Debug message';
      const context = { step: 'validation', data: { id: '123' } };

      // Act
      service.debug(message, context);

      // Assert
      const logCall = consoleDebugSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.step).toBe('validation');
      expect(logData.data).toEqual({ id: '123' });
    });
  });

  describe('verbose', () => {
    it('Given: verbose message When: logging verbose Then: should output verbose level log', () => {
      // Arrange
      const message = 'Verbose message';

      // Act
      service.verbose(message);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.level).toBe('verbose');
      expect(logData.message).toBe(message);
    });
  });

  describe('request context', () => {
    it('Given: request with user When: logging Then: should include user info', () => {
      // Arrange
      const message = 'Test message';
      const mockRequest = {
        correlationId: 'corr-123',
        user: { id: 'user-123', orgId: 'org-456' },
      } as unknown as Request;

      // Act
      service.log(message, undefined, mockRequest);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.userId).toBe('user-123');
      expect(logData.orgId).toBe('org-456');
    });

    it('Given: request with orgId When: logging Then: should include orgId', () => {
      // Arrange
      const message = 'Test message';
      const mockRequest = {
        correlationId: 'corr-123',
        orgId: 'org-789',
      } as unknown as Request;

      // Act
      service.log(message, undefined, mockRequest);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.orgId).toBe('org-789');
    });

    it('Given: request without user When: logging Then: should not include user info', () => {
      // Arrange
      const message = 'Test message';
      const mockRequest = {
        correlationId: 'corr-123',
        method: 'GET',
        path: '/api/test',
      } as unknown as Request;

      // Act
      service.log(message, undefined, mockRequest);

      // Assert
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.userId).toBeUndefined();
      expect(logData.correlationId).toBe('corr-123');
    });
  });
});
