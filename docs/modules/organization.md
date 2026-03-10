> **[English](./organization.md)** | [Español](./organization.es.md)

# Organization Module

## Overview

The Organization module is the foundation of the multi-tenancy architecture in Nevada Inventory. It manages the lifecycle of organizations (tenants), their settings, dashboard analytics, and audit trail capabilities. Every entity in the system is scoped to an organization via an `orgId` foreign key, ensuring strict data isolation between tenants.

---

## Multi-tenancy

### Tenant Identification

Organizations are identified through multiple mechanisms, resolved in priority order by the `@OrgId()` decorator (`src/shared/decorators/orgId.decorator.ts`):

1. **`req.orgId`** - Set by TenantMiddleware (highest priority)
2. **`X-Organization-ID` header** - Direct organization ID
3. **`X-Organization-Slug` header** - Resolved to ID via repository lookup
4. **Request body `orgId`** - Slugs are auto-resolved to IDs
5. **Subdomain extraction** - From `Host` header (e.g., `acme.example.com`)
6. **Fallback** - `DEFAULT_ORG_ID` environment variable or `'dev-org'`

### Data Isolation

Every database query is scoped by `orgId`, enforced at the repository layer. The `Entity` base class (`src/shared/domain/base/entity.base.ts`) includes `_orgId` as a core property on all domain entities.

---

## Organization Settings

The `Organization` entity stores a flexible `settings: Record<string, unknown>` JSON field that supports dynamic configuration per tenant. Current supported settings:

| Setting Key | Type | Description |
|---|---|---|
| `pickingEnabled` | `boolean` | Whether picking workflow is active |
| `pickingMode` | `'OFF' \| 'OPTIONAL' \| 'REQUIRED_FULL' \| 'REQUIRED_PARTIAL'` | Picking enforcement level |
| `multiCompanyEnabled` | `boolean` | Enable business lines (companies) |
| `language` | `string` | Organization language preference |

### Organization Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Organization display name |
| `taxId` | `string?` | Tax identification number |
| `timezone` | `string` | IANA timezone (e.g., `America/Santiago`) |
| `currency` | `string` | ISO 4217 currency code (e.g., `CLP`, `USD`) |
| `dateFormat` | `string` | Date display format (e.g., `YYYY-MM-DD`) |
| `isActive` | `boolean` | Whether the organization is active |

---

## Dashboard

The dashboard use case provides real-time analytics scoped to an organization, with optional company-level filtering for multi-company tenants.

### Metrics Provided

- **Inventory summary** - Total products, stock quantity, inventory value
- **Low stock count** - Products below reorder thresholds
- **Monthly sales** - Count and revenue for the current month
- **Sales trend** - 7-day sales chart data (date, count, revenue)
- **Top products** - Top 5 products by revenue (current month)
- **Stock by warehouse** - Quantity and value per warehouse
- **Recent activity** - Last 5 events across sales, movements, returns, transfers

### Key File

- `src/application/dashboardUseCases/getDashboardMetricsUseCase.ts` - `GetDashboardMetricsUseCase`

---

## Audit

The audit subsystem provides a comprehensive trail of all actions performed within the system, including HTTP requests, domain actions, and domain events.

### Audit Entity

`AuditLog` (`src/shared/audit/domain/entities/auditLog.entity.ts`) captures:

- `entityType` (Value Object) - The type of entity affected (e.g., `Product`, `Sale`, `System`)
- `entityId` - The specific entity ID
- `action` (Value Object) - What happened (e.g., `CREATE`, `UPDATE`, `HTTP_REQUEST`)
- `performedBy` - User ID who performed the action
- `metadata` (Value Object) - Structured JSON data with automatic sensitive field redaction
- `ipAddress`, `userAgent` - Client context
- `httpMethod`, `httpUrl`, `httpStatusCode`, `duration` - HTTP request details

### Audit Service

`AuditService` (`src/shared/audit/domain/services/auditService.ts`) provides static methods for non-blocking audit logging:

- `logAction()` - Log domain actions
- `logEvent()` - Log domain events
- `logHttpRequest()` - Log HTTP requests
- `logError()` - Log errors with context

Sensitive fields (`password`, `token`, `apiKey`, `creditCard`, etc.) are automatically redacted from metadata using `sanitizeMetadata()`.

### Audit Specifications

The audit module uses the Specification Pattern for composable query filters (`src/shared/audit/domain/specifications/auditLogSpecifications.ts`):

- `AuditLogByEntityTypeSpecification`
- `AuditLogByEntityIdSpecification`
- `AuditLogByActionSpecification`
- `AuditLogByUserSpecification`
- `AuditLogByHttpMethodSpecification`
- `AuditLogByDateRangeSpecification`

Specifications are combined with AND/OR/NOT logic for complex queries.

---

## Use Cases

### Organization Use Cases

| Use Case | File | Description |
|---|---|---|
| `CreateOrganizationUseCase` | `src/application/organizationUseCases/createOrganizationUseCase.ts` | Creates organization with optional admin user and ADMIN role assignment |
| `GetOrganizationByIdUseCase` | `src/application/organizationUseCases/getOrganizationByIdUseCase.ts` | Retrieves organization by ID or slug (auto-detected) |
| `UpdateOrganizationUseCase` | `src/application/organizationUseCases/updateOrganizationUseCase.ts` | Updates organization properties with slug/domain conflict validation |
| `TogglePickingSettingUseCase` | `src/application/organizationUseCases/togglePickingSettingUseCase.ts` | Configures picking workflow mode (OFF, OPTIONAL, REQUIRED_FULL, REQUIRED_PARTIAL) |
| `ToggleMultiCompanySettingUseCase` | `src/application/organizationUseCases/toggleMultiCompanySettingUseCase.ts` | Enables/disables multi-company (business lines) feature |

### Dashboard Use Cases

| Use Case | File | Description |
|---|---|---|
| `GetDashboardMetricsUseCase` | `src/application/dashboardUseCases/getDashboardMetricsUseCase.ts` | Retrieves comprehensive dashboard metrics with optional company filter |

### Audit Use Cases

| Use Case | File | Description |
|---|---|---|
| `GetAuditLogsUseCase` | `src/application/auditUseCases/getAuditLogsUseCase.ts` | Paginated audit logs with composable specification filters |
| `GetAuditLogUseCase` | `src/application/auditUseCases/getAuditLogUseCase.ts` | Single audit log by ID |
| `GetEntityHistoryUseCase` | `src/application/auditUseCases/getEntityHistoryUseCase.ts` | Change history for a specific entity (type + ID) |
| `GetUserActivityUseCase` | `src/application/auditUseCases/getUserActivityUseCase.ts` | All actions performed by a specific user |

---

## Entities

### Organization Entity

- **File**: `src/organization/domain/entities/organization.entity.ts`
- **Base Class**: `AggregateRoot<IOrganizationProps>` (supports domain events)
- **Key Methods**: `create()`, `reconstitute()`, `update()`, `updateSettings()`, `getSetting()`, `setSetting()`, `activate()`, `deactivate()`

### AuditLog Entity

- **File**: `src/shared/audit/domain/entities/auditLog.entity.ts`
- **Base Class**: `Entity<IAuditLogProps>`
- **Value Objects**: `EntityType`, `AuditAction`, `AuditMetadata`

### Value Objects

- `EntityType` (`src/shared/audit/domain/valueObjects/entityType.valueObject.ts`) - Validated entity type names
- `AuditAction` (`src/shared/audit/domain/valueObjects/auditAction.valueObject.ts`) - Validated audit action names
- `AuditMetadata` (`src/shared/audit/domain/valueObjects/auditMetadata.valueObject.ts`) - Immutable metadata container with JSON serialization

---

## API Endpoints

All organization endpoints require `SYSTEM_ADMIN` role and JWT authentication.

### Organization Controller

**File**: `src/organization/organization.controller.ts`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/organizations` | Create new organization (with optional admin user) |
| `GET` | `/organizations/:id` | Get organization by ID or slug |
| `PUT` | `/organizations/:id` | Update organization |
| `PATCH` | `/organizations/:id/settings/picking` | Toggle picking setting |
| `PATCH` | `/organizations/:id/settings/multi-company` | Toggle multi-company setting |

### DTOs

- `CreateOrganizationDto` (`src/organization/dto/createOrganization.dto.ts`) - Includes optional `AdminUserDto` for bootstrapping
- `UpdateOrganizationDto` (`src/organization/dto/updateOrganization.dto.ts`) - All fields optional for partial updates
- `CreateOrganizationResponseDto`, `GetOrganizationResponseDto`, `UpdateOrganizationResponseDto` - Response wrappers

### Module Registration

**File**: `src/organization/organization.module.ts`

The `OrganizationModule` registers use cases, binds `OrganizationRepository` to the `'OrganizationRepository'` injection token, and exports it for use by other modules.
