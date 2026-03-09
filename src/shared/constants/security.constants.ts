// Constantes de roles del sistema
export const SYSTEM_ROLES = {
  // Rol de sistema (sin orgId) - Para operaciones que trascienden organizaciones
  // Este rol no se crea automáticamente en el seed, se asigna manualmente
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',

  // Roles predefinidos del sistema (isSystem=true, orgId=null)
  // Estos roles se crean automáticamente en el seed y están disponibles para todas las organizaciones
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  WAREHOUSE_OPERATOR: 'WAREHOUSE_OPERATOR',
  CONSULTANT: 'CONSULTANT',
  IMPORT_OPERATOR: 'IMPORT_OPERATOR',
  SALES_PERSON: 'SALES_PERSON',
} as const;

// Constantes de permisos del sistema
export const SYSTEM_PERMISSIONS = {
  // Gestión de usuarios
  USERS_CREATE: 'USERS:CREATE',
  USERS_READ: 'USERS:READ',
  USERS_UPDATE: 'USERS:UPDATE',
  USERS_DELETE: 'USERS:DELETE',
  USERS_MANAGE_ROLES: 'USERS:MANAGE_ROLES',

  // Gestión de roles
  ROLES_CREATE: 'ROLES:CREATE',
  ROLES_READ: 'ROLES:READ',
  ROLES_UPDATE: 'ROLES:UPDATE',
  ROLES_DELETE: 'ROLES:DELETE',

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
  INVENTORY_EXIT: 'INVENTORY:EXIT',
  INVENTORY_TRANSFER: 'INVENTORY:TRANSFER',
  INVENTORY_ADJUST: 'INVENTORY:ADJUST',

  // Gestión de ventas
  SALES_CREATE: 'SALES:CREATE',
  SALES_READ: 'SALES:READ',
  SALES_UPDATE: 'SALES:UPDATE',
  SALES_DELETE: 'SALES:DELETE',
  SALES_CONFIRM: 'SALES:CONFIRM',
  SALES_CANCEL: 'SALES:CANCEL',
  SALES_PICK: 'SALES:PICK',
  SALES_SHIP: 'SALES:SHIP',
  SALES_COMPLETE: 'SALES:COMPLETE',
  SALES_RETURN: 'SALES:RETURN',
  SALES_SWAP: 'SALES:SWAP',

  // Gestión de devoluciones
  RETURNS_CREATE: 'RETURNS:CREATE',
  RETURNS_READ: 'RETURNS:READ',
  RETURNS_UPDATE: 'RETURNS:UPDATE',
  RETURNS_DELETE: 'RETURNS:DELETE',
  RETURNS_CONFIRM: 'RETURNS:CONFIRM',
  RETURNS_CANCEL: 'RETURNS:CANCEL',

  // Reportes
  REPORTS_READ: 'REPORTS:READ',
  REPORTS_READ_SENSITIVE: 'REPORTS:READ_SENSITIVE',
  REPORTS_EXPORT: 'REPORTS:EXPORT',

  // Auditoría
  AUDIT_READ: 'AUDIT:READ',
  AUDIT_EXPORT: 'AUDIT:EXPORT',

  // Gestión de empresas (líneas de negocio)
  COMPANIES_CREATE: 'COMPANIES:CREATE',
  COMPANIES_READ: 'COMPANIES:READ',
  COMPANIES_UPDATE: 'COMPANIES:UPDATE',
  COMPANIES_DELETE: 'COMPANIES:DELETE',

  // Gestión de contactos (clientes/proveedores)
  CONTACTS_CREATE: 'CONTACTS:CREATE',
  CONTACTS_READ: 'CONTACTS:READ',
  CONTACTS_UPDATE: 'CONTACTS:UPDATE',
  CONTACTS_DELETE: 'CONTACTS:DELETE',

  // Configuración
  SETTINGS_MANAGE: 'SETTINGS:MANAGE',

  // Gestión de integraciones (e-commerce)
  INTEGRATIONS_CREATE: 'INTEGRATIONS:CREATE',
  INTEGRATIONS_READ: 'INTEGRATIONS:READ',
  INTEGRATIONS_UPDATE: 'INTEGRATIONS:UPDATE',
  INTEGRATIONS_DELETE: 'INTEGRATIONS:DELETE',
  INTEGRATIONS_SYNC: 'INTEGRATIONS:SYNC',
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
