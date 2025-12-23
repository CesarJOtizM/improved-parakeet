import { Role } from '@auth/domain/entities/role.entity';
import { User } from '@auth/domain/entities/user.entity';
import { RoleAssignmentService } from '@auth/domain/services/roleAssignmentService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { describe, expect, it } from '@jest/globals';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';

describe('RoleAssignmentService', () => {
  const mockOrgId = 'test-org-id';
  const mockCurrentUserId = 'current-user-id';

  const createMockUser = (roles: string[] = []) => {
    const user = User.create(
      {
        email: Email.create('test@example.com'),
        username: 'testuser',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
      },
      mockOrgId
    );
    // Add roles to user props
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).props.roles = roles;
    return user;
  };

  const createMockRole = (name: string, isActive: boolean = true) => {
    return Role.create(
      {
        name,
        description: `Role ${name}`,
        isActive,
      },
      mockOrgId
    );
  };

  describe('canAssignRole', () => {
    it('Given: admin user assigning role to other user When: checking Then: should return valid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canAssignRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.canAssign).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: user trying to assign role to themselves When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canAssignRole(user, role, user.id, currentUserRoles);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('yourself'))).toBe(true);
    });

    it('Given: user already has role When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser(['SUPERVISOR']);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canAssignRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('already has this role'))).toBe(true);
    });

    it('Given: inactive role When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole('SUPERVISOR', false);
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canAssignRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('inactive role'))).toBe(true);
    });

    it('Given: non-admin user When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['SUPERVISOR']; // Not admin

      // Act
      const result = RoleAssignmentService.canAssignRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Insufficient permissions'))).toBe(true);
    });

    it('Given: non-system-admin trying to assign SYSTEM_ADMIN When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole(SYSTEM_ROLES.SYSTEM_ADMIN);
      const currentUserRoles = ['ADMIN']; // Not SYSTEM_ADMIN

      // Act
      const result = RoleAssignmentService.canAssignRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Only SYSTEM_ADMIN'))).toBe(true);
    });
  });

  describe('canRemoveRole', () => {
    it('Given: admin user removing role from other user When: checking Then: should return valid', () => {
      // Arrange
      const user = createMockUser(['SUPERVISOR', 'WAREHOUSE_OPERATOR']); // Multiple roles
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canRemoveRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.canAssign).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: user trying to remove role from themselves When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser(['SUPERVISOR']);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canRemoveRole(user, role, user.id, currentUserRoles);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('yourself'))).toBe(true);
    });

    it('Given: user does not have role When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser([]);
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canRemoveRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('does not have this role'))).toBe(true);
    });

    it('Given: removing last role from user When: checking Then: should return invalid', () => {
      // Arrange
      const user = createMockUser(['SUPERVISOR']); // Only one role
      const role = createMockRole('SUPERVISOR');
      const currentUserRoles = ['ADMIN'];

      // Act
      const result = RoleAssignmentService.canRemoveRole(
        user,
        role,
        mockCurrentUserId,
        currentUserRoles
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('last role'))).toBe(true);
    });
  });

  describe('getEffectivePermissions', () => {
    it('Given: user with admin role When: getting permissions Then: should return all permissions', () => {
      // Arrange
      const roles = [createMockRole('ADMIN')];
      const rolePermissionsMap = new Map<string, string[]>();
      rolePermissionsMap.set('ADMIN', ['USERS:CREATE', 'USERS:READ']);
      rolePermissionsMap.set('SUPERVISOR', ['USERS:READ']);

      // Act
      const permissions = RoleAssignmentService.getEffectivePermissions(roles, rolePermissionsMap);

      // Assert
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('USERS:CREATE');
      expect(permissions).toContain('USERS:READ');
    });

    it('Given: user with multiple roles When: getting permissions Then: should return combined permissions', () => {
      // Arrange
      const roles = [createMockRole('SUPERVISOR'), createMockRole('WAREHOUSE_OPERATOR')];
      const rolePermissionsMap = new Map<string, string[]>();
      rolePermissionsMap.set('SUPERVISOR', ['USERS:READ', 'PRODUCTS:READ']);
      rolePermissionsMap.set('WAREHOUSE_OPERATOR', ['WAREHOUSES:READ']);

      // Act
      const permissions = RoleAssignmentService.getEffectivePermissions(roles, rolePermissionsMap);

      // Assert
      expect(permissions).toContain('USERS:READ');
      expect(permissions).toContain('PRODUCTS:READ');
      expect(permissions).toContain('WAREHOUSES:READ');
    });

    it('Given: inactive role When: getting permissions Then: should not include permissions from inactive role', () => {
      // Arrange
      const roles = [createMockRole('SUPERVISOR', false)];
      const rolePermissionsMap = new Map<string, string[]>();
      rolePermissionsMap.set('SUPERVISOR', ['USERS:READ']);

      // Act
      const permissions = RoleAssignmentService.getEffectivePermissions(roles, rolePermissionsMap);

      // Assert
      expect(permissions).toHaveLength(0);
    });
  });

  describe('checkPermission', () => {
    it('Given: user with required permission When: checking Then: should return true', () => {
      // Arrange
      const userPermissions = ['USERS:CREATE', 'USERS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = RoleAssignmentService.checkPermission(userPermissions, requiredPermission);

      // Assert
      expect(result.hasPermission).toBe(true);
      expect(result.missingPermissions).toHaveLength(0);
    });

    it('Given: user without required permission When: checking Then: should return false', () => {
      // Arrange
      const userPermissions = ['USERS:READ'];
      const requiredPermission = 'USERS:CREATE';

      // Act
      const result = RoleAssignmentService.checkPermission(userPermissions, requiredPermission);

      // Assert
      expect(result.hasPermission).toBe(false);
      expect(result.missingPermissions).toContain('USERS:CREATE');
    });
  });

  describe('validateRoleName', () => {
    it('Given: valid role name When: validating Then: should return valid', () => {
      // Arrange & Act
      const result = RoleAssignmentService.validateRoleName('ADMIN');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid role name When: validating Then: should return invalid', () => {
      // Arrange & Act
      const result = RoleAssignmentService.validateRoleName('invalid-role');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
