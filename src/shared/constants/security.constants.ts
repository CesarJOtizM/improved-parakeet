// Constantes de roles del sistema
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  WAREHOUSE_OPERATOR: 'WAREHOUSE_OPERATOR',
  INVENTORY_AUDITOR: 'INVENTORY_AUDITOR',
  READ_ONLY_USER: 'READ_ONLY_USER',
} as const;

// Constantes de permisos del sistema
export const SYSTEM_PERMISSIONS = {
  // Gestión de usuarios
  USERS_CREATE: 'USERS:CREATE',
  USERS_READ: 'USERS:READ',
  USERS_UPDATE: 'USERS:UPDATE',
  USERS_DELETE: 'USERS:DELETE',
  USERS_MANAGE_ROLES: 'USERS:MANAGE_ROLES',

  // Gestión de organizaciones
  ORGANIZATIONS_CREATE: 'ORGANIZATIONS:CREATE',
  ORGANIZATIONS_READ: 'ORGANIZATIONS:READ',
  ORGANIZATIONS_UPDATE: 'ORGANIZATIONS:UPDATE',
  ORGANIZATIONS_DELETE: 'ORGANIZATIONS:DELETE',

  // Gestión de bodegas
  WAREHOUSES_CREATE: 'WAREHOUSES:CREATE',
  WAREHOUSES_READ: 'WAREHOUSES:READ',
  WAREHOUSES_UPDATE: 'WAREHOUSES:UPDATE',
  WAREHOUSES_DELETE: 'WAREHOUSES:DELETE',

  // Gestión de productos
  PRODUCTS_CREATE: 'PRODUCTS:CREATE',
  PRODUCTS_READ: 'PRODUCTS:READ',
  PRODUCTS_UPDATE: 'PRODUCTS:UPDATE',
  PRODUCTS_DELETE: 'PRODUCTS:DELETE',
  PRODUCTS_IMPORT: 'PRODUCTS:IMPORT',

  // Gestión de inventario
  INVENTORY_READ: 'INVENTORY:READ',
  INVENTORY_ENTRY: 'INVENTORY:ENTRY',
  INVENTORY_EXIT: 'INVENTORY_EXIT',
  INVENTORY_TRANSFER: 'INVENTORY:TRANSFER',
  INVENTORY_ADJUST: 'INVENTORY:ADJUST',

  // Reportes
  REPORTS_READ: 'REPORTS:READ',
  REPORTS_EXPORT: 'REPORTS:EXPORT',

  // Auditoría
  AUDIT_READ: 'AUDIT:READ',
  AUDIT_EXPORT: 'AUDIT:EXPORT',
} as const;

// Constantes de configuración de seguridad
// Nota: Estas constantes ahora son fallbacks. La configuración principal
// está en auth.config.ts y se puede acceder via ConfigService
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

export const SECURITY_CONFIG = {
  // Headers de seguridad
  SECURITY_HEADERS,

  // CORS
  CORS_MAX_AGE: 86400, // 24 horas

  // Password (estos valores se pueden mover a auth.config.ts si es necesario)
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SPECIAL_CHARS: true,

  // Session (estos valores se pueden mover a auth.config.ts si es necesario)
  SESSION_MAX_ACTIVE_SESSIONS: 5,
  SESSION_INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutos
} as const;

// Tipos derivados de las constantes
export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];
