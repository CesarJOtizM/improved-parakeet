import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PermissionGuard } from '@shared/guards/permission.guard';

interface IMockUser {
  id: string;
  orgId?: string;
  permissions?: string[];
  roles?: string[];
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReflector: any;

  const createMockContext = (
    user: IMockUser | null,
    userPermissions: string[] = [],
    userRoles: string[] = []
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          userPermissions,
          userRoles,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new PermissionGuard(mockReflector);
  });

  describe('canActivate', () => {
    it('Given: no permissions required When: checking Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext(null);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no user When: permissions required Then: should throw UnauthorizedException', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['READ']);
      const context = createMockContext(null);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('Given: user without orgId When: checking Then: should throw ForbiddenException', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['READ']);
      const context = createMockContext({ id: 'user-123' });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User without assigned organization');
    });

    it('Given: admin role When: checking Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['SUPER_PERMISSION']);
      const context = createMockContext({ id: 'user-123', orgId: 'org-123' }, [], ['ADMIN']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with required permission When: checking Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['READ']);
      const context = createMockContext(
        { id: 'user-123', orgId: 'org-123' },
        ['READ', 'WRITE'],
        ['USER']
      );

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without required permission When: checking Then: should throw ForbiddenException', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['DELETE']);
      const context = createMockContext({ id: 'user-123', orgId: 'org-123' }, ['READ'], ['USER']);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('Given: ANY type permissions When: user has one Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'ANY',
        permissions: ['READ', 'WRITE', 'DELETE'],
      });
      const context = createMockContext({ id: 'user-123', orgId: 'org-123' }, ['READ'], ['USER']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: ANY type permissions When: user has none Then: should throw', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'ANY',
        permissions: ['DELETE', 'ADMIN'],
      });
      const context = createMockContext({ id: 'user-123', orgId: 'org-123' }, ['READ'], ['USER']);

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('Given: ALL type permissions When: user has all Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'ALL',
        permissions: ['READ', 'WRITE'],
      });
      const context = createMockContext(
        { id: 'user-123', orgId: 'org-123' },
        ['READ', 'WRITE', 'DELETE'],
        ['USER']
      );

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: ALL type permissions When: user missing some Then: should throw', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'ALL',
        permissions: ['READ', 'WRITE', 'DELETE'],
      });
      const context = createMockContext(
        { id: 'user-123', orgId: 'org-123' },
        ['READ', 'WRITE'],
        ['USER']
      );

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('Given: multiple required permissions (array) When: user has all Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(['READ', 'WRITE']);
      const context = createMockContext(
        { id: 'user-123', orgId: 'org-123' },
        ['READ', 'WRITE', 'DELETE'],
        ['USER']
      );

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });
});
