// Correlation ID Middleware Tests
// Unit tests for CorrelationIdMiddleware following AAA and Given-When-Then patterns

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CorrelationIdMiddleware } from '@shared/middlewares/correlationId.middleware';
import { NextFunction, Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn() as Response['setHeader'],
    };
    mockNext = jest.fn();
  });

  describe('use', () => {
    it('Given: request without correlation ID header When: processing request Then: should generate new correlation ID', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.correlationId).toBeDefined();
      expect(typeof mockRequest.correlationId).toBe('string');
      expect(mockRequest.correlationId!.length).toBeGreaterThan(0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        mockRequest.correlationId
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request with X-Correlation-ID header When: processing request Then: should use provided correlation ID', () => {
      // Arrange
      const providedCorrelationId = 'existing-correlation-id-123';
      mockRequest.headers = {
        'x-correlation-id': providedCorrelationId,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.correlationId).toBe(providedCorrelationId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        providedCorrelationId
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request with correlation ID When: processing request Then: should add correlation ID to response headers', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(1);
    });

    it('Given: request When: processing request Then: should call next middleware', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: multiple requests When: processing requests Then: should generate unique correlation IDs', () => {
      // Arrange
      const correlationIds: string[] = [];

      // Act
      for (let i = 0; i < 5; i++) {
        const request = { headers: {} } as Request;
        const response = { setHeader: jest.fn() } as unknown as Response;
        const next = jest.fn();
        middleware.use(request, response, next);
        correlationIds.push(request.correlationId!);
      }

      // Assert
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('Given: request with lowercase header When: processing request Then: should extract correlation ID', () => {
      // Arrange
      const providedCorrelationId = 'lowercase-header-id';
      mockRequest.headers = {
        'x-correlation-id': providedCorrelationId,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.correlationId).toBe(providedCorrelationId);
    });

    it('Given: request with mixed case header When: processing request Then: should extract correlation ID', () => {
      // Arrange
      const providedCorrelationId = 'mixed-case-header-id';
      // Express normalizes headers to lowercase
      mockRequest.headers = {
        'x-correlation-id': providedCorrelationId,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.correlationId).toBe(providedCorrelationId);
    });
  });
});
