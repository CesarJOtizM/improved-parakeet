import { SetMetadata } from '@nestjs/common';

export const ROLE_BASED_AUTH_KEY = 'roleBasedAuthOptions';

export interface RoleBasedAuthMetadata {
  requiredRoles: string[];
  requireAllRoles?: boolean;
  checkOrganization?: boolean;
  allowSuperAdmin?: boolean;
}

/**
 * Decorador para requerir roles específicos
 * @param roles Array de roles requeridos
 * @param options Opciones adicionales de configuración
 */
export const RequireRoles = (
  roles: string[],
  options: Omit<RoleBasedAuthMetadata, 'requiredRoles'> = {}
) => SetMetadata(ROLE_BASED_AUTH_KEY, { requiredRoles: roles, ...options });

/**
 * Decorador para requerir todos los roles especificados
 * @param roles Array de roles requeridos (todos deben estar presentes)
 */
export const RequireAllRoles = (roles: string[]) =>
  SetMetadata(ROLE_BASED_AUTH_KEY, { requiredRoles: roles, requireAllRoles: true });

/**
 * Decorador para requerir al menos uno de los roles especificados
 * @param roles Array de roles alternativos
 */
export const RequireAnyRole = (roles: string[]) =>
  SetMetadata(ROLE_BASED_AUTH_KEY, { requiredRoles: roles, requireAllRoles: false });

/**
 * Decorador para requerir acceso a la organización
 */
export const RequireOrganizationAccess = () =>
  SetMetadata(ROLE_BASED_AUTH_KEY, { checkOrganization: true });

/**
 * Decorador para permitir acceso a super administradores
 */
export const AllowSuperAdmin = () => SetMetadata(ROLE_BASED_AUTH_KEY, { allowSuperAdmin: true });

/**
 * Decorador para restringir acceso solo a super administradores
 */
export const SuperAdminOnly = () =>
  SetMetadata(ROLE_BASED_AUTH_KEY, {
    requiredRoles: ['SUPER_ADMIN'],
    requireAllRoles: true,
    allowSuperAdmin: false,
  });
