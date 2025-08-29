# Setup de Seguridad Base - Sistema de Inventarios

## Resumen

Este documento describe la implementación del setup de seguridad base para el sistema de inventarios, siguiendo las mejores prácticas de seguridad y la arquitectura hexagonal con DDD.

## Arquitectura de Configuración

### Configuración Centralizada

El sistema utiliza una **configuración centralizada** en `src/authentication/config/auth.config.ts` que evita duplicaciones y mantiene todas las configuraciones de seguridad en un solo lugar.

**Archivo principal**: `src/authentication/config/auth.config.ts`

```typescript
export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    saltRounds: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
  rateLimit: {
    ip: { maxRequests: number; windowMs: number; blockDurationMs: number };
    user: { maxRequests: number; windowMs: number; blockDurationMs: number };
    login: { maxRequests: number; windowMs: number; blockDurationMs: number };
    refreshToken: { maxRequests: number; windowMs: number; blockDurationMs: number };
  };
  security: {
    maxFailedLoginAttempts: number;
    lockoutDurationMinutes: number;
    sessionTimeoutMinutes: number;
    requireMfa: boolean;
  };
}
```

### Configuraciones Especializadas

Las configuraciones especializadas en `src/shared/config/` utilizan la configuración centralizada:

- `rateLimit.config.ts` - Configuración de rate limiting basada en auth.config.ts
- `logging.config.ts` - Configuración de logging basada en auth.config.ts
- `security.config.ts` - Configuración de seguridad consolidada
- `validation.config.ts` - Configuración de validación (independiente)

## Componentes Implementados

### 1. Passport JWT Strategy

**Archivo**: `src/authentication/security/strategies/jwtStrategy.ts`

- Implementa la estrategia JWT de Passport
- Valida tokens JWT y verifica blacklist
- Extrae y valida el payload del token
- Logging detallado de operaciones de autenticación
- **Usa configuración centralizada** de `auth.config.ts`

**Uso**:

```typescript
// La estrategia se aplica automáticamente en el módulo de autenticación
// No requiere configuración adicional
```

### 2. Guards de Autorización por Roles

**Archivos**:

- `src/authentication/security/guards/roleBasedAuthGuard.ts` - Guard principal para autorización por roles
- `src/authentication/security/guards/permissionsGuard.ts` - Guard para verificación de permisos
- `src/authentication/security/guards/jwtAuthGuard.ts` - Guard para autenticación JWT

**Características**:

- Verificación de roles con opción de requerir todos o al menos uno
- Verificación de acceso a organizaciones
- Soporte para super administradores
- Logging detallado de decisiones de autorización

**Uso**:

```typescript
import { RequireRoles, RequireAllRoles, SuperAdminOnly } from '@auth/security/decorators';

@Controller('products')
export class ProductsController {
  @Get()
  @UseGuards(RoleBasedAuthGuard)
  @RequireRoles(['WAREHOUSE_MANAGER', 'WAREHOUSE_OPERATOR'])
  async getProducts() {
    // Solo usuarios con roles WAREHOUSE_MANAGER o WAREHOUSE_OPERATOR
  }

  @Post()
  @UseGuards(RoleBasedAuthGuard)
  @RequireAllRoles(['WAREHOUSE_MANAGER', 'PRODUCTS_CREATE'])
  async createProduct() {
    // Requiere ambos roles
  }

  @Delete(':id')
  @UseGuards(RoleBasedAuthGuard)
  @SuperAdminOnly()
  async deleteProduct() {
    // Solo super administradores
  }
}
```

### 3. Interceptores para Logging de Autenticación

**Archivos**:

- `src/authentication/security/interceptors/authenticationLoggingInterceptor.ts` - Logging de autenticación
- `src/authentication/security/interceptors/authorizationLoggingInterceptor.ts` - Logging de autorización
- `src/authentication/security/interceptors/rateLimitInterceptor.ts` - Logging de rate limiting

**Características**:

- Logging detallado de operaciones de autenticación y autorización
- Configuración de niveles de logging
- Protección de datos sensibles
- Métricas de rendimiento
- **Usa configuración centralizada** para rate limiting

**Uso**:

```typescript
// Los interceptores se aplican automáticamente en el módulo de autenticación
// Configuración disponible en auth.config.ts y logging.config.ts
```

### 4. Setup de Validación con class-validator

**Archivo**: `src/shared/config/validation.config.ts`

**Características**:

- Validación automática de DTOs
- Transformación de tipos
- Whitelist de propiedades para seguridad
- Configuración por entorno

**Uso**:

```typescript
import { IsString, IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}
```

### 5. Middleware de Seguridad

**Archivo**: `src/shared/middleware/securityMiddleware.ts`

**Características**:

- Headers de seguridad automáticos
- Prevención de ataques comunes
- Logging de headers aplicados
- Generación de IDs de request

## Configuración

### Variables de Entorno

```bash
# JWT (configurado en auth.config.ts)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
BCRYPT_SALT_ROUNDS=12

# Redis (configurado en auth.config.ts)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# Rate Limiting (configurado en auth.config.ts)
RATE_LIMIT_IP_MAX=100
RATE_LIMIT_IP_WINDOW_MS=60000
RATE_LIMIT_IP_BLOCK_DURATION_MS=300000
RATE_LIMIT_USER_MAX=1000
RATE_LIMIT_USER_WINDOW_MS=3600000
RATE_LIMIT_USER_BLOCK_DURATION_MS=900000
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_MS=900000
RATE_LIMIT_LOGIN_BLOCK_DURATION_MS=1800000
RATE_LIMIT_REFRESH_MAX=10
RATE_LIMIT_REFRESH_WINDOW_MS=60000
RATE_LIMIT_REFRESH_BLOCK_DURATION_MS=600000

# Security (configurado en auth.config.ts)
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
SESSION_TIMEOUT_MINUTES=480
REQUIRE_MFA=false

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging
NODE_ENV=development
```

### Configuración por Entorno

El sistema detecta automáticamente el entorno y aplica la configuración correspondiente:

- **Development**: Logging detallado, validación estricta
- **Production**: Logging mínimo, validación estricta, headers de seguridad
- **Test**: Logging mínimo, validación básica

## Constantes de Seguridad

**Archivo**: `src/shared/constants/security.constants.ts`

Define roles y permisos del sistema:

```typescript
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  // ... más roles
};

export const SYSTEM_PERMISSIONS = {
  USERS_CREATE: 'USERS:CREATE',
  PRODUCTS_IMPORT: 'PRODUCTS:IMPORT',
  // ... más permisos
};
```

## Uso en Controladores

### Ejemplo Completo

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RoleBasedAuthGuard } from '@auth/security/guards';
import { RequireRoles, RequirePermissions } from '@auth/security/decorators';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
export class InventoryController {
  @Get()
  @RequireRoles(['WAREHOUSE_MANAGER', 'INVENTORY_AUDITOR'])
  async getInventory() {
    // Endpoint protegido por roles
  }

  @Post('import')
  @RequireRoles(['WAREHOUSE_MANAGER'])
  @RequirePermissions(['PRODUCTS_IMPORT'])
  async importProducts() {
    // Endpoint que requiere rol y permiso específico
  }
}
```

## Monitoreo y Auditoría

### Logs de Seguridad

El sistema genera logs detallados para:

- Intentos de autenticación (exitosos y fallidos)
- Decisiones de autorización
- Violaciones de rate limiting
- Aplicación de headers de seguridad
- Errores de validación

### Métricas Disponibles

- Tiempo de respuesta de autenticación
- Tasa de éxito/fallo de autorización
- Uso de rate limiting por IP/usuario
- Headers de seguridad aplicados

## Ventajas de la Configuración Consolidada

1. **Sin Duplicación**: Una sola fuente de verdad para configuraciones
2. **Fácil Mantenimiento**: Cambios en un solo lugar
3. **Consistencia**: Todas las configuraciones siguen el mismo patrón
4. **Flexibilidad**: Configuración por entorno y variables de entorno
5. **Type Safety**: Interfaces TypeScript para todas las configuraciones

## Próximos Pasos

1. **Implementar tests unitarios** para todos los servicios de autenticación
2. **Configurar alertas** para eventos de seguridad críticos
3. **Implementar auditoría** de cambios en roles y permisos
4. **Configurar monitoreo** de intentos de acceso no autorizado
5. **Implementar rotación automática** de claves JWT

## Consideraciones de Seguridad

- **Nunca logear datos sensibles** como contraseñas o tokens
- **Validar siempre** la entrada del usuario
- **Aplicar principio de menor privilegio** en roles y permisos
- **Monitorear logs** de seguridad regularmente
- **Actualizar dependencias** de seguridad regularmente
- **Revisar configuración** de rate limiting según el uso real

## Soporte

Para dudas o problemas con la implementación de seguridad, revisar:

1. Logs del sistema
2. Documentación de NestJS
3. Mejores prácticas de OWASP
4. Guías de seguridad de la organización
