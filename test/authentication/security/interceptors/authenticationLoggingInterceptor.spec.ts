/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthenticationLoggingInterceptor } from '@auth/security/interceptors/authenticationLoggingInterceptor';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('AuthenticationLoggingInterceptor', () => {
  let interceptor: AuthenticationLoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    interceptor = new AuthenticationLoggingInterceptor();

    mockRequest = {
      method: 'POST',
      url: '/auth/login',
      ip: '127.0.0.1',
      user: {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@test.com',
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
    it('Given: authenticated user When: request is successful Then: should log start and success events', done => {
      // Arrange
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(of({ success: true }));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTH_LOG] START'),
            expect.objectContaining({
              method: 'POST',
              url: '/auth/login',
              ip: '127.0.0.1',
              userId: 'user-123',
              orgId: 'org-123',
            })
          );

          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTH_LOG] SUCCESS'),
            expect.objectContaining({
              method: 'POST',
              url: '/auth/login',
              userId: 'user-123',
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
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(of({ success: true }));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTH_LOG] START'),
            expect.objectContaining({
              userId: 'anonymous',
              orgId: 'unknown',
            })
          );
          done();
        },
      });
    });

    it('Given: request fails When: error occurs Then: should log error event', done => {
      // Arrange
      const testError = new Error('Authentication failed');
      (testError as any).status = 401;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));
      const errorLoggerSpy = jest.spyOn((interceptor as any).logger, 'log');

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: err => {
          expect(err.message).toBe('Authentication failed');
          expect(errorLoggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AUTH_LOG] ERROR'),
            expect.objectContaining({
              method: 'POST',
              url: '/auth/login',
              error: 'Authentication failed',
              statusCode: 401,
            })
          );
          done();
        },
      });
    });
  });
});
