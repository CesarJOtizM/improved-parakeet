# Módulo de Ventas (Sales Module)

## Índice
1. [Propósito y Responsabilidades](#propósito-y-responsabilidades)
2. [Arquitectura del Módulo](#arquitectura-del-módulo)
3. [Entidades de Dominio](#entidades-de-dominio)
4. [Servicios de Dominio](#servicios-de-dominio)
5. [Casos de Uso](#casos-de-uso)
6. [Repositorios](#repositorios)
7. [DTOs y Mappers](#dtos-y-mappers)
8. [Ejemplos de Uso](#ejemplos-de-uso)
9. [Diagramas](#diagramas)
10. [Dependencias](#dependencias)
11. [Consideraciones de Actualización](#consideraciones-de-actualización)

---

## Propósito y Responsabilidades

El **Módulo de Ventas** gestiona todo el ciclo de vida de las ventas, desde la creación hasta la confirmación y cancelación. Es responsable de:

- **Gestión de Ventas**: Crear, actualizar, confirmar y cancelar ventas
- **Líneas de Venta**: Agregar y remover productos de una venta
- **Cálculos de Venta**: Calcular subtotales, impuestos y totales
- **Integración con Inventario**: Reservar y descontar stock al confirmar ventas
- **Numeración Automática**: Generar números de venta secuenciales
- **Validaciones de Negocio**: Validar disponibilidad de stock, precios, etc.

### Responsabilidades Clave

| Responsabilidad | Descripción |
|-----------------|-------------|
| Ciclo de Vida de Venta | Gestionar estados: Borrador → Confirmada → Cancelada |
| Cálculos Financieros | Subtotales, descuentos, impuestos, total |
| Integración Inventario | Crear movimientos de salida al confirmar |
| Trazabilidad | Mantener historial de cambios y movimientos |
| Validaciones | Stock disponible, productos activos, precios válidos |

---

## Arquitectura del Módulo

```
src/sales/
├── sales.module.ts              # Módulo principal NestJS
├── domain/
│   ├── entities/
│   │   ├── sale.entity.ts       # Entidad principal de venta
│   │   └── saleLine.entity.ts   # Líneas de venta
│   └── services/
│       ├── inventoryIntegration.service.ts  # Integración con inventario
│       ├── saleCalculation.service.ts       # Cálculos de venta
│       ├── saleNumberGeneration.service.ts  # Generación de números
│       └── saleValidation.service.ts        # Validaciones
├── dto/
│   ├── createSale.dto.ts
│   ├── getSales.dto.ts
│   └── updateSale.dto.ts
└── mappers/
    └── sale.mapper.ts
```

---

## Entidades de Dominio

### Sale (Venta)

```typescript
interface Sale {
  id: string;
  organizationId: string;
  saleNumber: string;              // Número secuencial (VTA-2024-00001)
  warehouseId: string;             // Bodega de origen
  customerId?: string;             // Cliente (opcional)
  status: SaleStatus;              // 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  lines: SaleLine[];               // Líneas de productos
  subtotal: Money;                 // Suma de líneas
  discountAmount: Money;           // Descuento total
  taxAmount: Money;                // Impuestos
  total: Money;                    // Total final
  notes?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  movementId?: string;             // Movimiento de inventario asociado
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### SaleLine (Línea de Venta)

```typescript
interface SaleLine {
  id: string;
  saleId: string;
  productId: string;
  locationId: string;              // Ubicación de donde sale
  quantity: number;
  unitPrice: Money;                // Precio unitario
  discountPercent: number;         // % de descuento en línea
  discountAmount: Money;           // Monto de descuento
  taxPercent: number;              // % de impuesto
  taxAmount: Money;                // Monto de impuesto
  subtotal: Money;                 // quantity * unitPrice - discount
  total: Money;                    // subtotal + tax
}
```

### SaleStatus (Estados de Venta)

```typescript
type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

// Transiciones válidas:
// DRAFT → CONFIRMED (confirmar venta)
// DRAFT → CANCELLED (cancelar borrador)
// CONFIRMED → CANCELLED (anular venta confirmada, crea movimiento reverso)
```

---

## Servicios de Dominio

### SaleValidationService

Valida las operaciones de venta.

```typescript
class SaleValidationService {
  // Valida que una venta puede ser confirmada
  validateForConfirmation(sale: Sale): Result<void, SaleValidationError>;

  // Valida stock disponible para todas las líneas
  validateStockAvailability(sale: Sale): Result<void, StockError>;

  // Valida que los productos están activos
  validateProductsActive(sale: Sale): Result<void, ProductError>;

  // Valida precios y cálculos
  validateCalculations(sale: Sale): Result<void, CalculationError>;
}
```

### SaleCalculationService

Realiza cálculos financieros de la venta.

```typescript
class SaleCalculationService {
  // Calcula totales de una línea
  calculateLineTotal(line: SaleLine): SaleLineCalculation;

  // Calcula totales de la venta completa
  calculateSaleTotal(sale: Sale): SaleCalculation;

  // Aplica descuento a la venta
  applyDiscount(sale: Sale, discountPercent: number): Sale;

  // Recalcula todos los totales
  recalculate(sale: Sale): Sale;
}
```

### InventoryIntegrationService

Integra las ventas con el módulo de inventario.

```typescript
class InventoryIntegrationService {
  // Verifica stock disponible
  checkStockAvailability(
    warehouseId: string,
    lines: SaleLine[]
  ): Result<StockAvailability[], StockError>;

  // Crea movimiento de salida al confirmar venta
  createExitMovement(sale: Sale): Result<Movement, MovementError>;

  // Crea movimiento de entrada al cancelar venta confirmada
  createReversalMovement(sale: Sale): Result<Movement, MovementError>;

  // Reserva stock (opcional, para implementación futura)
  reserveStock(sale: Sale): Result<void, StockError>;
}
```

### SaleNumberGenerationService

Genera números de venta secuenciales.

```typescript
class SaleNumberGenerationService {
  // Genera el siguiente número de venta
  // Formato: VTA-{YYYY}-{SECUENCIA}
  generateNextNumber(organizationId: string): Promise<string>;

  // Ejemplo: VTA-2024-00001, VTA-2024-00002, etc.
}
```

---

## Casos de Uso

| Use Case | Descripción | Archivo |
|----------|-------------|---------|
| CreateSaleUseCase | Crear una venta en borrador | `src/application/saleUseCases/createSaleUseCase.ts` |
| GetSalesUseCase | Listar ventas con filtros | `src/application/saleUseCases/getSalesUseCase.ts` |
| GetSaleByIdUseCase | Obtener venta por ID | `src/application/saleUseCases/getSaleByIdUseCase.ts` |
| UpdateSaleUseCase | Actualizar venta en borrador | `src/application/saleUseCases/updateSaleUseCase.ts` |
| ConfirmSaleUseCase | Confirmar venta (descuenta stock) | `src/application/saleUseCases/confirmSaleUseCase.ts` |
| CancelSaleUseCase | Cancelar venta | `src/application/saleUseCases/cancelSaleUseCase.ts` |
| AddSaleLineUseCase | Agregar línea a venta | `src/application/saleUseCases/addSaleLineUseCase.ts` |
| RemoveSaleLineUseCase | Remover línea de venta | `src/application/saleUseCases/removeSaleLineUseCase.ts` |
| GetSaleMovementUseCase | Obtener movimiento de inventario asociado | `src/application/saleUseCases/getSaleMovementUseCase.ts` |

---

## Repositorios

| Repositorio | Interfaz (Port) | Implementación |
|-------------|-----------------|----------------|
| SaleRepository | `ISaleRepository` | `src/infrastructure/database/repositories/sale.repository.ts` |

### Métodos del Repositorio

```typescript
interface ISaleRepository {
  create(sale: Sale): Promise<Sale>;
  update(sale: Sale): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  findByNumber(saleNumber: string): Promise<Sale | null>;
  findAll(filters: SaleFilters): Promise<PaginatedResult<Sale>>;
  delete(id: string): Promise<void>;
  getNextSequence(organizationId: string, year: number): Promise<number>;
}
```

---

## DTOs y Mappers

### CreateSaleDto

```typescript
interface CreateSaleDto {
  warehouseId: string;
  customerId?: string;
  notes?: string;
  lines?: CreateSaleLineDto[];
}

interface CreateSaleLineDto {
  productId: string;
  locationId: string;
  quantity: number;
  unitPrice?: number;       // Si no se provee, usa precio del producto
  discountPercent?: number; // Descuento en línea
}
```

### GetSalesDto (Filtros)

```typescript
interface GetSalesDto {
  warehouseId?: string;
  customerId?: string;
  status?: SaleStatus;
  fromDate?: Date;
  toDate?: Date;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'saleNumber' | 'total';
  sortOrder?: 'asc' | 'desc';
}
```

### SaleResponseDto

```typescript
interface SaleResponseDto {
  id: string;
  saleNumber: string;
  warehouse: WarehouseDto;
  customer?: CustomerDto;
  status: SaleStatus;
  lines: SaleLineResponseDto[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes?: string;
  movement?: MovementSummaryDto;
  confirmedAt?: string;
  confirmedBy?: UserSummaryDto;
  cancelledAt?: string;
  cancelledBy?: UserSummaryDto;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Ejemplos de Uso

### Crear una Venta

```typescript
// POST /api/v1/sales
const createSaleDto = {
  warehouseId: 'warehouse-uuid',
  customerId: 'customer-uuid',
  notes: 'Venta de mostrador',
  lines: [
    {
      productId: 'product-uuid-1',
      locationId: 'location-uuid',
      quantity: 5,
      discountPercent: 10,
    },
    {
      productId: 'product-uuid-2',
      locationId: 'location-uuid',
      quantity: 2,
    },
  ],
};

const result = await createSaleUseCase.execute(createSaleDto);
// Resultado: Venta en estado DRAFT con cálculos aplicados
```

### Agregar Línea a Venta Existente

```typescript
// POST /api/v1/sales/:saleId/lines
const addLineDto = {
  productId: 'product-uuid-3',
  locationId: 'location-uuid',
  quantity: 3,
  unitPrice: 25.99,
};

const result = await addSaleLineUseCase.execute({
  saleId: 'sale-uuid',
  ...addLineDto,
});
// La venta se recalcula automáticamente
```

### Confirmar Venta

```typescript
// POST /api/v1/sales/:saleId/confirm
const result = await confirmSaleUseCase.execute({
  saleId: 'sale-uuid',
});

// Proceso interno:
// 1. Valida stock disponible
// 2. Valida productos activos
// 3. Crea movimiento de salida (EXIT)
// 4. Publica movimiento (descuenta stock)
// 5. Cambia estado a CONFIRMED
// 6. Publica evento SaleConfirmed
```

### Cancelar Venta

```typescript
// POST /api/v1/sales/:saleId/cancel
const result = await cancelSaleUseCase.execute({
  saleId: 'sale-uuid',
  reason: 'Cliente canceló pedido',
});

// Si la venta estaba CONFIRMED:
// 1. Crea movimiento de entrada (reverso)
// 2. Publica movimiento (devuelve stock)
// 3. Cambia estado a CANCELLED
// 4. Publica evento SaleCancelled
```

### Consultar Ventas con Filtros

```typescript
// GET /api/v1/sales?status=CONFIRMED&fromDate=2024-01-01&page=1&limit=20
const result = await getSalesUseCase.execute({
  status: 'CONFIRMED',
  fromDate: new Date('2024-01-01'),
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

// Resultado paginado con ventas confirmadas
```

---

## Diagramas

### Diagrama de Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SALES MODULE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                              HTTP LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SalesController                                                     │    │
│  │  - POST /sales (create)                                             │    │
│  │  - GET /sales (list)                                                │    │
│  │  - GET /sales/:id (get by id)                                       │    │
│  │  - PUT /sales/:id (update)                                          │    │
│  │  - POST /sales/:id/confirm (confirm)                                │    │
│  │  - POST /sales/:id/cancel (cancel)                                  │    │
│  │  - POST /sales/:id/lines (add line)                                 │    │
│  │  - DELETE /sales/:id/lines/:lineId (remove line)                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           APPLICATION LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Use Cases: Create, Get, Update, Confirm, Cancel, AddLine, RemoveLine│   │
│  └─────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                             DOMAIN LAYER                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Entities        │  │  Domain Services │  │  Value Objects   │          │
│  │  - Sale          │  │  - Validation    │  │  - Money         │          │
│  │  - SaleLine      │  │  - Calculation   │  │  - SaleStatus    │          │
│  │                  │  │  - Integration   │  │                  │          │
│  │                  │  │  - NumberGen     │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│                           REPOSITORY PORT                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ISaleRepository                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY MODULE (Import)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ProductRepository, StockRepository, MovementRepository              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Diagrama de Flujo: Confirmación de Venta

```
┌─────────────────┐
│  ConfirmSale    │
│  UseCase        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ SaleValidation  │────▶│  Validar venta  │
│ Service         │     │  en DRAFT       │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ InventoryInteg. │────▶│  Verificar      │
│ Service         │     │  stock          │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────────────────┐
│ CreateMovement  │────▶│  Crear movimiento EXIT con líneas   │
│ UseCase         │     │  de la venta                        │
└────────┬────────┘     └─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────────────────┐
│ PostMovement    │────▶│  Publicar movimiento                │
│ UseCase         │     │  (descuenta stock real)             │
└────────┬────────┘     └─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────────────────┐
│ SaleRepository  │────▶│  Actualizar venta:                  │
│ .update()       │     │  - status = CONFIRMED               │
│                 │     │  - movementId = nuevo movimiento    │
│                 │     │  - confirmedAt, confirmedBy         │
└────────┬────────┘     └─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────────────────┐
│ DomainEventBus  │────▶│  Publicar SaleConfirmed event       │
│ .publish()      │     │  → AuditHandler, NotificationHandler│
└─────────────────┘     └─────────────────────────────────────┘
```

### Diagrama de Estados de Venta

```
                              ┌──────────────────┐
                              │     CREAR        │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                      ┌──────▶│      DRAFT       │◀──────┐
                      │       └────────┬─────────┘       │
                      │                │                 │
                      │       ┌────────┴─────────┐       │
                      │       │                  │       │
                      │       ▼                  ▼       │
              ┌───────────────────┐    ┌───────────────────┐
              │     CONFIRMAR     │    │     CANCELAR      │
              │   (descuenta      │    │   (sin efecto     │
              │    stock)         │    │    en stock)      │
              └─────────┬─────────┘    └─────────┬─────────┘
                        │                        │
                        ▼                        ▼
              ┌──────────────────┐    ┌──────────────────┐
              │    CONFIRMED     │    │    CANCELLED     │
              └────────┬─────────┘    └──────────────────┘
                       │
                       ▼
              ┌───────────────────┐
              │     CANCELAR      │
              │   (devuelve       │
              │    stock)         │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │    CANCELLED     │
              └──────────────────┘
```

### Diagrama de Integración con Inventario

```
┌─────────────────────────────────────────────────────────────────┐
│                         SALES MODULE                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Sale Entity                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ id: uuid                                             │  │  │
│  │  │ saleNumber: VTA-2024-00001                          │  │  │
│  │  │ warehouseId: warehouse-uuid ─────────────────────┐  │  │  │
│  │  │ status: CONFIRMED                                │  │  │  │
│  │  │ movementId: movement-uuid ───────────────────────┼──┼──┼──┐
│  │  │ lines: [                                         │  │  │  │
│  │  │   { productId, locationId, quantity: 5 }         │  │  │  │
│  │  │   { productId, locationId, quantity: 2 }         │  │  │  │
│  │  │ ]                                                │  │  │  │
│  │  │ total: 150.00                                    │  │  │  │
│  │  └──────────────────────────────────────────────────┼──┘  │  │
│  └─────────────────────────────────────────────────────┼─────┘  │
└────────────────────────────────────────────────────────┼────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       INVENTORY MODULE                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Movement Entity                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ id: movement-uuid                                    │  │  │
│  │  │ type: EXIT                                           │  │  │
│  │  │ status: POSTED                                       │  │  │
│  │  │ warehouseId: warehouse-uuid                          │  │  │
│  │  │ reference: VTA-2024-00001                            │  │  │
│  │  │ lines: [                                             │  │  │
│  │  │   { productId, locationId, quantity: -5 }            │  │  │
│  │  │   { productId, locationId, quantity: -2 }            │  │  │
│  │  │ ]                                                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                              │                             │  │
│  │                              ▼                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                   Stock Updated                      │  │  │
│  │  │  Product A: 100 → 95 (-5)                           │  │  │
│  │  │  Product B: 50 → 48 (-2)                            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dependencias

### Dependencias Upstream (Módulos que importa)

| Módulo | Propósito |
|--------|-----------|
| AuthenticationModule | Contexto de usuario, permisos |
| InventoryModule | Stock, productos, movimientos, bodegas |
| PrismaModule | Acceso a base de datos |
| SharedModule | Utilidades, event bus |

### Dependencias Downstream (Módulos que lo importan)

| Módulo | Uso |
|--------|-----|
| ReturnsModule | Crear devoluciones asociadas a ventas |
| ReportModule | Generar reportes de ventas |

### Repositorios Importados de Inventory

```typescript
imports: [
  InventoryModule, // Provee:
  // - ProductRepository (consulta de productos y precios)
  // - StockRepository (verificación de disponibilidad)
  // - MovementRepository (crear movimientos de salida)
  // - WarehouseRepository (validar bodegas)
  // - LocationRepository (validar ubicaciones)
]
```

### Repositorios Exportados

```typescript
exports: [
  SaleRepository, // Usado por ReturnsModule para vincular devoluciones
]
```

---

## Consideraciones de Actualización

### Migraciones de Base de Datos

Al actualizar el módulo, considerar:

1. **Nuevos campos de venta**: Agregar columnas con valores default
2. **Índices**: Crear índices para filtros frecuentes (status, warehouseId, customerId)
3. **Secuencias**: Manejar secuencias de numeración por organización

### Compatibilidad de API

- **Versionamiento**: Endpoints bajo `/api/v1/sales`
- **Breaking changes**: Documentar en CHANGELOG.md
- **Deprecación**: Headers `Deprecation` para endpoints obsoletos

### Reglas de Negocio a Considerar

| Regla | Descripción |
|-------|-------------|
| No editar confirmadas | Ventas CONFIRMED no pueden modificarse |
| Stock requerido | Confirmar solo si hay stock suficiente |
| Productos activos | Solo vender productos activos |
| Precios positivos | Validar precios > 0 |
| Cantidades enteras | Según configuración de producto |

### Performance

| Escenario | Recomendación |
|-----------|---------------|
| Alto volumen de ventas | Índices en (organizationId, status, createdAt) |
| Consultas de reportes | Vistas materializadas para agregaciones |
| Confirmaciones masivas | Cola de procesamiento |

### Testing

```bash
# Ejecutar tests del módulo
npm run test -- --testPathPattern=sales

# Tests de integración
npm run test:e2e -- --testPathPattern=sales
```

### Monitoreo

Métricas recomendadas:
- `sales.created.count` - Ventas creadas
- `sales.confirmed.count` - Ventas confirmadas
- `sales.cancelled.count` - Ventas canceladas
- `sales.total.amount` - Monto total de ventas
- `sales.api.latency` - Latencia de endpoints

---

## Contacto y Soporte

Para dudas sobre este módulo:
- Revisar documentación técnica en `/docs/technical/`
- Consultar tests como ejemplos en `/tests/sales/`
- Abrir issue con etiqueta `sales`
