/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { MetricsInterceptor } from '@shared/interceptors/metrics.interceptor';
import { of, throwError } from 'rxjs';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let mockMetricsService: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockMetricsService = {
      recordRequestDuration: jest.fn(),
    };

    interceptor = new MetricsInterceptor(mockMetricsService);

    mockRequest = {
      method: 'GET',
      path: '/products',
      route: {
        path: '/products/:id',
      },
    };

    mockResponse = {
      statusCode: 200,
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
      handle: jest.fn().mockReturnValue(of({ data: [] })),
    } as any;
  });

  describe('intercept', () => {
    it('Given: successful request When: interceptor runs Then: should record metrics with success status', done => {
      // Arrange
      mockResponse.statusCode = 200;

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(mockMetricsService.recordRequestDuration).toHaveBeenCalledWith(
            'GET',
            '/products/:id',
            expect.any(Number),
            200
          );
          done();
        },
      });
    });

    it('Given: request without route When: interceptor runs Then: should use path instead', done => {
      // Arrange
      mockRequest.route = undefined;
      mockRequest.path = '/api/products';

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(mockMetricsService.recordRequestDuration).toHaveBeenCalledWith(
            'GET',
            '/api/products',
            expect.any(Number),
            200
          );
          done();
        },
      });
    });

    it('Given: failed request When: interceptor runs Then: should record metrics with error status', done => {
      // Arrange
      const testError = new Error('Internal error');
      (testError as any).status = 500;
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(mockMetricsService.recordRequestDuration).toHaveBeenCalledWith(
            'GET',
            '/products/:id',
            expect.any(Number),
            500
          );
          done();
        },
      });
    });

    it('Given: failed request without status When: interceptor runs Then: should default to 500', done => {
      // Arrange
      const testError = new Error('Unknown error');
      (mockCallHandler.handle as jest.Mock<any>).mockReturnValue(throwError(() => testError));

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        error: () => {
          expect(mockMetricsService.recordRequestDuration).toHaveBeenCalledWith(
            'GET',
            '/products/:id',
            expect.any(Number),
            500
          );
          done();
        },
      });
    });

    it('Given: POST request When: interceptor runs Then: should record correct method', done => {
      // Arrange
      mockRequest.method = 'POST';
      mockResponse.statusCode = 201;

      // Act
      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      // Assert
      result.subscribe({
        complete: () => {
          expect(mockMetricsService.recordRequestDuration).toHaveBeenCalledWith(
            'POST',
            '/products/:id',
            expect.any(Number),
            201
          );
          done();
        },
      });
    });
  });
});
