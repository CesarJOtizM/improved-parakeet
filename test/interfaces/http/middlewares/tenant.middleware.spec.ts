/* eslint-disable @typescript-eslint/no-explicit-any */
import { TenantMiddleware } from '@interface/http/middlewares/tenant.middleware';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockPrismaService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<any>;

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    domain: 'test.example.com',
  };

  beforeEach(() => {
    mockPrismaService = {
      organization: {
        findFirst: jest.fn(),
      },
    };

    middleware = new TenantMiddleware(mockPrismaService);

    mockRequest = {
      headers: {},
      query: {},
      body: {},
    };
    mockResponse = {};
    mockNext = jest.fn<any>();
  });

  describe('use', () => {
    it('Given: X-Organization-ID header When: organization exists Then: should set context', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect((mockRequest as any).orgId).toBe('org-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: X-Organization-Slug header When: organization exists Then: should set context', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-slug': 'test-org' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect((mockRequest as any).orgId).toBe('org-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: subdomain When: organization exists Then: should set context', async () => {
      // Arrange
      mockRequest.headers = { host: 'test-org.example.com' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: orgId in query When: middleware runs Then: should ignore query param and not set context', async () => {
      // Arrange - orgId in query should be ignored for security (prevent tenant-hopping)
      mockRequest.query = { orgId: 'org-123' };

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toBeUndefined();
      expect((mockRequest as any).orgId).toBeUndefined();
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: orgId in body When: middleware runs Then: should ignore body param and not set context', async () => {
      // Arrange - orgId in body should be ignored for security (prevent tenant-hopping)
      mockRequest.body = { orgId: 'org-123' };

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toBeUndefined();
      expect((mockRequest as any).orgId).toBeUndefined();
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: no organization identifier When: middleware runs Then: should call next without error', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: organization not found When: middleware runs Then: should throw ForbiddenException', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'non-existent' };
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenException));
    });

    it('Given: authenticated user from different org When: accessing org Then: should throw ForbiddenException', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      (mockRequest as any).user = { id: 'user-1', orgId: 'different-org' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenException));
    });

    it('Given: authenticated user from same org When: accessing org Then: should allow', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      (mockRequest as any).user = { id: 'user-1', orgId: 'org-123' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: www subdomain When: extracting org Then: should skip www', async () => {
      // Arrange
      mockRequest.headers = { host: 'www.example.com', 'x-organization-id': 'org-123' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
    });

    it('Given: api subdomain When: extracting org Then: should skip api', async () => {
      // Arrange
      mockRequest.headers = { host: 'api.example.com', 'x-organization-id': 'org-123' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
    });
  });
});
