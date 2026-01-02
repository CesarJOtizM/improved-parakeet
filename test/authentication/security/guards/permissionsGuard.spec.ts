import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: any;

  const createMockExecutionContext = (
    user: any | null,
    params: any = {},
    query: any = {},
    body: any = {},
    headers: any = {}
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          query,
          body,
          headers,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      get: jest.fn(),
    };
    guard = new PermissionsGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('Given: no permissions required When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ permissions: [], roles: [] });
      const context = createMockExecutionContext(null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no user When: checking access Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ permissions: ['READ'] });
      const context = createMockExecutionContext(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: user with required permission When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ permissions: ['READ'] });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ', 'WRITE'],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without required permission When: checking access Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ permissions: ['ADMIN'] });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ'],
      };
      const context = createMockExecutionContext(user);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: user with required role When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ roles: ['ADMIN'] });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN', 'USER'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without required role When: checking access Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ roles: ['ADMIN'] });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: requireAll true When: user has some permissions Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        permissions: ['READ', 'WRITE', 'DELETE'],
        requireAll: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ', 'WRITE'],
      };
      const context = createMockExecutionContext(user);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: requireAll true When: user has all permissions Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        permissions: ['READ', 'WRITE'],
        requireAll: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ', 'WRITE', 'DELETE'],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: organization mismatch When: checkOrganization enabled Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        permissions: ['READ'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ'],
      };
      const context = createMockExecutionContext(user, { orgId: 'org-456' }, {}, {}, {});

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: organization from header When: matching user org Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        permissions: ['READ'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ'],
      };
      const context = createMockExecutionContext(
        user,
        {},
        {},
        {},
        { 'x-organization-id': 'org-123' }
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no orgId in request When: checkOrganization enabled Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        permissions: ['READ'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['USER'],
        permissions: ['READ'],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
