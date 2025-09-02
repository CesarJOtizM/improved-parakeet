// Permission Guard Tests - Guard de permisos
// Tests unitarios para el guard de autorización siguiendo AAA y Given-When-Then

import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '@shared/guards/permission.guard';

import type { IAuthenticatedUser } from '@shared/types/http.types';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new PermissionGuard(mockReflector);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: null,
          userPermissions: [],
          userRoles: [],
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  describe('canActivate', () => {
    it('Given: no required permissions When: checking access Then: should allow access', () => {
      // Arrange
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('permissions', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('Given: unauthenticated user When: checking access Then: should throw UnauthorizedException', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const request = {
        user: null,
        userPermissions: [],
        userRoles: [],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Usuario no autenticado');
    });

    it('Given: user without organization When: checking access Then: should throw ForbiddenException', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: '',
        email: 'test@example.com',
        username: 'testuser',
        roles: [],
        permissions: [],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: [],
        userRoles: [],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Usuario sin organización asignada'
      );
    });

    it('Given: admin user When: checking access Then: should allow access regardless of permissions', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'admin@example.com',
        username: 'admin',
        roles: ['ADMIN'],
        permissions: [],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: [],
        userRoles: ['ADMIN'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with required permissions When: checking access Then: should allow access', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user missing required permissions When: checking access Then: should throw ForbiddenException', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Permisos insuficientes. Requeridos: PRODUCTS:CREATE, PRODUCTS:UPDATE'
      );
    });
  });

  describe('checkPermissions with ANY type', () => {
    it('Given: ANY type permissions When: user has one permission Then: should allow access', () => {
      // Arrange
      const requiredPermissions = {
        type: 'ANY' as const,
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
      };
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: ANY type permissions When: user has none of the permissions Then: should throw ForbiddenException', () => {
      // Arrange
      const requiredPermissions = {
        type: 'ANY' as const,
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
      };
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:DELETE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:DELETE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });

  describe('checkPermissions with ALL type', () => {
    it('Given: ALL type permissions When: user has all permissions Then: should allow access', () => {
      // Arrange
      const requiredPermissions = {
        type: 'ALL' as const,
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
      };
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: ALL type permissions When: user missing one permission Then: should throw ForbiddenException', () => {
      // Arrange
      const requiredPermissions = {
        type: 'ALL' as const,
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'],
      };
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });

  describe('Edge cases', () => {
    it('Given: empty permissions array When: checking access Then: should allow access', () => {
      // Arrange
      const requiredPermissions: string[] = [];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: [],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: [],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with extra permissions When: checking access Then: should allow access', () => {
      // Arrange
      const requiredPermissions = ['PRODUCTS:CREATE'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE', 'PRODUCTS:DELETE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE', 'PRODUCTS:DELETE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: invalid permission type When: checking permissions Then: should return false', () => {
      // Arrange
      const requiredPermissions = {
        type: 'INVALID' as 'ANY' | 'ALL',
        permissions: ['PRODUCTS:CREATE'],
      };
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        orgId: 'org-1',
        email: 'user@example.com',
        username: 'user',
        roles: ['USER'],
        permissions: ['PRODUCTS:CREATE'],
        jti: 'jti-1',
      };

      const request = {
        user,
        userPermissions: ['PRODUCTS:CREATE'],
        userRoles: ['USER'],
      };
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(request);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });
  });
});
