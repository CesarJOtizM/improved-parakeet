# Arquitectura del Backend

## Tabla de Contenidos

- [Vision General](#vision-general)
- [Principios Arquitectonicos](#principios-arquitectonicos)
- [Capas de la Arquitectura](#capas-de-la-arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de una Peticion HTTP](#flujo-de-una-peticion-http)
- [Multi-Tenancy](#multi-tenancy)
- [Sistema de Autenticacion](#sistema-de-autenticacion)
- [Sistema de Autorizacion (RBAC)](#sistema-de-autorizacion-rbac)
- [Eventos de Dominio](#eventos-de-dominio)
- [Gestion de Errores](#gestion-de-errores)
- [Infraestructura](#infraestructura)
- [Despliegue](#despliegue)

---

## Vision General

El backend del Nevada Inventory System es una API REST construida con **NestJS 11** que sigue tres paradigmas arquitectonicos:

1. **Domain-Driven Design (DDD)**: El codigo se organiza alrededor de los conceptos del negocio
2. **Clean Architecture**: Las capas internas no dependen de las externas
3. **Hexagonal Architecture (Ports & Adapters)**: El dominio define interfaces; la infraestructura las implementa

### Diagrama de Alto Nivel

```
┌──────────────────────────────────────────────────────────────────┐
│                    INTERFACES (HTTP Layer)                        │
│  Controllers, DTOs, Guards, Interceptors, Decorators             │
├──────────────────────────────────────────────────────────────────┤
│                    APPLICATION (Use Cases)                        │
│  Use Cases, Application Services, Event Handlers                 │
├──────────────────────────────────────────────────────────────────┤
│                      DOMAIN (Core)                               │
│  Entities, Aggregates, Value Objects, Domain Events,             │
│  Domain Services, Repository Ports, Specifications               │
├──────────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE (Adapters)                       │
│  Prisma Repositories, Redis Cache, External Services,            │
│  Email, Notifications, File Parsing                              │
└──────────────────────────────────────────────────────────────────┘
```

**Regla de dependencia**: Las flechas siempre apuntan hacia adentro. Interfaces → Application → Domain ← Infrastructure.

---

## Principios Arquitectonicos

### Screaming Architecture

La estructura de carpetas "grita" el dominio del negocio:

```
src/
├── inventory/        # Se ve que es un sistema de inventario
├── sales/            # Se ve que tiene ventas
├── returns/          # Se ve que tiene devoluciones
├── authentication/   # Se ve que tiene autenticacion
└── organization/     # Se ve que es multi-tenant
```

No es `src/controllers/`, `src/services/`, `src/models/` — es el negocio lo que organiza el codigo.

### Dependency Inversion

El dominio define **puertos** (interfaces). La infraestructura implementa **adaptadores**:

```typescript
// DOMINIO: Define lo que necesita (Puerto)
interface IProductRepository {
  findById(id: string, orgId: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
}

// INFRAESTRUCTURA: Implementa como se hace (Adaptador)
class PrismaProductRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}
  async findById(id, orgId) { return this.prisma.product.findUnique(...); }
  async save(product) { return this.prisma.product.upsert(...); }
}
```

### Single Responsibility

Cada use case tiene **una sola responsabilidad**:

```
src/application/
├── productUseCases/
│   ├── createProductUseCase.ts      # Solo crea productos
│   ├── getProductByIdUseCase.ts     # Solo consulta un producto
│   ├── updateProductUseCase.ts      # Solo actualiza productos
│   └── deleteProductUseCase.ts      # Solo elimina productos
```

---

## Capas de la Arquitectura

### 1. Domain Layer (Nucleo)

La capa mas interna. No depende de nada externo.

| Concepto | Ubicacion | Descripcion |
|----------|-----------|-------------|
| **Entity** | `{module}/domain/entities/` | Objetos con identidad (id + orgId) |
| **Aggregate Root** | `{module}/domain/entities/` | Entidad raiz que controla su grafo |
| **Value Object** | `{module}/domain/valueObjects/` | Objetos inmutables sin identidad |
| **Domain Event** | `{module}/domain/events/` | Eventos que representan algo que paso |
| **Domain Service** | `{module}/domain/services/` | Logica que no pertenece a una entidad |
| **Repository Port** | `{module}/domain/ports/` | Interfaces de acceso a datos |
| **Specification** | `{module}/domain/specifications/` | Reglas de negocio reutilizables |

#### Entity Base

```typescript
// src/shared/domain/base/entity.base.ts
abstract class Entity<T> {
  protected readonly _id: string;       // CUID2
  protected readonly _orgId: string;    // Multi-tenant
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  protected readonly props: T;

  equals(other: Entity<T>): boolean { return this._id === other._id; }
}
```

#### Aggregate Root Base

```typescript
// src/shared/domain/base/aggregateRoot.base.ts
abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  addDomainEvent(event: DomainEvent): void { ... }
  getDomainEvents(): DomainEvent[] { ... }
  clearDomainEvents(): void { ... }
}
```

### 2. Application Layer (Use Cases)

Orquesta la logica de negocio. Recibe DTOs, opera con entidades de dominio, retorna Results.

```typescript
// src/application/productUseCases/createProductUseCase.ts
class CreateProductUseCase {
  constructor(
    private productRepo: IProductRepository,
    private eventDispatcher: IDomainEventDispatcher,
  ) {}

  async execute(dto: CreateProductDto, orgId: string): Promise<Result<Product, DomainError>> {
    // 1. Validar reglas de negocio
    const existingProduct = await this.productRepo.findBySku(dto.sku, orgId);
    if (existingProduct) return err(new ConflictError('SKU already exists'));

    // 2. Crear entidad de dominio
    const product = Product.create({ ...dto, orgId });

    // 3. Persistir
    await this.productRepo.save(product);

    // 4. Publicar eventos de dominio
    await this.eventDispatcher.dispatchAll(product.getDomainEvents());

    // 5. Retornar resultado
    return ok(product);
  }
}
```

**131 use cases** organizados por dominio:

| Dominio | Cantidad | Ejemplos |
|---------|----------|----------|
| Auth | 6 | Login, Logout, Refresh, PasswordReset |
| Users | 6 | Create, Get, GetAll, Update, ChangeStatus, AssignRole |
| Roles | 8 | CRUD + Permissions management |
| Products | 5 | CRUD + status toggle |
| Categories | 4 | CRUD |
| Warehouses | 4 | CRUD |
| Stock | 3 | Get, GetAll, Adjust |
| Movements | 5 | Create, Get, GetAll, Post, Void |
| Transfers | 6 | Create, Get, GetAll, Initiate, Receive, Reject |
| Sales | 8 | CRUD + Confirm, Pick, Ship, Complete, Cancel |
| Returns | 5 | CRUD + Confirm, Cancel |
| Reports | 17 | Uno por tipo de reporte |
| Dashboard | 1 | GetDashboardMetrics |
| Audit | 4 | GetLogs, GetLog, GetUserActivity, GetEntityHistory |
| Import | 2 | Preview, Execute |
| Organization | 2 | Get, Update |

### 3. Infrastructure Layer (Adaptadores de Salida)

Implementa las interfaces definidas en el dominio:

| Adaptador | Ubicacion | Implementa |
|-----------|-----------|------------|
| PrismaProductRepository | `infrastructure/database/repositories/` | IProductRepository |
| PrismaSaleRepository | `infrastructure/database/repositories/` | ISaleRepository |
| EmailService | `infrastructure/externalServices/` | IEmailService |
| NotificationService | `infrastructure/externalServices/` | INotificationService |
| FileParsingService | `infrastructure/externalServices/` | IFileParsingService |
| FunctionalCacheService | `shared/infrastructure/cache/` | ICacheService |

**15+ repositorios Prisma** para todas las entidades principales.

### 4. Interface Layer (Adaptadores de Entrada)

Controllers HTTP con NestJS:

```typescript
// src/interfaces/http/inventory/products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
class ProductsController {
  constructor(
    private createProduct: CreateProductUseCase,
    private getProducts: GetProductsUseCase,
  ) {}

  @Post()
  @RequirePermissions('PRODUCTS:CREATE')
  async create(@Body() dto, @OrgId() orgId) {
    const result = await this.createProduct.execute(dto, orgId);
    return resultToHttp(result);
  }
}
```

**20+ controllers** organizados por dominio.

---

## Estructura del Proyecto

```
src/
├── main.ts                          # Bootstrap: Swagger, CORS, security
├── app.module.ts                    # Root module + middleware config
│
├── authentication/                  # Autenticacion y RBAC
│   ├── authentication.module.ts     # DI central
│   ├── config/                      # auth.config.ts (JWT, BCRYPT)
│   ├── domain/                      # Entities, Services, Ports, Events, VOs
│   ├── security/                    # Guards, Strategies, Decorators
│   └── dto/                         # Auth DTOs
│
├── inventory/                       # Dominio de Inventario
│   ├── inventory.module.ts
│   ├── products/                    # Product domain
│   ├── warehouses/                  # Warehouse domain
│   ├── locations/                   # Location domain (jerarquico)
│   ├── movements/                   # Movement domain (IN/OUT/ADJUSTMENT)
│   ├── transfers/                   # Transfer domain
│   └── stock/                       # Stock domain
│
├── sales/                           # Dominio de Ventas
│   ├── domain/entities/             # Sale (AggregateRoot), SaleLine
│   ├── domain/events/               # SaleCreated, SaleConfirmed, etc.
│   ├── domain/valueObjects/         # SaleNumber, SaleStatus, Money, Quantity
│   └── domain/specifications/       # Query specifications
│
├── returns/                         # Dominio de Devoluciones
│   ├── domain/entities/             # Return (AggregateRoot), ReturnLine
│   └── domain/valueObjects/         # ReturnStatus, ReturnType
│
├── report/                          # Dominio de Reportes
├── organization/                    # Multi-tenancy
├── import/                          # Importaciones masivas
├── healthCheck/                     # Health checks
│
├── application/                     # Casos de Uso (131 archivos)
│   ├── authUseCases/
│   ├── userUseCases/
│   ├── roleUseCases/
│   ├── productUseCases/
│   ├── saleUseCases/
│   ├── returnUseCases/
│   ├── reportUseCases/
│   ├── dashboardUseCases/
│   ├── eventHandlers/               # Event subscribers
│   └── ...
│
├── infrastructure/                  # Adaptadores de Infraestructura
│   ├── database/
│   │   ├── prisma/schema.prisma     # Schema de BD (25+ modelos)
│   │   ├── prisma/migrations/       # Migraciones
│   │   ├── prisma/seeds/            # Seeds de datos
│   │   ├── prisma.service.ts        # Cliente Prisma
│   │   ├── unitOfWork.service.ts    # Transacciones
│   │   └── repositories/            # 15+ repositorios Prisma
│   ├── externalServices/            # Email, Notifications, FileParsing
│   └── jobs/                        # Scheduled jobs (stock alerts)
│
├── interfaces/http/                 # Controllers HTTP
│   ├── routes/                      # Auth, Users, Roles, Settings
│   ├── inventory/                   # Products, Categories, Warehouses, etc.
│   ├── sales/                       # Sales controller
│   ├── returns/                     # Returns controller
│   ├── report/                      # Reports controller
│   ├── dashboard/                   # Dashboard metrics
│   ├── audit/                       # Audit logs
│   ├── import/                      # Bulk import
│   └── middlewares/                 # Tenant, ClientIP
│
└── shared/                          # Cross-cutting concerns
    ├── domain/base/                 # Entity, AggregateRoot, ValueObject
    ├── domain/events/               # DomainEventBus, Dispatcher, Idempotency
    ├── domain/result/               # Result<T, E> monad
    ├── domain/specifications/       # Specification pattern
    ├── infrastructure/cache/        # Redis cache con decoradores
    ├── infrastructure/resilience/   # CircuitBreaker, Retry, Timeout
    ├── guards/                      # PermissionGuard
    ├── decorators/                  # @RequirePermissions, @OrgId
    ├── filters/                     # GlobalExceptionFilter
    ├── interceptors/                # ResponseInterceptor
    ├── constants/                   # SYSTEM_ROLES, SYSTEM_PERMISSIONS
    └── utils/                       # resultToHttp, functional helpers
```

---

## Flujo de una Peticion HTTP

```
1. Cliente HTTP envia request
   ↓
2. TenantMiddleware extrae x-organization-slug
   ↓
3. JwtAuthGuard valida el token JWT
   ↓
4. RoleBasedAuthGuard verifica roles del usuario
   ↓
5. PermissionGuard verifica @RequirePermissions metadata
   ↓
6. Controller recibe request con DTO validado
   ↓
7. Controller invoca UseCase.execute(dto, orgId)
   ↓
8. UseCase opera con entidades de dominio
   ↓
9. UseCase llama al repositorio (puerto)
   ↓
10. Repositorio Prisma ejecuta query SQL
   ↓
11. UseCase retorna Result<T, DomainError>
   ↓
12. Controller convierte Result a HTTP response
   ↓
13. ResponseInterceptor envuelve la respuesta
   ↓
14. GlobalExceptionFilter captura errores no manejados
   ↓
15. Cliente recibe respuesta HTTP
```

### Cadena de Guards

```typescript
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
```

1. **JwtAuthGuard**: Extrae y valida JWT → inyecta `request.user`
2. **RoleBasedAuthGuard**: Verifica que el usuario tiene los roles requeridos
3. **PermissionGuard**: Lee metadata de `@RequirePermissions()` y verifica contra `request.user.permissions`

Roles **ADMIN** y **SYSTEM_ADMIN** hacen bypass de permission checks.

---

## Multi-Tenancy

### Modelo de Aislamiento

Cada organizacion tiene datos completamente aislados:

```
Organization A          Organization B
├── Users (3)           ├── Users (5)
├── Products (100)      ├── Products (200)
├── Warehouses (2)      ├── Warehouses (4)
├── Sales (50)          ├── Sales (120)
└── Roles (custom)      └── Roles (custom)
```

### Implementacion

**TenantMiddleware** extrae el contexto de organizacion:

```typescript
// src/interfaces/http/middlewares/tenant.middleware.ts
class TenantMiddleware {
  use(req, res, next) {
    const slug = req.headers['x-organization-slug'];
    // Normalizar y validar
    req.organizationSlug = slug;
    next();
  }
}
```

**Todas las entidades** tienen campo `orgId`:

```prisma
model Product {
  id        String @id
  orgId     String
  sku       String
  // ...
  @@unique([sku, orgId])  // SKU unico por org
}
```

**Repositorios** filtran por `orgId` automaticamente:

```typescript
async findAll(orgId: string, filters) {
  return this.prisma.product.findMany({
    where: { orgId, ...filters },
  });
}
```

---

## Sistema de Autenticacion

### Flujo de Login

```
POST /auth/login { email, password, organizationSlug }
  ↓
1. Buscar usuario por email + org
2. Verificar password con bcrypt
3. Generar access token (15 min) y refresh token (7 dias)
4. Crear registro de Session en BD
5. Retornar tokens + user data
```

### Tokens JWT

| Token | Duracion | Contenido |
|-------|----------|-----------|
| Access Token | 15 min | userId, orgId, roles, permissions |
| Refresh Token | 7 dias | userId, sessionId |

### Token Blacklist

Redis almacena tokens invalidados (logout):

```typescript
// Al hacer logout, el access token se agrega al blacklist
await this.redis.set(`blacklist:${token}`, '1', 'EX', remainingTTL);
```

### OTP (One-Time Password)

Para password reset y activacion de cuenta:

```
POST /auth/password-reset/request → Genera OTP y envia email
POST /auth/password-reset/verify  → Valida OTP
POST /auth/password-reset/confirm → Cambia password
```

---

## Sistema de Autorizacion (RBAC)

### Formato de Permisos

```
MODULE:ACTION
```

Ejemplo: `PRODUCTS:CREATE`, `SALES:CONFIRM`, `REPORTS:VIEW`

### 80+ Permisos Definidos

```typescript
// src/shared/constants/security.constants.ts
const SYSTEM_PERMISSIONS = {
  // Users
  'USERS:CREATE', 'USERS:READ', 'USERS:UPDATE', 'USERS:DELETE', 'USERS:MANAGE_ROLES',
  // Products
  'PRODUCTS:CREATE', 'PRODUCTS:READ', 'PRODUCTS:UPDATE', 'PRODUCTS:DELETE', 'PRODUCTS:IMPORT',
  // Sales
  'SALES:CREATE', 'SALES:READ', 'SALES:UPDATE', 'SALES:CONFIRM', 'SALES:PICK',
  'SALES:SHIP', 'SALES:COMPLETE', 'SALES:CANCEL',
  // ... y muchos mas
};
```

### Guard de Permisos

```typescript
// src/shared/guards/permission.guard.ts
@Injectable()
class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions', context.getHandler()
    );
    if (!requiredPermissions) return true;

    const user = request.user;

    // ADMIN y SYSTEM_ADMIN hacen bypass
    if (user.roles.includes('ADMIN') || user.roles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    // Verificar permisos
    return requiredPermissions.every(p => user.permissions.includes(p));
  }
}
```

### Uso en Controllers

```typescript
@Post()
@RequirePermissions('PRODUCTS:CREATE')
async create(@Body() dto) { ... }

@Post(':id/confirm')
@RequirePermissions('SALES:CONFIRM')
async confirm(@Param('id') id) { ... }
```

---

## Eventos de Dominio

### Arquitectura de Eventos

```
Entity (Aggregate Root)
  └─→ addDomainEvent(event)
        ↓
UseCase
  └─→ eventDispatcher.dispatchAll(entity.getDomainEvents())
        ↓
DomainEventBus
  └─→ EventHandler.handle(event)
        ↓
Side effects (audit log, notifications, etc.)
```

### Eventos Definidos

| Dominio | Eventos |
|---------|---------|
| Products | ProductCreated, ProductUpdated, ProductActivated, ProductDeactivated |
| Sales | SaleCreated, SaleConfirmed, SalePickingStarted, SaleShipped, SaleCompleted, SaleCancelled |
| Returns | ReturnCreated, ReturnConfirmed, ReturnCancelled |
| Movements | MovementPosted, MovementVoided |
| Transfers | TransferInitiated, TransferReceived, TransferRejected |
| Users | UserCreated, UserStatusChanged |
| Roles | RoleAssigned, PermissionChanged |

### Idempotencia

```typescript
// src/shared/domain/events/eventIdempotency.service.ts
class EventIdempotencyService {
  async isProcessed(eventId: string): Promise<boolean>;
  async markAsProcessed(eventId: string): Promise<void>;
}
```

Cada evento tiene un `eventId` unico. El servicio de idempotencia previene procesamiento duplicado.

---

## Gestion de Errores

### Result Monad

En lugar de lanzar excepciones, los use cases retornan `Result<T, E>`:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Uso
const result = await createProduct.execute(dto, orgId);
if (result.isErr()) {
  return resultToHttp(result); // 400, 404, 409, etc.
}
return result.value;
```

### Tipos de Error de Dominio

| Error | HTTP Status | Uso |
|-------|-------------|-----|
| `ValidationError` | 400 | Datos de entrada invalidos |
| `NotFoundError` | 404 | Entidad no encontrada |
| `ConflictError` | 409 | SKU duplicado, estado invalido |
| `BusinessRuleError` | 422 | Regla de negocio violada |
| `UnauthorizedError` | 401 | No autenticado |
| `ForbiddenError` | 403 | Sin permisos |

### GlobalExceptionFilter

Captura excepciones no manejadas y las convierte en respuestas HTTP estructuradas:

```typescript
// src/shared/filters/globalExceptionFilter.ts
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception, host) {
    const response = {
      success: false,
      message: exception.message,
      statusCode: exception.status || 500,
      timestamp: new Date().toISOString(),
    };
    // ...
  }
}
```

> Para la guia completa del Result Monad, ver [result-monad-guide.md](result-monad-guide.md)

---

## Infraestructura

### Base de Datos (PostgreSQL + Prisma)

- **25+ modelos** en el schema
- **UnitOfWork** para transacciones atomicas
- **Soft delete** con campo `deletedAt`
- **Indexes** optimizados para queries frecuentes (orgId, status, createdAt)

### Cache (Redis)

```typescript
// Decoradores de cache
@Cacheable({ key: 'products:{orgId}', ttl: 300 })
async getAll(orgId: string) { ... }

@CacheEvict({ key: 'products:{orgId}' })
async create(product: Product) { ... }
```

Usado para: rate limiting, token blacklist, cache de queries.

### Resiliencia

```
src/shared/infrastructure/resilience/
├── circuitBreaker.ts     # CLOSED → OPEN → HALF_OPEN
├── retry.ts              # Exponential backoff + jitter
├── timeout.ts            # Request timeout wrapper
└── resilientCall.ts      # Compone los tres patrones
```

Aplicado a: EmailService, NotificationService.

```typescript
const result = await resilientCall(
  () => emailService.send(to, subject, body),
  {
    circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
    retry: { maxAttempts: 3, initialDelay: 1000 },
    timeout: 10000,
  }
);
```

### Jobs Programados

**StockValidationJob**: Verifica alertas de stock cada hora.

```
Cada hora → Lee AlertConfiguration por org → Si coincide con cronFrequency
  → Verificar stock por debajo del minimo
  → Enviar notificaciones a recipientEmails
```

Frecuencias configurables: EVERY_HOUR, EVERY_6_HOURS, EVERY_12_HOURS, EVERY_DAY.

---

## Despliegue

### Render (`render.yaml`)

```yaml
services:
  - type: web
    name: nevada-api
    runtime: docker
    dockerfilePath: docker/prod.Dockerfile
    region: oregon
    plan: free
    healthCheckPath: /health
    envVars:
      - NODE_ENV: production
      - PORT: 10000
      - DATABASE_URL: (from external DB)
      - REDIS_URL: (from Upstash)
      - JWT_SECRET: (secret)
```

### Docker Production

Multi-stage build con Bun:

```dockerfile
# Stage 1: Build
FROM oven/bun AS builder
COPY . .
RUN bun install && bun run build

# Stage 2: Runtime
FROM oven/bun AS runtime
COPY --from=builder /app/dist ./dist
RUN bun run db:migrate:deploy
CMD ["bun", "run", "prod"]
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
jobs:
  lint:     # ESLint
  test:     # Jest con 90% coverage threshold
  build:    # Build de produccion
```

### Servicios Externos

| Servicio | Proveedor | Proposito |
|----------|-----------|-----------|
| PostgreSQL | Neon | Base de datos principal |
| Redis | Upstash | Cache, rate limiting, token blacklist |
| Monitoring | Sentry | Error tracking (opcional) |

---

## Documentacion Relacionada

| Documento | Descripcion |
|-----------|-------------|
| [Bounded Context Map](bounded-context-map.md) | Mapa de contextos acotados (DDD) |
| [Result Monad Guide](result-monad-guide.md) | Guia del patron Result<T, E> |
| [Data Model](data_model.md) | Modelo de datos y relaciones |
| [Testing Structure](testing-structure.md) | Estructura y convenciones de tests |
| [Patterns](patterns.md) | Patrones de diseno implementados |
