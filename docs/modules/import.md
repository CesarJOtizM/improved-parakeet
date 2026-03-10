> **[English](./import.md)** | [Español](./import.es.md)

# Import Module

## Overview

The Import module enables bulk data ingestion from Excel (`.xlsx`) and CSV files. It supports five import types and follows a two-phase workflow: **Preview** (validate without persisting) and **Execute** (validate, create, and process in one operation). Alternatively, a step-by-step flow is available: Create Batch, Validate, then Process. The module uses domain-driven design with entities, value objects, domain events, and domain services.

---

## Supported Import Types

Defined in `src/import/domain/valueObjects/importType.valueObject.ts`.

| Type | Description |
|---|---|
| `PRODUCTS` | Bulk import of products with SKU, name, unit, barcode, brand, category, etc. |
| `MOVEMENTS` | Inventory movements (IN, OUT, ADJUST_IN, ADJUST_OUT) |
| `WAREHOUSES` | Warehouse definitions with code, name, description, and address |
| `STOCK` | Initial stock levels per product and warehouse |
| `TRANSFERS` | Inter-warehouse transfers |

---

## Workflow

### Option A: Preview then Execute

This is the recommended flow for end users.

```
1. POST /imports/preview          --> Validate file, return summary (no persistence)
2. POST /imports/execute          --> Validate + Create Batch + Process (all-in-one)
```

**Preview** parses the file, validates headers against the expected template structure, and validates every row. It returns a summary with `canBeProcessed`, `totalRows`, `validRows`, `invalidRows`, structure errors, and per-row errors -- without creating any database records.

**Execute** performs the full import pipeline: type validation, file format validation, header structure validation, row-by-row data validation, batch creation, and row processing. If ANY validation error exists, the import is rejected immediately with no persistence.

### Option B: Step-by-Step

```
1. POST /imports                  --> Create an empty batch (PENDING)
2. POST /imports/:id/validate     --> Upload file and validate (PENDING --> VALIDATING --> VALIDATED)
3. POST /imports/:id/process      --> Process validated rows (VALIDATED --> PROCESSING --> COMPLETED/FAILED)
```

---

## Import Status Lifecycle

Defined in `src/import/domain/valueObjects/importStatus.valueObject.ts`.

```
PENDING --> VALIDATING --> VALIDATED --> PROCESSING --> COMPLETED
   |            |                          |
   v            v                          v
 FAILED       FAILED                     FAILED
```

| Status | Description |
|---|---|
| `PENDING` | Batch created, awaiting file upload |
| `VALIDATING` | File is being parsed and validated |
| `VALIDATED` | Validation complete; rows counted as valid/invalid |
| `PROCESSING` | Valid rows are being processed into domain entities |
| `COMPLETED` | All rows processed successfully (terminal) |
| `FAILED` | An error occurred during validation or processing (terminal) |

---

## Use Cases

All use cases are in `src/application/importUseCases/`.

| Use Case | File | Description |
|---|---|---|
| `PreviewImportUseCase` | `previewImportUseCase.ts` | Validate file and return summary without persisting. Checks type, file format, header structure, and row data. |
| `ExecuteImportUseCase` | `executeImportUseCase.ts` | Full import pipeline: validate, create batch, process all rows. Rejects if any validation errors. |
| `CreateImportBatchUseCase` | `createImportBatchUseCase.ts` | Create an empty import batch record in PENDING status. |
| `ValidateImportUseCase` | `validateImportUseCase.ts` | Upload file to an existing batch, parse and validate. Transitions PENDING to VALIDATED. |
| `ProcessImportUseCase` | `processImportUseCase.ts` | Process valid rows of a VALIDATED batch. Uses `ImportRowProcessorFactory` for type-specific processing. |
| `GetImportStatusUseCase` | `getImportStatusUseCase.ts` | Get current status and progress of an import batch. |
| `ListImportBatchesUseCase` | `listImportBatchesUseCase.ts` | List import batches with pagination and filters (type, status). |
| `DownloadImportTemplateUseCase` | `downloadImportTemplateUseCase.ts` | Generate and download a template file (CSV or XLSX) for a given import type. |
| `DownloadErrorReportUseCase` | `downloadErrorReportUseCase.ts` | Download error report for a batch showing row-level validation errors. |

---

## API Endpoints

**Base path:** `/imports`
**Controller:** `src/interfaces/http/import/import.controller.ts`
**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
**Permission required:** `PRODUCTS_IMPORT`

| Method | Path | Description |
|---|---|---|
| `POST` | `/imports/preview` | Preview and validate file without persisting (multipart/form-data, max 10MB) |
| `POST` | `/imports/execute` | Execute complete import (validate + create + process) in one operation |
| `POST` | `/imports` | Create empty import batch |
| `POST` | `/imports/:id/validate` | Upload file and validate against an existing batch (multipart/form-data) |
| `POST` | `/imports/:id/process` | Process a validated batch |
| `GET` | `/imports` | List import batches with pagination and filters |
| `GET` | `/imports/:id/status` | Get import batch status and progress |
| `GET` | `/imports/templates/:type` | Download import template (CSV or XLSX) |
| `GET` | `/imports/:id/errors` | Download error report for an import batch |

### Query Parameters

**List batches (`GET /imports`):**

| Parameter | Type | Description |
|---|---|---|
| `page` | `number` | Page number |
| `limit` | `number` | Items per page |
| `type` | `PRODUCTS` \| `MOVEMENTS` \| `WAREHOUSES` \| `STOCK` \| `TRANSFERS` | Filter by type |
| `status` | `PENDING` \| `VALIDATING` \| `VALIDATED` \| `PROCESSING` \| `COMPLETED` \| `FAILED` | Filter by status |

**Download template (`GET /imports/templates/:type`):**

| Parameter | Type | Description |
|---|---|---|
| `format` | `xlsx` \| `csv` | Template format (default: `csv`) |

---

## Templates

Templates are generated by `ImportTemplateService` (`src/import/domain/services/importTemplate.service.ts`) using the column definitions from `ImportValidationService` (`src/import/domain/services/importValidation.service.ts`).

Each template includes header rows and example data rows. Templates are available in CSV (with UTF-8 BOM for Excel compatibility) and XLSX formats.

### Products Template

| Column | Type | Required | Description |
|---|---|---|---|
| `SKU` | string | Yes | Unique product SKU |
| `Name` | string | Yes | Product name |
| `Description` | string | No | Product description |
| `Unit Code` | string | Yes | Unit code (UND, KG, etc.) |
| `Unit Name` | string | Yes | Unit name |
| `Unit Precision` | number | Yes | Decimal precision |
| `Barcode` | string | No | Product barcode |
| `Brand` | string | No | Brand |
| `Model` | string | No | Model |
| `Status` | enum | No | `ACTIVE`, `INACTIVE`, `DISCONTINUED` |
| `Cost Method` | enum | No | `AVG`, `FIFO` |
| `Category` | string | No | Category |
| `Company Code` | string | No | Company code for multi-company orgs |

### Movements Template

| Column | Type | Required | Description |
|---|---|---|---|
| `Type` | enum | Yes | `IN`, `OUT`, `ADJUST_IN`, `ADJUST_OUT` |
| `Warehouse Code` | string | Yes | Warehouse code |
| `Product SKU` | string | Yes | Product SKU |
| `Location Code` | string | No | Location code |
| `Quantity` | number | Yes | Quantity |
| `Unit Cost` | number | No | Unit cost |
| `Currency` | string | No | Currency code (e.g., COP) |
| `Reference` | string | No | Reference number |
| `Reason` | string | No | Movement reason |
| `Note` | string | No | Additional notes |

### Warehouses Template

| Column | Type | Required | Description |
|---|---|---|---|
| `Code` | string | Yes | Unique warehouse code |
| `Name` | string | Yes | Warehouse name |
| `Description` | string | No | Description |
| `Address` | string | No | Physical address |

### Stock Template

| Column | Type | Required | Description |
|---|---|---|---|
| `Product SKU` | string | Yes | Product SKU |
| `Warehouse Code` | string | Yes | Warehouse code |
| `Location Code` | string | No | Location code |
| `Quantity` | number | Yes | Stock quantity |
| `Unit Cost` | number | No | Unit cost |
| `Currency` | string | No | Currency code |

### Transfers Template

| Column | Type | Required | Description |
|---|---|---|---|
| `From Warehouse Code` | string | Yes | Source warehouse |
| `To Warehouse Code` | string | Yes | Destination warehouse |
| `Product SKU` | string | Yes | Product SKU |
| `From Location Code` | string | No | Source location |
| `To Location Code` | string | No | Destination location |
| `Quantity` | number | Yes | Transfer quantity |
| `Note` | string | No | Transfer note |

---

## Domain Entities

### ImportBatch (`src/import/domain/entities/importBatch.entity.ts`)

The aggregate root representing a bulk import operation. Manages status transitions and contains `ImportRow` entities.

**Properties:** `type`, `status`, `fileName`, `totalRows`, `processedRows`, `validRows`, `invalidRows`, `startedAt`, `validatedAt`, `completedAt`, `errorMessage`, `note`, `createdBy`

### ImportRow (`src/import/domain/entities/importRow.entity.ts`)

Represents a single row in an import file. Contains row data and its validation result.

**Properties:** `rowNumber`, `data` (key-value map), `validationResult`

---

## Domain Services

| Service | File | Description |
|---|---|---|
| `ImportValidationService` | `src/import/domain/services/importValidation.service.ts` | Validates file structure (headers) and row data against template definitions. Type-checks strings, numbers, dates, booleans, and enums. |
| `ImportTemplateService` | `src/import/domain/services/importTemplate.service.ts` | Generates CSV/XLSX templates with headers and example data. Provides column descriptions for documentation. |
| `ImportProcessingService` | `src/import/domain/services/importProcessing.service.ts` | Processes batch rows using a pluggable `RowProcessor` function. Supports progress callbacks and checkpoint intervals. Provides type-specific data transformation methods (`toProductData`, `toMovementData`, `toWarehouseData`, `toStockData`, `toTransferData`). |
| `ImportErrorReportService` | `src/import/domain/services/importErrorReport.service.ts` | Generates downloadable error reports for import batches. |
| `ImportRowProcessorFactory` | `src/import/application/services/importRowProcessorFactory.ts` | Factory that creates type-specific row processors for each import type. |

---

## Domain Events

| Event | File | Trigger |
|---|---|---|
| `ImportStartedEvent` | `src/import/domain/events/importStarted.event.ts` | Batch transitions to VALIDATING |
| `ImportValidatedEvent` | `src/import/domain/events/importValidated.event.ts` | Batch validation completes |
| `ImportCompletedEvent` | `src/import/domain/events/importCompleted.event.ts` | Batch processing completes successfully |

---

## File Reference

| Layer | Path |
|---|---|
| Entities | `src/import/domain/entities/importBatch.entity.ts`, `importRow.entity.ts` |
| Value Objects | `src/import/domain/valueObjects/importType.valueObject.ts`, `importStatus.valueObject.ts`, `validationResult.valueObject.ts` |
| Domain Services | `src/import/domain/services/*.ts` |
| Application Services | `src/import/application/services/importRowProcessorFactory.ts` |
| Events | `src/import/domain/events/*.ts` |
| Repository Port | `src/import/domain/ports/repositories/iImportBatchRepository.port.ts` |
| DTOs | `src/import/dto/*.ts` |
| Use Cases | `src/application/importUseCases/*.ts` |
| Controller | `src/interfaces/http/import/import.controller.ts` |
| HTTP Module | `src/interfaces/http/import/importHttp.module.ts` |
