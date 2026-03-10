> **[English](./shared.md)** | [Español](./shared.es.md)

# Shared Module

## Overview

The Shared module contains cross-cutting concerns, foundational abstractions, and infrastructure utilities used across the entire Nevada Inventory application. It provides the building blocks for Domain-Driven Design (DDD), functional programming patterns, security middleware, observability services, and resilience mechanisms.

### Directory Structure

```
src/shared/
  audit/           -- Audit subsystem (entities, services, specifications, value objects)
  config/          -- Application configuration (cache, logging, rate limiting, security, env validation)
  constants/       -- System constants (error codes, security headers, roles, permissions)
  decorators/      -- Custom NestJS decorators (@OrgId, @RequirePermissions, @ApiResponse)
  domain/          -- DDD building blocks (base classes, Result monad, specifications, events)
  filters/         -- Global exception filter
  guards/          -- Permission guard
  infrastructure/  -- Cache and resilience implementations
  interceptors/    -- HTTP interceptors (audit, metrics, response)
  middleware/      -- Security middleware
  middlewares/     -- Correlation ID middleware
  ports/           -- Interface definitions (repositories, cache, events, external services)
  services/        -- Metrics and structured logging services
  types/           -- TypeScript type definitions (HTTP, API response, database)
  utils/           -- Utility functions (functional helpers, response builders, Result-to-HTTP)
```

---

## Result Monad

The Result monad is the primary error-handling mechanism throughout the application. Instead of throwing exceptions, use cases return `Result<T, DomainError>` to make success and failure paths explicit and type-safe.

### Core Types

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

- **File**: `src/shared/domain/result/result.types.ts`

### Ok Class

**File**: `src/shared/domain/result/ok.ts`

Represents a successful result. Provides:
- `map(fn)` - Transform the success value
- `flatMap(fn)` - Chain Result-returning operations
- `unwrap()` - Extract value (throws if Err)
- `unwrapOr(default)` - Extract value with fallback
- `match(onOk, onErr)` - Pattern match on the result

### Err Class

**File**: `src/shared/domain/result/err.ts`

Represents a failure result. Provides the same API as `Ok` but with error-path semantics:
- `map()` - No-op, propagates error
- `mapErr(fn)` - Transform the error value
- `unwrapErr()` - Extract the error
- `match(onOk, onErr)` - Executes the `onErr` branch

### Factory Functions

```typescript
ok(value)   // Creates Ok<T, E>
err(error)  // Creates Err<T, E>
```

### Result Utilities

**File**: `src/shared/domain/result/resultUtils.ts`

- `fromPromise(promise)` - Converts a Promise to `Result<T, Error>`
- `fromThrowable(fn, errorMapper?)` - Wraps a throwing function in a Result
- `combine(results)` - Combines multiple Results into one (fails on first error)

### Result-to-HTTP Bridge

**File**: `src/shared/utils/resultToHttp.ts`

- `resultToHttpResponse(result)` - Extracts the value from Ok or throws the appropriate NestJS `HttpException` with correct status code mapping

---

## Domain Errors

**File**: `src/shared/domain/result/domainError.ts`

A hierarchy of typed errors used as the `E` type in `Result<T, E>`:

| Error Class | HTTP Status | Default Code | Description |
|---|---|---|---|
| `DomainError` | - | - | Abstract base class |
| `ValidationError` | 400 | `VALIDATION_ERROR` | Input validation failures |
| `NotFoundError` | 404 | `NOT_FOUND` | Entity not found |
| `ConflictError` | 409 | `CONFLICT` | Duplicate or conflicting data |
| `BusinessRuleError` | 400 | `BUSINESS_RULE_VIOLATION` | Business logic violations |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` | Auth failures (generic message for security) |
| `TokenError` | 401 | `TOKEN_ERROR` | Token failures (generic message for security) |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| `InsufficientStockError` | 400 | `INSUFFICIENT_STOCK` | Stock below requested quantity |
| `StockNotFoundError` | 404 | `STOCK_NOT_FOUND` | No stock record exists |

### Error Codes

**File**: `src/shared/constants/error-codes.ts`

Centralized error code constants following the convention `MODULE_ACTION` or `MODULE_ENTITY_REASON` in `UPPER_SNAKE_CASE`. Over 100 error codes organized by module: Auth, Users, Roles, Products, Categories, Warehouses, Stock, Movements, Transfers, Sales, Returns, Reports, Companies, Organizations, Imports, Dashboard, Audit, Reorder Rules.

---

## Specifications Pattern

The Specification Pattern encapsulates business rules as composable, reusable objects that can be combined with boolean logic.

### Interface

**File**: `src/shared/domain/specifications/iSpecification.port.ts`

```typescript
interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(spec: ISpecification<T>): ISpecification<T>;
  or(spec: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}
```

### Base Implementation

**File**: `src/shared/domain/specifications/baseSpecification.ts`

`BaseSpecification<T>` provides default `and()`, `or()`, `not()` implementations using composite classes: `AndSpecification`, `OrSpecification`, `NotSpecification`.

### Prisma Specifications

**File**: `src/shared/domain/specifications/prismaSpecification.base.ts`

`PrismaSpecification<T>` extends `BaseSpecification<T>` with a `toPrismaWhere(orgId): PrismaWhereInput` method that converts specifications to Prisma-compatible where clauses. Composite classes (`PrismaAndSpecification`, `PrismaOrSpecification`, `PrismaNotSpecification`) correctly compose `AND`, `OR`, `NOT` Prisma conditions.

---

## Domain Events

The domain event system enables loose coupling between aggregates and side effects (notifications, audit logging, stock updates).

### DomainEvent Base

**File**: `src/shared/domain/events/domainEvent.base.ts`

Abstract base class with `eventName`, `occurredOn`, and a `markForDispatch()` mechanism to control when events are published.

### DomainEventBus

**File**: `src/shared/domain/events/domainEventBus.service.ts`

In-memory event bus that supports:
- `registerHandler(eventType, handler)` - Register handlers for event types
- `publish(event)` - Publish to all registered handlers (parallel execution, error isolation)
- `publishAll(events)` - Publish multiple events

### DomainEventDispatcher

**File**: `src/shared/domain/events/domainEventDispatcher.service.ts`

Orchestrates event dispatch from aggregate roots:
- `dispatchEvents(events)` - Dispatches only events marked for dispatch
- `markAndDispatch(events)` - Marks all events and dispatches them

### EventIdempotencyService

**File**: `src/shared/domain/events/eventIdempotency.service.ts`

Ensures handlers process events at most once using a `processedEvent` database table:
- `tryMarkAsProcessed(eventType, eventId, orgId)` - Returns `true` on first call, `false` on duplicates
- `isProcessed()` - Check if already processed
- `cleanupOldRecords(olderThanDays)` - Periodic cleanup of old records

### Event Handler Interface

**File**: `src/shared/ports/events/iDomainEventHandler.port.ts`

```typescript
interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}
```

---

## Guards & Decorators

### Permission Guard

**File**: `src/shared/guards/permission.guard.ts`

`PermissionGuard` enforces permission-based access control:
- Reads required permissions from route metadata (set by decorators)
- Grants automatic access to `ADMIN` and `SYSTEM_ADMIN` roles
- Supports `ALL` (every permission required) and `ANY` (at least one) modes

### Decorators

**File**: `src/shared/decorators/requirePermissions.decorator.ts`

| Decorator | Description |
|---|---|
| `@RequirePermissions(...perms)` | Require all specified permissions |
| `@RequireAnyPermission(...perms)` | Require at least one permission |
| `@RequireAllPermissions(...perms)` | Explicitly require all permissions |
| `@RequireRoles(...roles)` | Require specific roles |
| `@RequireOrganization()` | Require user to belong to an organization |
| `@RequireWarehouseAccess()` | Require warehouse access |

**File**: `src/shared/decorators/orgId.decorator.ts`

| Decorator | Description |
|---|---|
| `@OrgId()` | Parameter decorator that extracts the organization ID from the request |

**File**: `src/shared/decorators/apiResponse.decorator.ts`

| Decorator | Description |
|---|---|
| `@ApiSuccessResponse(model)` | Swagger success response wrapper |
| `@ApiErrorResponses(...codes)` | Swagger error responses |
| `@ApiStandardResponses(model)` | Combined success + standard error responses |

---

## Interceptors

### AuditInterceptor

**File**: `src/shared/interceptors/audit.interceptor.ts`

Automatically logs every HTTP request to the audit system:
- Captures method, URL, user, organization, IP, user agent
- Records success/failure with duration
- Redacts sensitive fields (`password`, `token`, `otp`, etc.)

### MetricsInterceptor

**File**: `src/shared/interceptors/metrics.interceptor.ts`

Records HTTP request metrics:
- Request duration (histogram)
- Request count by method, path, status code (counter)

### ResponseInterceptor

**File**: `src/shared/interceptors/responseInterceptor.ts`

Normalizes all successful responses into a consistent envelope format:

```json
{ "success": true, "message": "...", "data": { ... }, "timestamp": "..." }
```

---

## Middleware

### SecurityMiddleware

**File**: `src/shared/middleware/securityMiddleware.ts`

Applies standard security headers to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Request-ID` (generated per request)
- `X-Response-Time` (timestamp)

### CorrelationIdMiddleware

**File**: `src/shared/middlewares/correlationId.middleware.ts`

Adds distributed tracing support:
- Extracts `X-Correlation-ID` header if present, otherwise generates a UUID
- Attaches to `req.correlationId` and echoes in response header
- Available in structured logger context for end-to-end request tracing

### GlobalExceptionFilter

**File**: `src/shared/filters/globalExceptionFilter.ts`

Catches all unhandled exceptions and returns a standardized error response. Integrates with Sentry for error tracking in production. Maps `HttpException` details (message, errorCode, details) to the response body.

---

## Constants

### Security Constants

**File**: `src/shared/constants/security.constants.ts`

- `SYSTEM_ROLES` - Predefined role names: `SYSTEM_ADMIN`, `ADMIN`, `SUPERVISOR`, `WAREHOUSE_OPERATOR`, `CONSULTANT`, `IMPORT_OPERATOR`, `SALES_PERSON`
- `SYSTEM_PERMISSIONS` - 50+ granular permissions organized by module (Users, Roles, Organizations, Warehouses, Products, Inventory, Sales, Returns, Reports, Audit, Companies, Contacts, Settings, Integrations)
- `SECURITY_HEADERS` - Standard HTTP security headers
- `SECURITY_CONFIG` - CORS, password policy, session configuration

### Configuration

| File | Description |
|---|---|
| `src/shared/config/env.validation.ts` | Type-safe environment variable validation with `class-validator`, production-specific requirements enforcement |
| `src/shared/config/cache.config.ts` | Cache TTL and store configuration |
| `src/shared/config/logging.config.ts` | Logging level and format configuration |
| `src/shared/config/rateLimit.config.ts` | Rate limiting thresholds |
| `src/shared/config/security.config.ts` | Security-related configuration |
| `src/shared/config/validation.config.ts` | Validation pipeline configuration |

---

## Utilities

### Functional Programming Utilities

| File | Export | Description |
|---|---|---|
| `src/shared/utils/functional/pipe.ts` | `pipe(f, g, h)` | Left-to-right function composition: `h(g(f(x)))` |
| `src/shared/utils/functional/compose.ts` | `compose(f, g, h)` | Right-to-left function composition: `f(g(h(x)))` |
| `src/shared/utils/functional/curry.ts` | `curry` | Function currying utility |
| `src/shared/utils/functional/helpers.ts` | Various | General functional helpers |

### Response Utilities

**File**: `src/shared/utils/responseUtils.ts`

- `createSuccessResponse(message, data)` - Standard success envelope
- `createErrorResponse(message, statusCode, path, method, errorCode, details)` - Standard error envelope

### Services

| File | Class | Description |
|---|---|---|
| `src/shared/services/metrics.service.ts` | `MetricsService` | In-memory metrics collection (counters, histograms, gauges) with Prometheus-ready export format. Records HTTP request durations and database query durations. |
| `src/shared/services/structuredLogger.service.ts` | `StructuredLoggerService` | JSON structured logging with correlation ID, user context, and request metadata. Implements NestJS `LoggerService`. |

### Cache Infrastructure

| File | Description |
|---|---|
| `src/shared/infrastructure/cache/functionalCache.service.ts` | `FunctionalCacheService` implementing `ICacheService` with Result monad returns. Supports `get`, `set`, `delete`, `exists`, `getMany`, `setMany`, `deleteMany`, `clear`. |
| `src/shared/infrastructure/cache/cacheDecorators.ts` | Cache decorator utilities |
| `src/shared/infrastructure/cache/cacheHelpers.ts` | Cache key generation helpers |
| `src/shared/infrastructure/cache/cache.factory.ts` | Cache provider factory |

### Port Interfaces

| File | Interface | Description |
|---|---|---|
| `src/shared/ports/repositories/iReadRepository.port.ts` | `IReadRepository<T>` | Read-only repository contract |
| `src/shared/ports/repositories/iWriteRepository.port.ts` | `IWriteRepository<T>` | Write repository contract |
| `src/shared/ports/repositories/iRepository.port.ts` | `IRepository<T>` | Combined read/write contract |
| `src/shared/ports/cache/iCacheService.port.ts` | `ICacheService` | Cache service contract |
| `src/shared/ports/events/` | `IDomainEventDispatcher`, `IDomainEventHandler` | Event system contracts |
| `src/shared/ports/externalServices/` | `IEmailService`, `INotificationService`, `IDocumentGenerationService`, `IFileParsingService`, `IExcelGenerationService` | External service contracts |

### DDD Base Classes

| File | Class | Description |
|---|---|---|
| `src/shared/domain/base/entity.base.ts` | `Entity<T>` | Base entity with `id` (CUID2), `orgId`, `createdAt`, `updatedAt`, equality by ID + orgId |
| `src/shared/domain/base/aggregateRoot.base.ts` | `AggregateRoot<T>` | Extends Entity with domain event collection (`addDomainEvent`, `clearEvents`, `markEventsForDispatch`) |
| `src/shared/domain/base/valueObject.base.ts` | `ValueObject<T>` | Immutable value object with structural equality (`equals()`) and `getValue()` |
