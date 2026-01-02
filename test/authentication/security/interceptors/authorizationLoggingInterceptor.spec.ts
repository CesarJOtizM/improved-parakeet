/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthorizationLoggingInterceptor } from '@auth/security/interceptors/authorizationLoggingInterceptor';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('AuthorizationLoggingInterceptor', () => {
  let interceptor: AuthorizationLoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    interceptor = new AuthorizationLoggingInterceptor();

    mockRequest = {
      method: 'GET',
      url: '/products',
      ip: '127.0.0.1',
      user: {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: ['read:products', 'write:products'],
      },
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    } as any;

    loggerSpy = jest.spyOn((interceptor as any).logger, 'log');
    jest.spyOn((interceptor as any).logger, 'error');
  });

  describe('intercept', () => {
    it('Given: authorized user When: request is successful Then: should log start and success events', done => {
      // Arrange
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(of({ data: [] }));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] START'),
            expect.objectContaining({
              method: 'GET',
              url: '/products',
              ip: '127.0.0.1',
              userId: 'user-123',
              orgId: 'org-123',
              roles: ['ADMIN'],
            })
          );

          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] SUCCESS'),
            expect.objectContaining({
              method: 'GET',
              url: '/products',
              userId: 'user-123',
              accessGranted: true,
              duration: expect.any(Number),
            })
          );
          done();
        },
      });
    });

    it('Given: anonymous user When: request is made Then: should log with anonymous userId', done => {
      // Arrange
      mockRequest.user = undefined;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(of({ data: [] }));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] START'),
            expect.objectContaining({
              userId: 'anonymous',
              orgId: 'unknown',
              roles: [],
              permissions: [],
            })
          );
          done();
        },
      });
    });

    it('Given: insufficient permissions When: error occurs Then: should log error with correct failure reason', done => {
      // Arrange
      const testError = new Error('Insufficient permissions to access this resource');
      (testError as any).status = 403;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: err => {
          expect(err.message).toBe('Insufficient permissions to access this resource');
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] ERROR'),
            expect.objectContaining({
              method: 'GET',
              url: '/products',
              error: 'Insufficient permissions to access this resource',
              statusCode: 403,
              accessGranted: false,
              failureReason: 'INSUFFICIENT_PERMISSIONS',
            })
          );
          done();
        },
      });
    });

    it('Given: insufficient role permissions When: error occurs Then: should extract correct failure reason', done => {
      // Arrange
      const testError = new Error('Insufficient role permissions');
      (testError as any).status = 403;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] ERROR'),
            expect.objectContaining({
              failureReason: 'INSUFFICIENT_ROLES',
            })
          );
          done();
        },
      });
    });

    it('Given: organization access denied When: error occurs Then: should extract correct failure reason', done => {
      // Arrange
      const testError = new Error('Access denied to this organization');
      (testError as any).status = 403;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] ERROR'),
            expect.objectContaining({
              failureReason: 'ORGANIZATION_ACCESS_DENIED',
            })
          );
          done();
        },
      });
    });

    it('Given: authentication required When: error occurs Then: should extract correct failure reason', done => {
      // Arrange
      const testError = new Error('User authentication required');
      (testError as any).status = 401;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] ERROR'),
            expect.objectContaining({
              failureReason: 'AUTHENTICATION_REQUIRED',
            })
          );
          done();
        },
      });
    });

    it('Given: unknown error When: error occurs Then: should extract UNKNOWN failure reason', done => {
      // Arrange
      const testError = new Error('Some random error');
      (testError as any).status = 500;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTHZ_LOG] ERROR'),
            expect.objectContaining({
              failureReason: 'UNKNOWN',
            })
          );
          done();
        },
      });
    });
  });
});
