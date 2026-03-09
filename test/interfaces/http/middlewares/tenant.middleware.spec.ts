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

    it('Given: www subdomain only When: extracting org with no other identifier Then: should call next without org', async () => {
      // Arrange
      mockRequest.headers = { host: 'www.example.com' };

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toBeUndefined();
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: api subdomain only When: extracting org with no other identifier Then: should call next without org', async () => {
      // Arrange
      mockRequest.headers = { host: 'api.example.com' };

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toBeUndefined();
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: valid subdomain only When: extracting org Then: should use subdomain', async () => {
      // Arrange
      mockRequest.headers = { host: 'mycompany.example.com' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ id: 'mycompany' }]),
          }),
        })
      );
    });

    it('Given: host without dot When: extracting org Then: should not extract subdomain', async () => {
      // Arrange
      mockRequest.headers = { host: 'localhost' };

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toBeUndefined();
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: database error When: finding organization Then: should pass error to next', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      const dbError = new Error('Database connection failed');
      mockPrismaService.organization.findFirst.mockRejectedValue(dbError);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('Given: X-Organization-ID header takes priority When: both header and subdomain exist Then: should use header', async () => {
      // Arrange
      mockRequest.headers = {
        'x-organization-id': 'org-from-header',
        host: 'subdomain.example.com',
      };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ id: 'org-from-header' }]),
          }),
        })
      );
    });

    it('Given: X-Organization-Slug takes priority over subdomain When: both exist Then: should use slug header', async () => {
      // Arrange
      mockRequest.headers = {
        'x-organization-slug': 'my-org-slug',
        host: 'subdomain.example.com',
      };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ id: 'my-org-slug' }]),
          }),
        })
      );
    });

    it('Given: authenticated user with no orgId When: accessing org Then: should allow', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      (mockRequest as any).user = { id: 'user-1' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).organization).toEqual(mockOrganization);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('Given: non-Error thrown When: middleware fails Then: should still pass to next', async () => {
      // Arrange
      mockRequest.headers = { 'x-organization-id': 'org-123' };
      mockPrismaService.organization.findFirst.mockRejectedValue('string error');

      // Act
      await middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith('string error');
    });
  });
});
