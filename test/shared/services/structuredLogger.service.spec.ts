import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StructuredLoggerService } from '@shared/services/structuredLogger.service';

describe('StructuredLoggerService', () => {
  let service: StructuredLoggerService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new StructuredLoggerService();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setContext', () => {
    it('Given: context When: setting Then: should be included in logs', () => {
      // Arrange
      service.setContext('TestContext');

      // Act
      service.log('Test message');

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.context).toBe('TestContext');
    });
  });

  describe('log', () => {
    it('Given: message When: logging Then: should output structured JSON', () => {
      // Act
      service.log('Test message');

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.level).toBe('info');
      expect(logData.message).toBe('Test message');
      expect(logData.timestamp).toBeDefined();
    });

    it('Given: message with string context When: logging Then: should include context', () => {
      // Act
      service.log('Test message', 'AdditionalContext');

      // Assert
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.additionalContext).toBe('AdditionalContext');
    });

    it('Given: message with object context When: logging Then: should merge context', () => {
      // Act
      service.log('Test message', { key: 'value', count: 42 });

      // Assert
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.key).toBe('value');
      expect(logData.count).toBe(42);
    });

    it('Given: request When: logging Then: should include request info', () => {
      // Arrange
      const mockRequest = {
        correlationId: 'corr-123',
        user: { id: 'user-123', orgId: 'org-123' },
        method: 'GET',
        path: '/api/test',
      } as any;

      // Act
      service.log('Test message', undefined, mockRequest);

      // Assert
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.correlationId).toBe('corr-123');
      expect(logData.userId).toBe('user-123');
      expect(logData.orgId).toBe('org-123');
      expect(logData.method).toBe('GET');
      expect(logData.path).toBe('/api/test');
    });
  });

  describe('error', () => {
    it('Given: error message When: logging Then: should output with trace', () => {
      // Arrange
      const errorSpy = jest.spyOn(console, 'error');

      // Act
      service.error('Error message', 'Stack trace here');

      // Assert
      expect(errorSpy).toHaveBeenCalled();
      const logData = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(logData.level).toBe('error');
      expect(logData.message).toBe('Error message');
      expect(logData.trace).toBe('Stack trace here');
    });
  });

  describe('warn', () => {
    it('Given: warning message When: logging Then: should output warning level', () => {
      // Arrange
      const warnSpy = jest.spyOn(console, 'warn');

      // Act
      service.warn('Warning message');

      // Assert
      expect(warnSpy).toHaveBeenCalled();
      const logData = JSON.parse(warnSpy.mock.calls[0][0]);
      expect(logData.level).toBe('warn');
    });
  });

  describe('debug', () => {
    it('Given: debug message When: logging Then: should output debug level', () => {
      // Arrange
      const debugSpy = jest.spyOn(console, 'debug');

      // Act
      service.debug('Debug message');

      // Assert
      expect(debugSpy).toHaveBeenCalled();
      const logData = JSON.parse(debugSpy.mock.calls[0][0]);
      expect(logData.level).toBe('debug');
    });
  });

  describe('verbose', () => {
    it('Given: verbose message When: logging Then: should output verbose level', () => {
      // Act
      service.verbose('Verbose message');

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      const logData = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(logData.level).toBe('verbose');
    });
  });
});
