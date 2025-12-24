// Audit Interceptor Tests - Interceptor de auditoría
// Tests unitarios para el interceptor de auditoría siguiendo AAA y Given-When-Then

import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { firstValueFrom, of, throwError } from 'rxjs';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('Audit Interceptor', () => {
  let interceptor: AuditInterceptor;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: Partial<Request>;
  let mockLogger: jest.Mocked<Logger>;
  let mockAuditRepository: jest.Mocked<IAuditLogRepository>;

  beforeEach(() => {
    // Mock del AuditLogRepository
    mockAuditRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAuditLogRepository>;

    interceptor = new AuditInterceptor(mockAuditRepository);

    // Mock del logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    // @ts-expect-error - Testing private property assignment
    (interceptor as { logger: Logger }).logger = mockLogger;

    // Mock del request
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      body: { name: 'test', value: 42 },
      query: {},
      params: { id: '123' },
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
      ip: undefined,
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
      organization: {
        id: 'org-123',
        name: 'Test Organization',
      },
    } as unknown as Partial<Request>;

    // Mock del ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;

    // Mock del CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('Given: successful request When: intercepting Then: should log start and success', async () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AUDIT] POST /api/test - User: user-123 - Org: org-123'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] POST /api/test - SUCCESS')
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
    });

    it('Given: request with body When: intercepting Then: should save request body in audit', async () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().requestBody).toEqual({
        body: { name: 'test', value: 42 },
        query: {},
        params: { id: '123' },
      });
    });

    it('Given: request with query params When: intercepting Then: should save query params in audit', async () => {
      // Arrange
      const requestWithQuery = { ...mockRequest, query: { page: '1', limit: '10' } };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithQuery
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().requestBody).toEqual({
        body: { name: 'test', value: 42 },
        query: { page: '1', limit: '10' },
        params: { id: '123' },
      });
    });

    it('Given: request with path params When: intercepting Then: should save path params in audit', async () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().requestBody).toEqual({
        body: { name: 'test', value: 42 },
        query: {},
        params: { id: '123' },
      });
    });

    it('Given: request without user When: intercepting Then: should log anonymous user', async () => {
      // Arrange
      const requestWithoutUser = { ...mockRequest, user: undefined };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithoutUser
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AUDIT] POST /api/test - User: anonymous - Org: org-123'
      );
    });

    it('Given: request without organization When: intercepting Then: should log unknown organization', async () => {
      // Arrange
      const requestWithoutOrg = { ...mockRequest, organization: undefined };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithoutOrg
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[AUDIT] POST /api/test - User: user-123 - Org: unknown'
      );
    });

    it('Given: request with empty body When: intercepting Then: should save empty body in audit', async () => {
      // Arrange
      const requestWithEmptyBody = { ...mockRequest, body: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyBody
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      const metadata = savedCall.metadata.getValue() as { requestBody: { body: unknown } };
      expect(metadata.requestBody.body).toEqual({});
    });

    it('Given: request with empty query When: intercepting Then: should save empty query in audit', async () => {
      // Arrange
      const requestWithEmptyQuery = { ...mockRequest, query: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyQuery
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      const metadata = savedCall.metadata.getValue() as { requestBody: { query: unknown } };
      expect(metadata.requestBody.query).toEqual({});
    });

    it('Given: request with empty params When: intercepting Then: should save empty params in audit', async () => {
      // Arrange
      const requestWithEmptyParams = { ...mockRequest, params: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyParams
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      const metadata = savedCall.metadata.getValue() as { requestBody: { params: unknown } };
      expect(metadata.requestBody.params).toEqual({});
    });

    it('Given: successful response When: intercepting Then: should save response in audit', async () => {
      // Arrange
      const response = { data: 'success', message: 'Operation completed' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toEqual(response);
    });

    it('Given: error response When: intercepting Then: should log error', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      await expect(firstValueFrom(result$)).rejects.toThrow('Database connection failed');

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
        )
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
    });

    it('Given: error with stack trace When: intercepting Then: should save error in audit', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at test.js:1:1';
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      await expect(firstValueFrom(result$)).rejects.toThrow('Database connection failed');

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toEqual({
        error: 'Database connection failed',
      });
    });

    it('Given: error without stack trace When: intercepting Then: should save error in audit', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      error.stack = undefined;
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      await expect(firstValueFrom(result$)).rejects.toThrow('Database connection failed');

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toEqual({
        error: 'Database connection failed',
      });
    });

    it('Given: request When: intercepting Then: should measure duration', async () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[AUDIT\] POST \/api\/test - SUCCESS - Duration: \d+ms - User: user-123 - Org: org-123/
        )
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.duration).toBeGreaterThanOrEqual(0);
    });

    it('Given: error request When: intercepting Then: should measure duration for error', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      await expect(firstValueFrom(result$)).rejects.toThrow('Database connection failed');

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
        )
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.duration).toBeGreaterThanOrEqual(0);
    });

    it('Given: non-object response When: intercepting Then: should save response in audit', async () => {
      // Arrange
      const response = 'simple string response';
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toBe(response);
    });

    it('Given: null response When: intercepting Then: should save null response in audit', async () => {
      // Arrange
      const response = null;
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toBeNull();
    });

    it('Given: undefined response When: intercepting Then: should save undefined response in audit', async () => {
      // Arrange
      const response = undefined;
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      await firstValueFrom(result$);

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toBeUndefined();
    });

    it('Given: error without stack trace When: intercepting Then: should save error without stack in audit', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      delete (error as { stack?: string }).stack; // Remove stack trace

      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      await expect(firstValueFrom(result$)).rejects.toThrow('Database connection failed');

      // Wait for setImmediate to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
        )
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
      const savedCall = mockAuditRepository.save.mock.calls[0][0] as AuditLog;
      expect(savedCall.metadata.getValue().responseBody).toEqual({
        error: 'Database connection failed',
      });
    });
  });
});
