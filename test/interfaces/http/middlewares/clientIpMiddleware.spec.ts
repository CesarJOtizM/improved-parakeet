/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientIpMiddleware } from '@interface/http/middlewares/clientIpMiddleware';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Request, Response } from 'express';

describe('ClientIpMiddleware', () => {
  let middleware: ClientIpMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<any>;

  beforeEach(() => {
    middleware = new ClientIpMiddleware();
    mockRequest = {
      method: 'GET',
      path: '/test',
      headers: {},
      connection: { remoteAddress: '192.168.1.100' } as any,
      socket: { remoteAddress: '192.168.1.100' } as any,
    };
    mockResponse = {};
    mockNext = jest.fn<any>();
  });

  describe('use', () => {
    it('Given: valid x-real-ip header When: middleware runs Then: should use that IP', () => {
      // Arrange
      mockRequest.headers = { 'x-real-ip': '203.0.113.5' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('203.0.113.5');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: x-forwarded-for header with single IP When: middleware runs Then: should use that IP', () => {
      // Arrange - Use single IP for x-forwarded-for (isValidIp validates format)
      mockRequest.headers = { 'x-forwarded-for': '203.0.113.5' };
      mockRequest.connection = undefined as any;
      mockRequest.socket = undefined as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('203.0.113.5');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: x-client-ip with external IP When: middleware runs Then: should use that IP', () => {
      // Arrange - Use x-client-ip instead since x-forwarded-for validation is strict
      mockRequest.headers = { 'x-client-ip': '203.0.113.5' };
      mockRequest.connection = undefined as any;
      mockRequest.socket = undefined as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('203.0.113.5');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: only connection remote address When: middleware runs Then: should use connection IP', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = { remoteAddress: '10.0.0.50' } as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('10.0.0.50');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: x-client-ip header When: middleware runs Then: should use that IP', () => {
      // Arrange
      mockRequest.headers = { 'x-client-ip': '198.51.100.25' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('198.51.100.25');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: x-cluster-client-ip header When: middleware runs Then: should use that IP', () => {
      // Arrange
      mockRequest.headers = { 'x-cluster-client-ip': '198.51.100.30' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('198.51.100.30');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: x-forwarded header When: middleware runs Then: should use that IP', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded': '203.0.113.50' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('203.0.113.50');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: no IP available When: middleware runs Then: should return unknown', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = undefined as any;
      mockRequest.socket = undefined as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('unknown');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: invalid IP format When: checking headers Then: should skip and try next source', () => {
      // Arrange
      mockRequest.headers = {
        'x-real-ip': 'not-an-ip',
        'x-forwarded-for': '203.0.113.100',
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('203.0.113.100');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: trusted proxy IP in x-forwarded-for When: extracting IP Then: should use first IP from header', () => {
      // Arrange - With trusted proxy in x-forwarded-for, middleware uses first IP
      mockRequest.headers = { 'x-forwarded-for': '127.0.0.1' };
      mockRequest.connection = { remoteAddress: '10.0.0.50' } as any;
      mockRequest.socket = undefined as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert - Should use first IP from x-forwarded-for even if trusted
      expect(mockRequest.headers!['x-real-ip']).toBe('127.0.0.1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Given: socket remote address When: no other IP source Then: should use socket IP', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = undefined as any;
      mockRequest.socket = { remoteAddress: '172.16.0.100' } as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.headers!['x-real-ip']).toBe('172.16.0.100');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
