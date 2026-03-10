> **[English](./inventory.md)** | [Español](./inventory.es.md)

# Inventory Module

## Overview

The Inventory Module is the core domain module of the system, responsible for managing products, warehouses, stock movements, inter-warehouse transfers, stock levels, companies, locations, categories, and reorder rules. It follows a Hexagonal Architecture (Ports & Adapters) pattern with Domain-Driven Design (DDD) principles, including Aggregate Roots, Entities, Value Objects, Domain Events, and Specifications. The module is built on NestJS and uses Prisma as the ORM.

---

## Architecture

The module is organized into the following layers:

- **Domain Layer** (`src/inventory/*/domain/`): Contains entities, value objects, domain events, domain services, specifications, and repository port interfaces.
- **Application Layer** (`src/application/*UseCases/`): Contains use cases that orchestrate domain logic and interact with repository ports.
- **Infrastructure Layer** (`src/infrastructure/database/repositories/`): Contains Prisma-based repository implementations.
- **Interface Layer** (`src/interfaces/http/inventory/`): Contains NestJS REST controllers that expose HTTP endpoints.

The module is registered via `InventoryModule` (`src/inventory/inventory.module.ts`) and its HTTP endpoints are exposed through `InventoryHttpModule` (`src/interfaces/http/inventory/inventoryHttp.module.ts`).

All endpoints are protected by JWT authentication, role-based authorization, and permission guards. Audit logging is applied via interceptors.

---

## Sub-modules

### Products

Manages the product catalog including SKU, pricing, categorization, cost methods, and lifecycle status.

**Key files:**
- Entity: `src/inventory/products/domain/entities/product.entity.ts` (`Product` - Aggregate Root)
- Entity: `src/inventory/products/domain/entities/category.entity.ts` (`Category`)
- Entity: `src/inventory/products/domain/entities/unit.entity.ts` (`Unit`)
- Value Objects: `SKU`, `ProductName`, `ProductStatus`, `CostMethod`, `Price`, `UnitValueObject`
- Repository Port: `src/inventory/products/domain/ports/repositories/iProductRepository.port.ts`
- Domain Services: `pricing.service.ts`, `productBusinessRules.service.ts`, `productValidation.service.ts`
- Domain Events: `ProductCreatedEvent`, `ProductUpdatedEvent`

**Product properties:**
`sku`, `name`, `description`, `categories`, `unit`, `barcode`, `brand`, `model`, `price`, `status`, `costMethod`, `companyId`

**Product statuses:** `ACTIVE`, `INACTIVE`, `DISCONTINUED` (final/irreversible)

**Cost methods:** `AVG` (weighted moving average), `FIFO`

**SKU validation:** 3-50 characters, alphanumeric with hyphens and underscores, cannot start or end with special characters.

---

### Warehouses

Manages physical warehouses and their locations. Each warehouse has a unique code and can contain multiple locations.

**Key files:**
- Entity: `src/inventory/warehouses/domain/entities/warehouse.entity.ts` (`Warehouse` - Aggregate Root)
- Entity: `src/inventory/warehouses/domain/entities/location.entity.ts` (`Location` - Aggregate Root, within warehouse context)
- Value Objects: `WarehouseCode`, `LocationCode`, `Address`
- Repository Ports: `iWarehouseRepository.port.ts`, `iLocationRepository.port.ts`
- Domain Services: `warehouseAssignment.service.ts`, `warehouseBusinessRules.service.ts`
- Domain Events: `WarehouseCreatedEvent`, `LocationAddedEvent`

**Warehouse properties:**
`code`, `name`, `description`, `address`, `isActive`, `statusChangedBy`, `statusChangedAt`

**Location properties (warehouse context):**
`code`, `name`, `warehouseId`, `isDefault`, `isActive`

---

### Movements

Manages inventory movements (entries, exits, adjustments, and transfer-related movements). Movements follow a lifecycle: DRAFT -> POSTED -> VOID/RETURNED.

**Key files:**
- Entity: `src/inventory/movements/domain/entities/movement.entity.ts` (`Movement` - Aggregate Root)
- Entity: `src/inventory/movements/domain/entities/movementLine.entity.ts` (`MovementLine`)
- Value Objects: `MovementType`, `MovementStatus`, `UnitCost`
- Repository Port: `src/inventory/movements/domain/ports/repositories/iMovementRepository.port.ts`
- Domain Services: `ppmService.ts` (Weighted Average Cost)
- Specifications: `movementSpecifications.ts`
- Mapper: `movement.mapper.ts`

**Movement types:**

| Type | Direction | Description |
|------|-----------|-------------|
| `IN` | Input | Purchase/receipt entry |
| `OUT` | Output | Sale/dispatch exit |
| `ADJUST_IN` | Input | Positive adjustment |
| `ADJUST_OUT` | Output | Negative adjustment |
| `TRANSFER_IN` | Input | Transfer receipt |
| `TRANSFER_OUT` | Output | Transfer dispatch |

**Movement statuses:**

| Status | Description |
|--------|-------------|
| `DRAFT` | Editable, not yet applied to stock |
| `POSTED` | Applied to stock, creates audit trail |
| `VOID` | Reversed posted movement |
| `RETURNED` | Marked as returned |

**Movement line properties:**
`productId`, `locationId`, `quantity`, `unitCost`, `currency`, `extra`

**Domain Events:**
`MovementPostedEvent`, `MovementVoidedEvent`, `MovementReturnedEvent`, `StockUpdatedEvent`, `PPMRecalculatedEvent`

---

### Transfers

Manages inter-warehouse stock transfers with a multi-step workflow: DRAFT -> IN_TRANSIT -> RECEIVED/REJECTED/PARTIAL, or DRAFT -> CANCELED.

**Key files:**
- Entity: `src/inventory/transfers/domain/entities/transfer.entity.ts` (`Transfer` - Aggregate Root)
- Entity: `src/inventory/transfers/domain/entities/transferLine.entity.ts` (`TransferLine`)
- Value Objects: `TransferStatus`, `TransferDirection`
- Repository Port: `src/inventory/transfers/domain/ports/repositories/iTransferRepository.port.ts`
- Domain Services: `transferValidation.service.ts`, `transferWorkflow.service.ts`

**Transfer statuses:**

| Status | Description |
|--------|-------------|
| `DRAFT` | Initial state, editable |
| `IN_TRANSIT` | Confirmed, stock deducted from origin |
| `PARTIAL` | Partially received at destination |
| `RECEIVED` | Fully received at destination |
| `REJECTED` | Rejected by destination warehouse |
| `CANCELED` | Canceled before transit |

**Transfer line properties:**
`productId`, `quantity`, `fromLocationId`, `toLocationId`

**Domain Events:**
`TransferInitiatedEvent`, `TransferReceivedEvent`, `TransferRejectedEvent`

**Business rule:** Origin and destination warehouses must be different.

---

### Stock

Manages current stock levels, stock alerts, and inventory calculations. Stock is computed from posted movements and tracked per product-warehouse-location combination.

**Key files:**
- Entity: `src/inventory/stock/domain/entities/reorderRule.entity.ts` (`ReorderRule` - Aggregate Root)
- Value Objects: `Quantity`, `Money`, `MinQuantity`, `MaxQuantity`, `SafetyStock`
- Repository Ports: `iStockRepository.port.ts`, `iReorderRuleRepository.port.ts`
- Domain Services: `inventoryCalculation.service.ts`, `alertService.ts`, `stockValidation.service.ts`, `noNegativeStockRule.service.ts`, `mandatoryAuditRule.service.ts`
- Domain Events: `LowStockAlertEvent` (severities: LOW, CRITICAL, OUT_OF_STOCK), `StockThresholdExceededEvent`

**Quantity value object:** Supports precision 0-6, arithmetic operations (add, subtract, multiply, divide), positivity checks.

**Money value object:** Supports currency (default: COP), precision 0-6, arithmetic with currency validation, formatting.

**Key calculation functions:**
- `calculateAverageCost` - Weighted moving average cost (PPM)
- `calculateInventoryBalance` - Total quantity and cost from movements
- `validateStockAvailability` - Checks sufficient stock for outputs
- `calculateInventoryValue` - Total value = quantity x unit cost
- `calculatePPM` / `recalculatePPM` - PPM calculation and historical recalculation

---

### Companies

Manages companies (brands/subsidiaries) within the organization. Products can be associated with a company for multi-company inventory management.

**Key files:**
- Entity: `src/inventory/companies/domain/entities/company.entity.ts` (`Company`)
- Repository Port: `src/inventory/companies/domain/ports/repositories/iCompanyRepository.port.ts`
- DTOs: `src/inventory/companies/dto/company.dto.ts`

**Company properties:**
`name`, `code`, `description`, `isActive`

**Business rules:** Company code and name must be unique within the organization. A company cannot be deleted if it has associated products.

---

### Locations

Manages granular storage locations within warehouses. Supports a hierarchical structure (zone > aisle > rack > shelf > bin).

**Key files:**
- Entity: `src/inventory/locations/domain/entities/location.entity.ts` (`Location` - Aggregate Root)
- Value Objects: `LocationCode` (max 50 chars, uppercase), `LocationType` (ZONE, AISLE, RACK, SHELF, BIN)
- Repository Interface: `src/inventory/locations/domain/repositories/locationRepository.interface.ts`
- Mapper: `location.mapper.ts`

**Location properties:**
`code`, `name`, `description`, `type`, `warehouseId`, `parentId`, `isActive`

**Location types:** `ZONE`, `AISLE`, `RACK`, `SHELF`, `BIN`

---

### Categories

Manages hierarchical product categories. Categories can have parent-child relationships (tree structure).

**Key files:**
- Entity: `src/inventory/products/domain/entities/category.entity.ts` (`Category`)
- Repository Port: `src/inventory/products/domain/ports/repositories/iCategoryRepository.port.ts`

**Category properties:**
`name`, `parentId`, `description`, `isActive`

**Business rules:** Category name must be unique within the organization. Categories with subcategories or associated products cannot be deleted.

---

### Reorder Rules

Manages automatic reorder thresholds per product-warehouse combination, defining minimum, maximum, and safety stock quantities.

**Key files:**
- Entity: `src/inventory/stock/domain/entities/reorderRule.entity.ts` (`ReorderRule` - Aggregate Root)
- Repository Port: `src/inventory/stock/domain/ports/repositories/iReorderRuleRepository.port.ts`

**Reorder rule properties:**
`productId`, `warehouseId`, `minQty` (MinQuantity), `maxQty` (MaxQuantity), `safetyQty` (SafetyStock)

**Business rule:** `maxQty` must always be greater than `minQty`.

---

## Use Cases

### Product Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateProductUseCase` | `src/application/productUseCases/createProductUseCase.ts` | Create a new product with SKU validation |
| `GetProductsUseCase` | `src/application/productUseCases/getProductsUseCase.ts` | List products with pagination, filtering, and sorting |
| `GetProductByIdUseCase` | `src/application/productUseCases/getProductByIdUseCase.ts` | Retrieve a single product by ID |
| `UpdateProductUseCase` | `src/application/productUseCases/updateProductUseCase.ts` | Update product information and status |

### Warehouse Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateWarehouseUseCase` | `src/application/warehouseUseCases/createWarehouseUseCase.ts` | Create a new warehouse with unique code |
| `GetWarehousesUseCase` | `src/application/warehouseUseCases/getWarehousesUseCase.ts` | List warehouses with pagination and filtering |
| `GetWarehouseByIdUseCase` | `src/application/warehouseUseCases/getWarehouseByIdUseCase.ts` | Retrieve a single warehouse by ID |
| `UpdateWarehouseUseCase` | `src/application/warehouseUseCases/updateWarehouseUseCase.ts` | Update warehouse details and status |

### Movement Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateMovementUseCase` | `src/application/movementUseCases/createMovementUseCase.ts` | Create a DRAFT movement with lines |
| `GetMovementsUseCase` | `src/application/movementUseCases/getMovementsUseCase.ts` | List movements with filtering by type, status, date range |
| `GetMovementByIdUseCase` | `src/application/movementUseCases/getMovementByIdUseCase.ts` | Retrieve a single movement with its lines |
| `UpdateMovementUseCase` | `src/application/movementUseCases/updateMovementUseCase.ts` | Update a DRAFT movement |
| `PostMovementUseCase` | `src/application/movementUseCases/postMovementUseCase.ts` | Post a movement (DRAFT -> POSTED), updating stock |
| `VoidMovementUseCase` | `src/application/movementUseCases/voidMovementUseCase.ts` | Void a posted movement (POSTED -> VOID) |
| `DeleteMovementUseCase` | `src/application/movementUseCases/deleteMovementUseCase.ts` | Delete a DRAFT movement |
| `MarkMovementReturnedUseCase` | `src/application/movementUseCases/markMovementReturnedUseCase.ts` | Mark a posted movement as returned |

### Transfer Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `InitiateTransferUseCase` | `src/application/transferUseCases/initiateTransferUseCase.ts` | Create a new transfer between warehouses |
| `GetTransfersUseCase` | `src/application/transferUseCases/getTransfersUseCase.ts` | List transfers with filtering |
| `GetTransferByIdUseCase` | `src/application/transferUseCases/getTransferByIdUseCase.ts` | Retrieve a single transfer with details |
| `ConfirmTransferUseCase` | `src/application/transferUseCases/confirmTransferUseCase.ts` | Confirm transfer (DRAFT -> IN_TRANSIT), deducting origin stock |
| `ReceiveTransferUseCase` | `src/application/transferUseCases/receiveTransferUseCase.ts` | Receive transfer (IN_TRANSIT -> RECEIVED), adding destination stock |
| `RejectTransferUseCase` | `src/application/transferUseCases/rejectTransferUseCase.ts` | Reject transfer (IN_TRANSIT -> REJECTED) |
| `CancelTransferUseCase` | `src/application/transferUseCases/cancelTransferUseCase.ts` | Cancel a DRAFT transfer |

### Stock Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `GetStockUseCase` | `src/application/stockUseCases/getStockUseCase.ts` | Query current stock levels with optional filters |

### Category Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateCategoryUseCase` | `src/application/categoryUseCases/createCategoryUseCase.ts` | Create a new category |
| `GetCategoriesUseCase` | `src/application/categoryUseCases/getCategoriesUseCase.ts` | List categories with pagination |
| `GetCategoryByIdUseCase` | `src/application/categoryUseCases/getCategoryByIdUseCase.ts` | Retrieve a single category |
| `UpdateCategoryUseCase` | `src/application/categoryUseCases/updateCategoryUseCase.ts` | Update a category |
| `DeleteCategoryUseCase` | `src/application/categoryUseCases/deleteCategoryUseCase.ts` | Delete a category (if no children or products) |

### Company Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateCompanyUseCase` | `src/application/companyUseCases/createCompanyUseCase.ts` | Create a new company |
| `GetCompaniesUseCase` | `src/application/companyUseCases/getCompaniesUseCase.ts` | List companies with pagination |
| `GetCompanyByIdUseCase` | `src/application/companyUseCases/getCompanyByIdUseCase.ts` | Retrieve a single company |
| `UpdateCompanyUseCase` | `src/application/companyUseCases/updateCompanyUseCase.ts` | Update a company |
| `DeleteCompanyUseCase` | `src/application/companyUseCases/deleteCompanyUseCase.ts` | Delete a company (if no associated products) |

### Reorder Rule Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `CreateReorderRuleUseCase` | `src/application/reorderRuleUseCases/createReorderRuleUseCase.ts` | Create a reorder rule for a product-warehouse pair |
| `GetReorderRulesUseCase` | `src/application/reorderRuleUseCases/getReorderRulesUseCase.ts` | List all reorder rules |
| `UpdateReorderRuleUseCase` | `src/application/reorderRuleUseCases/updateReorderRuleUseCase.ts` | Update reorder rule thresholds |
| `DeleteReorderRuleUseCase` | `src/application/reorderRuleUseCases/deleteReorderRuleUseCase.ts` | Delete a reorder rule |

---

## Entities & Value Objects

### Aggregate Roots

| Entity | File | Key Behaviors |
|--------|------|---------------|
| `Product` | `product.entity.ts` | create, update, activate, deactivate, validateActiveForOperation |
| `Warehouse` | `warehouse.entity.ts` | create, update, activate, deactivate |
| `Location` (warehouse) | `warehouses/.../location.entity.ts` | create, update, setAsDefault, activate, deactivate |
| `Location` (locations module) | `locations/.../location.entity.ts` | create, update, activate, deactivate, setParent |
| `Movement` | `movement.entity.ts` | create, addLine, removeLine, post, void, markAsReturned, update |
| `Transfer` | `transfer.entity.ts` | create, addLine, removeLine, confirm, receive, receivePartial, reject, cancel |
| `ReorderRule` | `reorderRule.entity.ts` | create, updateMinQty, updateMaxQty, updateSafetyQty |

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `Category` | `category.entity.ts` | Hierarchical product category with parent-child support |
| `Company` | `company.entity.ts` | Company/brand within organization |
| `Unit` | `unit.entity.ts` | Unit of measure (code, name, precision) |
| `MovementLine` | `movementLine.entity.ts` | Line item in a movement with product, quantity, and cost |
| `TransferLine` | `transferLine.entity.ts` | Line item in a transfer with product and quantity |

### Value Objects

| Value Object | Description |
|--------------|-------------|
| `SKU` | Stock Keeping Unit (3-50 chars, alphanumeric + hyphen/underscore) |
| `ProductName` | Validated product name |
| `ProductStatus` | ACTIVE, INACTIVE, DISCONTINUED |
| `CostMethod` | AVG (weighted average), FIFO |
| `Price` | Alias for Money in the products context |
| `UnitValueObject` | Unit of measure reference |
| `WarehouseCode` | Unique warehouse identifier code |
| `Address` | Warehouse address (max 500 chars) |
| `LocationCode` | Location identifier code (max 50 chars, uppercase) |
| `LocationType` | ZONE, AISLE, RACK, SHELF, BIN |
| `MovementType` | IN, OUT, ADJUST_IN, ADJUST_OUT, TRANSFER_IN, TRANSFER_OUT |
| `MovementStatus` | DRAFT, POSTED, VOID, RETURNED |
| `UnitCost` | Cost per unit for movement lines |
| `TransferStatus` | DRAFT, IN_TRANSIT, PARTIAL, RECEIVED, REJECTED, CANCELED |
| `TransferDirection` | OUTBOUND, INBOUND |
| `Quantity` | Numeric quantity with precision 0-6 |
| `Money` | Monetary amount with currency (default COP) and precision |
| `MinQuantity` | Minimum stock threshold for reorder rules |
| `MaxQuantity` | Maximum stock threshold for reorder rules |
| `SafetyStock` | Safety stock buffer quantity |

---

## API Endpoints

All endpoints are prefixed with `/inventory/` and require JWT authentication (`Bearer` token).

All endpoints require appropriate permissions as specified in the Permission column.

### Products

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/products` | PRODUCTS:CREATE | Create a new product |
| `GET` | `/inventory/products` | PRODUCTS:READ | List products (paginated, filterable) |
| `GET` | `/inventory/products/:id` | PRODUCTS:READ | Get product by ID |
| `PUT` | `/inventory/products/:id` | PRODUCTS:UPDATE | Update a product |

### Warehouses

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/warehouses` | WAREHOUSES:CREATE | Create a new warehouse |
| `GET` | `/inventory/warehouses` | WAREHOUSES:READ | List warehouses (paginated, filterable) |
| `GET` | `/inventory/warehouses/:id` | WAREHOUSES:READ | Get warehouse by ID |
| `PUT` | `/inventory/warehouses/:id` | WAREHOUSES:UPDATE | Update a warehouse |

### Movements

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/movements` | INVENTORY:ENTRY | Create a DRAFT movement |
| `GET` | `/inventory/movements` | INVENTORY:READ | List movements (paginated, filterable) |
| `GET` | `/inventory/movements/:id` | INVENTORY:READ | Get movement by ID |
| `PATCH` | `/inventory/movements/:id` | INVENTORY:ENTRY | Update a DRAFT movement |
| `DELETE` | `/inventory/movements/:id` | INVENTORY:ENTRY | Delete a DRAFT movement |
| `POST` | `/inventory/movements/:id/post` | INVENTORY:ENTRY | Post movement (DRAFT -> POSTED) |
| `POST` | `/inventory/movements/:id/void` | INVENTORY:ENTRY | Void movement (POSTED -> VOID) |
| `POST` | `/inventory/movements/:id/return` | INVENTORY:ENTRY | Mark as returned (POSTED -> RETURNED) |

### Transfers

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/transfers` | INVENTORY:TRANSFER | Initiate a new transfer |
| `GET` | `/inventory/transfers` | INVENTORY:READ | List transfers (paginated, filterable) |
| `GET` | `/inventory/transfers/:id` | INVENTORY:READ | Get transfer by ID |
| `POST` | `/inventory/transfers/:id/confirm` | INVENTORY:TRANSFER | Confirm transfer (DRAFT -> IN_TRANSIT) |
| `POST` | `/inventory/transfers/:id/receive` | INVENTORY:TRANSFER | Receive transfer (IN_TRANSIT -> RECEIVED) |
| `POST` | `/inventory/transfers/:id/reject` | INVENTORY:TRANSFER | Reject transfer |
| `POST` | `/inventory/transfers/:id/cancel` | INVENTORY:TRANSFER | Cancel transfer (DRAFT only) |

### Stock

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/inventory/stock` | INVENTORY:READ | Get current stock levels |

**Query parameters:** `warehouseId` (comma-separated), `productId`, `lowStock`, `companyId`, `sortBy`, `sortOrder`

### Categories

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/categories` | PRODUCTS:CREATE | Create a new category |
| `GET` | `/inventory/categories` | PRODUCTS:READ | List categories (paginated, filterable) |
| `GET` | `/inventory/categories/:id` | PRODUCTS:READ | Get category by ID |
| `PUT` | `/inventory/categories/:id` | PRODUCTS:UPDATE | Update a category |
| `DELETE` | `/inventory/categories/:id` | PRODUCTS:DELETE | Delete a category |

### Companies

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/companies` | COMPANIES:CREATE | Create a new company |
| `GET` | `/inventory/companies` | COMPANIES:READ | List companies (paginated, filterable) |
| `GET` | `/inventory/companies/:id` | COMPANIES:READ | Get company by ID |
| `PUT` | `/inventory/companies/:id` | COMPANIES:UPDATE | Update a company |
| `DELETE` | `/inventory/companies/:id` | COMPANIES:DELETE | Delete a company |

### Reorder Rules

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/inventory/stock/reorder-rules` | INVENTORY:ADJUST | Create a reorder rule |
| `GET` | `/inventory/stock/reorder-rules` | INVENTORY:READ | List all reorder rules |
| `PUT` | `/inventory/stock/reorder-rules/:id` | INVENTORY:ADJUST | Update a reorder rule |
| `DELETE` | `/inventory/stock/reorder-rules/:id` | INVENTORY:ADJUST | Delete a reorder rule |

---

## Domain Events

The module uses a domain event bus (`DomainEventBus`) to decouple domain logic from side effects. Events are registered in `InventoryModule.onModuleInit()`.

| Event | Trigger | Handler(s) |
|-------|---------|------------|
| `ProductCreated` | New product is created | `ProductCreatedEventHandler` |
| `ProductUpdated` | Product is updated | `ProductUpdatedEventHandler` |
| `WarehouseCreated` | New warehouse is created | `WarehouseCreatedEventHandler` |
| `LocationAdded` | Location is added to a warehouse | `LocationAddedEventHandler` |
| `MovementPosted` | Movement status changes to POSTED | `MovementPostedEventHandler`, `MovementPostedAuditHandler` |
| `MovementVoided` | Movement status changes to VOID | `MovementVoidedAuditHandler` |
| `MovementReturned` | Movement status changes to RETURNED | *(emitted, handler in returns module)* |
| `StockUpdated` | Stock quantity changes for a product-warehouse | *(informational event)* |
| `PPMRecalculated` | Weighted average cost is recalculated | *(informational event)* |
| `TransferInitiated` | Transfer confirmed and stock deducted from origin | `TransferInitiatedAuditHandler` |
| `TransferReceived` | Transfer fully received at destination | `TransferReceivedAuditHandler` |
| `TransferRejected` | Transfer rejected by destination | `TransferRejectedAuditHandler` |
| `LowStockAlert` | Stock falls below minimum/safety thresholds | `LowStockAlertEventHandler` |
| `StockThresholdExceeded` | Stock exceeds maximum threshold | `StockThresholdExceededEventHandler` |

---

## Repository Interfaces

All repositories follow the Hexagonal Architecture pattern: domain ports define the interface, and infrastructure adapters (Prisma-based) provide the implementation. All repository methods are scoped by `orgId` for multi-tenant isolation.

| Port Interface | Implementation | Description |
|----------------|---------------|-------------|
| `IProductRepository` | `PrismaProductRepository` | Product CRUD + findBySku, findByCategory, findByStatus, findByWarehouse, findLowStock, findBySpecification |
| `ICategoryRepository` | `PrismaCategoryRepository` | Category CRUD + findByName, findByParentId, findRootCategories |
| `ICompanyRepository` | `PrismaCompanyRepository` | Company CRUD + findByCode, findByName, existsByCode, existsByName, countProducts |
| `IWarehouseRepository` | `PrismaWarehouseRepository` | Warehouse CRUD + findByCode, existsByCode, findActive |
| `IMovementRepository` | `PrismaMovementRepository` | Movement CRUD + findByWarehouse, findByStatus, findByType, findByDateRange, findByProduct, findBySpecification, lazy loading |
| `ITransferRepository` | `PrismaTransferRepository` | Transfer CRUD + findByFromWarehouse, findByToWarehouse, findByStatus, findByDateRange, findInTransit, findPending |
| `IStockRepository` | `PrismaStockRepository` | getStockQuantity, getStockWithCost, updateStock, incrementStock, decrementStock, findAll |
| `IReorderRuleRepository` | `PrismaReorderRuleRepository` | ReorderRule CRUD + findByProductAndWarehouse |
| `ILocationRepository` (locations) | `PrismaLocationRepository` | Location CRUD + findByCode, findByWarehouse, findChildren |
