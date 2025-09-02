import { Permission } from '@auth/domain/entities/permission.entity';
import { Role } from '@auth/domain/entities/role.entity';
import { User } from '@auth/domain/entities/user.entity';
import { AuthorizationService } from '@auth/domain/services/authorizationService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';

describe('AuthorizationService', () => {
  const mockOrgId = 'test-org-id';
  const mockUser = User.create(
    {
      email: Email.create('test@example.com'),
      password: 'SecurePass123!',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      status: UserStatus.create('ACTIVE'),
      failedLoginAttempts: 0,
    },
    mockOrgId
  );

  describe('checkPermission', () => {
    it('Given: user with required permission When: checking permission Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const requiredPermission = 'users:read';

      // Act
      const result = AuthorizationService.checkPermission(
        mockUser,
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual([requiredPermission]);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: user without required permission When: checking permission Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermission = 'products:delete';

      // Act
      const result = AuthorizationService.checkPermission(
        mockUser,
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
      expect(result.requiredPermissions).toEqual([requiredPermission]);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: empty user permissions When: checking permission Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions: string[] = [];
      const requiredPermission = 'users:read';

      // Act
      const result = AuthorizationService.checkPermission(
        mockUser,
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
      expect(result.requiredPermissions).toEqual([requiredPermission]);
      expect(result.userPermissions).toEqual(userPermissions);
    });
  });

  describe('checkAnyPermission', () => {
    it('Given: user with one of required permissions When: checking any permission Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['users:read', 'products:delete'];

      // Act
      const result = AuthorizationService.checkAnyPermission(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: user with none of required permissions When: checking any permission Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['products:delete', 'reports:read'];

      // Act
      const result = AuthorizationService.checkAnyPermission(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('No required permissions found');
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: empty required permissions When: checking any permission Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions: string[] = [];

      // Act
      const result = AuthorizationService.checkAnyPermission(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('No required permissions found');
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });
  });

  describe('checkAllPermissions', () => {
    it('Given: user with all required permissions When: checking all permissions Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const requiredPermissions = ['users:read', 'users:write'];

      // Act
      const result = AuthorizationService.checkAllPermissions(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: user with some required permissions When: checking all permissions Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions = ['users:read', 'users:write', 'products:delete'];

      // Act
      const result = AuthorizationService.checkAllPermissions(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('Missing permissions: products:delete');
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: empty required permissions When: checking all permissions Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const requiredPermissions: string[] = [];

      // Act
      const result = AuthorizationService.checkAllPermissions(
        mockUser,
        userPermissions,
        requiredPermissions
      );

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(requiredPermissions);
      expect(result.userPermissions).toEqual(userPermissions);
    });
  });

  describe('checkModuleAccess', () => {
    it('Given: user with module permissions When: checking module access Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const module = 'users';

      // Act
      const result = AuthorizationService.checkModuleAccess(mockUser, userPermissions, module);

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(['users:*']);
      expect(result.userPermissions).toEqual(['users:read', 'users:write']);
    });

    it('Given: user without module permissions When: checking module access Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const module = 'products';

      // Act
      const result = AuthorizationService.checkModuleAccess(mockUser, userPermissions, module);

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('No access to module: products');
      expect(result.requiredPermissions).toEqual(['products:*']);
      expect(result.userPermissions).toEqual([]);
    });

    it('Given: empty user permissions When: checking module access Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions: string[] = [];
      const module = 'users';

      // Act
      const result = AuthorizationService.checkModuleAccess(mockUser, userPermissions, module);

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('No access to module: users');
      expect(result.requiredPermissions).toEqual(['users:*']);
      expect(result.userPermissions).toEqual([]);
    });
  });

  describe('checkActionPermission', () => {
    it('Given: user with action permission When: checking action permission Then: should return authorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write', 'products:read'];
      const module = 'users';
      const action = 'read';

      // Act
      const result = AuthorizationService.checkActionPermission(
        mockUser,
        userPermissions,
        module,
        action
      );

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(['users:read']);
      expect(result.userPermissions).toEqual(userPermissions);
    });

    it('Given: user without action permission When: checking action permission Then: should return unauthorized result', () => {
      // Arrange
      const userPermissions = ['users:read', 'users:write'];
      const module = 'users';
      const action = 'delete';

      // Act
      const result = AuthorizationService.checkActionPermission(
        mockUser,
        userPermissions,
        module,
        action
      );

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('Cannot perform delete on users');
      expect(result.requiredPermissions).toEqual(['users:delete']);
      expect(result.userPermissions).toEqual(userPermissions);
    });
  });

  describe('checkRole', () => {
    it('Given: user with required role When: checking role Then: should return authorized result', () => {
      // Arrange
      const userRoles = ['USER', 'ADMIN', 'MODERATOR'];
      const requiredRole = 'ADMIN';

      // Act
      const result = AuthorizationService.checkRole(mockUser, userRoles, requiredRole);

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(['ROLE:ADMIN']);
      expect(result.userPermissions).toEqual(userRoles);
    });

    it('Given: user without required role When: checking role Then: should return unauthorized result', () => {
      // Arrange
      const userRoles = ['USER', 'MODERATOR'];
      const requiredRole = 'ADMIN';

      // Act
      const result = AuthorizationService.checkRole(mockUser, userRoles, requiredRole);

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('Required role not found: ADMIN');
      expect(result.requiredPermissions).toEqual(['ROLE:ADMIN']);
      expect(result.userPermissions).toEqual(userRoles);
    });
  });

  describe('checkAnyRole', () => {
    it('Given: user with one of required roles When: checking any role Then: should return authorized result', () => {
      // Arrange
      const userRoles = ['USER', 'MODERATOR'];
      const requiredRoles = ['ADMIN', 'MODERATOR'];

      // Act
      const result = AuthorizationService.checkAnyRole(mockUser, userRoles, requiredRoles);

      // Assert
      expect(result.isAuthorized).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.requiredPermissions).toEqual(['ROLE:ADMIN', 'ROLE:MODERATOR']);
      expect(result.userPermissions).toEqual(userRoles);
    });

    it('Given: user with none of required roles When: checking any role Then: should return unauthorized result', () => {
      // Arrange
      const userRoles = ['USER', 'MODERATOR'];
      const requiredRoles = ['ADMIN', 'SUPER_ADMIN'];

      // Act
      const result = AuthorizationService.checkAnyRole(mockUser, userRoles, requiredRoles);

      // Assert
      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('No required roles found');
      expect(result.requiredPermissions).toEqual(['ROLE:ADMIN', 'ROLE:SUPER_ADMIN']);
      expect(result.userPermissions).toEqual(userRoles);
    });
  });

  describe('isAdmin', () => {
    it('Given: user with ADMIN role When: checking if admin Then: should return true', () => {
      // Arrange
      const userRoles = ['USER', 'ADMIN', 'MODERATOR'];

      // Act
      const result = AuthorizationService.isAdmin(mockUser, userRoles);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without ADMIN role When: checking if admin Then: should return false', () => {
      // Arrange
      const userRoles = ['USER', 'MODERATOR'];

      // Act
      const result = AuthorizationService.isAdmin(mockUser, userRoles);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isSuperUser', () => {
    it('Given: user with SUPER_USER role When: checking if super user Then: should return true', () => {
      // Arrange
      const userRoles = ['USER', 'SUPER_USER'];

      // Act
      const result = AuthorizationService.isSuperUser(mockUser, userRoles);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with ADMIN role When: checking if super user Then: should return true', () => {
      // Arrange
      const userRoles = ['USER', 'ADMIN'];

      // Act
      const result = AuthorizationService.isSuperUser(mockUser, userRoles);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user without SUPER_USER or ADMIN role When: checking if super user Then: should return false', () => {
      // Arrange
      const userRoles = ['USER', 'MODERATOR'];

      // Act
      const result = AuthorizationService.isSuperUser(mockUser, userRoles);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissionsFromRoles', () => {
    it('Given: user roles and role permissions When: getting user permissions Then: should return unique permissions', () => {
      // Arrange
      const userRoles = [
        Role.create({ name: 'ADMIN', description: 'Administrator', isActive: true }, 'org-1'),
        Role.create({ name: 'USER', description: 'Regular User', isActive: true }, 'org-1'),
      ];
      const rolePermissions = [
        Permission.create({ name: 'users:read', module: 'users', action: 'read' }, 'org-1'),
        Permission.create({ name: 'users:write', module: 'users', action: 'write' }, 'org-1'),
        Permission.create({ name: 'products:read', module: 'products', action: 'read' }, 'org-1'),
      ];

      // Act
      const result = AuthorizationService.getUserPermissionsFromRoles(userRoles, rolePermissions);

      // Assert
      expect(result).toEqual(['users:read', 'users:write', 'products:read']);
    });

    it('Given: empty user roles When: getting user permissions Then: should return empty array', () => {
      // Arrange
      const userRoles: Role[] = [];
      const rolePermissions = [
        Permission.create({ name: 'users:read', module: 'users', action: 'read' }, 'org-1'),
        Permission.create({ name: 'users:write', module: 'users', action: 'write' }, 'org-1'),
      ];

      // Act
      const result = AuthorizationService.getUserPermissionsFromRoles(userRoles, rolePermissions);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('validatePermissionHierarchy', () => {
    it('Given: user with admin permission When: validating permission hierarchy Then: should return true', () => {
      // Arrange
      const userPermissions = ['USERS:ADMIN', 'PRODUCTS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = AuthorizationService.validatePermissionHierarchy(
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with specific permission When: validating permission hierarchy Then: should return true', () => {
      // Arrange
      const userPermissions = ['USERS:CREATE', 'USERS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = AuthorizationService.validatePermissionHierarchy(
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result).toBe(true);
    });

    it('Given: user with admin permission for different module When: validating permission hierarchy Then: should return false', () => {
      // Arrange
      const userPermissions = ['PRODUCTS:ADMIN', 'USERS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = AuthorizationService.validatePermissionHierarchy(
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result).toBe(false);
    });

    it('Given: user without required permission When: validating permission hierarchy Then: should return false', () => {
      // Arrange
      const userPermissions = ['PRODUCTS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = AuthorizationService.validatePermissionHierarchy(
        userPermissions,
        requiredPermission
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
