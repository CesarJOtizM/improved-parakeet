> **[English](./infrastructure.md)** | [Español](./infrastructure.es.md)

# Infrastructure Module

## Overview

The Infrastructure module provides all concrete implementations for external dependencies: database access via Prisma ORM, external service integrations (email, notifications, document generation, file parsing), scheduled jobs, and health check monitoring. Following Hexagonal Architecture, these implementations satisfy port interfaces defined in the domain and shared layers, allowing them to be replaced without affecting business logic.

### Directory Structure

```
src/infrastructure/
  database/
    generated/prisma/    -- Auto-generated Prisma Client
    migrations/          -- SQL migration files
    prisma/
      schema.prisma      -- Prisma schema definition
      seed.ts            -- Database seeding orchestrator
      seeds/             -- Seed data (auth, inventory, demo)
      views.sql          -- Database views
    repositories/        -- Repository implementations
    services/            -- Base repository service
    utils/               -- Query optimizer, stream query utilities
    prisma.module.ts     -- Global NestJS module
    prisma.service.ts    -- Prisma client service
    unitOfWork.service.ts -- Transaction management
  externalServices/
    emailService.ts          -- Email via Resend API
    notificationService.ts   -- Stock alert notifications
    documentGenerationService.ts -- PDF/Excel generation
    fileParsingService.ts    -- Excel/CSV file parsing
    excelGenerationService.ts -- Excel export service
    templates/               -- Email HTML templates
  healthCheck/
    healthCheck.adapter.ts   -- Health check infrastructure adapter
  jobs/
    stockValidationJob.ts    -- Scheduled stock level validation
```

---

## Database Layer

### Prisma Configuration

#### PrismaService

**File**: `src/infrastructure/database/prisma.service.ts`

The `PrismaService` extends `PrismaClient` and implements NestJS lifecycle hooks:

- **Connection management** - `onModuleInit()` connects, `onModuleDestroy()` disconnects gracefully
- **Connection pooling** - Configurable via `DB_CONNECTION_LIMIT` (default: 10) and `DB_POOL_TIMEOUT` (default: 10s) environment variables
- **SSL support** - Automatic SSL for Supabase and AWS hostnames
- **Adapter** - Uses `@prisma/adapter-pg` (`PrismaPg`) for PostgreSQL connection
- **Logging** - Query, error, and warning logs in development; error-only in production

#### PrismaModule

**File**: `src/infrastructure/database/prisma.module.ts`

Global NestJS module (`@Global()`) that provides and exports `PrismaService` and `UnitOfWork` to the entire application.

#### UnitOfWork

**File**: `src/infrastructure/database/unitOfWork.service.ts`

Provides transactional boundaries for multi-operation workflows:

```typescript
interface IUnitOfWork {
  execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
```

- **Isolation level** - `ReadCommitted`
- **Timeout** - 30 seconds
- **Max wait** - 10 seconds
- **Automatic rollback** on failure

#### Schema

**File**: `src/infrastructure/database/prisma/schema.prisma`

Defines the complete data model for the application including organizations, users, roles, permissions, products, stock, warehouses, movements, sales, transfers, returns, audit logs, reports, companies, contacts, integrations, and more.

### Repositories

All repositories implement port interfaces from the domain layer, enforce `orgId`-scoped queries, and use Prisma Client for data access.

#### BaseRepositoryService

**File**: `src/infrastructure/database/services/base.repository.service.ts`

Abstract base class providing common CRUD operations for all repositories:

| Method | Description |
|---|---|
| `create(data, orgId)` | Create entity scoped to organization |
| `findById(id, orgId)` | Find by ID within organization |
| `findAll(orgId, options?)` | Paginated find all with optional filters |
| `update(id, data, orgId)` | Update entity |
| `delete(id, orgId)` | Soft delete (sets `deletedAt`) |
| `hardDelete(id, orgId)` | Permanent deletion |
| `exists(id, orgId)` | Check existence |
| `count(orgId, where?)` | Count records |
| `findWithFilters(orgId, filters)` | Search with text, category, status, date range filters |

#### Domain-Specific Repositories

| Repository | File | Port |
|---|---|---|
| `OrganizationRepository` | `repositories/organization.repository.ts` | `IOrganizationRepository` |
| `UserRepository` | `repositories/user.repository.ts` | `IUserRepository` |
| `RoleRepository` | `repositories/role.repository.ts` | `IRoleRepository` |
| `ProductRepository` | `repositories/product.repository.ts` | `IProductRepository` |
| `CategoryRepository` | `repositories/category.repository.ts` | `ICategoryRepository` |
| `WarehouseRepository` | `repositories/warehouse.repository.ts` | `IWarehouseRepository` |
| `LocationRepository` | `repositories/location.repository.ts` | `ILocationRepository` |
| `StockRepository` | `repositories/stock.repository.ts` | `IStockRepository` |
| `MovementRepository` | `repositories/movement.repository.ts` | `IMovementRepository` |
| `TransferRepository` | `repositories/transfer.repository.ts` | `ITransferRepository` |
| `SaleRepository` | `repositories/sale.repository.ts` | `ISaleRepository` |
| `ReturnRepository` | `repositories/return.repository.ts` | `IReturnRepository` |
| `ContactRepository` | `repositories/contact.repository.ts` | `IContactRepository` |
| `CompanyRepository` | `repositories/company.repository.ts` | `ICompanyRepository` |
| `AuditLogRepository` | `repositories/auditLog.repository.ts` | `IAuditLogRepository` |
| `ReorderRuleRepository` | `repositories/reorderRule.repository.ts` | `IReorderRuleRepository` |
| `ReportRepository` | `repositories/report.repository.ts` | `IReportRepository` |
| `ReportTemplateRepository` | `repositories/reportTemplate.repository.ts` | `IReportTemplateRepository` |
| `SessionRepository` | `repositories/session.repository.ts` | `ISessionRepository` |
| `OtpRepository` | `repositories/otp.repository.ts` | `IOtpRepository` |
| `ImportBatchRepository` | `repositories/prismaImportBatchRepository.ts` | `IImportBatchRepository` |
| `IntegrationConnectionRepository` | `repositories/integrationConnection.repository.ts` | `IIntegrationConnectionRepository` |
| `IntegrationSkuMappingRepository` | `repositories/integrationSkuMapping.repository.ts` | `IIntegrationSkuMappingRepository` |
| `IntegrationSyncLogRepository` | `repositories/integrationSyncLog.repository.ts` | `IIntegrationSyncLogRepository` |

### Migrations

| Migration | File | Description |
|---|---|---|
| Initial schema | `migrations/20260226100000_init_migration/migration.sql` | Complete initial database schema |
| Document number functions | `migrations/20260226200000_add_document_number_functions/migration.sql` | PostgreSQL functions for auto-generating document numbers |

### Database Utilities

#### QueryPagination

**File**: `src/infrastructure/database/utils/queryOptimizer.ts`

- `QueryPagination.fromPage(page, pageSize)` - Converts page/pageSize to skip/take
- `QueryPagination.create(options)` - Creates pagination options (supports cursor-based)
- `QueryPagination.createResult(data, total, options)` - Creates paginated result with `hasMore` and `nextCursor`

#### FieldSelector

- `FieldSelector.create(fields)` - Creates Prisma select objects
- `FieldSelector.createWithRelations(fields, relations)` - Creates select with nested relations

#### BatchOperations

- `BatchOperations.chunk(array, size)` - Splits arrays into chunks
- `BatchOperations.executeInBatches(items, batchSize, operation)` - Executes operations in batches
- `BatchOperations.batchCreate()`, `batchUpdate()`, `batchDelete()` - Batch CRUD operations
- Default batch size: 1000

#### StreamQuery

**File**: `src/infrastructure/database/utils/streamQuery.ts`

Cursor-based pagination for processing large result sets without loading everything into memory:

- `StreamQuery.stream(queryFn, options, onBatch)` - Stream with batch callback
- `StreamQuery.streamAll(queryFn, options)` - Collect all items (use with caution)
- `StreamQuery.createPrismaQuery(prismaQuery)` - Creates a cursor-based query function from Prisma findMany

### Seed Data

**File**: `src/infrastructure/database/prisma/seed.ts`

Orchestrates database seeding in two categories:

- **Auth seeds** (`seeds/auth/`) - Roles, permissions, role-permission mappings, system admin, users
- **Demo seeds** (`seeds/demo/`) - Organizations, companies, categories, warehouses, products, stock, movements, sales, transfers, returns, contacts, users, audit logs

---

## Resilience Patterns

All resilience utilities are located in `src/shared/infrastructure/resilience/` and are used by external service implementations throughout the infrastructure layer.

### Circuit Breaker

**File**: `src/shared/infrastructure/resilience/circuitBreaker.ts`

Prevents cascading failures by monitoring external service calls with three states:

| State | Behavior |
|---|---|
| `CLOSED` | Normal operation, all calls pass through |
| `OPEN` | Failures exceeded threshold, all calls fail fast with `CircuitBreakerOpenError` |
| `HALF_OPEN` | Recovery attempt, limited calls allowed to test if the service recovered |

**Configuration**:
- `failureThreshold` (default: 5) - Failures before opening
- `resetTimeout` (default: 30s) - Time before recovery attempt
- `successThreshold` (default: 2) - Successes in HALF_OPEN before closing

```typescript
const breaker = new CircuitBreaker({ name: 'EmailService', failureThreshold: 3 });
const result = await breaker.execute(() => emailService.send(email));
```

### Retry with Exponential Backoff

**File**: `src/shared/infrastructure/resilience/retry.ts`

Retries failing operations with increasing delays between attempts, including jitter to prevent thundering herd problems.

**Configuration**:
- `maxAttempts` (default: 3) - Maximum retry attempts
- `initialDelay` (default: 200ms) - First retry delay
- `backoffMultiplier` (default: 2) - Delay multiplier per attempt
- `maxDelay` (default: 10s) - Maximum delay cap
- `isRetryable` (optional) - Predicate to filter retryable errors

**Jitter formula**: `delay * (0.5 + random() * 0.5)` -- prevents synchronized retries

```typescript
const result = await retry(
  () => externalApi.call(),
  { maxAttempts: 3, name: 'ExternalAPI' }
);
```

### Timeout

**File**: `src/shared/infrastructure/resilience/timeout.ts`

Wraps an async operation with a timeout. If the operation exceeds the specified duration, it rejects with a `TimeoutError`.

```typescript
const result = await withTimeout(
  () => externalApi.call(),
  5000,  // 5 seconds
  'ExternalAPI'
);
```

### ResilientCall

**File**: `src/shared/infrastructure/resilience/resilientCall.ts`

Composes all three resilience patterns into a single entry point. Execution order: **Circuit Breaker -> Retry (with Timeout per attempt)**.

```typescript
const resilient = new ResilientCall({
  name: 'EmailService',
  timeoutMs: 5000,
  retry: { maxAttempts: 3 },
  circuitBreaker: { failureThreshold: 5 },
});

const result = await resilient.execute(() => emailService.send(email));
```

**Current Usage in the Codebase**:
- `EmailService` - 10s timeout, 3 retries (500ms initial), circuit breaker (5 failures, 60s reset)
- `NotificationService` - 15s timeout, 2 retries (1s initial), circuit breaker (10 failures, 120s reset)

---

## External Services

### EmailService

**File**: `src/infrastructure/externalServices/emailService.ts`

Implements `IEmailService` using the **Resend** API for transactional email delivery. Falls back to logging if `RESEND_API_KEY` is not configured.

**Email Templates** (`src/infrastructure/externalServices/templates/`):

| Template | Method | Description |
|---|---|---|
| `welcome.template.ts` | `sendWelcomeEmail()` | Welcome new user |
| `welcomeWithCredentials.template.ts` | `sendWelcomeWithCredentialsEmail()` | Welcome with temporary password |
| `passwordReset.template.ts` | `sendPasswordResetOtpEmail()` | OTP code for password reset |
| `accountActivation.template.ts` | `sendAccountActivationEmail()` | Account activated notification |
| `accountDeactivation.template.ts` | `sendAccountDeactivationEmail()` | Account deactivated notification |
| `adminNotification.template.ts` | `sendNewUserNotificationToAdmin()` | New user requires admin attention |
| `lowStockAlert.template.ts` | (used by NotificationService) | Low stock alert email |
| `stockAlertDigest.template.ts` | (used by NotificationService) | Consolidated stock alert digest |
| `emailLayout.template.ts` | Base layout | Shared HTML layout for all emails |

**Translations**: `templates/translations/email-translations.ts` - Bilingual email content (English/Spanish)

### NotificationService

**File**: `src/infrastructure/externalServices/notificationService.ts`

Implements `INotificationService` for sending stock-related notifications:

- `sendLowStockAlert(notification)` - Individual low stock alert
- `sendStockThresholdExceededAlert(notification)` - Overstock alert
- `sendStockAlertDigest(notification)` - Consolidated digest email with low stock + overstock items, supporting bilingual content (en/es)

Uses `ResilientCall` for reliable delivery.

### DocumentGenerationService

**File**: `src/infrastructure/externalServices/documentGenerationService.ts`

Implements `IDocumentGenerationService` for report generation:

- `generateExcel(request)` - Full-featured Excel (.xlsx) generation using ExcelJS with styled headers, zebra striping, auto-filters, summary sections, number formatting, and frozen panes
- `generatePDF(request)` - Mock PDF generation (text-based placeholder)

### FileParsingService

**File**: `src/infrastructure/externalServices/fileParsingService.ts`

Implements `IFileParsingService` for importing data from files:

- `validateFileFormat(file)` - Validates file size (max 10MB), extension (.xlsx, .xls, .csv), MIME type, and magic bytes for tamper detection
- `parseFile(file)` - Parses Excel (via ExcelJS) or CSV files into structured `{ headers, rows, totalRows, fileType }`

### ExcelGenerationService

**File**: `src/infrastructure/externalServices/excelGenerationService.ts`

Implements `IExcelGenerationService` for Excel export functionality.

---

## Health Check

The health check system follows Hexagonal Architecture with a clean separation between domain logic, application service, and infrastructure adapter.

### Domain Layer

**File**: `src/healthCheck/services/healthCheck.service.ts`

Pure functions for health check logic (no side effects):

- `createHealthCheckResult(status, version, environment)` - Creates basic health result
- `createDetailedHealthCheck(result, database, system, services, metrics?)` - Creates detailed result
- `determineOverallStatus(basic, database, system, services)` - Derives overall status from components
- `performHealthCheck(port, version, environment)` - Orchestrates a full health check

### Types

**File**: `src/healthCheck/types/healthCheck.types.ts`

| Type | Description |
|---|---|
| `HealthStatus` | `'healthy' \| 'unhealthy' \| 'degraded'` |
| `HealthCheckResult` | Basic status, timestamp, uptime, version, environment |
| `DatabaseHealth` | Status, response time, last check |
| `SystemHealth` | Memory (used/total/%), CPU (load/cores), Disk (used/total/%) |
| `DetailedHealthCheck` | Full result with database, system, and service statuses |

### Port Interface

**File**: `src/healthCheck/ports/healthCheck.port.ts`

```typescript
interface IHealthCheckPort {
  checkBasic(): Promise<HealthCheckResult>;
  checkDetailed(): Promise<DetailedHealthCheck>;
  checkDatabase(): Promise<boolean>;
  checkSystem(): Promise<boolean>;
}
```

### Application Service

**File**: `src/application/healthCheck/healthCheck.application.service.ts`

`HealthCheckApplicationService` coordinates health checks via dependency injection (token: `'HealthCheckPort'`):

- `getBasicHealth()` - Quick liveness check
- `getDetailedHealth()` - Full readiness check
- `getFullHealthCheck()` - Domain-orchestrated health check with version and environment

### Infrastructure Adapter

**File**: `src/infrastructure/healthCheck/healthCheck.adapter.ts`

`HealthCheckAdapter` implements `IHealthCheckPort`:

- **Database check** - Executes `SELECT 1` via Prisma, considers unhealthy if response > 1 second
- **System check** - Monitors heap memory usage, considers degraded above 90%
- **System metrics** - Reports heap memory usage, CPU core count (via `os.cpus()`)

---

## Jobs

### StockValidationJob

**File**: `src/infrastructure/jobs/stockValidationJob.ts`

A cron job (`@Cron(CronExpression.EVERY_HOUR)`) that validates stock levels across all organizations:

**Workflow**:

1. Fetches all active organizations
2. For each organization, checks `AlertConfiguration` (must be explicitly enabled)
3. Respects configured frequency (`EVERY_HOUR`, `EVERY_6_HOURS`, `EVERY_12_HOURS`, `EVERY_DAY`, `EVERY_WEEK`, etc.)
4. For each product-warehouse combination:
   - Evaluates stock level using `AlertService.evaluateStockLevel()`
   - Checks against `minQuantity`, `safetyStock`, `maxQuantity` from reorder rules
   - Emits `LowStockAlertEvent` or `StockThresholdExceededEvent` domain events
   - Respects severity-level configuration (`notifyLowStock`, `notifyCriticalStock`, `notifyOutOfStock`)
5. Sends consolidated digest email to configured recipients via `NotificationService`
6. Updates `lastRunAt` timestamp in `AlertConfiguration`

**Alert Severities**: `LOW`, `CRITICAL`, `OUT_OF_STOCK`

**Dependencies**: `ProductRepository`, `StockRepository`, `WarehouseRepository`, `ReorderRuleRepository`, `OrganizationRepository`, `DomainEventBus`, `PrismaService`, `NotificationService`
