import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para requerir permisos específicos en un endpoint
 * @param permissions Array de permisos requeridos (ej: ['PRODUCTS:CREATE', 'PRODUCTS:UPDATE'])
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorador para requerir al menos uno de los permisos especificados
 * @param permissions Array de permisos alternativos
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { type: 'ANY', permissions });

/**
 * Decorador para requerir todos los permisos especificados
 * @param permissions Array de permisos requeridos
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { type: 'ALL', permissions });

/**
 * Decorador para requerir un rol específico
 * @param roles Array de roles requeridos
 */
export const RequireRoles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * Decorador para requerir que el usuario pertenezca a la organización
 */
export const RequireOrganization = () => SetMetadata('requireOrganization', true);

/**
 * Decorador para requerir que el usuario tenga acceso a la bodega específica
 */
export const RequireWarehouseAccess = () => SetMetadata('requireWarehouseAccess', true);
