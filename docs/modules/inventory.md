# Módulo de Inventario (Inventory Module)

## Índice
1. [Propósito y Responsabilidades](#propósito-y-responsabilidades)
2. [Arquitectura del Módulo](#arquitectura-del-módulo)
3. [Submódulos](#submódulos)
4. [Entidades de Dominio](#entidades-de-dominio)
5. [Servicios de Dominio](#servicios-de-dominio)
6. [Casos de Uso](#casos-de-uso)
7. [Repositorios](#repositorios)
8. [Eventos de Dominio](#eventos-de-dominio)
9. [DTOs y Mappers](#dtos-y-mappers)
10. [Ejemplos de Uso](#ejemplos-de-uso)
11. [Diagramas](#diagramas)
12. [Dependencias](#dependencias)
13. [Consideraciones de Actualización](#consideraciones-de-actualización)

---

## Propósito y Responsabilidades

El **Módulo de Inventario** es el núcleo del sistema de gestión de inventarios. Es responsable de:

- **Gestión de Productos**: Crear, actualizar y consultar productos con sus categorías y unidades de medida
- **Gestión de Bodegas**: Administrar bodegas/almacenes y sus ubicaciones internas
- **Control de Stock**: Mantener el registro de existencias, niveles de stock y alertas
- **Movimientos de Inventario**: Registrar entradas, salidas y ajustes de inventario
- **Transferencias**: Gestionar transferencias de productos entre bodegas
- **Reglas de Reorden**: Configurar alertas y reglas de reabastecimiento automático

### Responsabilidades Clave

| Responsabilidad | Descripción |
|-----------------|-------------|
| Integridad del Stock | Garantizar que el stock nunca sea negativo y esté siempre actualizado |
| Trazabilidad | Registrar todos los movimientos para auditoría |
| Validaciones de Negocio | Aplicar reglas de negocio antes de operaciones |
| Eventos de Dominio | Publicar eventos para integración con otros módulos |
| Cálculo de Costos | Mantener costos promedio y valorización de inventario |

---

## Arquitectura del Módulo

```
src/inventory/
├── inventory.module.ts          # Módulo principal NestJS
├── products/                    # Submódulo de Productos
│   ├── domain/
│   │   ├── entities/
│   │   ├── services/
│   │   └── ports/
│   ├── dto/
│   └── mappers/
├── warehouses/                  # Submódulo de Bodegas
│   ├── domain/
│   ├── dto/
│   └── mappers/
├── stock/                       # Submódulo de Stock
│   ├── domain/
│   │   ├── entities/
│   │   ├── services/
│   │   └── ports/
│   └── dto/
├── movements/                   # Submódulo de Movimientos
│   ├── domain/
│   ├── dto/
│   └── mappers/
├── transfers/                   # Submódulo de Transferencias
│   ├── domain/
│   ├── dto/
│   └── mappers/
└── locations/                   # Submódulo de Ubicaciones
    ├── domain/
    ├── dto/
    └── mappers/
```

---

## Submódulos

### 1. Products (Productos)

**Ubicación**: `src/inventory/products/`

Gestiona el catálogo de productos, categorías y unidades de medida.

**Archivos Principales**:
- `domain/entities/product.entity.ts` - Entidad de producto
- `domain/entities/category.entity.ts` - Entidad de categoría
- `domain/entities/unit.entity.ts` - Entidad de unidad de medida
- `domain/services/pricing.service.ts` - Cálculo de precios
- `domain/services/productValidation.service.ts` - Validaciones
- `domain/services/productBusinessRules.service.ts` - Reglas de negocio

### 2. Warehouses (Bodegas)

**Ubicación**: `src/inventory/warehouses/`

Administra bodegas, sus configuraciones y ubicaciones.

**Archivos Principales**:
- `domain/entities/warehouse.entity.ts` - Entidad de bodega
- `domain/services/warehouseAssignment.service.ts` - Asignación de productos
- `domain/services/warehouseBusinessRules.service.ts` - Reglas de negocio

### 3. Stock (Existencias)

**Ubicación**: `src/inventory/stock/`

Controla los niveles de stock, alertas y reglas de reorden.

**Archivos Principales**:
- `domain/entities/reorderRule.entity.ts` - Reglas de reorden
- `domain/services/stockValidation.service.ts` - Validación de stock
- `domain/services/inventoryCalculation.service.ts` - Cálculos de inventario
- `domain/services/noNegativeStockRule.service.ts` - Regla anti-negativos
- `domain/services/mandatoryAuditRule.service.ts` - Auditoría obligatoria

### 4. Movements (Movimientos)

**Ubicación**: `src/inventory/movements/`

Registra todos los movimientos de inventario.

**Archivos Principales**:
- `domain/entities/movement.entity.ts` - Entidad de movimiento
- `domain/entities/movementLine.entity.ts` - Líneas de movimiento
- `domain/valueObjects/movementType.valueObject.ts` - Tipos (Entrada, Salida, Ajuste)
- `domain/valueObjects/movementStatus.valueObject.ts` - Estados (Borrador, Publicado, Anulado)

### 5. Transfers (Transferencias)

**Ubicación**: `src/inventory/transfers/`

Gestiona transferencias entre bodegas.

**Archivos Principales**:
- `domain/entities/transfer.entity.ts` - Entidad de transferencia
- `domain/entities/transferLine.entity.ts` - Líneas de transferencia
- `domain/services/transferValidation.service.ts` - Validaciones
- `domain/services/transferWorkflow.service.ts` - Flujo de trabajo

### 6. Locations (Ubicaciones)

**Ubicación**: `src/inventory/locations/`

Administra ubicaciones dentro de las bodegas.

**Archivos Principales**:
- `domain/entities/location.entity.ts` - Entidad de ubicación
- `dto/createLocation.dto.ts` - DTO de creación
- `mappers/location.mapper.ts` - Mapper

---

## Entidades de Dominio

### Product (Producto)

```typescript
interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unitId: string;
  basePrice: Money;
  cost: Money;
  isActive: boolean;
  minStock?: number;
  maxStock?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Warehouse (Bodega)

```typescript
interface Warehouse {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  locations: Location[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Movement (Movimiento)

```typescript
interface Movement {
  id: string;
  organizationId: string;
  warehouseId: string;
  type: MovementType; // 'ENTRY' | 'EXIT' | 'ADJUSTMENT'
  status: MovementStatus; // 'DRAFT' | 'POSTED' | 'VOIDED'
  reference?: string;
  notes?: string;
  lines: MovementLine[];
  postedAt?: Date;
  postedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transfer (Transferencia)

```typescript
interface Transfer {
  id: string;
  organizationId: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  status: TransferStatus; // 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'
  lines: TransferLine[];
  initiatedBy: string;
  initiatedAt: Date;
  receivedAt?: Date;
  receivedBy?: string;
}
```

---

## Servicios de Dominio

### StockValidationService

Valida operaciones de stock antes de su ejecución.

```typescript
class StockValidationService {
  // Valida si hay suficiente stock para una salida
  validateStockAvailability(
    warehouseId: string,
    productId: string,
    quantity: number
  ): Result<void, StockError>;

  // Valida reglas de stock mínimo/máximo
  validateStockLimits(
    productId: string,
    newQuantity: number
  ): Result<void, StockLimitError>;
}
```

### InventoryCalculationService

Realiza cálculos de inventario.

```typescript
class InventoryCalculationService {
  // Calcula el costo promedio ponderado
  calculateWeightedAverageCost(
    currentCost: Money,
    currentQty: number,
    newCost: Money,
    newQty: number
  ): Money;

  // Calcula la valorización total del inventario
  calculateInventoryValuation(warehouseId: string): Money;
}
```

### TransferWorkflowService

Gestiona el flujo de trabajo de transferencias.

```typescript
class TransferWorkflowService {
  // Inicia una transferencia
  initiateTransfer(transfer: Transfer): Result<Transfer, TransferError>;

  // Confirma el envío
  confirmShipment(transferId: string): Result<Transfer, TransferError>;

  // Recibe la transferencia en destino
  receiveTransfer(transferId: string): Result<Transfer, TransferError>;

  // Rechaza la transferencia
  rejectTransfer(transferId: string, reason: string): Result<Transfer, TransferError>;
}
```

---

## Casos de Uso

### Productos

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| CreateProductUseCase | Crear un nuevo producto | `src/application/productUseCases/createProductUseCase.ts` |
| GetProductsUseCase | Listar productos con filtros | `src/application/productUseCases/getProductsUseCase.ts` |
| GetProductByIdUseCase | Obtener producto por ID | `src/application/productUseCases/getProductByIdUseCase.ts` |
| UpdateProductUseCase | Actualizar producto | `src/application/productUseCases/updateProductUseCase.ts` |

### Bodegas

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| CreateWarehouseUseCase | Crear una bodega | `src/application/warehouseUseCases/createWarehouseUseCase.ts` |
| GetWarehousesUseCase | Listar bodegas | `src/application/warehouseUseCases/getWarehousesUseCase.ts` |
| GetWarehouseByIdUseCase | Obtener bodega por ID | `src/application/warehouseUseCases/getWarehouseByIdUseCase.ts` |

### Movimientos

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| CreateMovementUseCase | Crear movimiento (borrador) | `src/application/movementUseCases/createMovementUseCase.ts` |
| GetMovementsUseCase | Listar movimientos | `src/application/movementUseCases/getMovementsUseCase.ts` |
| PostMovementUseCase | Publicar movimiento | `src/application/movementUseCases/postMovementUseCase.ts` |

### Transferencias

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| InitiateTransferUseCase | Iniciar transferencia | `src/application/transferUseCases/initiateTransferUseCase.ts` |
| ConfirmTransferUseCase | Confirmar envío | `src/application/transferUseCases/confirmTransferUseCase.ts` |
| ReceiveTransferUseCase | Recibir transferencia | `src/application/transferUseCases/receiveTransferUseCase.ts` |
| RejectTransferUseCase | Rechazar transferencia | `src/application/transferUseCases/rejectTransferUseCase.ts` |
| CancelTransferUseCase | Cancelar transferencia | `src/application/transferUseCases/cancelTransferUseCase.ts` |
| GetTransfersUseCase | Listar transferencias | `src/application/transferUseCases/getTransfersUseCase.ts` |

### Stock

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| GetStockUseCase | Consultar stock | `src/application/stockUseCases/getStockUseCase.ts` |

---

## Repositorios

| Repositorio | Interfaz (Port) | Implementación |
|-------------|-----------------|----------------|
| ProductRepository | `IProductRepository` | `src/infrastructure/database/repositories/product.repository.ts` |
| WarehouseRepository | `IWarehouseRepository` | `src/infrastructure/database/repositories/warehouse.repository.ts` |
| MovementRepository | `IMovementRepository` | `src/infrastructure/database/repositories/movement.repository.ts` |
| StockRepository | `IStockRepository` | `src/infrastructure/database/repositories/stock.repository.ts` |
| TransferRepository | `ITransferRepository` | `src/infrastructure/database/repositories/transfer.repository.ts` |
| LocationRepository | `ILocationRepository` | `src/infrastructure/database/repositories/location.repository.ts` |
| ReorderRuleRepository | `IReorderRuleRepository` | `src/infrastructure/database/repositories/reorderRule.repository.ts` |

---

## Eventos de Dominio

### Eventos Publicados

| Evento | Disparador | Descripción |
|--------|------------|-------------|
| ProductCreated | CreateProductUseCase | Producto creado |
| ProductUpdated | UpdateProductUseCase | Producto actualizado |
| WarehouseCreated | CreateWarehouseUseCase | Bodega creada |
| LocationAdded | AddLocationUseCase | Ubicación añadida |
| MovementPosted | PostMovementUseCase | Movimiento publicado (afecta stock) |
| MovementVoided | VoidMovementUseCase | Movimiento anulado |
| TransferInitiated | InitiateTransferUseCase | Transferencia iniciada |
| TransferReceived | ReceiveTransferUseCase | Transferencia recibida |
| TransferRejected | RejectTransferUseCase | Transferencia rechazada |
| LowStockAlert | StockValidationJob | Stock por debajo del mínimo |
| StockThresholdExceeded | StockValidationJob | Stock excede umbral |

### Event Handlers Registrados

```typescript
// En inventory.module.ts
const eventHandlers = [
  ProductCreatedEventHandler,
  ProductUpdatedEventHandler,
  WarehouseCreatedEventHandler,
  LocationAddedEventHandler,
  MovementPostedEventHandler,
  MovementPostedAuditHandler,
  MovementVoidedAuditHandler,
  TransferInitiatedAuditHandler,
  TransferReceivedAuditHandler,
  TransferRejectedAuditHandler,
  LowStockAlertEventHandler,
  StockThresholdExceededEventHandler,
];
```

---

## DTOs y Mappers

### DTOs de Producto

```typescript
// CreateProductDto
interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unitId: string;
  basePrice: number;
  cost: number;
  minStock?: number;
  maxStock?: number;
}

// GetProductResponseDto
interface GetProductResponseDto {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: CategoryDto;
  unit: UnitDto;
  basePrice: number;
  cost: number;
  isActive: boolean;
  stock?: StockDto;
}
```

### DTOs de Movimiento

```typescript
// CreateMovementDto
interface CreateMovementDto {
  warehouseId: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  reference?: string;
  notes?: string;
  lines: CreateMovementLineDto[];
}

// CreateMovementLineDto
interface CreateMovementLineDto {
  productId: string;
  locationId: string;
  quantity: number;
  unitCost?: number;
}
```

---

## Ejemplos de Uso

### Crear un Producto

```typescript
// Controller
@Post()
@RequirePermissions('inventory:products:create')
async createProduct(
  @Body() dto: CreateProductDto,
  @CurrentUser() user: AuthUser
): Promise<ApiResponse<GetProductResponseDto>> {
  const result = await this.createProductUseCase.execute({
    ...dto,
    organizationId: user.organizationId,
    createdBy: user.id,
  });

  if (result.isFailure()) {
    throw new BadRequestException(result.error);
  }

  return ApiResponse.success(result.value);
}
```

### Crear un Movimiento de Entrada

```typescript
// Ejemplo de uso del CreateMovementUseCase
const movementData = {
  warehouseId: 'warehouse-uuid',
  type: 'ENTRY',
  reference: 'PO-2024-001',
  notes: 'Recepción de compra',
  lines: [
    {
      productId: 'product-uuid-1',
      locationId: 'location-uuid',
      quantity: 100,
      unitCost: 15.50,
    },
    {
      productId: 'product-uuid-2',
      locationId: 'location-uuid',
      quantity: 50,
      unitCost: 25.00,
    },
  ],
};

const result = await createMovementUseCase.execute(movementData);

// Publicar el movimiento para afectar stock
if (result.isSuccess()) {
  await postMovementUseCase.execute({ movementId: result.value.id });
}
```

### Iniciar una Transferencia

```typescript
// Ejemplo de flujo de transferencia
const transferData = {
  sourceWarehouseId: 'warehouse-origin-uuid',
  targetWarehouseId: 'warehouse-destination-uuid',
  lines: [
    {
      productId: 'product-uuid',
      quantity: 25,
    },
  ],
};

// 1. Iniciar transferencia
const transfer = await initiateTransferUseCase.execute(transferData);

// 2. Confirmar envío (bodega origen)
await confirmTransferUseCase.execute({ transferId: transfer.value.id });

// 3. Recibir en destino
await receiveTransferUseCase.execute({
  transferId: transfer.value.id,
  receivedLines: [
    {
      lineId: 'line-uuid',
      receivedQuantity: 25, // Cantidad recibida
    },
  ],
});
```

### Consultar Stock

```typescript
// Ejemplo de consulta de stock
const stockQuery = {
  warehouseId: 'warehouse-uuid',
  productId: 'product-uuid', // Opcional
  includeLocations: true,
};

const result = await getStockUseCase.execute(stockQuery);

// Resultado
{
  items: [
    {
      productId: 'product-uuid',
      productName: 'Producto A',
      warehouseId: 'warehouse-uuid',
      totalQuantity: 150,
      reservedQuantity: 10,
      availableQuantity: 140,
      averageCost: 15.75,
      totalValue: 2362.50,
      locations: [
        { locationId: 'loc-1', quantity: 100 },
        { locationId: 'loc-2', quantity: 50 },
      ],
    },
  ],
  summary: {
    totalProducts: 1,
    totalValue: 2362.50,
  },
}
```

---

## Diagramas

### Diagrama de Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVENTORY MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Products   │  │  Warehouses  │  │    Stock     │  │  Movements   │    │
│  │  Submódulo   │  │  Submódulo   │  │  Submódulo   │  │  Submódulo   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │            │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐    │
│  │  Transfers   │  │  Locations   │  │   Reorder    │  │    Events    │    │
│  │  Submódulo   │  │  Submódulo   │  │    Rules     │  │   Handlers   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DOMAIN LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Entities: Product, Warehouse, Location, Movement, Transfer, Stock  │    │
│  │  Value Objects: Money, Quantity, MovementType, TransferStatus       │    │
│  │  Domain Services: StockValidation, InventoryCalculation, Workflow   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           REPOSITORY PORTS                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  IProductRepository, IWarehouseRepository, IStockRepository         │    │
│  │  IMovementRepository, ITransferRepository, ILocationRepository      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Prisma Repositories (implementan los ports del dominio)            │    │
│  │  Database Migrations, Seeds                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Diagrama de Flujo: Movimiento de Inventario

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Controller │────▶│ CreateMovement   │────▶│ MovementRepository│
│  (HTTP)     │     │    UseCase       │     │   .create()       │
└─────────────┘     └──────────────────┘     └───────────────────┘
                            │
                            │ (movimiento en DRAFT)
                            ▼
                    ┌──────────────────┐
                    │   PostMovement   │
                    │    UseCase       │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ StockValidation │ │ StockRepository │ │ DomainEventBus  │
│    Service      │ │   .update()     │ │ .publish()      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                               │
                    ┌──────────────────────────┼───────────────┐
                    ▼                          ▼               ▼
          ┌─────────────────┐    ┌─────────────────┐  ┌─────────────────┐
          │ Audit Handler   │    │ Stock Alert     │  │ Notification    │
          │ (registro log)  │    │ Handler         │  │ Handler         │
          └─────────────────┘    └─────────────────┘  └─────────────────┘
```

### Diagrama de Flujo: Transferencia entre Bodegas

```
       BODEGA ORIGEN                              BODEGA DESTINO
            │                                          │
            ▼                                          │
┌─────────────────────┐                               │
│  InitiateTransfer   │                               │
│  (PENDING)          │                               │
└──────────┬──────────┘                               │
           │                                          │
           ▼                                          │
┌─────────────────────┐                               │
│  ConfirmTransfer    │                               │
│  (IN_TRANSIT)       │──────────────────────────────▶│
│  - Descuenta stock  │                               │
└──────────┬──────────┘                               │
           │                                          ▼
           │                              ┌─────────────────────┐
           │                              │  ReceiveTransfer    │
           │                              │  (RECEIVED)         │
           │                              │  - Aumenta stock    │
           │                              └──────────┬──────────┘
           │                                         │
           │                                         ▼
           │                              ┌─────────────────────┐
           │                              │  RejectTransfer     │
           │                              │  (REJECTED)         │
           │◀─────────────────────────────│  - Devuelve stock   │
           │                              └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  CancelTransfer     │
│  (CANCELLED)        │
│  - Restaura stock   │
└─────────────────────┘
```

### Diagrama de Estados: Movimiento

```
                    ┌───────────┐
                    │  CREATE   │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │   DRAFT   │◀──────────────────┐
                    └─────┬─────┘                   │
                          │                         │
               ┌──────────┴──────────┐              │
               │                     │              │
               ▼                     ▼              │
         ┌───────────┐         ┌───────────┐       │
         │   POST    │         │  DELETE   │       │
         └─────┬─────┘         └───────────┘       │
               │                                    │
               ▼                                    │
         ┌───────────┐                             │
         │  POSTED   │─────────────────────────────┤
         └─────┬─────┘        (void)               │
               │                                    │
               ▼                                    │
         ┌───────────┐                             │
         │  VOIDED   │─────────────────────────────┘
         └───────────┘     (reverse movement)
```

---

## Dependencias

### Dependencias Upstream (Módulos que importa)

| Módulo | Propósito |
|--------|-----------|
| AuthenticationModule | Contexto de usuario, permisos, auditoría |
| PrismaModule | Acceso a base de datos |
| SharedModule | Utilidades, event bus, decoradores |

### Dependencias Downstream (Módulos que lo importan)

| Módulo | Uso |
|--------|-----|
| SalesModule | Verificar stock, crear movimientos de salida |
| ReturnsModule | Crear movimientos de entrada por devoluciones |
| ReportModule | Generar reportes de inventario |
| ImportModule | Importar productos y stock masivamente |

### Repositorios Exportados

El módulo exporta los siguientes repositorios para uso de otros módulos:

```typescript
exports: [
  ProductRepository,
  WarehouseRepository,
  MovementRepository,
  StockRepository,
  LocationRepository,
  TransferRepository,
  ReorderRuleRepository,
]
```

---

## Consideraciones de Actualización

### Migración de Base de Datos

Al actualizar el módulo, considerar:

1. **Nuevas columnas en productos**: Ejecutar migraciones Prisma
2. **Índices de stock**: Verificar índices para consultas frecuentes
3. **Particionamiento**: Para grandes volúmenes, considerar particionamiento por organización

### Compatibilidad de API

- **Versionamiento**: Usar prefijos `/api/v1/`, `/api/v2/`
- **Deprecación**: Marcar endpoints obsoletos con headers `Deprecation`
- **Breaking changes**: Documentar en CHANGELOG.md

### Escalabilidad

| Escenario | Recomendación |
|-----------|---------------|
| Alto volumen de movimientos | Implementar cola de procesamiento (Bull/Redis) |
| Consultas de stock pesadas | Cachear con Redis, TTL 5 minutos |
| Múltiples bodegas | Índices compuestos (organizationId, warehouseId) |
| Auditoría masiva | Event sourcing para historial completo |

### Testing

```bash
# Ejecutar tests del módulo
npm run test -- --testPathPattern=inventory

# Tests de integración
npm run test:e2e -- --testPathPattern=inventory
```

### Monitoreo

Métricas recomendadas:
- `inventory.movements.posted.count` - Movimientos publicados
- `inventory.stock.alerts.count` - Alertas de stock bajo
- `inventory.transfers.pending.count` - Transferencias pendientes
- `inventory.api.latency` - Latencia de endpoints

---

## Contacto y Soporte

Para dudas sobre este módulo:
- Revisar documentación técnica en `/docs/technical/`
- Consultar tests como ejemplos de uso en `/tests/inventory/`
- Abrir issue en el repositorio con etiqueta `inventory`
