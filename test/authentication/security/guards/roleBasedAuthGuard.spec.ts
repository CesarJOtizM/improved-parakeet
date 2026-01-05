import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RoleBasedAuthGuard', () => {
  let guard: RoleBasedAuthGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReflector: any;

  const createMockExecutionContext = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    guard = new RoleBasedAuthGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('Given: no roles required When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requiredRoles: [] });
      const context = createMockExecutionContext(null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no user When: roles required Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requiredRoles: ['ADMIN'] });
      const context = createMockExecutionContext(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: user with required role When: checking access Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({ requiredRoles: ['ADMIN'] });
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
      mockReflector.get.mockReturnValue({
        requiredRoles: ['ADMIN'],
        allowSuperAdmin: false,
        allowOrganizationAdmin: false,
      });
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

    it('Given: super admin When: allowSuperAdmin enabled Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['MANAGER'],
        allowSuperAdmin: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['SYSTEM_ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: org admin When: allowOrganizationAdmin enabled Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['MANAGER'],
        allowOrganizationAdmin: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: requireAllRoles true When: user has some roles Then: should throw ForbiddenException', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['MANAGER', 'SUPERVISOR'],
        requireAllRoles: true,
        allowSuperAdmin: false,
        allowOrganizationAdmin: false,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['MANAGER'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: requireAllRoles true When: user has all roles Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['MANAGER', 'SUPERVISOR'],
        requireAllRoles: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['MANAGER', 'SUPERVISOR', 'USER'],
        permissions: [],
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
        requiredRoles: ['ADMIN'],
        checkOrganization: true,
        allowSuperAdmin: false,
        allowOrganizationAdmin: false,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user, { orgId: 'org-456' }, {}, {}, {});

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Given: org from query When: matching user org Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['ADMIN'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user, {}, { orgId: 'org-123' }, {}, {});

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: org from body When: matching user org Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['ADMIN'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user, {}, {}, { orgId: 'org-123' }, {});

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no orgId in request When: checkOrganization enabled Then: should allow access', async () => {
      // Arrange
      mockReflector.get.mockReturnValue({
        requiredRoles: ['ADMIN'],
        checkOrganization: true,
      });
      const user = {
        id: 'user-123',
        orgId: 'org-123',
        roles: ['ADMIN'],
        permissions: [],
      };
      const context = createMockExecutionContext(user);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
