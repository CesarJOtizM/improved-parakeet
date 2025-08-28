import { Permission } from '@auth/domain/entities/permission.entity';
import { Role } from '@auth/domain/entities/role.entity';
import { User } from '@auth/domain/entities/user.entity';

export interface AuthorizationResult {
  isAuthorized: boolean;
  reason?: string;
  requiredPermissions: string[];
  userPermissions: string[];
}

export interface PermissionCheck {
  module: string;
  action: string;
}

export class AuthorizationService {
  /**
   * Verifica si un usuario tiene un permiso específico
   */
  public static checkPermission(
    user: User,
    userPermissions: string[],
    requiredPermission: string
  ): AuthorizationResult {
    const hasPermission = userPermissions.includes(requiredPermission);

    return {
      isAuthorized: hasPermission,
      reason: hasPermission ? undefined : 'Insufficient permissions',
      requiredPermissions: [requiredPermission],
      userPermissions,
    };
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos requeridos
   */
  public static checkAnyPermission(
    user: User,
    userPermissions: string[],
    requiredPermissions: string[]
  ): AuthorizationResult {
    const hasAnyPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );

    return {
      isAuthorized: hasAnyPermission,
      reason: hasAnyPermission ? undefined : 'No required permissions found',
      requiredPermissions,
      userPermissions,
    };
  }

  /**
   * Verifica si un usuario tiene todos los permisos requeridos
   */
  public static checkAllPermissions(
    user: User,
    userPermissions: string[],
    requiredPermissions: string[]
  ): AuthorizationResult {
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );

    return {
      isAuthorized: hasAllPermissions,
      reason: hasAllPermissions
        ? undefined
        : `Missing permissions: ${missingPermissions.join(', ')}`,
      requiredPermissions,
      userPermissions,
    };
  }

  /**
   * Verifica si un usuario tiene acceso a un módulo específico
   */
  public static checkModuleAccess(
    user: User,
    userPermissions: string[],
    module: string
  ): AuthorizationResult {
    const modulePermissions = userPermissions.filter(permission =>
      permission.startsWith(`${module}:`)
    );

    const hasModuleAccess = modulePermissions.length > 0;

    return {
      isAuthorized: hasModuleAccess,
      reason: hasModuleAccess ? undefined : `No access to module: ${module}`,
      requiredPermissions: [`${module}:*`],
      userPermissions: modulePermissions,
    };
  }

  /**
   * Verifica si un usuario puede realizar una acción específica en un módulo
   */
  public static checkActionPermission(
    user: User,
    userPermissions: string[],
    module: string,
    action: string
  ): AuthorizationResult {
    const requiredPermission = `${module}:${action}`;
    const hasPermission = userPermissions.includes(requiredPermission);

    return {
      isAuthorized: hasPermission,
      reason: hasPermission ? undefined : `Cannot perform ${action} on ${module}`,
      requiredPermissions: [requiredPermission],
      userPermissions,
    };
  }

  /**
   * Verifica si un usuario tiene un rol específico
   */
  public static checkRole(
    user: User,
    userRoles: string[],
    requiredRole: string
  ): AuthorizationResult {
    const hasRole = userRoles.includes(requiredRole);

    return {
      isAuthorized: hasRole,
      reason: hasRole ? undefined : `Required role not found: ${requiredRole}`,
      requiredPermissions: [`ROLE:${requiredRole}`],
      userPermissions: userRoles,
    };
  }

  /**
   * Verifica si un usuario tiene al menos uno de los roles requeridos
   */
  public static checkAnyRole(
    user: User,
    userRoles: string[],
    requiredRoles: string[]
  ): AuthorizationResult {
    const hasAnyRole = requiredRoles.some(role => userRoles.includes(role));

    return {
      isAuthorized: hasAnyRole,
      reason: hasAnyRole ? undefined : 'No required roles found',
      requiredPermissions: requiredRoles.map(role => `ROLE:${role}`),
      userPermissions: userRoles,
    };
  }

  /**
   * Verifica si un usuario es administrador
   */
  public static isAdmin(user: User, userRoles: string[]): boolean {
    return userRoles.includes('ADMIN');
  }

  /**
   * Verifica si un usuario es superusuario
   */
  public static isSuperUser(user: User, userRoles: string[]): boolean {
    return userRoles.includes('SUPER_USER') || userRoles.includes('ADMIN');
  }

  /**
   * Obtiene los permisos de un usuario basados en sus roles
   */
  public static getUserPermissionsFromRoles(
    userRoles: Role[],
    rolePermissions: Permission[]
  ): string[] {
    const permissions = new Set<string>();

    userRoles.forEach(role => {
      if (role.isActive()) {
        rolePermissions.forEach(permission => {
          permissions.add(permission.getFullPermission());
        });
      }
    });

    return Array.from(permissions);
  }

  /**
   * Valida la jerarquía de permisos
   */
  public static validatePermissionHierarchy(
    userPermissions: string[],
    requiredPermission: string
  ): boolean {
    // Implementar lógica de jerarquía de permisos si es necesario
    // Por ejemplo, si tienes USERS:ADMIN, automáticamente tienes USERS:READ
    const permissionHierarchy: Record<string, string[]> = {
      'USERS:ADMIN': ['USERS:CREATE', 'USERS:READ', 'USERS:UPDATE', 'USERS:DELETE'],
      'PRODUCTS:ADMIN': ['PRODUCTS:CREATE', 'PRODUCTS:READ', 'PRODUCTS:UPDATE', 'PRODUCTS:DELETE'],
      'INVENTORY:ADMIN': ['INVENTORY:VIEW', 'INVENTORY:MANAGE', 'INVENTORY:REPORTS'],
    };

    const impliedPermissions = permissionHierarchy[requiredPermission] || [];

    return (
      userPermissions.includes(requiredPermission) ||
      impliedPermissions.some(permission => userPermissions.includes(permission))
    );
  }
}
