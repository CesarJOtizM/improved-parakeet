import { JwtAuthGuard, IJwtAuthGuardOptions } from '@auth/security/guards/jwtAuthGuard';
import { IPermissionGuardOptions, PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

// Decorador para configurar autenticación JWT
export const JwtAuth = (options?: IJwtAuthGuardOptions) => {
  return applyDecorators(SetMetadata('jwtAuthOptions', options || {}), UseGuards(JwtAuthGuard));
};

// Decorador para configurar permisos
export const RequirePermissions = (options: IPermissionGuardOptions) => {
  return applyDecorators(SetMetadata('permissionOptions', options), UseGuards(PermissionsGuard));
};

// Decoradores de conveniencia para permisos comunes
export const RequireRole = (role: string) => {
  return RequirePermissions({ roles: [role] });
};

export const RequireRoles = (roles: string[], requireAll: boolean = false) => {
  return RequirePermissions({ roles, requireAll });
};

export const RequirePermission = (permission: string) => {
  return RequirePermissions({ permissions: [permission] });
};

export const RequirePermissionsList = (permissions: string[], requireAll: boolean = false) => {
  return RequirePermissions({ permissions, requireAll });
};

// Decorador para endpoints públicos (sin autenticación)
export const Public = () => {
  return JwtAuth({ requireAuth: false });
};

// Decorador para endpoints que requieren autenticación pero sin verificación de blacklist
export const AuthOnly = () => {
  return JwtAuth({ checkBlacklist: false });
};

// Decorador para endpoints con rate limiting
export const RateLimited = (type: 'IP' | 'USER' = 'IP') => {
  return JwtAuth({ checkRateLimit: true, rateLimitType: type });
};

// Decorador para endpoints que requieren verificación de organización
export const OrgScoped = () => {
  return RequirePermissions({ checkOrganization: true });
};

// Decorador para endpoints que no requieren verificación de organización
export const CrossOrg = () => {
  return RequirePermissions({ checkOrganization: false });
};

// Decoradores para roles específicos del sistema
export const AdminOnly = () => {
  return RequireRole('ADMIN');
};

export const SupervisorOnly = () => {
  return RequireRole('SUPERVISOR');
};

export const OperatorOnly = () => {
  return RequireRole('WAREHOUSE_OPERATOR');
};

export const ConsultantOnly = () => {
  return RequireRole('CONSULTANT');
};

// Decoradores para permisos específicos por módulo
export const CanManageUsers = () => {
  return RequirePermission('USERS:CREATE');
};

export const CanManageProducts = () => {
  return RequirePermission('PRODUCTS:CREATE');
};

export const CanManageWarehouses = () => {
  return RequirePermission('WAREHOUSES:CREATE');
};

export const CanPostMovements = () => {
  return RequirePermission('MOVEMENTS:POST');
};

export const CanVoidMovements = () => {
  return RequirePermission('MOVEMENTS:VOID');
};

export const CanImportData = () => {
  return RequirePermission('IMPORTS:IMPORT');
};

export const CanViewReports = () => {
  return RequirePermission('REPORTS:READ');
};

export const CanManageSettings = () => {
  return RequirePermission('SETTINGS:UPDATE');
};
