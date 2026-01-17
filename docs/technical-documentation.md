# Documentación Técnica - Sistema de Inventarios Multi-Tenant

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Módulos del Sistema](#módulos-del-sistema)
   - [Módulo Inventory](#módulo-inventory)
   - [Módulo Authentication](#módulo-authentication)
   - [Módulo Sales](#módulo-sales)
   - [Módulo Returns](#módulo-returns)
   - [Módulo Organization](#módulo-organization)
   - [Módulo Shared](#módulo-shared)
   - [Módulo Infrastructure](#módulo-infrastructure)
   - [Módulo Interfaces](#módulo-interfaces)
   - [Módulo Application](#módulo-application)
   - [Módulo Report](#módulo-report)
   - [Módulo Import](#módulo-import)
4. [Guía para Desarrolladores](#guía-para-desarrolladores)
5. [Consideraciones de Actualización Futura](#consideraciones-de-actualización-futura)

---

## Introducción

Este documento proporciona documentación técnica completa de todos los módulos del sistema de inventarios multi-tenant. Cada sección incluye:

- **Propósito y responsabilidades**: Qué hace el módulo y por qué existe
- **Ejemplos de uso**: Cómo usar el módulo en la práctica
- **Diagramas relevantes**: Visualización de la arquitectura y flujos
- **Documentación para desarrolladores**: Guías para trabajar con el módulo
- **Consideraciones de actualización futura**: Qué considerar al extender el módulo

---

## Arquitectura General

El sistema sigue una **Arquitectura Hexagonal + DDD + Screaming Architecture** con **Programación Funcional**.

### Principios Arquitectónicos

1. **Screaming Architecture**: La estructura "grita" el dominio del negocio
2. **Domain-Driven Design (DDD)**: Bounded contexts, aggregates, value objects
3. **Hexagonal Architecture**: Separación entre dominio, aplicación, infraestructura e interfaces
4. **Result Monad**: Manejo explícito de errores sin excepciones
5. **Multi-Tenancy**: Aislamiento completo de datos por organización

### Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    Interfaces Layer                          │
│  (HTTP Controllers, DTOs, Mappers)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Application Layer                          │
│  (Use Cases, Event Handlers)                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Domain Layer                              │
│  (Entities, Value Objects, Domain Services, Ports)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                Infrastructure Layer                          │
│  (Repositories, External Services, Database)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Módulos del Sistema

---

## Módulo Inventory

### Propósito y Responsabilidades

El módulo **Inventory** es el **dominio principal** del sistema (Screaming Architecture). Es responsable de:

- **Gestión de Productos**: Creación, actualización y consulta de productos con SKU único
- **Gestión de Bodegas**: Administración de bodegas y ubicaciones internas
- **Movimientos de Inventario**: Registro de entradas, salidas y ajustes con validación de stock
- **Transferencias**: Transferencias entre bodegas con estados y trazabilidad
- **Control de Stock**: Cálculo de disponibilidad, valorización (PPM) y alertas
- **Reglas de Negocio**: Validación de stock negativo, auditoría obligatoria, alertas de stock

### Estructura del Módulo

```
inventory/
├── products/          # Gestión de productos
│   ├── domain/       # Entities, Value Objects, Ports
│   ├── dto/          # DTOs para HTTP
│   └── mappers/      # DTO ↔ Domain mappers
├── warehouses/       # Gestión de bodegas
│   ├── domain/
│   ├── dto/
│   └── mappers/
├── movements/        # Movimientos de inventario
│   ├── domain/
│   ├── dto/
│   └── mappers/
├── transfers/        # Transferencias entre bodegas
│   ├── domain/
│   ├── dto/
│   └── mappers/
└── stock/            # Control de stock
    └── domain/
        ├── services/ # Servicios de dominio (cálculos, validaciones)
        └── ports/    # Interfaces de repositorio
```

### Submódulos

#### 1. Products (Productos)

**Responsabilidades**:

- Gestión del catálogo de productos
- Validación de SKU único por organización
- Gestión de unidades de medida
- Estados de producto (ACTIVE, INACTIVE, DISCONTINUED)
- Métodos de costo (AVG, FIFO)

**Entidades Principales**:

- `Product`: Aggregate root con SKU, nombre, descripción, unidad, etc.
- Value Objects: `SKU`, `ProductName`, `ProductStatus`, `CostMethod`, `Unit`

**Ejemplo de Uso**:

```typescript
// Crear producto
const productProps = ProductMapper.toDomainProps({
  sku: 'PROD-001',
  name: 'Laptop Dell XPS',
  unit: { code: 'UNIT', name: 'Unit', precision: 0 },
  status: 'ACTIVE',
  costMethod: 'AVG',
});

const product = Product.create(productProps, orgId);
const result = await createProductUseCase.execute({ ...productProps, orgId });

// Consultar productos
const products = await getProductsUseCase.execute({
  orgId,
  page: 1,
  limit: 20,
  filters: { status: 'ACTIVE' },
});
```

**Eventos de Dominio**:

- `ProductCreated`: Disparado al crear un producto
- `ProductUpdated`: Disparado al actualizar un producto

#### 2. Warehouses (Bodegas)

**Responsabilidades**:

- Gestión de bodegas por organización
- Gestión de ubicaciones dentro de bodegas
- Validación de capacidad y restricciones

**Entidades Principales**:

- `Warehouse`: Aggregate root con nombre, código, direcciones, etc.
- `Location`: Ubicación dentro de una bodega

**Ejemplo de Uso**:

```typescript
// Crear bodega
const warehouse = await createWarehouseUseCase.execute({
  name: 'Bodega Principal',
  code: 'WH-001',
  address: 'Calle 123',
  orgId,
});

// Agregar ubicación
warehouse.addLocation({
  code: 'LOC-001',
  name: 'Estantería A',
  type: 'SHELF',
});
```

**Eventos de Dominio**:

- `WarehouseCreated`: Disparado al crear una bodega
- `LocationAdded`: Disparado al agregar una ubicación

#### 3. Movements (Movimientos)

**Responsabilidades**:

- Registro de entradas (INPUT), salidas (OUTPUT) y ajustes (ADJUSTMENT)
- Validación de stock disponible para salidas
- Cálculo de costos mediante Promedio Ponderado Móvil (PPM)
- Estados: DRAFT, POSTED, VOIDED

**Entidades Principales**:

- `Movement`: Aggregate root con tipo, estado, bodega, líneas
- `MovementLine`: Línea de movimiento con producto, cantidad, costo

**Ejemplo de Uso**:

```typescript
// Crear movimiento de entrada
const movement = await createMovementUseCase.execute({
  type: 'INPUT',
  warehouseId: 'wh-123',
  reference: 'PO-001',
  reason: 'Purchase Order',
  lines: [
    {
      productId: 'prod-123',
      locationId: 'loc-123',
      quantity: 100,
      unitCost: 50.0,
      currency: 'COP',
    },
  ],
  orgId,
});

// Publicar movimiento (afecta stock)
const result = await postMovementUseCase.execute({
  movementId: movement.id,
  orgId,
});
```

**Reglas de Negocio**:

- **No Negative Stock**: No se pueden hacer salidas que dejen stock negativo
- **Mandatory Audit**: Movimientos críticos requieren auditoría
- **Cost Calculation**: Cálculo automático de costos promedio

**Eventos de Dominio**:

- `MovementPosted`: Disparado al publicar un movimiento
- `MovementVoided`: Disparado al anular un movimiento

#### 4. Transfers (Transferencias)

**Responsabilidades**:

- Transferencias entre bodegas
- Estados: DRAFT, IN_TRANSIT, RECEIVED, REJECTED
- Trazabilidad completa del proceso

**Entidades Principales**:

- `Transfer`: Aggregate root con bodega origen, destino, líneas

**Ejemplo de Uso**:

```typescript
// Iniciar transferencia
const transfer = await initiateTransferUseCase.execute({
  fromWarehouseId: 'wh-001',
  toWarehouseId: 'wh-002',
  lines: [
    {
      productId: 'prod-123',
      quantity: 50,
      locationId: 'loc-001',
    },
  ],
  orgId,
});

// Recibir transferencia
await receiveTransferUseCase.execute({
  transferId: transfer.id,
  orgId,
});
```

**Eventos de Dominio**:

- `TransferInitiated`: Disparado al iniciar transferencia
- `TransferReceived`: Disparado al recibir transferencia
- `TransferRejected`: Disparado al rechazar transferencia

#### 5. Stock (Control de Stock)

**Responsabilidades**:

- Cálculo de disponibilidad de stock
- Valorización mediante Promedio Ponderado Móvil (PPM)
- Validación de reglas de negocio
- Alertas de stock bajo/máximo

**Servicios de Dominio**:

- `InventoryCalculationService`: Cálculos de costos promedio y balances
- `NoNegativeStockRule`: Validación de stock negativo
- `AlertService`: Generación de alertas de stock
- `MandatoryAuditRule`: Validación de auditoría obligatoria

**Ejemplo de Uso**:

```typescript
// Calcular costo promedio
const newAverageCost = calculateAverageCost(
  currentQuantity,
  currentAverageCost,
  newQuantity,
  newUnitCost
);

// Validar stock disponible
const validation = NoNegativeStockRule.validate({
  currentStock: 100,
  requestedQuantity: 150,
  productId: 'prod-123',
});

if (!validation.isValid) {
  return err(new BusinessRuleError(validation.errors.join(', ')));
}
```

### Diagrama de Flujo - Creación y Publicación de Movimiento

```
┌─────────────┐
│  Controller │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ CreateMovement  │
│   Use Case      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│   Movement      │─────▶│  Repository  │
│   (DRAFT)       │      │   (Save)     │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ PostMovement    │
│   Use Case      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Validate Stock  │─────▶│ StockService │
│   (No Negative) │      │  (Check)     │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Calculate Cost  │─────▶│  PPM Service │
│   (PPM)         │      │  (Calculate) │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Update Stock    │─────▶│  Repository  │
│   (POSTED)      │      │   (Update)   │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ Dispatch Event  │
│ MovementPosted  │
└─────────────────┘
```

### Casos de Uso Principales

| Caso de Uso               | Descripción                        | Resultado                                       |
| ------------------------- | ---------------------------------- | ----------------------------------------------- |
| `CreateProductUseCase`    | Crear nuevo producto               | `Result<Product, DomainError>`                  |
| `GetProductsUseCase`      | Listar productos con filtros       | `Result<PaginatedResult<Product>, DomainError>` |
| `CreateMovementUseCase`   | Crear movimiento (DRAFT)           | `Result<Movement, DomainError>`                 |
| `PostMovementUseCase`     | Publicar movimiento (afecta stock) | `Result<Movement, DomainError>`                 |
| `InitiateTransferUseCase` | Iniciar transferencia              | `Result<Transfer, DomainError>`                 |
| `CreateWarehouseUseCase`  | Crear bodega                       | `Result<Warehouse, DomainError>`                |

### Documentación para Desarrolladores

#### Crear un Nuevo Tipo de Movimiento

1. **Agregar al enum `MovementType`**:

```typescript
// src/inventory/movements/domain/valueObjects/movementType.valueObject.ts
export enum MovementTypeEnum {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  ADJUSTMENT = 'ADJUSTMENT',
  NEW_TYPE = 'NEW_TYPE', // Nuevo tipo
}
```

2. **Actualizar reglas de negocio** si es necesario:

```typescript
// src/inventory/stock/domain/services/noNegativeStockRule.service.ts
// Agregar validaciones específicas para el nuevo tipo
```

3. **Actualizar tests**:

```typescript
// test/inventory/movements/...
// Agregar casos de prueba para el nuevo tipo
```

#### Agregar Nueva Validación de Stock

1. **Crear servicio de dominio**:

```typescript
// src/inventory/stock/domain/services/newValidationRule.service.ts
export class NewValidationRule {
  public static validate(context: IValidationContext): IValidationResult {
    // Lógica de validación
  }
}
```

2. **Usar en use case**:

```typescript
// src/application/movementUseCases/postMovementUseCase.ts
const validation = NewValidationRule.validate(context);
if (!validation.isValid) {
  return err(new BusinessRuleError(validation.errors.join(', ')));
}
```

### Consideraciones de Actualización Futura

1. **Métodos de Costo Adicionales**: Actualmente soporta AVG y FIFO. Para agregar LIFO:
   - Extender `CostMethod` value object
   - Implementar cálculo en `InventoryCalculationService`
   - Actualizar tests

2. **Múltiples Unidades de Medida**: Actualmente un producto tiene una unidad. Para soportar múltiples:
   - Crear entidad `ProductUnit` con conversiones
   - Actualizar `MovementLine` para especificar unidad
   - Implementar conversiones automáticas

3. **Lotes y Series**: Para rastreo por lotes/series:
   - Crear entidad `Batch` o `Serial`
   - Actualizar `MovementLine` para incluir lotes
   - Implementar validaciones de expiración

4. **Reservas de Stock**: Para reservar stock para órdenes:
   - Crear entidad `StockReservation`
   - Actualizar cálculo de disponibilidad
   - Implementar expiración de reservas

5. **Optimización de Consultas**: Para mejorar rendimiento:
   - Implementar índices en Prisma schema
   - Agregar caché para consultas frecuentes
   - Considerar read models para reportes

---

## Módulo Authentication

### Propósito y Responsabilidades

El módulo **Authentication** es responsable de:

- **Autenticación de Usuarios**: Login, logout, refresh tokens, OTP
- **Autorización**: Sistema RBAC (Role-Based Access Control) con permisos granulares
- **Gestión de Usuarios**: CRUD de usuarios, asignación de roles
- **Gestión de Roles**: Creación y gestión de roles personalizados
- **Seguridad**: Rate limiting, blacklist de tokens, validación de sesiones
- **Auditoría**: Registro de todas las operaciones de seguridad

### Estructura del Módulo

```
authentication/
├── domain/
│   ├── entities/        # User, Role, Session, OTP
│   ├── valueObjects/    # Email, Password, etc.
│   ├── services/        # AuthenticationService, JwtService, etc.
│   └── ports/           # Repository interfaces
├── security/
│   ├── guards/          # JwtAuthGuard, PermissionsGuard, RoleBasedAuthGuard
│   ├── strategies/      # JwtStrategy
│   └── decorators/      # @Roles(), @Permissions()
├── config/             # Configuración de autenticación
└── dto/                # DTOs para HTTP
```

### Componentes Principales

#### 1. Autenticación

**Servicios**:

- `AuthenticationService`: Validación de credenciales, hash de passwords
- `JwtService`: Generación y validación de tokens JWT
- `TokenBlacklistService`: Gestión de tokens revocados
- `RateLimitService`: Control de intentos de login
- `OtpCleanupService`: Limpieza de OTPs expirados

**Ejemplo de Uso**:

```typescript
// Login
const result = await loginUseCase.execute({
  email: 'user@example.com',
  password: 'password123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Refresh token
const refreshResult = await refreshTokenUseCase.execute({
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  orgId,
});
```

#### 2. Autorización (RBAC)

**Roles Predefinidos**:

- `ADMIN`: Acceso completo
- `SUPERVISOR`: Supervisión y reportes
- `WAREHOUSE_OPERATOR`: Operaciones de bodega
- `CONSULTANT`: Solo lectura
- `IMPORT_OPERATOR`: Importación de datos

**Permisos Granulares**:

- `products:create`, `products:read`, `products:update`, `products:delete`
- `movements:create`, `movements:post`, `movements:void`
- `users:manage`, `roles:manage`
- Y muchos más...

**Ejemplo de Uso**:

```typescript
// Crear rol personalizado
const role = await createRoleUseCase.execute({
  name: 'Sales Manager',
  description: 'Manages sales operations',
  permissions: [
    'sales:create',
    'sales:read',
    'sales:update',
    'products:read'
  ],
  orgId
});

// Asignar rol a usuario
await assignRoleToUserUseCase.execute({
  userId: 'user-123',
  roleId: role.id,
  orgId
});

// Usar en controller
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('products:create')
@Post('products')
async createProduct(@Body() dto: CreateProductDto) {
  // ...
}
```

#### 3. Gestión de Usuarios

**Entidades**:

- `User`: Aggregate root con email, nombre, estado, roles
- `Role`: Aggregate root con nombre, permisos
- `Session`: Sesión activa del usuario
- `OTP`: Código OTP para reset de password

**Ejemplo de Uso**:

```typescript
// Crear usuario
const user = await createUserUseCase.execute({
  email: 'newuser@example.com',
  name: 'John Doe',
  password: 'securePassword123',
  orgId,
});

// Cambiar estado
await changeUserStatusUseCase.execute({
  userId: user.id,
  status: 'INACTIVE',
  orgId,
});
```

### Diagrama de Flujo - Autenticación y Autorización

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /auth/login
       ▼
┌─────────────────┐
│  AuthController │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  LoginUseCase   │─────▶│  UserRepo    │
│                 │      │  (Find)      │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ Validate Creds  │
│  (bcrypt)       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Generate JWT   │─────▶│  JwtService  │
│                 │      │  (Sign)      │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Create Session │─────▶│ SessionRepo  │
│                 │      │  (Save)      │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│  Return Tokens  │
└─────────────────┘

┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /products (with JWT)
       ▼
┌─────────────────┐
│  ProductCtrl    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  JwtAuthGuard   │─────▶│  JwtStrategy │
│                 │      │  (Validate)  │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ PermissionsGuard│─────▶│  Check Perms│
│                 │      │  (Validate)  │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│  Execute UseCase│
└─────────────────┘
```

### Casos de Uso Principales

| Caso de Uso                   | Descripción                 | Resultado                            |
| ----------------------------- | --------------------------- | ------------------------------------ |
| `LoginUseCase`                | Autenticación de usuario    | `Result<LoginResponse, DomainError>` |
| `RefreshTokenUseCase`         | Renovar token de acceso     | `Result<TokenResponse, DomainError>` |
| `CreateUserUseCase`           | Crear usuario (admin)       | `Result<User, DomainError>`          |
| `CreateRoleUseCase`           | Crear rol personalizado     | `Result<Role, DomainError>`          |
| `AssignRoleToUserUseCase`     | Asignar rol a usuario       | `Result<void, DomainError>`          |
| `RequestPasswordResetUseCase` | Solicitar reset de password | `Result<void, DomainError>`          |
| `ResetPasswordUseCase`        | Resetear password con OTP   | `Result<void, DomainError>`          |

### Documentación para Desarrolladores

#### Agregar Nuevo Permiso

1. **Definir constante**:

```typescript
// src/shared/constants/permissions.ts
export const PERMISSIONS = {
  // ... existentes
  NEW_FEATURE_CREATE: 'new-feature:create',
  NEW_FEATURE_READ: 'new-feature:read',
} as const;
```

2. **Usar en guard**:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('new-feature:create')
@Post('new-feature')
async create() { /* ... */ }
```

3. **Asignar a roles**:

```typescript
await assignPermissionsToRoleUseCase.execute({
  roleId: 'role-123',
  permissions: ['new-feature:create', 'new-feature:read'],
  orgId,
});
```

#### Implementar Nuevo Método de Autenticación (OAuth, etc.)

1. **Crear estrategia Passport**:

```typescript
// src/authentication/security/strategies/oauthStrategy.ts
@Injectable()
export class OAuthStrategy extends PassportStrategy(Strategy, 'oauth') {
  // Implementar validación
}
```

2. **Registrar en módulo**:

```typescript
// authentication.module.ts
providers: [
  OAuthStrategy,
  // ...
];
```

3. **Crear guard**:

```typescript
// src/authentication/security/guards/oauthAuthGuard.ts
@Injectable()
export class OAuthAuthGuard extends AuthGuard('oauth') {}
```

### Consideraciones de Actualización Futura

1. **OAuth2/SSO**: Para integración con proveedores externos:
   - Implementar estrategias Passport para OAuth2
   - Crear entidad `ExternalIdentity`
   - Manejar vinculación de cuentas

2. **MFA (Multi-Factor Authentication)**: Para mayor seguridad:
   - Agregar campo `mfaEnabled` a `User`
   - Implementar generación de códigos TOTP
   - Actualizar `LoginUseCase` para requerir MFA

3. **Sesiones Concurrentes**: Para limitar sesiones simultáneas:
   - Agregar validación en `JwtAuthGuard`
   - Implementar política de sesiones (última sesión, máximo N sesiones)

4. **Auditoría Mejorada**: Para trazabilidad completa:
   - Agregar más campos a `AuditLog` (IP, user agent, cambios específicos)
   - Implementar retención configurable
   - Agregar exportación de logs

5. **Password Policies**: Para políticas de contraseñas:
   - Crear value object `PasswordPolicy`
   - Validar en `CreateUserUseCase` y `ResetPasswordUseCase`
   - Implementar expiración de contraseñas

---

## Módulo Sales

### Propósito y Responsabilidades

El módulo **Sales** es responsable de:

- **Gestión de Ventas**: Creación y gestión de órdenes de venta
- **Líneas de Venta**: Gestión de productos vendidos con cantidades y precios
- **Integración con Inventory**: Validación de stock disponible
- **Estados de Venta**: DRAFT, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
- **Cálculo de Totales**: Subtotal, impuestos, descuentos, total

### Estructura del Módulo

```
sales/
├── domain/
│   ├── entities/        # Sale, SaleLine
│   ├── valueObjects/    # SaleStatus, Money, etc.
│   └── ports/           # Repository interfaces
├── dto/                 # DTOs para HTTP
└── mappers/             # DTO ↔ Domain mappers
```

### Entidades Principales

#### Sale (Venta)

**Propiedades**:

- `id`: Identificador único
- `status`: Estado (DRAFT, CONFIRMED, etc.)
- `customerId`: Cliente (opcional)
- `warehouseId`: Bodega de origen
- `lines`: Líneas de venta
- `subtotal`: Subtotal sin impuestos
- `tax`: Impuestos
- `discount`: Descuentos
- `total`: Total final

**Ejemplo de Uso**:

```typescript
// Crear venta
const sale = await createSaleUseCase.execute({
  warehouseId: 'wh-123',
  customerId: 'cust-456',
  lines: [
    {
      productId: 'prod-123',
      quantity: 2,
      unitPrice: 100.0,
      currency: 'COP',
    },
  ],
  orgId,
});

// Confirmar venta (valida stock y afecta inventario)
const result = await confirmSaleUseCase.execute({
  saleId: sale.id,
  orgId,
});
```

### Diagrama de Flujo - Creación y Confirmación de Venta

```
┌─────────────┐
│  Controller │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  CreateSale     │
│   Use Case      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│   Sale (DRAFT)  │─────▶│  Repository  │
│                 │      │   (Save)     │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ ConfirmSale     │
│   Use Case      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Validate Stock  │─────▶│ Inventory    │
│   (Available)    │      │  (Check)     │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Create Movement │─────▶│ Inventory    │
│   (OUTPUT)      │      │  (Post)      │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Update Sale     │─────▶│  Repository  │
│   (CONFIRMED)   │      │   (Update)   │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ Dispatch Event  │
│  SaleConfirmed  │
└─────────────────┘
```

### Casos de Uso Principales

| Caso de Uso          | Descripción                    | Resultado                                    |
| -------------------- | ------------------------------ | -------------------------------------------- |
| `CreateSaleUseCase`  | Crear nueva venta (DRAFT)      | `Result<Sale, DomainError>`                  |
| `ConfirmSaleUseCase` | Confirmar venta (afecta stock) | `Result<Sale, DomainError>`                  |
| `GetSalesUseCase`    | Listar ventas con filtros      | `Result<PaginatedResult<Sale>, DomainError>` |
| `GetSaleByIdUseCase` | Obtener venta por ID           | `Result<Sale, DomainError>`                  |
| `CancelSaleUseCase`  | Cancelar venta                 | `Result<Sale, DomainError>`                  |

### Documentación para Desarrolladores

#### Agregar Nuevo Estado de Venta

1. **Actualizar enum**:

```typescript
// src/sales/domain/valueObjects/saleStatus.valueObject.ts
export enum SaleStatusEnum {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  NEW_STATUS = 'NEW_STATUS', // Nuevo estado
}
```

2. **Actualizar transiciones**:

```typescript
// src/sales/domain/entities/sale.entity.ts
public transitionToNewStatus(): void {
  if (!this.canTransitionTo('NEW_STATUS')) {
    throw new BusinessRuleError('Invalid status transition');
  }
  this.props.status = SaleStatus.create('NEW_STATUS');
}
```

### Consideraciones de Actualización Futura

1. **Descuentos y Promociones**: Para aplicar descuentos:
   - Crear entidad `Discount` o `Promotion`
   - Actualizar cálculo de totales
   - Implementar reglas de descuento

2. **Impuestos por Producto**: Para impuestos específicos:
   - Agregar campo `taxRate` a `SaleLine`
   - Actualizar cálculo de impuestos
   - Considerar diferentes tipos de impuesto (IVA, etc.)

3. **Facturación Electrónica**: Para integración con facturación:
   - Crear módulo `Invoicing`
   - Integrar con servicios externos
   - Generar documentos XML/PDF

4. **Reservas de Stock**: Para reservar stock al crear venta:
   - Integrar con módulo Inventory
   - Crear entidad `StockReservation`
   - Implementar expiración de reservas

---

## Módulo Returns

### Propósito y Responsabilidades

El módulo **Returns** es responsable de:

- **Gestión de Devoluciones**: Creación y gestión de órdenes de devolución
- **Relación con Ventas**: Devoluciones asociadas a ventas específicas
- **Integración con Inventory**: Reingreso de productos al inventario
- **Estados de Devolución**: DRAFT, CONFIRMED, RECEIVED, CANCELLED
- **Validación**: Validar que la devolución corresponde a una venta válida

### Estructura del Módulo

```
returns/
├── domain/
│   ├── entities/        # Return, ReturnLine
│   ├── valueObjects/    # ReturnStatus, etc.
│   └── ports/           # Repository interfaces
├── dto/                 # DTOs para HTTP
└── mappers/             # DTO ↔ Domain mappers
```

### Entidades Principales

#### Return (Devolución)

**Propiedades**:

- `id`: Identificador único
- `saleId`: Venta asociada
- `status`: Estado (DRAFT, CONFIRMED, etc.)
- `warehouseId`: Bodega de destino
- `lines`: Líneas de devolución
- `reason`: Razón de la devolución

**Ejemplo de Uso**:

```typescript
// Crear devolución
const returnOrder = await createReturnUseCase.execute({
  saleId: 'sale-123',
  warehouseId: 'wh-123',
  reason: 'Defective product',
  lines: [
    {
      saleLineId: 'sale-line-123',
      quantity: 1,
      reason: 'Defective',
    },
  ],
  orgId,
});

// Confirmar devolución (reingresa al inventario)
const result = await confirmReturnUseCase.execute({
  returnId: returnOrder.id,
  orgId,
});
```

### Diagrama de Flujo - Devolución

```
┌─────────────┐
│  Controller │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  CreateReturn   │─────▶│  Sales Module│
│   Use Case      │      │  (Validate)  │
└──────┬──────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│   Return (DRAFT)│─────▶│  Repository  │
│                 │      │   (Save)     │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│ ConfirmReturn   │
│   Use Case      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Create Movement │─────▶│ Inventory    │
│   (INPUT)       │      │  (Post)      │
└─────────────────┘      └──────────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Update Return   │─────▶│  Repository  │
│   (CONFIRMED)   │      │   (Update)   │
└─────────────────┘      └──────────────┘
```

### Consideraciones de Actualización Futura

1. **Devoluciones Parciales**: Para devolver solo parte de una venta:
   - Validar cantidad máxima devolvable
   - Rastrear cantidades ya devueltas
   - Actualizar estado de líneas de venta

2. **Reembolsos**: Para procesar reembolsos:
   - Integrar con sistema de pagos
   - Crear entidad `Refund`
   - Implementar diferentes métodos de reembolso

3. **Inspección de Devoluciones**: Para inspeccionar productos devueltos:
   - Agregar estado `INSPECTION`
   - Crear entidad `Inspection`
   - Determinar destino (reingreso, descarte, reparación)

---

## Módulo Organization

### Propósito y Responsabilidades

El módulo **Organization** es responsable de:

- **Multi-Tenancy**: Gestión de organizaciones (tenants)
- **Aislamiento de Datos**: Garantizar que cada organización solo accede a sus datos
- **Configuración**: Configuraciones por organización (timezone, moneda, etc.)
- **Branding**: Personalización de marca (futuro)

### Estructura del Módulo

```
organization/
├── domain/
│   ├── entities/        # Organization
│   └── ports/           # Repository interfaces
├── dto/                 # DTOs para HTTP
└── organization.controller.ts
```

### Entidades Principales

#### Organization (Organización)

**Propiedades**:

- `id`: Identificador único
- `name`: Nombre de la organización
- `slug`: Slug único para URLs
- `domain`: Dominio personalizado (opcional)
- `isActive`: Estado activo/inactivo
- `settings`: Configuraciones (timezone, moneda, etc.)

**Ejemplo de Uso**:

```typescript
// Crear organización
const organization = await createOrganizationUseCase.execute({
  name: 'Acme Corp',
  slug: 'acme-corp',
  domain: 'acme.example.com',
});

// Resolver organización desde header
const orgId = await organizationService.resolveOrgId(headers['X-Organization-Slug']);
```

### Multi-Tenancy

**Estrategia de Aislamiento**:

- Todos los datos (excepto `Organization`) tienen `orgId`
- Todos los queries filtran por `orgId`
- Middleware extrae `orgId` de headers (`X-Organization-ID` o `X-Organization-Slug`)

**Ejemplo de Implementación**:

```typescript
// Middleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const orgId = req.headers['x-organization-id'] as string;
    const orgSlug = req.headers['x-organization-slug'] as string;

    if (orgSlug) {
      const org = await this.orgRepo.findBySlug(orgSlug);
      req['orgId'] = org.id;
    } else if (orgId) {
      req['orgId'] = orgId;
    }

    next();
  }
}

// Decorator para extraer orgId
export const OrgId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request['orgId'];
});
```

### Consideraciones de Actualización Futura

1. **Branding por Organización**: Para personalización visual:
   - Crear entidad `OrganizationBranding`
   - Almacenar logos, colores, fuentes
   - Implementar API para servir assets

2. **Configuraciones Avanzadas**: Para más opciones:
   - Crear entidad `OrganizationSettings`
   - Implementar schema de configuración
   - Agregar validación de configuraciones

3. **Sub-organizaciones**: Para jerarquías:
   - Agregar campo `parentOrgId` a `Organization`
   - Implementar herencia de configuraciones
   - Actualizar aislamiento de datos

---

## Módulo Shared

### Propósito y Responsabilidades

El módulo **Shared** contiene utilidades y componentes compartidos entre todos los módulos:

- **Result Monad**: Manejo funcional de errores
- **Domain Events**: Sistema de eventos de dominio
- **Base Classes**: `AggregateRoot`, `ValueObject`, `Entity`
- **Guards y Decorators**: Utilidades de seguridad
- **Filters y Interceptors**: Manejo de errores y transformaciones
- **Cache Service**: Servicio de caché funcional
- **Ports Compartidos**: Interfaces de repositorio base

### Estructura del Módulo

```
shared/
├── domain/
│   ├── base/            # AggregateRoot, Entity, ValueObject
│   ├── result/          # Result monad, DomainError
│   └── events/          # DomainEvent, EventBus, EventDispatcher
├── ports/               # Interfaces compartidas
│   ├── repositories/    # IRepository, IReadRepository, IWriteRepository
│   └── externalServices/# Interfaces de servicios externos
├── guards/              # Guards compartidos
├── decorators/          # Decorators personalizados
├── filters/             # Exception filters
├── interceptors/        # Interceptors
├── middleware/          # Middleware compartido
└── infrastructure/
    └── cache/           # Cache service
```

### Componentes Principales

#### 1. Result Monad

**Propósito**: Manejo explícito de errores sin excepciones.

**Ejemplo de Uso**:

```typescript
import { ok, err, Result } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

// Crear resultado exitoso
const success = ok({ id: '123', name: 'Product' });

// Crear resultado con error
const failure = err(new ValidationError('Invalid input'));

// Usar en use case
async execute(request: IRequest): Promise<Result<IResponse, DomainError>> {
  if (!request.field) {
    return err(new ValidationError('Field is required'));
  }

  const entity = await this.repository.save(entity);
  return ok({ success: true, data: entity });
}

// Usar en controller
const result = await useCase.execute(request);
return resultToHttpResponse(result); // Convierte Result a HTTP
```

#### 2. Domain Events

**Propósito**: Comunicación asíncrona entre bounded contexts.

**Ejemplo de Uso**:

```typescript
// Disparar evento
product.markEventsForDispatch();
await eventDispatcher.dispatchEvents(product.domainEvents);
product.clearEvents();

// Escuchar evento
@Injectable()
export class ProductCreatedEventHandler {
  async handle(event: ProductCreatedEvent) {
    // Procesar evento
  }
}

// Registrar handler
eventBus.registerHandler('ProductCreated', handler);
```

#### 3. Aggregate Root Base

**Propósito**: Clase base para todas las entidades agregadas.

**Ejemplo de Uso**:

```typescript
export class Product extends AggregateRoot<IProductProps> {
  private constructor(props: IProductProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IProductProps, orgId: string): Product {
    const product = new Product(props, undefined, orgId);
    product.addDomainEvent(new ProductCreatedEvent(product.id, orgId));
    return product;
  }
}
```

### Consideraciones de Actualización Futura

1. **Event Sourcing**: Para auditoría completa:
   - Implementar event store
   - Agregar proyecciones (read models)
   - Implementar replay de eventos

2. **CQRS**: Para separar lectura y escritura:
   - Crear read models separados
   - Implementar comandos y queries
   - Sincronizar mediante eventos

---

## Módulo Infrastructure

### Propósito y Responsabilidades

El módulo **Infrastructure** contiene adaptadores de salida (output adapters):

- **Database**: Repositorios Prisma, migraciones
- **External Services**: Email, notificaciones, etc.
- **Jobs**: Tareas programadas (validación de stock, limpieza)
- **Cache**: Implementación de caché (Redis)

### Estructura del Módulo

```
infrastructure/
├── database/
│   ├── repositories/    # Implementaciones Prisma
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── externalServices/
│   ├── emailService.ts
│   └── notificationService.ts
├── jobs/
│   └── stockValidationJob.ts
└── cache/
    └── functionalCacheService.ts
```

### Componentes Principales

#### 1. Database (Prisma)

**Repositorios**: Implementaciones de interfaces de dominio usando Prisma.

**Ejemplo**:

```typescript
@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(product: Product): Promise<Product> {
    const data = this.toPrisma(product);
    const saved = await this.prisma.product.upsert({
      where: { id: product.id },
      create: data,
      update: data,
    });
    return this.toDomain(saved);
  }

  async findBySku(sku: string, orgId: string): Promise<Product | null> {
    const found = await this.prisma.product.findFirst({
      where: { sku, orgId, deletedAt: null },
    });
    return found ? this.toDomain(found) : null;
  }
}
```

#### 2. External Services

**EmailService**: Envío de emails (OTP, notificaciones).

**NotificationService**: Notificaciones (alertas de stock, etc.).

### Consideraciones de Actualización Futura

1. **Múltiples Bases de Datos**: Para soportar diferentes DBs:
   - Crear abstracción de repositorio
   - Implementar adaptadores para cada DB
   - Usar factory pattern

2. **Message Queue**: Para procesamiento asíncrono:
   - Integrar RabbitMQ/Kafka
   - Implementar publishers/subscribers
   - Manejar retry y dead letter queue

---

## Módulo Interfaces

### Propósito y Responsabilidades

El módulo **Interfaces** contiene adaptadores de entrada (input adapters):

- **HTTP Controllers**: Endpoints REST
- **DTOs**: Data Transfer Objects con validación
- **Mappers**: Conversión DTO ↔ Domain
- **Guards**: Protección de endpoints
- **Filters**: Manejo de excepciones HTTP

### Estructura del Módulo

```
interfaces/
└── http/
    ├── routes/           # Controllers de autenticación
    ├── inventory/       # Controllers de inventario
    ├── sales/           # Controllers de ventas
    ├── returns/         # Controllers de devoluciones
    ├── audit/           # Controllers de auditoría
    └── healthCheck/     # Health check
```

### Ejemplo de Controller

```typescript
@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductsUseCase: GetProductsUseCase
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('products:create')
  @ApiOperation({ summary: 'Create new product' })
  async create(
    @Body() dto: CreateProductDto,
    @OrgId() orgId: string
  ): Promise<CreateProductResponseDto> {
    const props = ProductMapper.toDomainProps(dto);
    const result = await this.createProductUseCase.execute({
      ...props,
      orgId,
    });
    return resultToHttpResponse(result);
  }
}
```

### Consideraciones de Actualización Futura

1. **GraphQL**: Para API más flexible:
   - Implementar resolvers GraphQL
   - Crear schema
   - Integrar con use cases

2. **WebSockets**: Para actualizaciones en tiempo real:
   - Implementar gateway de WebSocket
   - Emitir eventos de dominio
   - Sincronizar estado

---

## Módulo Application

### Propósito y Responsabilidades

El módulo **Application** contiene los casos de uso (use cases):

- **Orquestación**: Coordina el dominio y la infraestructura
- **Validación**: Valida reglas de negocio
- **Eventos**: Dispara eventos de dominio
- **Result Monad**: Retorna `Result<T, DomainError>`

### Estructura del Módulo

```
application/
├── productUseCases/
│   ├── createProductUseCase.ts
│   ├── getProductsUseCase.ts
│   └── ...
├── movementUseCases/
│   ├── createMovementUseCase.ts
│   ├── postMovementUseCase.ts
│   └── ...
├── authUseCases/
│   ├── loginUseCase.ts
│   └── ...
└── eventHandlers/
    ├── productCreatedEventHandler.ts
    └── ...
```

### Patrón de Use Case

```typescript
@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: ICreateProductRequest
  ): Promise<Result<ICreateProductResponse, DomainError>> {
    this.logger.log('Creating product', { sku: request.sku });

    // Validación
    if (await this.productRepository.existsBySku(request.sku, request.orgId)) {
      return err(new ConflictError('Product with SKU already exists'));
    }

    // Crear entidad
    const productProps = ProductMapper.toDomainProps(request);
    const product = Product.create(productProps, request.orgId);

    // Guardar
    const savedProduct = await this.productRepository.save(product);

    // Disparar eventos
    savedProduct.markEventsForDispatch();
    await this.eventDispatcher.dispatchEvents(savedProduct.domainEvents);
    savedProduct.clearEvents();

    // Retornar resultado
    return ok({
      success: true,
      message: 'Product created successfully',
      data: ProductMapper.toResponseData(savedProduct),
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Consideraciones de Actualización Futura

1. **Saga Pattern**: Para transacciones distribuidas:
   - Implementar orquestación de sagas
   - Manejar compensaciones
   - Persistir estado de saga

2. **Command/Query Separation**: Para CQRS:
   - Separar comandos y queries
   - Optimizar queries con read models
   - Implementar proyecciones

---

## Módulo Report

### Propósito y Responsabilidades

El módulo **Report** es responsable de:

- **Generación de Reportes**: Reportes de inventario, ventas, etc.
- **Exportación**: PDF, Excel, CSV
- **Templates**: Plantillas de reportes personalizables
- **Suscripción a Eventos**: Escucha eventos de dominio para actualizar reportes

### Consideraciones de Actualización Futura

1. **Reportes en Tiempo Real**: Para dashboards:
   - Implementar WebSockets
   - Actualizar reportes automáticamente
   - Cachear resultados

2. **Reportes Programados**: Para envío automático:
   - Implementar jobs programados
   - Enviar por email
   - Almacenar historial

---

## Módulo Import

### Propósito y Responsabilidades

El módulo **Import** es responsable de:

- **Importación Masiva**: Carga de productos desde Excel/CSV
- **Validación**: Validación de datos antes de importar
- **Procesamiento Asíncrono**: Procesar importaciones grandes en background
- **Reporte de Errores**: Reportar filas con errores

### Consideraciones de Actualización Futura

1. **Importación Incremental**: Para actualizaciones:
   - Detectar cambios
   - Actualizar solo lo modificado
   - Mantener historial

2. **Múltiples Formatos**: Para más opciones:
   - Soporte para JSON, XML
   - Validación de schemas
   - Transformación de datos

---

## Guía para Desarrolladores

### Flujo de Trabajo Típico

1. **Crear Entidad de Dominio**:
   - Extender `AggregateRoot<TProps>`
   - Implementar métodos `create()` y `reconstitute()`
   - Agregar Value Objects necesarios

2. **Crear Ports (Interfaces)**:
   - Definir `I{Entity}Repository` en `domain/ports/repositories/`
   - Extender `IReadRepository` y `IWriteRepository`

3. **Crear Mapper**:
   - Implementar `toDomainProps()` (DTO → Domain)
   - Implementar `toResponseData()` (Domain → Response)

4. **Implementar Repositorio**:
   - Implementar interface en `infrastructure/database/repositories/`
   - Usar Prisma para persistencia

5. **Crear Use Case**:
   - Inyectar repositorio y `DomainEventDispatcher`
   - Usar mapper para conversiones
   - Retornar `Result<T, DomainError>`

6. **Crear Controller**:
   - Inyectar use case
   - Usar guards y decorators
   - Usar `resultToHttpResponse()` para convertir Result

7. **Registrar en Módulo**:
   - Agregar providers
   - Exportar use cases y repositorios

8. **Escribir Tests**:
   - Tests unitarios para use cases
   - Tests de integración para repositorios
   - Tests E2E para endpoints

### Convenciones Importantes

1. **Nunca usar `any`**: Usar tipos específicos o `unknown`
2. **Siempre usar path aliases**: `@inventory/products/...`
3. **Siempre retornar Result**: Nunca lanzar excepciones en use cases
4. **Siempre usar mappers**: Nunca crear Value Objects en controllers
5. **Siempre filtrar por orgId**: En todos los queries de repositorio

### Checklist para Nuevas Features

- [ ] Entidad de dominio creada (extiende `AggregateRoot`)
- [ ] Value Objects creados
- [ ] Ports (interfaces) definidos
- [ ] Mapper implementado
- [ ] Repositorio implementado
- [ ] Use case creado (retorna `Result`)
- [ ] Controller creado (usa guards)
- [ ] DTOs con validación
- [ ] Tests escritos
- [ ] Documentación Swagger
- [ ] Registrado en módulo

---

## Consideraciones de Actualización Futura

### Arquitectura

1. **Microservicios**: Si el sistema crece:
   - Separar bounded contexts en servicios independientes
   - Implementar comunicación mediante eventos
   - Considerar API Gateway

2. **Event Sourcing + CQRS**: Para auditoría completa:
   - Implementar event store
   - Crear read models separados
   - Implementar proyecciones

3. **GraphQL**: Para API más flexible:
   - Implementar resolvers
   - Crear schema
   - Optimizar queries (DataLoader)

### Performance

1. **Caché Distribuido**: Para mejor rendimiento:
   - Implementar Redis cluster
   - Cachear consultas frecuentes
   - Invalidar caché en eventos

2. **Read Replicas**: Para escalar lectura:
   - Configurar réplicas de PostgreSQL
   - Usar réplicas para queries de solo lectura
   - Balancear carga

3. **Índices Optimizados**: Para consultas rápidas:
   - Analizar queries lentas
   - Agregar índices compuestos
   - Considerar índices parciales

### Seguridad

1. **OAuth2/SSO**: Para integración externa:
   - Implementar proveedores OAuth2
   - Soporte para SAML
   - Vinculación de cuentas

2. **MFA**: Para mayor seguridad:
   - Implementar TOTP
   - Soporte para SMS/Email
   - Backup codes

3. **Auditoría Mejorada**: Para compliance:
   - Retención configurable
   - Exportación de logs
   - Análisis de patrones

### Funcionalidad

1. **Múltiples Unidades de Medida**: Para flexibilidad:
   - Conversiones automáticas
   - Unidades base y derivadas
   - Validación de conversiones

2. **Lotes y Series**: Para rastreo:
   - Gestión de lotes
   - Números de serie
   - Expiración y recall

3. **Reservas de Stock**: Para órdenes:
   - Reservar stock al crear orden
   - Expiración automática
   - Liberación automática

---

## Conclusión

Esta documentación proporciona una guía completa para entender y trabajar con todos los módulos del sistema. Para más detalles sobre patrones específicos, consulta:

- `docs/result-monad-guide.md`: Guía completa del Result monad
- `docs/bounded-context-map.md`: Mapa de bounded contexts
- `docs/testing-structure.md`: Estructura de tests
- `.cursorrules`: Reglas y convenciones del proyecto

---

**Última actualización**: 2024
**Versión del documento**: 1.0




