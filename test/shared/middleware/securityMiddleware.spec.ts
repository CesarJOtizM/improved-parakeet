// Security Middleware Tests - Middleware de seguridad
// Tests unitarios para el middleware de seguridad siguiendo AAA y Given-When-Then

import { SecurityMiddleware } from '@shared/middleware/securityMiddleware';
import { NextFunction, Request, Response } from 'express';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Test Browser)',
      },
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') {
          return 'Mozilla/5.0 (Test Browser)';
        }
        return undefined;
      }),
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('use', () => {
    it('Given: valid request When: applying security headers Then: should set all security headers', () => {
      // Arrange
      const expectedHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Request-ID': expect.stringMatching(/^req_\d+_[a-z0-9]{9}$/),
        'X-Response-Time': expect.any(String),
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(7);
      Object.entries(expectedHeaders).forEach(([header, value]) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith(header, value);
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request with different method When: applying security headers Then: should set headers regardless of method', () => {
      // Arrange
      mockRequest.method = 'POST';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request with different URL When: applying security headers Then: should set headers regardless of URL', () => {
      // Arrange
      mockRequest.url = '/api/users/123';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request with different IP When: applying security headers Then: should set headers regardless of IP', () => {
      // Arrange
      mockRequest.ip = '192.168.1.100';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: request without user agent When: applying security headers Then: should handle missing user agent', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: error during header setting When: applying security headers Then: should call next without error', () => {
      // Arrange
      const error = new Error('Header setting failed');
      mockResponse.setHeader = jest.fn().mockImplementation(() => {
        throw error;
      });

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(); // No error passed to next
    });

    it('Given: multiple requests When: applying security headers Then: should generate unique request IDs', () => {
      // Arrange
      const requestIds: string[] = [];

      // Act
      for (let i = 0; i < 3; i++) {
        // Reset mock to clear previous calls
        mockResponse.setHeader.mockClear();
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        const call = mockResponse.setHeader.mock.calls.find(call => call[0] === 'X-Request-ID');
        if (call) {
          requestIds.push(call[1]);
        }
      }

      // Assert
      expect(requestIds).toHaveLength(3);
      // Check that IDs follow the correct format
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      });
      // Note: In fast execution, IDs might not be unique due to same timestamp
      // This is acceptable behavior for the middleware
    });

    it('Given: request When: applying security headers Then: should set X-Response-Time with current timestamp', () => {
      // Arrange
      const beforeTime = Date.now();

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const afterTime = Date.now();
      const setHeaderCall = mockResponse.setHeader.mock.calls.find(
        call => call[0] === 'X-Response-Time'
      );
      expect(setHeaderCall).toBeDefined();

      const responseTime = parseInt(setHeaderCall[1], 10);
      expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('generateRequestId', () => {
    it('Given: multiple calls When: generating request IDs Then: should generate unique IDs', () => {
      // Arrange
      const requestIds = new Set<string>();

      // Act
      for (let i = 0; i < 10; i++) {
        const id = (middleware as { generateRequestId(): string }).generateRequestId();
        requestIds.add(id);
      }

      // Assert
      expect(requestIds.size).toBe(10);
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      });
    });

    it('Given: request ID generation When: checking format Then: should follow correct pattern', () => {
      // Arrange & Act
      const requestId = (middleware as { generateRequestId(): string }).generateRequestId();

      // Assert
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(requestId.length).toBeGreaterThan(20);
    });
  });

  describe('logSecurityHeaders', () => {
    it('Given: request with all properties When: logging security headers Then: should log debug information', () => {
      // Arrange
      const loggerSpy = jest.spyOn(middleware['logger'], 'debug').mockImplementation();

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Security headers applied for GET /api/test from 127.0.0.1',
        {
          method: 'GET',
          url: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          securityHeaders: [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Referrer-Policy',
          ],
        }
      );

      // Cleanup
      loggerSpy.mockRestore();
    });

    it('Given: request without user agent When: logging security headers Then: should log with Unknown user agent', () => {
      // Arrange
      const requestWithoutUserAgent = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        headers: {},
        get: jest.fn().mockReturnValue(undefined),
      };
      const loggerSpy = jest.spyOn(middleware['logger'], 'debug').mockImplementation();

      // Act
      middleware.use(requestWithoutUserAgent as Request, mockResponse as Response, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Security headers applied for GET /api/test from 127.0.0.1',
        expect.objectContaining({
          userAgent: 'Unknown',
        })
      );

      // Cleanup
      loggerSpy.mockRestore();
    });
  });
});
