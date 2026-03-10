> **[English](./returns.md)** | [Español](./returns.es.md)

# Returns Module

## Overview

The Returns module manages customer returns (products returned by customers) and supplier returns (products returned to suppliers). It supports the full lifecycle from draft creation through confirmation with automatic inventory adjustment. The module follows Domain-Driven Design (DDD) with Hexagonal Architecture, mirroring the patterns used in the Sales module.

---

## Architecture

```
src/returns/                         # Domain + DTO + Mapper layer
  domain/
    entities/
      return.entity.ts               # Return (AggregateRoot)
      returnLine.entity.ts           # ReturnLine (Entity)
    valueObjects/
      returnStatus.valueObject.ts    # ReturnStatus (ValueObject)
      returnNumber.valueObject.ts    # ReturnNumber (ValueObject)
      returnType.valueObject.ts      # ReturnType (ValueObject)
      returnReason.valueObject.ts    # ReturnReason (ValueObject)
    events/
      returnCreated.event.ts         # ReturnCreatedEvent
      returnConfirmed.event.ts       # ReturnConfirmedEvent
      returnCancelled.event.ts       # ReturnCancelledEvent
      inventoryInGenerated.event.ts  # InventoryInGeneratedEvent
      inventoryOutGenerated.event.ts # InventoryOutGeneratedEvent
    services/
      inventoryIntegration.service.ts # Generates Movement from Return
      returnCalculation.service.ts    # Pure calculation functions
      returnNumberGeneration.service.ts # Atomic number generation
      returnValidation.service.ts     # Business rule & quantity validation
    ports/repositories/
      iReturnRepository.port.ts       # Repository port interface
  dto/
    createReturn.dto.ts              # CreateReturnDto, CreateReturnLineDto
    updateReturn.dto.ts              # UpdateReturnDto
    getReturns.dto.ts                # GetReturnsDto (query filters)
  mappers/
    return.mapper.ts                 # ReturnMapper (DTO <-> Domain)
  returns.module.ts                  # NestJS module definition

src/application/returnUseCases/      # Application layer (use cases)
src/interfaces/http/returns/         # HTTP adapter layer
  returns.controller.ts              # REST controller
  returnsHttp.module.ts              # HTTP module
```

### Key Dependencies

- **InventoryModule**: MovementRepository, StockRepository, ProductRepository, WarehouseRepository
- **SalesModule**: SaleRepository (for customer return quantity validation)
- **AuthenticationModule**: DomainEventDispatcher, JWT guards

---

## Workflow

### State Machine

```
+----------+
|  DRAFT   |
+----+-----+
     |
     | confirm()        cancel()
     +--------+---------+
     |                   |
+----v------+      +----v-------+
| CONFIRMED |      | CANCELLED  |
+----+------+      +------------+
     |
     | cancel()
     |
+----v-------+
| CANCELLED  |
+------------+
```

### Allowed Transitions

| From | To | Method | Condition |
|---|---|---|---|
| DRAFT | CONFIRMED | `confirm()` | Must have >= 1 line with positive quantities; return quantity must not exceed original sale/purchase quantities |
| DRAFT | CANCELLED | `cancel()` | -- |
| CONFIRMED | CANCELLED | `cancel()` | -- |

### Return Types

The module supports two fundamentally different return types, each with distinct validation rules and inventory effects:

| Type | Value | Required Field | Inventory Effect |
|---|---|---|---|
| **Customer Return** | `RETURN_CUSTOMER` | `saleId` | **IN movement** (stock increases) |
| **Supplier Return** | `RETURN_SUPPLIER` | `sourceMovementId` | **OUT movement** (stock decreases) |

### Return Number Format

Pattern: `RETURN-YYYY-NNN` (e.g., `RETURN-2026-001`)
- Generated atomically via database sequence to prevent race conditions.

---

## Use Cases

| Use Case | File | Description |
|---|---|---|
| **CreateReturnUseCase** | `createReturnUseCase.ts` | Creates a new return in DRAFT status. Validates warehouse exists. Enforces type-specific requirements (saleId for customer returns, sourceMovementId for supplier returns). Generates atomic return number. Optionally includes initial lines. |
| **GetReturnsUseCase** | `getReturnsUseCase.ts` | Lists returns with pagination and filtering by status, type, warehouse, company, date range, and free-text search on return number. Supports sorting. |
| **GetReturnByIdUseCase** | `getReturnByIdUseCase.ts` | Retrieves a single return with all lines and resolved names. |
| **UpdateReturnUseCase** | `updateReturnUseCase.ts` | Updates return metadata (reason, note). Only allowed in DRAFT status. |
| **ConfirmReturnUseCase** | `confirmReturnUseCase.ts` | Confirms a DRAFT return within an atomic transaction: validates quantities against original sale/purchase, creates the appropriate movement (IN or OUT), adjusts stock, and optionally marks the linked sale/movement as RETURNED. |
| **CancelReturnUseCase** | `cancelReturnUseCase.ts` | Cancels a return (from DRAFT or CONFIRMED). Records reason. |
| **AddReturnLineUseCase** | `addReturnLineUseCase.ts` | Adds a line to a DRAFT return. Uses atomic repository method to prevent race conditions. |
| **RemoveReturnLineUseCase** | `removeReturnLineUseCase.ts` | Removes a line from a DRAFT return. |
| **GetReturnsBySaleUseCase** | `getReturnsBySaleUseCase.ts` | Retrieves all returns associated with a specific sale. Validates that the sale exists. Used by the Sales controller (`GET /sales/:id/returns`). |
| **GetReturnsByMovementUseCase** | `getReturnsByMovementUseCase.ts` | Retrieves all returns associated with a specific source movement. Validates that the movement exists. |

---

## Entities & Value Objects

### Return (Aggregate Root)

File: `src/returns/domain/entities/return.entity.ts`

The `Return` class is the aggregate root. It extends `AggregateRoot` and manages a collection of `ReturnLine` entities. It validates type-specific requirements on creation (e.g., customer returns must have a `saleId`).

**Key Properties:**
- `returnNumber: ReturnNumber` - Unique return identifier (RETURN-YYYY-NNN)
- `status: ReturnStatus` - Current lifecycle status (DRAFT, CONFIRMED, CANCELLED)
- `type: ReturnType` - Return type (RETURN_CUSTOMER or RETURN_SUPPLIER)
- `reason: ReturnReason` - Return reason (free text, max 500 chars)
- `warehouseId: string` - Target warehouse
- `saleId?: string` - Linked sale (for customer returns)
- `sourceMovementId?: string` - Linked purchase movement (for supplier returns)
- `returnMovementId?: string` - Generated inventory movement (set on confirm)
- `note?: string` - Additional notes
- Audit fields: `createdBy`, `confirmedAt`, `cancelledAt`
- `readMetadata?: IReturnReadMetadata` - Transient read-model data (warehouseName, saleNumber, lineProducts), not persisted

### ReturnLine (Entity)

File: `src/returns/domain/entities/returnLine.entity.ts`

Represents a single product line within a return. Supports different pricing depending on return type.

**Properties:**
- `productId: string` - Product being returned
- `locationId?: string` - Optional warehouse location (optional for MVP)
- `quantity: Quantity` - Quantity returned (must be positive)
- `originalSalePrice?: SalePrice` - Original sale price (required for customer returns)
- `originalUnitCost?: Money` - Original unit cost (required for supplier returns)
- `currency: string` - Currency code (required)
- `extra?: Record<string, unknown>` - Additional metadata

### Value Objects

| Value Object | File | Description |
|---|---|---|
| **ReturnStatus** | `returnStatus.valueObject.ts` | Enum: DRAFT, CONFIRMED, CANCELLED. Enforces valid transitions via `canConfirm()` (from DRAFT only) and `canCancel()` (from DRAFT or CONFIRMED). |
| **ReturnNumber** | `returnNumber.valueObject.ts` | Format `RETURN-YYYY-NNN` (3-6 digit sequence). Validates format on construction. |
| **ReturnType** | `returnType.valueObject.ts` | Enum: `RETURN_CUSTOMER`, `RETURN_SUPPLIER`. Provides `isCustomerReturn()` and `isSupplierReturn()` helpers. |
| **ReturnReason** | `returnReason.valueObject.ts` | Free-text string (nullable). Max 500 characters. Cannot be empty if provided. |

---

## Domain Services

| Service | File | Description |
|---|---|---|
| **InventoryIntegrationService** | `inventoryIntegration.service.ts` | Two methods: `generateMovementFromCustomerReturn()` creates an IN movement (reason: `RETURN_CUSTOMER`); `generateMovementFromSupplierReturn()` creates an OUT movement (reason: `RETURN_SUPPLIER`). Both map return lines to movement lines. |
| **ReturnCalculationService** | `returnCalculation.service.ts` | Pure functions for calculating subtotal and total with optional adjustments. Returns `null` when no lines have pricing data. |
| **ReturnNumberGenerationService** | `returnNumberGeneration.service.ts` | Generates the next atomic return number via the repository's `getNextReturnNumber()` method. |
| **ReturnValidationService** | `returnValidation.service.ts` | Validates confirmation prerequisites, cancellation rules, customer return quantities (against sale lines), and supplier return quantities (against purchase movement lines). |

---

## Domain Events

| Event | Trigger | Description |
|---|---|---|
| `ReturnCreatedEvent` | `Return.create()` | Emitted when a new return is created. Includes returnType, saleId, and sourceMovementId. |
| `ReturnConfirmedEvent` | `Return.confirm()` | Emitted when a return is confirmed. Includes `returnMovementId`. |
| `ReturnCancelledEvent` | `Return.cancel()` | Emitted when a return is cancelled. Includes optional reason. |
| `InventoryInGeneratedEvent` | `ConfirmReturnUseCase` | Emitted after a customer return generates an IN movement (stock added). |
| `InventoryOutGeneratedEvent` | `ConfirmReturnUseCase` | Emitted after a supplier return generates an OUT movement (stock removed). |

---

## API Endpoints

Base path: `/returns`

All endpoints require JWT authentication and role-based authorization.

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/returns` | `RETURNS_CREATE` | Create new return (DRAFT) |
| `GET` | `/returns` | `RETURNS_READ` | List returns with filters and pagination |
| `GET` | `/returns/:id` | `RETURNS_READ` | Get return by ID with lines |
| `PUT` | `/returns/:id` | `RETURNS_UPDATE` | Update return metadata (DRAFT only) |
| `POST` | `/returns/:id/confirm` | `RETURNS_CONFIRM` | Confirm return and generate inventory movement |
| `POST` | `/returns/:id/cancel` | `RETURNS_CANCEL` | Cancel return (DRAFT/CONFIRMED) |
| `POST` | `/returns/:id/lines` | `RETURNS_UPDATE` | Add line to return (DRAFT only) |
| `DELETE` | `/returns/:id/lines/:lineId` | `RETURNS_UPDATE` | Remove line from return (DRAFT only) |

### Additional Cross-Module Endpoints

These endpoints are exposed via the Sales controller but delegate to Returns use cases:

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/sales/:id/returns` | `SALES_READ` | Get all returns for a sale |

---

## Integration with Inventory

### Customer Return Confirmation Flow

When a customer return is confirmed (`ConfirmReturnUseCase`), the following happens within a single atomic transaction (`UnitOfWork`):

1. **Row locking**: The linked sale row is locked (`SELECT ... FOR UPDATE`) to prevent concurrent returns from exceeding sold quantities.

2. **Quantity validation**: Checks that the total returned quantity (including all existing non-cancelled returns) does not exceed the sold quantity per product.

3. **Movement generation**: `InventoryIntegrationService.generateMovementFromCustomerReturn()` creates an `IN` movement with reason `RETURN_CUSTOMER`.

4. **Movement creation**: The movement is created directly with `POSTED` status.

5. **Stock increment**: For each movement line, stock is atomically incremented using `INSERT ... ON CONFLICT DO UPDATE` (upsert pattern).

6. **Return update**: The return status is set to `CONFIRMED` and linked to the movement via `returnMovementId`.

7. **Sale status update**: If the linked sale is in `COMPLETED` or `SHIPPED` status, it is automatically transitioned to `RETURNED`.

8. **Events**: `ReturnConfirmedEvent` and `InventoryInGeneratedEvent` are dispatched after the transaction commits.

### Supplier Return Confirmation Flow

When a supplier return is confirmed, the flow is similar but with key differences:

1. **Row locking**: The source movement row is locked to prevent concurrent returns.

2. **Quantity validation**: Checks that total returned quantity does not exceed the purchased quantity per product (from the source IN/PURCHASE movement).

3. **Movement generation**: `InventoryIntegrationService.generateMovementFromSupplierReturn()` creates an `OUT` movement with reason `RETURN_SUPPLIER`.

4. **Stock decrement**: For each movement line, stock is atomically decremented. If insufficient stock exists, the transaction rolls back with an `InsufficientStockError`.

5. **Source movement update**: If the source movement is in `POSTED` status, it is automatically transitioned to `RETURNED`.

6. **Events**: `ReturnConfirmedEvent` and `InventoryOutGeneratedEvent` are dispatched after the transaction commits.

### Inventory Movement Summary

| Return Type | Movement Type | Movement Reason | Stock Effect | Linked Entity Update |
|---|---|---|---|---|
| `RETURN_CUSTOMER` | `IN` | `RETURN_CUSTOMER` | Stock increases (product returned to warehouse) | Sale -> `RETURNED` (if COMPLETED or SHIPPED) |
| `RETURN_SUPPLIER` | `OUT` | `RETURN_SUPPLIER` | Stock decreases (product sent back to supplier) | Source Movement -> `RETURNED` (if POSTED) |

### Concurrency Safety

Both confirmation flows use `SELECT ... FOR UPDATE` row-level locking inside the transaction to prevent the TOCTOU (Time-of-Check-Time-of-Use) vulnerability. This ensures that even if two return confirmations happen concurrently for the same sale or movement, the total returned quantities will never exceed the original quantities.
