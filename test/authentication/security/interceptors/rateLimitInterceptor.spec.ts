/* eslint-disable @typescript-eslint/no-explicit-any */
import { RateLimitInterceptor } from '@auth/security/interceptors/rateLimitInterceptor';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let mockRateLimitService: any;
  let mockReflector: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let loggerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockRateLimitService = {
      checkRateLimit: jest.fn(),
    };

    mockReflector = {
      get: jest.fn(),
    };

    interceptor = new RateLimitInterceptor(mockRateLimitService, mockReflector as Reflector);

    mockRequest = {
      method: 'POST',
      url: '/auth/login',
      ip: '127.0.0.1',
      user: {
        id: 'user-123',
      },
      headers: {},
      connection: {
        remoteAddress: '127.0.0.1',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    } as any;

    loggerSpy = jest.spyOn((interceptor as any).logger, 'warn');
    jest.spyOn((interceptor as any).logger, 'error');
  });

  describe('intercept', () => {
    it('Given: rate limiting disabled When: request is made Then: should proceed without checking', async () => {
      // Arrange
      mockReflector.get.mockReturnValue(undefined);

      // Act
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(mockRateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('Given: rate limiting enabled and allowed When: request is made Then: should set headers and proceed', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: new Date(),
      });

      // Act
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        '127.0.0.1',
        'IP',
        undefined
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 99);
    });

    it('Given: rate limit exceeded When: request is made Then: should throw HttpException', done => {
      // Arrange
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        blocked: false,
      });

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).then(result => {
        result.subscribe({
          error: err => {
            expect(err).toBeInstanceOf(HttpException);
            expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
            expect(loggerSpy).toHaveBeenCalledWith('Rate limit exceeded for IP:127.0.0.1');
            done();
          },
        });
      });
    });

    it('Given: rate limit exceeded and blocked When: request is made Then: should set block headers', async () => {
      // Arrange
      const blockExpiresAt = new Date(Date.now() + 60000);
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(),
        blocked: true,
        blockExpiresAt,
      });

      // Act & Assert
      try {
        await interceptor.intercept(mockExecutionContext, mockCallHandler);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Blocked', 'true');
    });

    it('Given: user type rate limiting When: user is authenticated Then: should use user id', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ enabled: true, type: 'USER' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: new Date(),
      });

      // Act
      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'user-123',
        'USER',
        undefined
      );
    });

    it('Given: user type rate limiting When: user is not authenticated Then: should skip rate limiting', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockReflector.get.mockReturnValue({ enabled: true, type: 'USER' });

      // Act
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(mockRateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('Given: x-forwarded-for header When: IP rate limiting Then: should use forwarded IP', async () => {
      // Arrange
      mockRequest.headers['x-forwarded-for'] = '192.168.1.1';
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: new Date(),
      });

      // Act
      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        '192.168.1.1',
        'IP',
        undefined
      );
    });

    it('Given: x-real-ip header When: IP rate limiting Then: should use real IP', async () => {
      // Arrange
      mockRequest.headers['x-real-ip'] = '10.0.0.1';
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: new Date(),
      });

      // Act
      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith('10.0.0.1', 'IP', undefined);
    });

    it('Given: rate limit service error When: checking rate limit Then: should allow request', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ enabled: true, type: 'IP' });
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Service error'));
      const errorLoggerSpy = jest.spyOn((interceptor as any).logger, 'error');

      // Act
      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        'Rate limiting interceptor error:',
        expect.any(Error)
      );
    });
  });
});
