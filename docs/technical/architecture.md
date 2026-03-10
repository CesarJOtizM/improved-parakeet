> **[English](./architecture.md)** | [Español](./architecture.es.md)

# Backend Architecture

## Table of Contents

- [Overview](#overview)
- [Architectural Principles](#architectural-principles)
- [Architecture Layers](#architecture-layers)
- [Project Structure](#project-structure)
- [HTTP Request Flow](#http-request-flow)
- [Multi-Tenancy](#multi-tenancy)
- [Authentication System](#authentication-system)
- [Authorization System (RBAC)](#authorization-system-rbac)
- [Domain Events](#domain-events)
- [Error Handling](#error-handling)
- [Infrastructure](#infrastructure)
- [Deployment](#deployment)

---

## Overview

The Nevada Inventory System backend is a REST API built with **NestJS 11** that follows three architectural paradigms:

1. **Domain-Driven Design (DDD)**: Code is organized around business concepts
2. **Clean Architecture**: Inner layers do not depend on outer layers
3. **Hexagonal Architecture (Ports & Adapters)**: The domain defines interfaces; infrastructure implements them

### High-Level Diagram

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

**Dependency rule**: Arrows always point inward. Interfaces -> Application -> Domain <- Infrastructure.

---

## Architectural Principles

### Screaming Architecture

The folder structure "screams" the business domain:

```
src/
├── inventory/        # Core: inventory management
├── sales/            # Sales order management
├── returns/          # Return order management
├── contacts/         # Customer/supplier contacts
├── integrations/     # Third-party integrations (VTEX)
├── authentication/   # Authentication and RBAC
├── organization/     # Multi-tenancy management
├── report/           # 17 report types
└── import/           # Bulk import operations
```

It is not `src/controllers/`, `src/services/`, `src/models/` -- the business is what organizes the code.

### Dependency Inversion

The domain defines **ports** (interfaces). Infrastructure implements **adapters**:

```typescript
// DOMAIN: Defines what it needs (Port)
interface IProductRepository {
  findById(id: string, orgId: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
}

// INFRASTRUCTURE: Implements how it's done (Adapter)
class PrismaProductRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}
  async findById(id, orgId) { return this.prisma.product.findUnique(...); }
  async save(product) { return this.prisma.product.upsert(...); }
}
```

### Single Responsibility

Each use case has **a single responsibility**:

```
src/application/
├── productUseCases/
│   ├── createProductUseCase.ts      # Only creates products
│   ├── getProductByIdUseCase.ts     # Only queries a single product
│   ├── updateProductUseCase.ts      # Only updates products
│   └── deleteProductUseCase.ts      # Only deletes products
```

---

## Architecture Layers

### 1. Domain Layer (Core)

The innermost layer. Does not depend on anything external.

| Concept | Location | Description |
|---------|----------|-------------|
| **Entity** | `{module}/domain/entities/` | Objects with identity (id + orgId) |
| **Aggregate Root** | `{module}/domain/entities/` | Root entity controlling its graph |
| **Value Object** | `{module}/domain/valueObjects/` | Immutable objects without identity |
| **Domain Event** | `{module}/domain/events/` | Events representing something that happened |
| **Domain Service** | `{module}/domain/services/` | Logic that does not belong to a single entity |
| **Repository Port** | `{module}/domain/ports/` | Data access interfaces |
| **Specification** | `{module}/domain/specifications/` | Reusable business rules |

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

Orchestrates business logic. Receives DTOs, operates with domain entities, returns Results.

```typescript
// src/application/productUseCases/createProductUseCase.ts
class CreateProductUseCase {
  constructor(
    private productRepo: IProductRepository,
    private eventDispatcher: IDomainEventDispatcher,
  ) {}

  async execute(dto: CreateProductDto, orgId: string): Promise<Result<Product, DomainError>> {
    // 1. Validate business rules
    const existingProduct = await this.productRepo.findBySku(dto.sku, orgId);
    if (existingProduct) return err(new ConflictError('SKU already exists'));

    // 2. Create domain entity
    const product = Product.create({ ...dto, orgId });

    // 3. Persist
    await this.productRepo.save(product);

    // 4. Publish domain events
    await this.eventDispatcher.dispatchAll(product.getDomainEvents());

    // 5. Return result
    return ok(product);
  }
}
```

**150+ use cases** organized by domain:

| Domain | Count | Examples |
|--------|-------|----------|
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
| Reports | 17 | One per report type |
| Dashboard | 1 | GetDashboardMetrics |
| Audit | 4 | GetLogs, GetLog, GetUserActivity, GetEntityHistory |
| Import | 2 | Preview, Execute |
| Organization | 2 | Get, Update |
| Contacts | 4 | Create, Get, GetById, Update |
| Integrations | 11 | Connection CRUD, SkuMapping CRUD, Sync, Retry |

### 3. Infrastructure Layer (Output Adapters)

Implements the interfaces defined in the domain:

| Adapter | Location | Implements |
|---------|----------|------------|
| PrismaProductRepository | `infrastructure/database/repositories/` | IProductRepository |
| PrismaSaleRepository | `infrastructure/database/repositories/` | ISaleRepository |
| PrismaContactRepository | `infrastructure/database/repositories/` | IContactRepository |
| IntegrationConnectionRepository | `infrastructure/database/repositories/` | IIntegrationConnectionRepository |
| IntegrationSkuMappingRepository | `infrastructure/database/repositories/` | IIntegrationSkuMappingRepository |
| IntegrationSyncLogRepository | `infrastructure/database/repositories/` | IIntegrationSyncLogRepository |
| EmailService | `infrastructure/externalServices/` | IEmailService |
| NotificationService | `infrastructure/externalServices/` | INotificationService |
| FileParsingService | `infrastructure/externalServices/` | IFileParsingService |
| FunctionalCacheService | `shared/infrastructure/cache/` | ICacheService |

**20+ Prisma repositories** for all main entities.

### 4. Interface Layer (Input Adapters)

HTTP controllers with NestJS:

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

**20+ controllers** organized by domain.

---

## Project Structure

```
src/
├── main.ts                          # Bootstrap: Swagger, CORS, security
├── app.module.ts                    # Root module + middleware config
│
├── authentication/                  # Authentication and RBAC
│   ├── authentication.module.ts     # Central DI
│   ├── config/                      # auth.config.ts (JWT, BCRYPT)
│   ├── domain/                      # Entities, Services, Ports, Events, VOs
│   ├── security/                    # Guards, Strategies, Decorators
│   └── dto/                         # Auth DTOs
│
├── inventory/                       # Inventory Domain
│   ├── inventory.module.ts
│   ├── products/                    # Product domain
│   ├── warehouses/                  # Warehouse domain
│   ├── locations/                   # Location domain (hierarchical)
│   ├── movements/                   # Movement domain (IN/OUT/ADJUSTMENT)
│   ├── transfers/                   # Transfer domain
│   └── stock/                       # Stock domain
│
├── sales/                           # Sales Domain
│   ├── domain/entities/             # Sale (AggregateRoot), SaleLine
│   ├── domain/events/               # SaleCreated, SaleConfirmed, etc.
│   ├── domain/valueObjects/         # SaleNumber, SaleStatus, Money, Quantity
│   └── domain/specifications/       # Query specifications
│
├── returns/                         # Returns Domain
│   ├── domain/entities/             # Return (AggregateRoot), ReturnLine
│   └── domain/valueObjects/         # ReturnStatus, ReturnType
│
├── contacts/                        # Contact management domain
│   ├── domain/entities/             # Contact entity
│   ├── domain/ports/                # IContactRepository
│   ├── dto/                         # Create/Update DTOs
│   └── mappers/                     # Contact mapper
│
├── integrations/                    # Third-party integrations
│   ├── integrations.module.ts       # Main integrations module
│   ├── shared/                      # Shared integration components
│   │   ├── domain/entities/         # Connection, SkuMapping, SyncLog
│   │   ├── domain/ports/            # Repository interfaces
│   │   └── encryption/              # EncryptionService
│   └── vtex/                        # VTEX e-commerce integration
│       ├── application/             # Sync, Poll, Webhook use cases
│       ├── infrastructure/          # VtexApiClient
│       ├── events/                  # OutboundSyncHandler
│       └── jobs/                    # VtexPollingJob
│
├── report/                          # Report domain (17 types)
├── organization/                    # Multi-tenancy
├── import/                          # Bulk import
├── healthCheck/                     # Health checks
│
├── application/                     # Use Cases (150+ files)
│   ├── authUseCases/
│   ├── userUseCases/
│   ├── roleUseCases/
│   ├── productUseCases/
│   ├── saleUseCases/
│   ├── returnUseCases/
│   ├── contactUseCases/             # Contact CRUD
│   ├── integrationUseCases/         # Connection, SkuMapping, Sync management
│   ├── reportUseCases/
│   ├── dashboardUseCases/
│   ├── eventHandlers/               # Event subscribers
│   └── ...
│
├── infrastructure/                  # Infrastructure Adapters
│   ├── database/
│   │   ├── prisma/schema.prisma     # DB schema (25+ models)
│   │   ├── prisma/migrations/       # Migrations
│   │   ├── prisma/seeds/            # Data seeds
│   │   ├── prisma.service.ts        # Prisma client
│   │   ├── unitOfWork.service.ts    # Transactions
│   │   └── repositories/            # 20+ Prisma repositories
│   ├── externalServices/            # Email, Notifications, FileParsing
│   └── jobs/                        # Scheduled jobs (stock alerts)
│
├── interfaces/http/                 # HTTP Controllers
│   ├── routes/                      # Auth, Users, Roles, Settings
│   ├── inventory/                   # Products, Categories, Warehouses, etc.
│   ├── sales/                       # Sales controller
│   ├── returns/                     # Returns controller
│   ├── report/                      # Reports controller
│   ├── dashboard/                   # Dashboard metrics
│   ├── audit/                       # Audit logs
│   ├── contacts/                    # Contact management endpoints
│   ├── integrations/                # Integration + VTEX webhook endpoints
│   ├── import/                      # Bulk import
│   └── middlewares/                 # Tenant, ClientIP
│
└── shared/                          # Cross-cutting concerns
    ├── domain/base/                 # Entity, AggregateRoot, ValueObject
    ├── domain/events/               # DomainEventBus, Dispatcher, Idempotency
    ├── domain/result/               # Result<T, E> monad
    ├── domain/specifications/       # Specification pattern
    ├── infrastructure/cache/        # Redis cache with decorators
    ├── infrastructure/resilience/   # CircuitBreaker, Retry, Timeout
    ├── guards/                      # PermissionGuard
    ├── decorators/                  # @RequirePermissions, @OrgId
    ├── filters/                     # GlobalExceptionFilter
    ├── interceptors/                # ResponseInterceptor
    ├── constants/                   # SYSTEM_ROLES, SYSTEM_PERMISSIONS
    └── utils/                       # resultToHttp, functional helpers
```

---

## HTTP Request Flow

```
1. HTTP client sends request
   ↓
2. TenantMiddleware extracts x-organization-slug
   ↓
3. JwtAuthGuard validates the JWT token
   ↓
4. RoleBasedAuthGuard verifies user roles
   ↓
5. PermissionGuard verifies @RequirePermissions metadata
   ↓
6. Controller receives request with validated DTO
   ↓
7. Controller invokes UseCase.execute(dto, orgId)
   ↓
8. UseCase operates with domain entities
   ↓
9. UseCase calls the repository (port)
   ↓
10. Prisma repository executes SQL query
   ↓
11. UseCase returns Result<T, DomainError>
   ↓
12. Controller converts Result to HTTP response
   ↓
13. ResponseInterceptor wraps the response
   ↓
14. GlobalExceptionFilter catches unhandled errors
   ↓
15. Client receives HTTP response
```

### Guard Chain

```typescript
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
```

1. **JwtAuthGuard**: Extracts and validates JWT -> injects `request.user`
2. **RoleBasedAuthGuard**: Verifies the user has the required roles
3. **PermissionGuard**: Reads metadata from `@RequirePermissions()` and verifies against `request.user.permissions`

**ADMIN** and **SYSTEM_ADMIN** roles bypass permission checks.

---

## Multi-Tenancy

### Isolation Model

Each organization has completely isolated data:

```
Organization A          Organization B
├── Users (3)           ├── Users (5)
├── Products (100)      ├── Products (200)
├── Warehouses (2)      ├── Warehouses (4)
├── Sales (50)          ├── Sales (120)
└── Roles (custom)      └── Roles (custom)
```

### Implementation

**TenantMiddleware** extracts the organization context:

```typescript
// src/interfaces/http/middlewares/tenant.middleware.ts
class TenantMiddleware {
  use(req, res, next) {
    const slug = req.headers['x-organization-slug'];
    // Normalize and validate
    req.organizationSlug = slug;
    next();
  }
}
```

**All entities** have an `orgId` field:

```prisma
model Product {
  id        String @id
  orgId     String
  sku       String
  // ...
  @@unique([sku, orgId])  // SKU unique per org
}
```

**Repositories** filter by `orgId` automatically:

```typescript
async findAll(orgId: string, filters) {
  return this.prisma.product.findMany({
    where: { orgId, ...filters },
  });
}
```

---

## Authentication System

### Login Flow

```
POST /auth/login { email, password, organizationSlug }
  ↓
1. Find user by email + org
2. Verify password with bcrypt
3. Generate access token (15 min) and refresh token (7 days)
4. Create Session record in DB
5. Return tokens + user data
```

### JWT Tokens

| Token | Duration | Content |
|-------|----------|---------|
| Access Token | 15 min | userId, orgId, roles, permissions |
| Refresh Token | 7 days | userId, sessionId |

### Token Blacklist

Redis stores invalidated tokens (logout):

```typescript
// On logout, the access token is added to the blacklist
await this.redis.set(`blacklist:${token}`, '1', 'EX', remainingTTL);
```

### OTP (One-Time Password)

For password reset and account activation:

```
POST /auth/password-reset/request → Generates OTP and sends email
POST /auth/password-reset/verify  → Validates OTP
POST /auth/password-reset/confirm → Changes password
```

---

## Authorization System (RBAC)

### Permission Format

```
MODULE:ACTION
```

Example: `PRODUCTS:CREATE`, `SALES:CONFIRM`, `REPORTS:VIEW`

### 80+ Defined Permissions

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
  // ... and many more
};
```

### Permission Guard

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

    // ADMIN and SYSTEM_ADMIN bypass
    if (user.roles.includes('ADMIN') || user.roles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    // Verify permissions
    return requiredPermissions.every(p => user.permissions.includes(p));
  }
}
```

### Usage in Controllers

```typescript
@Post()
@RequirePermissions('PRODUCTS:CREATE')
async create(@Body() dto) { ... }

@Post(':id/confirm')
@RequirePermissions('SALES:CONFIRM')
async confirm(@Param('id') id) { ... }
```

---

## Domain Events

### Event Architecture

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

### Defined Events

| Domain | Events |
|--------|--------|
| Products | ProductCreated, ProductUpdated, ProductActivated, ProductDeactivated |
| Sales | SaleCreated, SaleConfirmed, SalePickingStarted, SaleShipped, SaleCompleted, SaleCancelled |
| Returns | ReturnCreated, ReturnConfirmed, ReturnCancelled |
| Movements | MovementPosted, MovementVoided |
| Transfers | TransferInitiated, TransferReceived, TransferRejected |
| Users | UserCreated, UserStatusChanged |
| Roles | RoleAssigned, PermissionChanged |
| Integrations | VtexOutboundSync (sale confirmed triggers outbound sync to VTEX) |

### Idempotency

```typescript
// src/shared/domain/events/eventIdempotency.service.ts
class EventIdempotencyService {
  async isProcessed(eventId: string): Promise<boolean>;
  async markAsProcessed(eventId: string): Promise<void>;
}
```

Each event has a unique `eventId`. The idempotency service prevents duplicate processing.

---

## Error Handling

### Result Monad

Instead of throwing exceptions, use cases return `Result<T, E>`:

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// Usage
const result = await createProduct.execute(dto, orgId);
if (result.isErr()) {
  return resultToHttp(result); // 400, 404, 409, etc.
}
return result.value;
```

### Domain Error Types

| Error | HTTP Status | Usage |
|-------|-------------|-------|
| `ValidationError` | 400 | Invalid input data |
| `NotFoundError` | 404 | Entity not found |
| `ConflictError` | 409 | Duplicate SKU, invalid state |
| `BusinessRuleError` | 422 | Business rule violated |
| `UnauthorizedError` | 401 | Not authenticated |
| `ForbiddenError` | 403 | Insufficient permissions |

### GlobalExceptionFilter

Catches unhandled exceptions and converts them into structured HTTP responses:

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

> For the full Result Monad guide, see [result-monad-guide.md](result-monad-guide.md)

---

## Infrastructure

### Database (PostgreSQL + Prisma)

- **25+ models** in the schema
- **UnitOfWork** for atomic transactions
- **Soft delete** with `deletedAt` field
- **Indexes** optimized for frequent queries (orgId, status, createdAt)

### Cache (Redis)

```typescript
// Cache decorators
@Cacheable({ key: 'products:{orgId}', ttl: 300 })
async getAll(orgId: string) { ... }

@CacheEvict({ key: 'products:{orgId}' })
async create(product: Product) { ... }
```

Used for: rate limiting, token blacklist, query cache.

### Resilience

```
src/shared/infrastructure/resilience/
├── circuitBreaker.ts     # CLOSED → OPEN → HALF_OPEN
├── retry.ts              # Exponential backoff + jitter
├── timeout.ts            # Request timeout wrapper
└── resilientCall.ts      # Composes all three patterns
```

Applied to: EmailService, NotificationService.

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

### Scheduled Jobs

**StockValidationJob**: Checks stock alerts every hour.

```
Every hour → Read AlertConfiguration per org → If matches cronFrequency
  → Check stock below minimum
  → Send notifications to recipientEmails
```

Configurable frequencies: EVERY_HOUR, EVERY_6_HOURS, EVERY_12_HOURS, EVERY_DAY.

---

## Deployment

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

Multi-stage build with Bun:

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
  test:     # Jest with 90% coverage threshold
  build:    # Production build
```

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| PostgreSQL | Neon | Main database |
| Redis | Upstash | Cache, rate limiting, token blacklist |
| Monitoring | Sentry | Error tracking (optional) |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Bounded Context Map](bounded-context-map.md) | DDD context map |
| [Result Monad Guide](result-monad-guide.md) | Result<T, E> pattern guide |
| [Data Model](data_model.md) | Database structure |
| [Testing Structure](testing-structure.md) | Test conventions |
| [Patterns](patterns.md) | Design patterns |
| [Error Codes](error-codes.md) | Error code catalog |
| [Module: Inventory](../modules/inventory.md) | Inventory module docs |
| [Module: Authentication](../modules/authentication.md) | Auth module docs |
| [Module: Sales](../modules/sales.md) | Sales module docs |
| [Module: Returns](../modules/returns.md) | Returns module docs |
| [Module: Contacts](../modules/contacts.md) | Contacts module docs |
| [Module: Integrations](../modules/integrations.md) | Integrations module docs |
| [Module: Reports](../modules/reports.md) | Reports module docs |
| [Module: Import](../modules/import.md) | Import module docs |
| [Module: Organization](../modules/organization.md) | Organization module docs |
| [Module: Shared](../modules/shared.md) | Shared module docs |
| [Module: Infrastructure](../modules/infrastructure.md) | Infrastructure module docs |
