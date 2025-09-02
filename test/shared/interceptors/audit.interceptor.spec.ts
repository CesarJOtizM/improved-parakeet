// Audit Interceptor Tests - Interceptor de auditoría
// Tests unitarios para el interceptor de auditoría siguiendo AAA y Given-When-Then

import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { of, throwError } from 'rxjs';

describe('Audit Interceptor', () => {
  let interceptor: AuditInterceptor;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: Partial<Request>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    interceptor = new AuditInterceptor();

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
      params: { id: '123' },
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

  describe('intercept', () => {
    it('Given: successful request When: intercepting Then: should log start and success', () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[AUDIT] POST /api/test - User: user-123 - Org: org-123'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] POST /api/test - SUCCESS')
        );
      });
    });

    it('Given: request with body When: intercepting Then: should log request body', () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[AUDIT] Request Body: {"name":"test","value":42}'
        );
      });
    });

    it('Given: request with query params When: intercepting Then: should log query params', () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[AUDIT] Query Params: {"page":"1","limit":"10"}'
        );
      });
    });

    it('Given: request with path params When: intercepting Then: should log path params', () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith('[AUDIT] Path Params: {"id":"123"}');
      });
    });

    it('Given: request without user When: intercepting Then: should log anonymous user', () => {
      // Arrange
      const requestWithoutUser = { ...mockRequest, user: undefined };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithoutUser
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[AUDIT] POST /api/test - User: anonymous - Org: org-123'
        );
      });
    });

    it('Given: request without organization When: intercepting Then: should log unknown organization', () => {
      // Arrange
      const requestWithoutOrg = { ...mockRequest, organization: undefined };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithoutOrg
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[AUDIT] POST /api/test - User: user-123 - Org: unknown'
        );
      });
    });

    it('Given: request with empty body When: intercepting Then: should not log body', () => {
      // Arrange
      const requestWithEmptyBody = { ...mockRequest, body: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyBody
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Request Body:')
        );
      });
    });

    it('Given: request with empty query When: intercepting Then: should not log query', () => {
      // Arrange
      const requestWithEmptyQuery = { ...mockRequest, query: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyQuery
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Query Params:')
        );
      });
    });

    it('Given: request with empty params When: intercepting Then: should not log params', () => {
      // Arrange
      const requestWithEmptyParams = { ...mockRequest, params: {} };
      (mockExecutionContext.switchToHttp().getRequest as jest.Mock).mockReturnValue(
        requestWithEmptyParams
      );
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Path Params:')
        );
      });
    });

    it('Given: successful response When: intercepting Then: should log response in debug', () => {
      // Arrange
      const response = { data: 'success', message: 'Operation completed' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[AUDIT] Response: {"data":"success","message":"Operation completed"}'
        );
      });
    });

    it('Given: error response When: intercepting Then: should log error', () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(
              /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
            )
          );
        },
      });
    });

    it('Given: error with stack trace When: intercepting Then: should log stack trace in debug', () => {
      // Arrange
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at test.js:1:1';
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe({
        error: () => {
          expect(mockLogger.debug).toHaveBeenCalledWith(
            '[AUDIT] Error Stack: Error: Database connection failed\n    at test.js:1:1'
          );
        },
      });
    });

    it('Given: error without stack trace When: intercepting Then: should not log stack trace', () => {
      // Arrange
      const error = new Error('Database connection failed');
      error.stack = undefined;
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe({
        error: () => {
          expect(mockLogger.debug).not.toHaveBeenCalledWith(
            expect.stringContaining('[AUDIT] Error Stack:')
          );
        },
      });
    });

    it('Given: request When: intercepting Then: should measure duration', () => {
      // Arrange
      const response = { data: 'success' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[AUDIT\] POST \/api\/test - SUCCESS - Duration: \d+ms - User: user-123 - Org: org-123/
          )
        );
      });
    });

    it('Given: error request When: intercepting Then: should measure duration for error', () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(
              /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
            )
          );
        },
      });
    });

    it('Given: non-object response When: intercepting Then: should not log response', () => {
      // Arrange
      const response = 'simple string response';
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Response:')
        );
      });
    });

    it('Given: null response When: intercepting Then: should not log response', () => {
      // Arrange
      const response = null;
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Response:')
        );
      });
    });

    it('Given: undefined response When: intercepting Then: should not log response', () => {
      // Arrange
      const response = undefined;
      mockCallHandler.handle.mockReturnValue(of(response));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe(() => {
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] Response:')
        );
      });
    });

    it('Given: error without stack trace When: intercepting Then: should not log stack trace', () => {
      // Arrange
      const error = new Error('Database connection failed');
      delete (error as { stack?: string }).stack; // Remove stack trace

      mockCallHandler.handle.mockReturnValue(throwError(() => error));

      // Act
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result$.subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(
              /\[AUDIT\] POST \/api\/test - ERROR - Duration: \d+ms - User: user-123 - Org: org-123 - Error: Database connection failed/
            )
          );
          expect(mockLogger.debug).not.toHaveBeenCalledWith(
            expect.stringContaining('[AUDIT] Error Stack:')
          );
        },
      });
    });
  });
});
