import { SetMetadata } from '@nestjs/common';

export const ROLE_BASED_AUTH_KEY = 'roleBasedAuthOptions';

export interface IRoleBasedAuthMetadata {
  requiredRoles: string[];
  requireAllRoles?: boolean;
  checkOrganization?: boolean;
  allowSuperAdmin?: boolean; // Permitir acceso a super administradores (sin orgId)
  allowOrganizationAdmin?: boolean; // Permitir acceso a administradores de organización (con orgId)
}

/**
 * Decorador para requerir roles específicos
 * @param roles Array de roles requeridos
 * @param options Opciones adicionales de configuración
 */
export const RequireRoles = (
  roles: string[],
  options: Omit<IRoleBasedAuthMetadata, 'requiredRoles'> = {}
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
 * Decorador para permitir acceso a super administradores (rol de sistema, sin orgId)
 */
export const AllowSuperAdmin = () => SetMetadata(ROLE_BASED_AUTH_KEY, { allowSuperAdmin: true });

/**
 * Decorador para permitir acceso a administradores de organización (rol de organización, con orgId)
 * El rol ADMIN tiene acceso total dentro de su organización
 */
export const AllowOrganizationAdmin = () =>
  SetMetadata(ROLE_BASED_AUTH_KEY, { allowOrganizationAdmin: true });

/**
 * Decorador para restringir acceso solo a super administradores
 */
export const SuperAdminOnly = () =>
  SetMetadata(ROLE_BASED_AUTH_KEY, {
    requiredRoles: ['SYSTEM_ADMIN'],
    requireAllRoles: true,
    allowSuperAdmin: false,
  });

/**
 * Decorador para restringir acceso solo a administradores de organización
 */
export const OrganizationAdminOnly = () =>
  SetMetadata(ROLE_BASED_AUTH_KEY, {
    requiredRoles: ['ADMIN'],
    requireAllRoles: true,
    allowOrganizationAdmin: false,
  });
