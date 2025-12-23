import { Role } from '@auth/domain/entities/role.entity';
import { User } from '@auth/domain/entities/user.entity';
import { RoleName } from '@auth/domain/valueObjects/roleName.valueObject';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';

export interface IRoleAssignmentValidationResult {
  isValid: boolean;
  errors: string[];
  canAssign: boolean;
}

export interface IPermissionCheckResult {
  hasPermission: boolean;
  effectivePermissions: string[];
  missingPermissions: string[];
}

export class RoleAssignmentService {
  /**
   * Validates if a role can be assigned to a user
   */
  public static canAssignRole(
    user: User,
    role: Role,
    currentUserId: string,
    currentUserRoles: string[]
  ): IRoleAssignmentValidationResult {
    const errors: string[] = [];

    // Cannot assign role to yourself
    if (user.id === currentUserId) {
      errors.push('Cannot assign role to yourself');
    }

    // Check if user already has this role
    const userRoles = user.roles || [];
    if (userRoles.includes(role.name)) {
      errors.push('User already has this role');
    }

    // Validate role is active
    if (!role.isActive) {
      errors.push('Cannot assign inactive role');
    }

    // Check if current user has permission to assign this role
    // Only ADMIN or SYSTEM_ADMIN can assign roles
    const canAssign =
      currentUserRoles.includes('ADMIN') || currentUserRoles.includes('SYSTEM_ADMIN');
    if (!canAssign) {
      errors.push('Insufficient permissions to assign roles');
    }

    // SYSTEM_ADMIN role can only be assigned by SYSTEM_ADMIN
    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN && !currentUserRoles.includes('SYSTEM_ADMIN')) {
      errors.push('Only SYSTEM_ADMIN can assign SYSTEM_ADMIN role');
    }

    // Cannot assign SYSTEM_ADMIN to organization users (must be system-level)
    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN && user.orgId) {
      errors.push('Cannot assign SYSTEM_ADMIN role to organization users');
    }

    // Validate system vs custom role assignment
    if (role.isSystem) {
      // System roles can be assigned to any organization user
      if (!user.orgId) {
        errors.push('System roles can only be assigned to organization users');
      }
    } else {
      // Custom roles can only be assigned within their organization
      if (role.orgId && user.orgId && role.orgId !== user.orgId) {
        errors.push('Custom roles can only be assigned to users in the same organization');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      canAssign: errors.length === 0 && canAssign,
    };
  }

  /**
   * Validates if a role can be removed from a user
   */
  public static canRemoveRole(
    user: User,
    role: Role,
    currentUserId: string,
    currentUserRoles: string[]
  ): IRoleAssignmentValidationResult {
    const errors: string[] = [];

    // Cannot remove role from yourself
    if (user.id === currentUserId) {
      errors.push('Cannot remove role from yourself');
    }

    // Check if user has this role
    const userRoles = user.roles || [];
    if (!userRoles.includes(role.name)) {
      errors.push('User does not have this role');
    }

    // Check if current user has permission to remove roles
    // Only ADMIN or SYSTEM_ADMIN can remove roles
    const canRemove =
      currentUserRoles.includes('ADMIN') || currentUserRoles.includes('SYSTEM_ADMIN');
    if (!canRemove) {
      errors.push('Insufficient permissions to remove roles');
    }

    // SYSTEM_ADMIN role can only be removed by SYSTEM_ADMIN
    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN && !currentUserRoles.includes('SYSTEM_ADMIN')) {
      errors.push('Only SYSTEM_ADMIN can remove SYSTEM_ADMIN role');
    }

    // Cannot remove last role from user (user must have at least one role)
    if (userRoles.length === 1 && userRoles[0] === role.name) {
      errors.push('Cannot remove last role from user. User must have at least one role');
    }

    return {
      isValid: errors.length === 0,
      errors,
      canAssign: errors.length === 0 && canRemove,
    };
  }

  /**
   * Gets effective permissions for a user based on their roles
   */
  public static getEffectivePermissions(
    userRoles: Role[],
    rolePermissionsMap: Map<string, string[]>
  ): string[] {
    const permissions = new Set<string>();

    // If user has ADMIN role, they get all permissions
    const hasAdminRole = userRoles.some(role => role.name === 'ADMIN');
    if (hasAdminRole) {
      // Return all possible permissions (this should be fetched from system)
      // For now, we'll collect from rolePermissionsMap
      rolePermissionsMap.forEach(perms => {
        perms.forEach(perm => permissions.add(perm));
      });
      return Array.from(permissions);
    }

    // Collect permissions from all roles
    userRoles.forEach(role => {
      if (role.isActive) {
        const rolePerms = rolePermissionsMap.get(role.name) || [];
        rolePerms.forEach(perm => permissions.add(perm));
      }
    });

    return Array.from(permissions);
  }

  /**
   * Checks if user has required permission
   */
  public static checkPermission(
    userPermissions: string[],
    requiredPermission: string
  ): IPermissionCheckResult {
    const hasPermission = userPermissions.includes(requiredPermission);

    return {
      hasPermission,
      effectivePermissions: userPermissions,
      missingPermissions: hasPermission ? [] : [requiredPermission],
    };
  }

  /**
   * Checks if user has any of the required permissions
   */
  public static checkAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[]
  ): IPermissionCheckResult {
    const hasAnyPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
    const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));

    return {
      hasPermission: hasAnyPermission,
      effectivePermissions: userPermissions,
      missingPermissions: hasAnyPermission ? [] : missingPermissions,
    };
  }

  /**
   * Checks if user has all required permissions
   */
  public static checkAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): IPermissionCheckResult {
    const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
    const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));

    return {
      hasPermission: hasAllPermissions,
      effectivePermissions: userPermissions,
      missingPermissions,
    };
  }

  /**
   * Validates role name format
   */
  public static validateRoleName(roleName: string): IRoleAssignmentValidationResult {
    const errors: string[] = [];

    try {
      RoleName.create(roleName);
    } catch (error) {
      errors.push(`Invalid role name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      canAssign: errors.length === 0,
    };
  }

  /**
   * Checks if role assignment violates business rules
   */
  public static validateRoleAssignmentRules(
    user: User,
    role: Role,
    allUserRoles: Role[]
  ): IRoleAssignmentValidationResult {
    const errors: string[] = [];

    // Check role hierarchy rules
    // ADMIN role cannot be assigned if user already has certain roles
    if (role.name === 'ADMIN') {
      const conflictingRoles = allUserRoles.filter(r => r.name === 'SUPERVISOR');
      if (conflictingRoles.length > 0) {
        errors.push('Cannot assign ADMIN role to user with SUPERVISOR role');
      }
    }

    // Check if role is system role and user belongs to organization
    if (role.name === SYSTEM_ROLES.SYSTEM_ADMIN && user.orgId) {
      errors.push('System roles cannot be assigned to organization users');
    }

    // Validate system vs custom role assignment
    if (role.isSystem) {
      // System roles can be assigned to any organization user
      if (!user.orgId) {
        errors.push('System roles can only be assigned to organization users');
      }
    } else {
      // Custom roles can only be assigned within their organization
      if (role.orgId && user.orgId && role.orgId !== user.orgId) {
        errors.push('Custom roles can only be assigned to users in the same organization');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      canAssign: errors.length === 0,
    };
  }

  /**
   * Validates if a role can be deleted
   */
  public static canDeleteRole(role: Role): IRoleAssignmentValidationResult {
    const errors: string[] = [];

    // Cannot delete system roles
    if (role.isSystem) {
      errors.push('Cannot delete system roles');
    }

    return {
      isValid: errors.length === 0,
      errors,
      canAssign: errors.length === 0,
    };
  }
}
