> **[English](./reports.md)** | [Español](./reports.es.md)

# Reports Module

## Overview

The Reports module provides comprehensive reporting capabilities across inventory, sales, returns, and analytical domains. It supports viewing reports as JSON (for frontend tables), streaming large reports via NDJSON, and exporting to multiple file formats. Reports can be cached for performance and support reusable templates with saved parameters. The module follows Domain-Driven Design with value objects, aggregate roots, and domain events.

---

## Report Types

All 19 report types are defined in `src/report/domain/valueObjects/reportType.valueObject.ts`.

### Inventory Reports (7)

| Type | Title | Description |
|---|---|---|
| `AVAILABLE_INVENTORY` | Available Inventory Report | Current stock per product, warehouse, and location |
| `MOVEMENT_HISTORY` | Movement History Report | Detailed log of all inventory movements |
| `VALUATION` | Inventory Valuation Report | Stock valuation using weighted average cost (PPM) |
| `LOW_STOCK` | Low Stock Alert Report | Products below minimum or reorder point, with severity levels (CRITICAL, WARNING) |
| `MOVEMENTS` | Movements Summary Report | Aggregated movement data grouped by type, warehouse, or period |
| `FINANCIAL` | Financial Report | Revenue, cost, gross margin, and margin percentage |
| `TURNOVER` | Inventory Turnover Report | COGS, average inventory, turnover rate, days of inventory, and classification (SLOW_MOVING, NORMAL, FAST_MOVING) |

### Sales Reports (4)

| Type | Title | Description |
|---|---|---|
| `SALES` | Sales Report | Individual sales with totals, status, and customer info |
| `SALES_BY_PRODUCT` | Sales by Product Report | Revenue, quantity, margin by product |
| `SALES_BY_WAREHOUSE` | Sales by Warehouse Report | Sales aggregated by warehouse |
| `SALES_BY_CLIENT` | Sales by Client Report | Sales aggregated by client |

### Returns Reports (6)

| Type | Title | Description |
|---|---|---|
| `RETURNS` | Returns Report | All returns with details |
| `RETURNS_BY_TYPE` | Returns by Type Report | Returns aggregated by type (CUSTOMER/SUPPLIER) |
| `RETURNS_BY_PRODUCT` | Returns by Product Report | Returned quantity and value per product |
| `RETURNS_BY_SALE` | Returns by Sale Report | Returns associated to a specific sale |
| `RETURNS_CUSTOMER` | Customer Returns Report | Customer-originated returns |
| `RETURNS_SUPPLIER` | Supplier Returns Report | Supplier-originated returns |

### Analysis Reports (2)

| Type | Title | Description |
|---|---|---|
| `ABC_ANALYSIS` | ABC Analysis Report | Products classified A/B/C by revenue contribution with cumulative percentages |
| `DEAD_STOCK` | Dead Stock Report | Products without sales for a configurable number of days, with risk levels (HIGH, MEDIUM, LOW) |

---

## Export Formats

Defined in `src/report/domain/valueObjects/reportFormat.valueObject.ts`.

| Format | MIME Type | Extension | Implementation |
|---|---|---|---|
| `JSON` | `application/json` | `.json` | Native (built-in) |
| `CSV` | `text/csv` | `.csv` | Native (built-in) |
| `EXCEL` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` | Delegated to `IDocumentGenerationService` |
| `PDF` | `application/pdf` | `.pdf` | Delegated to `IDocumentGenerationService` |

The export service (`src/report/domain/services/export.service.ts`) generates CSV and JSON natively, while PDF and Excel generation is delegated to an external service port following hexagonal architecture.

---

## Report Status Lifecycle

Defined in `src/report/domain/valueObjects/reportStatus.valueObject.ts`.

```
PENDING --> GENERATING --> COMPLETED --> EXPORTED
   |            |
   v            v
 FAILED       FAILED
```

| Status | Description |
|---|---|
| `PENDING` | Report queued for generation |
| `GENERATING` | Report is being generated |
| `COMPLETED` | Report generated successfully |
| `FAILED` | Report generation failed (terminal state) |
| `EXPORTED` | Report exported to a file format |

---

## Report Parameters

Defined in `src/report/domain/valueObjects/reportParameters.valueObject.ts`. All parameters are optional and vary by report type.

| Parameter | Type | Description |
|---|---|---|
| `dateRange` | `{ startDate, endDate }` | Date filter; defaults to current quarter if omitted |
| `warehouseId` | `string` | Filter by warehouse |
| `productId` | `string` | Filter by product |
| `category` | `string` | Filter by category |
| `status` | `string` | Filter by status |
| `returnType` | `CUSTOMER` \| `SUPPLIER` | Filter returns by type |
| `groupBy` | `DAY` \| `WEEK` \| `MONTH` \| `PRODUCT` \| `WAREHOUSE` \| `CUSTOMER` \| `TYPE` | Group results |
| `period` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | Period for turnover analysis |
| `severity` | `CRITICAL` \| `WARNING` | Low stock severity filter |
| `deadStockDays` | `number` | Days without sales threshold (default: 90) |
| `includeInactive` | `boolean` | Include inactive products |

---

## Caching

Configured in `src/report/domain/constants/reportCache.constants.ts` and implemented by `ReportCacheService` (`src/report/domain/services/reportCache.service.ts`).

- **View reports:** Cached for 1 hour (default), only when they have a `dateRange` parameter.
- **Export reports:** Always cached for 24 hours (default).
- **Financial reports:** Shorter cache TTL of 30 minutes for views.
- Cache is enabled/disabled via the `REPORT_CACHE_ENABLED` environment variable.

---

## Use Cases

All use cases are in `src/application/reportUseCases/`.

| Use Case | File | Description |
|---|---|---|
| `ViewReportUseCase` | `viewReportUseCase.ts` | Generate report data as JSON for frontend table display, with cache support |
| `StreamReportUseCase` | `streamReportUseCase.ts` | Stream report data in NDJSON batches (100 rows per batch) |
| `ExportReportUseCase` | `exportReportUseCase.ts` | Export report to PDF, Excel, or CSV with optional audit metadata |
| `CreateReportTemplateUseCase` | `createReportTemplateUseCase.ts` | Create a reusable report template with name, type, and default parameters |
| `UpdateReportTemplateUseCase` | `updateReportTemplateUseCase.ts` | Update template name, description, parameters, or active status |
| `GetReportTemplatesUseCase` | `getReportTemplatesUseCase.ts` | List report templates with optional filters (type, active, createdBy) |
| `GetReportsUseCase` | `getReportsUseCase.ts` | Retrieve report execution history with filters (type, status, date range, generatedBy) |

---

## API Endpoints

### Report Controller (`src/interfaces/http/report/report.controller.ts`)

**Base path:** `/reports`
**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
**Interceptor:** `ReportLoggingInterceptor`

Permissions are enforced per report type. Sensitive reports (Financial, Valuation, Sales, Sales by Product, Sales by Warehouse) require `REPORTS:READ_SENSITIVE` instead of `REPORTS:READ`.

#### View Endpoints (GET - JSON)

| Endpoint | Report Type |
|---|---|
| `GET /reports/inventory/available/view` | `AVAILABLE_INVENTORY` |
| `GET /reports/inventory/movement-history/view` | `MOVEMENT_HISTORY` |
| `GET /reports/inventory/valuation/view` | `VALUATION` |
| `GET /reports/inventory/low-stock/view` | `LOW_STOCK` |
| `GET /reports/inventory/movements/view` | `MOVEMENTS` |
| `GET /reports/inventory/financial/view` | `FINANCIAL` |
| `GET /reports/inventory/turnover/view` | `TURNOVER` |
| `GET /reports/sales/view` | `SALES` |
| `GET /reports/sales/by-product/view` | `SALES_BY_PRODUCT` |
| `GET /reports/sales/by-warehouse/view` | `SALES_BY_WAREHOUSE` |
| `GET /reports/sales/by-client/view` | `SALES_BY_CLIENT` |
| `GET /reports/returns/view` | `RETURNS` |
| `GET /reports/returns/by-type/view` | `RETURNS_BY_TYPE` |
| `GET /reports/returns/by-product/view` | `RETURNS_BY_PRODUCT` |
| `GET /reports/returns/by-sale/:saleId/view` | `RETURNS_BY_SALE` |
| `GET /reports/returns/customer/view` | `RETURNS_CUSTOMER` |
| `GET /reports/returns/supplier/view` | `RETURNS_SUPPLIER` |
| `GET /reports/inventory/abc-analysis/view` | `ABC_ANALYSIS` |
| `GET /reports/inventory/dead-stock/view` | `DEAD_STOCK` |

#### Stream Endpoints (GET - NDJSON)

| Endpoint | Report Type |
|---|---|
| `GET /reports/inventory/available/stream` | `AVAILABLE_INVENTORY` |
| `GET /reports/sales/view/stream` | `SALES` |
| `GET /reports/returns/view/stream` | `RETURNS` |

#### Export Endpoints (POST - File Download)

Each report type has a corresponding export endpoint that accepts a body with `format` (`PDF`, `EXCEL`, `CSV`), optional `parameters`, and `options`.

| Endpoint | Report Type |
|---|---|
| `POST /reports/inventory/available/export` | `AVAILABLE_INVENTORY` |
| `POST /reports/inventory/movement-history/export` | `MOVEMENT_HISTORY` |
| `POST /reports/inventory/valuation/export` | `VALUATION` |
| `POST /reports/inventory/low-stock/export` | `LOW_STOCK` |
| `POST /reports/inventory/movements/export` | `MOVEMENTS` |
| `POST /reports/inventory/financial/export` | `FINANCIAL` |
| `POST /reports/inventory/turnover/export` | `TURNOVER` |
| `POST /reports/sales/export` | `SALES` |
| `POST /reports/sales/by-product/export` | `SALES_BY_PRODUCT` |
| `POST /reports/sales/by-warehouse/export` | `SALES_BY_WAREHOUSE` |
| `POST /reports/sales/by-client/export` | `SALES_BY_CLIENT` |
| `POST /reports/returns/export` | `RETURNS` |
| `POST /reports/returns/by-type/export` | `RETURNS_BY_TYPE` |
| `POST /reports/returns/by-product/export` | `RETURNS_BY_PRODUCT` |
| `POST /reports/inventory/abc-analysis/export` | `ABC_ANALYSIS` |
| `POST /reports/inventory/dead-stock/export` | `DEAD_STOCK` |

#### Audit Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports/history` | Get report execution history with filters |

### Report Template Controller (`src/interfaces/http/report/reportTemplate.controller.ts`)

**Base path:** `/report-templates`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/report-templates` | List all templates (filterable by type, activeOnly, createdBy) |
| `GET` | `/report-templates/active` | List active templates only |
| `GET` | `/report-templates/by-type/:type` | List templates by report type |
| `POST` | `/report-templates` | Create a new template |
| `PUT` | `/report-templates/:id` | Update an existing template |

---

## Domain Services

| Service | File | Description |
|---|---|---|
| `ReportGenerationService` | `src/report/domain/services/reportGeneration.service.ts` | Generates raw report data by querying repository ports (Product, Warehouse, Movement, Sale, Return) |
| `ReportViewService` | `src/report/domain/services/reportView.service.ts` | Transforms raw data into frontend-ready structure with columns, rows, metadata, and summary |
| `ExportService` | `src/report/domain/services/export.service.ts` | Exports report data to CSV, JSON (native), PDF, Excel (delegated) |
| `ReportCacheService` | `src/report/domain/services/reportCache.service.ts` | Manages report caching with configurable TTL per report type |

---

## File Reference

| Layer | Path |
|---|---|
| Module | `src/report/report.module.ts` |
| Entities | `src/report/domain/entities/report.entity.ts`, `reportTemplate.entity.ts` |
| Value Objects | `src/report/domain/valueObjects/reportType.valueObject.ts`, `reportFormat.valueObject.ts`, `reportStatus.valueObject.ts`, `reportParameters.valueObject.ts` |
| Domain Services | `src/report/domain/services/*.ts` |
| Constants | `src/report/domain/constants/reportCache.constants.ts`, `reportPermissions.constants.ts` |
| Events | `src/report/domain/events/*.ts` |
| DTOs | `src/report/dto/viewReport.dto.ts`, `exportReport.dto.ts`, `reportTemplate.dto.ts` |
| Use Cases | `src/application/reportUseCases/*.ts` |
| Controllers | `src/interfaces/http/report/report.controller.ts`, `reportTemplate.controller.ts` |
| Mappers | `src/report/mappers/report.mapper.ts`, `reportTemplate.mapper.ts` |
| Interceptors | `src/report/interceptors/reportLogging.interceptor.ts` |
| Decorators | `src/report/decorators/requireReportPermission.decorator.ts` |
