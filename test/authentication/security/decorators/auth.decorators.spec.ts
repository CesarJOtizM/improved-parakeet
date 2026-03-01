import { describe, expect, it } from '@jest/globals';
import {
  JwtAuth,
  Public,
  AuthOnly,
  RateLimited,
  RequireRole,
  RequireRoles,
  RequirePermission,
  RequirePermissions,
  RequirePermissionsList,
  OrgScoped,
  CrossOrg,
  AdminOnly,
  SupervisorOnly,
  OperatorOnly,
  ConsultantOnly,
  CanManageUsers,
  CanManageProducts,
  CanManageWarehouses,
  CanPostMovements,
  CanVoidMovements,
  CanImportData,
  CanViewReports,
  CanManageSettings,
} from '@auth/security/decorators/auth.decorators';
import { GUARDS_METADATA } from '@nestjs/common/constants';

/**
 * Helper: applies a decorator to a dummy controller method and returns the method target + key
 * so we can inspect metadata set by SetMetadata and UseGuards via applyDecorators.
 */
function applyDecoratorToMethod(decorator: MethodDecorator) {
  class DummyController {
    dummyMethod() {}
  }
  const descriptor = Object.getOwnPropertyDescriptor(DummyController.prototype, 'dummyMethod')!;
  decorator(DummyController.prototype, 'dummyMethod', descriptor);
  return { target: DummyController.prototype, key: 'dummyMethod', descriptor };
}

describe('auth.decorators', () => {
  describe('JwtAuth', () => {
    it('Given: no options When: applying JwtAuth() Then: should set jwtAuthOptions metadata to empty object', () => {
      // Arrange
      const decorator = JwtAuth();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({});
    });

    it('Given: custom options When: applying JwtAuth(options) Then: should set jwtAuthOptions metadata with those options', () => {
      // Arrange
      const options = { requireAuth: false, checkBlacklist: true };
      const decorator = JwtAuth(options);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual(options);
    });

    it('Given: JwtAuth decorator When: applied Then: should attach JwtAuthGuard via UseGuards', () => {
      // Arrange
      const decorator = JwtAuth();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const guards = Reflect.getMetadata(GUARDS_METADATA, target[key as keyof typeof target]);
      expect(guards).toBeDefined();
      expect(Array.isArray(guards)).toBe(true);
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Public', () => {
    it('Given: Public decorator When: applied Then: should set jwtAuthOptions with requireAuth false', () => {
      // Arrange
      const decorator = Public();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ requireAuth: false });
    });
  });

  describe('AuthOnly', () => {
    it('Given: AuthOnly decorator When: applied Then: should set jwtAuthOptions with checkBlacklist false', () => {
      // Arrange
      const decorator = AuthOnly();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ checkBlacklist: false });
    });
  });

  describe('RateLimited', () => {
    it('Given: default RateLimited When: applied Then: should set checkRateLimit true and rateLimitType IP', () => {
      // Arrange
      const decorator = RateLimited();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ checkRateLimit: true, rateLimitType: 'IP' });
    });

    it('Given: RateLimited with USER type When: applied Then: should set rateLimitType USER', () => {
      // Arrange
      const decorator = RateLimited('USER');

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('jwtAuthOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ checkRateLimit: true, rateLimitType: 'USER' });
    });
  });

  describe('RequirePermissions', () => {
    it('Given: permission options When: applying RequirePermissions Then: should set permissionOptions metadata', () => {
      // Arrange
      const options = { roles: ['ADMIN'], permissions: ['USERS:CREATE'], requireAll: true };
      const decorator = RequirePermissions(options);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual(options);
    });

    it('Given: RequirePermissions When: applied Then: should attach PermissionsGuard', () => {
      // Arrange
      const decorator = RequirePermissions({ roles: ['ADMIN'] });

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const guards = Reflect.getMetadata(GUARDS_METADATA, target[key as keyof typeof target]);
      expect(guards).toBeDefined();
      expect(Array.isArray(guards)).toBe(true);
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('RequireRole', () => {
    it('Given: a single role When: applying RequireRole Then: should set permissionOptions with roles array containing that role', () => {
      // Arrange
      const decorator = RequireRole('ADMIN');

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['ADMIN'] });
    });
  });

  describe('RequireRoles', () => {
    it('Given: multiple roles with requireAll false When: applying RequireRoles Then: should set permissionOptions correctly', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN', 'SUPERVISOR'], false);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['ADMIN', 'SUPERVISOR'], requireAll: false });
    });

    it('Given: multiple roles with requireAll true When: applying RequireRoles Then: should set requireAll true', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN', 'SUPERVISOR'], true);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['ADMIN', 'SUPERVISOR'], requireAll: true });
    });

    it('Given: roles without explicit requireAll When: applying RequireRoles Then: should default requireAll to false', () => {
      // Arrange
      const decorator = RequireRoles(['ADMIN', 'SUPERVISOR']);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['ADMIN', 'SUPERVISOR'], requireAll: false });
    });
  });

  describe('RequirePermission', () => {
    it('Given: a single permission When: applying RequirePermission Then: should set permissionOptions with permissions array', () => {
      // Arrange
      const decorator = RequirePermission('USERS:CREATE');

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['USERS:CREATE'] });
    });
  });

  describe('RequirePermissionsList', () => {
    it('Given: multiple permissions with requireAll false When: applying RequirePermissionsList Then: should set metadata correctly', () => {
      // Arrange
      const decorator = RequirePermissionsList(['USERS:CREATE', 'USERS:READ'], false);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({
        permissions: ['USERS:CREATE', 'USERS:READ'],
        requireAll: false,
      });
    });

    it('Given: multiple permissions with requireAll true When: applying RequirePermissionsList Then: should set requireAll true', () => {
      // Arrange
      const decorator = RequirePermissionsList(['USERS:CREATE', 'USERS:READ'], true);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({
        permissions: ['USERS:CREATE', 'USERS:READ'],
        requireAll: true,
      });
    });

    it('Given: permissions without explicit requireAll When: applying RequirePermissionsList Then: should default requireAll to false', () => {
      // Arrange
      const decorator = RequirePermissionsList(['USERS:CREATE', 'USERS:READ']);

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({
        permissions: ['USERS:CREATE', 'USERS:READ'],
        requireAll: false,
      });
    });
  });

  describe('OrgScoped', () => {
    it('Given: OrgScoped decorator When: applied Then: should set permissionOptions with checkOrganization true', () => {
      // Arrange
      const decorator = OrgScoped();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ checkOrganization: true });
    });
  });

  describe('CrossOrg', () => {
    it('Given: CrossOrg decorator When: applied Then: should set permissionOptions with checkOrganization false', () => {
      // Arrange
      const decorator = CrossOrg();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ checkOrganization: false });
    });
  });

  describe('Role-specific decorators', () => {
    it('Given: AdminOnly When: applied Then: should set permissionOptions with roles [ADMIN]', () => {
      // Arrange
      const decorator = AdminOnly();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['ADMIN'] });
    });

    it('Given: SupervisorOnly When: applied Then: should set permissionOptions with roles [SUPERVISOR]', () => {
      // Arrange
      const decorator = SupervisorOnly();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['SUPERVISOR'] });
    });

    it('Given: OperatorOnly When: applied Then: should set permissionOptions with roles [WAREHOUSE_OPERATOR]', () => {
      // Arrange
      const decorator = OperatorOnly();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['WAREHOUSE_OPERATOR'] });
    });

    it('Given: ConsultantOnly When: applied Then: should set permissionOptions with roles [CONSULTANT]', () => {
      // Arrange
      const decorator = ConsultantOnly();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ roles: ['CONSULTANT'] });
    });
  });

  describe('Permission-specific decorators', () => {
    it('Given: CanManageUsers When: applied Then: should set permissions [USERS:CREATE]', () => {
      // Arrange
      const decorator = CanManageUsers();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['USERS:CREATE'] });
    });

    it('Given: CanManageProducts When: applied Then: should set permissions [PRODUCTS:CREATE]', () => {
      // Arrange
      const decorator = CanManageProducts();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['PRODUCTS:CREATE'] });
    });

    it('Given: CanManageWarehouses When: applied Then: should set permissions [WAREHOUSES:CREATE]', () => {
      // Arrange
      const decorator = CanManageWarehouses();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['WAREHOUSES:CREATE'] });
    });

    it('Given: CanPostMovements When: applied Then: should set permissions [MOVEMENTS:POST]', () => {
      // Arrange
      const decorator = CanPostMovements();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['MOVEMENTS:POST'] });
    });

    it('Given: CanVoidMovements When: applied Then: should set permissions [MOVEMENTS:VOID]', () => {
      // Arrange
      const decorator = CanVoidMovements();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['MOVEMENTS:VOID'] });
    });

    it('Given: CanImportData When: applied Then: should set permissions [IMPORTS:IMPORT]', () => {
      // Arrange
      const decorator = CanImportData();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['IMPORTS:IMPORT'] });
    });

    it('Given: CanViewReports When: applied Then: should set permissions [REPORTS:READ]', () => {
      // Arrange
      const decorator = CanViewReports();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['REPORTS:READ'] });
    });

    it('Given: CanManageSettings When: applied Then: should set permissions [SETTINGS:UPDATE]', () => {
      // Arrange
      const decorator = CanManageSettings();

      // Act
      const { target, key } = applyDecoratorToMethod(decorator);

      // Assert
      const metadata = Reflect.getMetadata('permissionOptions', target[key as keyof typeof target]);
      expect(metadata).toEqual({ permissions: ['SETTINGS:UPDATE'] });
    });
  });
});
