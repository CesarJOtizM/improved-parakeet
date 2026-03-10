> **[English](./sales.md)** | [Español](./sales.es.md)

# Sales Module

## Overview

The Sales module manages the full lifecycle of sales orders, from draft creation through confirmation, fulfillment (picking, shipping, completion), and returns. It follows Domain-Driven Design (DDD) with Hexagonal Architecture, using aggregate roots, value objects, domain events, and the specification pattern for queries.

---

## Architecture

The module is organized following clean architecture layers:

```
src/sales/                          # Domain + DTO + Mapper layer
  domain/
    entities/                       # Aggregate root and entities
      sale.entity.ts                # Sale (AggregateRoot)
      saleLine.entity.ts            # SaleLine (Entity)
      saleLineSwap.entity.ts        # SaleLineSwap (Entity)
    valueObjects/
      saleStatus.valueObject.ts     # SaleStatus (ValueObject)
      saleNumber.valueObject.ts     # SaleNumber (ValueObject)
      salePrice.valueObject.ts      # SalePrice (ValueObject)
    events/
      saleCreated.event.ts          # SaleCreatedEvent
      saleConfirmed.event.ts        # SaleConfirmedEvent
      saleCancelled.event.ts        # SaleCancelledEvent
      salePickingStarted.event.ts   # SalePickingStartedEvent
      saleShipped.event.ts          # SaleShippedEvent
      saleCompleted.event.ts        # SaleCompletedEvent
      saleReturned.event.ts         # SaleReturnedEvent
      saleLineSwapped.event.ts      # SaleLineSwappedEvent
      inventoryOutGenerated.event.ts # InventoryOutGeneratedEvent
    services/
      inventoryIntegration.service.ts # Generates Movement from Sale
      saleCalculation.service.ts      # Pure calculation functions
      saleNumberGeneration.service.ts # Atomic number generation
      saleValidation.service.ts       # Stock & business rule validation
    specifications/
      saleSpecifications.ts           # Prisma-compatible specifications
    ports/repositories/
      iSaleRepository.port.ts         # Repository port interface
  dto/
    createSale.dto.ts               # CreateSaleDto, CreateSaleLineDto
    updateSale.dto.ts               # UpdateSaleDto
    getSales.dto.ts                 # GetSalesDto (query filters)
    swapSaleLine.dto.ts             # SwapSaleLineDto
  mappers/
    sale.mapper.ts                  # SaleMapper (DTO <-> Domain)
  sales.module.ts                   # NestJS module definition

src/application/saleUseCases/       # Application layer (use cases)
src/interfaces/http/sales/          # HTTP adapter layer
  sales.controller.ts               # REST controller
  salesHttp.module.ts               # HTTP module + event handler registration
```

### Key Dependencies

- **InventoryModule**: MovementRepository, StockRepository, ProductRepository, WarehouseRepository
- **ContactsModule**: ContactRepository (for contact validation)
- **AuthenticationModule**: DomainEventDispatcher, JWT guards
- **OrganizationModule**: OrganizationRepository (for picking settings)

---

## Workflow

### State Machine

```
                          +-----------+
                          |   DRAFT   |
                          +-----+-----+
                                |
                     confirm()  |  cancel()
                   +------------+----------+
                   |                       |
             +-----v-----+          +-----v------+
             | CONFIRMED |          | CANCELLED  |
             +-----+-----+          +------------+
                   |
        startPicking() | cancel()
        +--------------+----------+
        |                         |
  +-----v-----+            +-----v------+
  |  PICKING   |            | CANCELLED  |
  +-----+-----+            +------------+
        |
    ship() | cancel()
    +------+----------+
    |                  |
+---v----+       +-----v------+
| SHIPPED|       | CANCELLED  |
+---+----+       +------------+
    |
  complete()
    |
+---v------+
| COMPLETED|
+---+------+
    |
  markAsReturned()
    |
+---v------+
| RETURNED |
+----------+
```

### Allowed Transitions

| From | To | Method | Condition |
|---|---|---|---|
| DRAFT | CONFIRMED | `confirm()` | Must have >= 1 line with positive quantities; stock must be available |
| DRAFT | CANCELLED | `cancel()` | -- |
| CONFIRMED | PICKING | `startPicking()` | Organization must have `pickingEnabled` setting |
| CONFIRMED | CANCELLED | `cancel()` | -- |
| CONFIRMED/PICKING | (swap) | `swapLine()` | Line swap allowed in CONFIRMED or PICKING |
| PICKING | SHIPPED | `ship()` | Organization must have `pickingEnabled` |
| PICKING | CANCELLED | `cancel()` | -- |
| SHIPPED | COMPLETED | `complete()` | Organization must have `pickingEnabled` |
| SHIPPED | RETURNED | `markAsReturned()` | -- |
| COMPLETED | RETURNED | `markAsReturned()` | -- |

### Sale Number Format

Pattern: `SALE-YYYY-NNN` (e.g., `SALE-2026-001`)
- Generated atomically via database sequence to prevent race conditions.

---

## Use Cases

| Use Case | File | Description |
|---|---|---|
| **CreateSaleUseCase** | `createSaleUseCase.ts` | Creates a new sale in DRAFT status. Validates warehouse and contact exist. Generates atomic sale number. Optionally includes initial lines. |
| **GetSalesUseCase** | `getSalesUseCase.ts` | Lists sales with pagination, filtering (status, warehouse, company, date range, free-text search), and sorting. Batch-resolves names for warehouses, contacts, products, and users. |
| **GetSaleByIdUseCase** | `getSaleByIdUseCase.ts` | Retrieves a single sale with all lines, resolved product/warehouse/contact/user names, and the organization's `pickingEnabled` setting. |
| **UpdateSaleUseCase** | `updateSaleUseCase.ts` | Updates sale metadata (contactId, customerReference, externalReference, note). Only allowed in DRAFT status. |
| **ConfirmSaleUseCase** | `confirmSaleUseCase.ts` | Confirms a DRAFT sale within an atomic transaction: validates stock, creates an OUT movement with POSTED status, decrements stock, and links the movement to the sale. |
| **CancelSaleUseCase** | `cancelSaleUseCase.ts` | Cancels a sale (from DRAFT, CONFIRMED, or PICKING). Records reason and cancelling user. |
| **AddSaleLineUseCase** | `addSaleLineUseCase.ts` | Adds a line to a DRAFT sale. Validates product exists. Uses atomic repository method to prevent race conditions. |
| **RemoveSaleLineUseCase** | `removeSaleLineUseCase.ts` | Removes a line from a DRAFT sale. |
| **StartPickingSaleUseCase** | `startPickingSaleUseCase.ts` | Transitions a CONFIRMED sale to PICKING status. Requires `pickingEnabled` organization setting. |
| **ShipSaleUseCase** | `shipSaleUseCase.ts` | Ships a PICKING sale. Accepts optional tracking number, carrier, and shipping notes. Requires `pickingEnabled`. |
| **CompleteSaleUseCase** | `completeSaleUseCase.ts` | Marks a SHIPPED sale as COMPLETED. Requires `pickingEnabled`. |
| **MarkSaleReturnedUseCase** | `markSaleReturnedUseCase.ts` | Marks a COMPLETED or SHIPPED sale as RETURNED (typically triggered by a customer return). |
| **SwapSaleLineUseCase** | `swapSaleLineUseCase.ts` | Swaps a product in a CONFIRMED or PICKING sale. Supports full and partial swaps with atomic inventory adjustments (ADJUST_IN for returned product, ADJUST_OUT for replacement). Supports cross-warehouse swaps and two pricing strategies (KEEP_ORIGINAL, NEW_PRICE). |
| **GetSaleMovementUseCase** | `getSaleMovementUseCase.ts` | Retrieves the inventory movement associated with a confirmed sale. |
| **GetSaleSwapsUseCase** | `getSaleSwapsUseCase.ts` | Retrieves the full swap history for a sale, including original and replacement product details. |

---

## Entities & Value Objects

### Sale (Aggregate Root)

File: `src/sales/domain/entities/sale.entity.ts`

The `Sale` class is the aggregate root. It extends `AggregateRoot` and manages a collection of `SaleLine` entities. All state transitions are protected by business rules enforced through the `SaleStatus` value object.

**Key Properties:**
- `saleNumber: SaleNumber` - Unique sale identifier (SALE-YYYY-NNN)
- `status: SaleStatus` - Current lifecycle status
- `warehouseId: string` - Target warehouse
- `contactId?: string` - Optional customer contact
- `customerReference?: string` - Customer-facing reference
- `externalReference?: string` - External system reference (invoice, order)
- `movementId?: string` - Linked inventory movement (set on confirm)
- `trackingNumber?, shippingCarrier?, shippingNotes?` - Shipping details
- Audit fields: `createdBy`, `confirmedBy`, `cancelledBy`, `pickedBy`, `shippedBy`, `completedBy`, `returnedBy` with corresponding timestamps

### SaleLine (Entity)

File: `src/sales/domain/entities/saleLine.entity.ts`

Represents a single product line within a sale.

**Properties:**
- `productId: string` - Product being sold
- `locationId?: string` - Optional warehouse location (optional for MVP)
- `quantity: Quantity` - Quantity sold (must be positive)
- `salePrice: SalePrice` - Unit sale price
- `extra?: Record<string, unknown>` - Additional metadata

### SaleLineSwap (Entity)

File: `src/sales/domain/entities/saleLineSwap.entity.ts`

Records the history of a product line swap operation. Tracks original and replacement product details, pricing strategy, and associated inventory movements.

### Value Objects

| Value Object | File | Description |
|---|---|---|
| **SaleStatus** | `saleStatus.valueObject.ts` | Enum: DRAFT, CONFIRMED, PICKING, SHIPPED, COMPLETED, CANCELLED, RETURNED. Enforces valid transitions via `canConfirm()`, `canStartPicking()`, `canShip()`, `canComplete()`, `canReturn()`, `canCancel()`, `canSwapLine()`. |
| **SaleNumber** | `saleNumber.valueObject.ts` | Format `SALE-YYYY-NNN` (3-6 digit sequence). Validates format on construction. |
| **SalePrice** | `salePrice.valueObject.ts` | Wraps `Money` value object. Must be positive. Supports multiplication for line total calculation. |

---

## Domain Services

| Service | File | Description |
|---|---|---|
| **InventoryIntegrationService** | `inventoryIntegration.service.ts` | Generates an OUT `Movement` entity from a Sale. Maps sale lines to movement lines preserving product, location, quantity, and currency. |
| **SaleCalculationService** | `saleCalculation.service.ts` | Pure functions for calculating subtotal and total (with optional discounts and taxes). |
| **SaleNumberGenerationService** | `saleNumberGeneration.service.ts` | Generates the next atomic sale number via the repository's `getNextSaleNumber()` method. |
| **SaleValidationService** | `saleValidation.service.ts` | Validates stock availability, sale confirmation prerequisites, swap eligibility, and cancellation rules. |

---

## Domain Events

| Event | Trigger | Description |
|---|---|---|
| `SaleCreatedEvent` | `Sale.create()` | Emitted when a new sale is created. |
| `SaleConfirmedEvent` | `Sale.confirm()` | Emitted when a sale is confirmed, includes `movementId`. |
| `SaleCancelledEvent` | `Sale.cancel()` | Emitted when a sale is cancelled, includes optional reason. |
| `SalePickingStartedEvent` | `Sale.startPicking()` | Emitted when picking begins. |
| `SaleShippedEvent` | `Sale.ship()` | Emitted when a sale is shipped, includes tracking details. |
| `SaleCompletedEvent` | `Sale.complete()` | Emitted when a sale is marked as completed. |
| `SaleReturnedEvent` | `Sale.markAsReturned()` | Emitted when a sale is marked as returned. |
| `SaleLineSwappedEvent` | `SwapSaleLineUseCase` | Emitted after a product swap transaction completes. |
| `InventoryOutGeneratedEvent` | `ConfirmSaleUseCase` | Emitted after the inventory OUT movement is posted. |

Event handlers are registered in `SalesHttpModule.onModuleInit()`:
- `SaleCreatedEventHandler`
- `SaleConfirmedEventHandler`
- `SaleCancelledEventHandler`
- `SaleLineSwappedEventHandler`

---

## Specifications (Query Filters)

File: `src/sales/domain/specifications/saleSpecifications.ts`

| Specification | Filter | Description |
|---|---|---|
| `SaleAllSpecification` | (none) | Base specification matching all sales in an org. |
| `SaleByStatusSpecification` | `status` | Filter by one or more statuses (comma-separated). |
| `SaleByWarehouseSpecification` | `warehouseId` | Filter by one or more warehouses (comma-separated). |
| `SaleByDateRangeSpecification` | `startDate`, `endDate` | Filter by creation date range. |
| `SaleBySearchSpecification` | `search` | Free-text search on saleNumber, customerReference, externalReference (case-insensitive). |
| `SaleByCompanySpecification` | `companyId` | Filter by product company via sale lines relation. |
| `SaleByCustomerSpecification` | `customerReference` | Filter by exact customer reference. |

Specifications implement `IPrismaSpecification<Sale>` and are composable via `.and()` for combined filtering.

---

## API Endpoints

Base path: `/sales`

All endpoints require JWT authentication and role-based authorization.

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/sales` | `SALES_CREATE` | Create new sale (DRAFT) |
| `GET` | `/sales` | `SALES_READ` | List sales with filters and pagination |
| `GET` | `/sales/:id` | `SALES_READ` | Get sale by ID with lines and resolved names |
| `PATCH` | `/sales/:id` | `SALES_UPDATE` | Update sale metadata (DRAFT only) |
| `POST` | `/sales/:id/confirm` | `SALES_CONFIRM` | Confirm sale and generate inventory movement |
| `POST` | `/sales/:id/cancel` | `SALES_CANCEL` | Cancel sale (DRAFT/CONFIRMED/PICKING) |
| `POST` | `/sales/:id/pick` | `SALES_PICK` | Start picking (CONFIRMED -> PICKING) |
| `POST` | `/sales/:id/ship` | `SALES_SHIP` | Ship sale (PICKING -> SHIPPED) |
| `POST` | `/sales/:id/complete` | `SALES_COMPLETE` | Complete sale (SHIPPED -> COMPLETED) |
| `POST` | `/sales/:id/return` | `SALES_RETURN` | Mark sale as returned |
| `POST` | `/sales/:id/swap` | `SALES_SWAP` | Swap a sale line product |
| `POST` | `/sales/:id/lines` | `SALES_UPDATE` | Add line to sale (DRAFT only) |
| `DELETE` | `/sales/:id/lines/:lineId` | `SALES_UPDATE` | Remove line from sale (DRAFT only) |
| `GET` | `/sales/:id/movement` | `SALES_READ` | Get associated inventory movement |
| `GET` | `/sales/:id/returns` | `SALES_READ` | Get returns associated with sale |
| `GET` | `/sales/:id/swaps` | `SALES_READ` | Get swap history for sale |

---

## Integration with Inventory

### Confirmation Flow

When a sale is confirmed (`ConfirmSaleUseCase`), the following happens within a single atomic transaction (`UnitOfWork`):

1. **Stock validation**: Pre-checks that all products have sufficient stock in the warehouse.

2. **Movement generation**: `InventoryIntegrationService.generateMovementFromSale()` creates an `OUT` movement with reason `SALE`, mapping each sale line to a movement line.

3. **Movement creation**: The movement is created directly with `POSTED` status (not DRAFT -> POSTED).

4. **Stock decrement**: For each movement line, stock is atomically decremented using raw SQL (`UPDATE stock SET quantity = quantity - N WHERE ... AND quantity >= N`). If any line fails (insufficient stock), the entire transaction rolls back.

5. **Sale update**: The sale status is set to `CONFIRMED` and linked to the movement via `movementId`.

6. **Events**: `SaleConfirmedEvent` and `InventoryOutGeneratedEvent` are dispatched after the transaction commits.

### Swap Flow

When a line is swapped (`SwapSaleLineUseCase`), the atomic transaction:

1. **Returns original product**: Increments stock for the original product (ADJUST_IN movement).

2. **Deducts replacement product**: Decrements stock for the replacement (ADJUST_OUT movement).

3. **Updates sale lines**: For partial swaps, reduces original line quantity and creates a new line. For full swaps, replaces the product in the existing line.

4. **Records swap**: Creates a `SaleLineSwap` record for audit trail.

### Cross-Module References

- Sales link to Returns via `GET /sales/:id/returns` (delegated to `GetReturnsBySaleUseCase` in the Returns module).

- A confirmed customer return can transition the linked sale to `RETURNED` status.
