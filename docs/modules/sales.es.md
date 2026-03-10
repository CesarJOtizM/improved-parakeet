> [English](./sales.md) | **[Español](./sales.es.md)**

# Modulo de Ventas

## Descripcion General

El modulo de Ventas gestiona el ciclo de vida completo de las ordenes de venta, desde la creacion en borrador hasta la confirmacion, cumplimiento (picking, envio, completado) y devoluciones. Sigue los principios de Domain-Driven Design (DDD) con Arquitectura Hexagonal, utilizando aggregate roots, value objects, eventos de dominio y el patron de especificacion para consultas.

---

## Arquitectura

El modulo esta organizado siguiendo capas de arquitectura limpia:

```
src/sales/                          # Capa de Dominio + DTO + Mapper
  domain/
    entities/                       # Aggregate root y entidades
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
      inventoryIntegration.service.ts # Genera Movement desde Sale
      saleCalculation.service.ts      # Funciones de calculo puras
      saleNumberGeneration.service.ts # Generacion atomica de numeros
      saleValidation.service.ts       # Validacion de stock y reglas de negocio
    specifications/
      saleSpecifications.ts           # Especificaciones compatibles con Prisma
    ports/repositories/
      iSaleRepository.port.ts         # Interfaz de puerto de repositorio
  dto/
    createSale.dto.ts               # CreateSaleDto, CreateSaleLineDto
    updateSale.dto.ts               # UpdateSaleDto
    getSales.dto.ts                 # GetSalesDto (filtros de consulta)
    swapSaleLine.dto.ts             # SwapSaleLineDto
  mappers/
    sale.mapper.ts                  # SaleMapper (DTO <-> Dominio)
  sales.module.ts                   # Definicion del modulo NestJS

src/application/saleUseCases/       # Capa de aplicacion (casos de uso)
src/interfaces/http/sales/          # Capa de adaptador HTTP
  sales.controller.ts               # Controlador REST
  salesHttp.module.ts               # Modulo HTTP + registro de manejadores de eventos
```

### Dependencias Clave

- **InventoryModule**: MovementRepository, StockRepository, ProductRepository, WarehouseRepository
- **ContactsModule**: ContactRepository (para validacion de contactos)
- **AuthenticationModule**: DomainEventDispatcher, guards JWT
- **OrganizationModule**: OrganizationRepository (para configuracion de picking)

---

## Flujo de Trabajo

### Maquina de Estados

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

### Transiciones Permitidas

| Desde | Hacia | Metodo | Condicion |
|---|---|---|---|
| DRAFT | CONFIRMED | `confirm()` | Debe tener >= 1 linea con cantidades positivas; debe haber stock disponible |
| DRAFT | CANCELLED | `cancel()` | -- |
| CONFIRMED | PICKING | `startPicking()` | La organizacion debe tener la configuracion `pickingEnabled` |
| CONFIRMED | CANCELLED | `cancel()` | -- |
| CONFIRMED/PICKING | (intercambio) | `swapLine()` | Intercambio de linea permitido en CONFIRMED o PICKING |
| PICKING | SHIPPED | `ship()` | La organizacion debe tener `pickingEnabled` |
| PICKING | CANCELLED | `cancel()` | -- |
| SHIPPED | COMPLETED | `complete()` | La organizacion debe tener `pickingEnabled` |
| SHIPPED | RETURNED | `markAsReturned()` | -- |
| COMPLETED | RETURNED | `markAsReturned()` | -- |

### Formato del Numero de Venta

Patron: `SALE-YYYY-NNN` (ej., `SALE-2026-001`)
- Generado atomicamente mediante secuencia de base de datos para prevenir condiciones de carrera.

---

## Casos de Uso

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| **CreateSaleUseCase** | `createSaleUseCase.ts` | Crea una nueva venta en estado DRAFT. Valida que el almacen y el contacto existan. Genera numero de venta atomico. Opcionalmente incluye lineas iniciales. |
| **GetSalesUseCase** | `getSalesUseCase.ts` | Lista ventas con paginacion, filtros (estado, almacen, empresa, rango de fechas, busqueda libre) y ordenamiento. Resuelve nombres en lote para almacenes, contactos, productos y usuarios. |
| **GetSaleByIdUseCase** | `getSaleByIdUseCase.ts` | Obtiene una venta individual con todas las lineas, nombres resueltos de productos/almacenes/contactos/usuarios y la configuracion `pickingEnabled` de la organizacion. |
| **UpdateSaleUseCase** | `updateSaleUseCase.ts` | Actualiza metadatos de la venta (contactId, customerReference, externalReference, note). Solo permitido en estado DRAFT. |
| **ConfirmSaleUseCase** | `confirmSaleUseCase.ts` | Confirma una venta DRAFT dentro de una transaccion atomica: valida stock, crea un movimiento OUT con estado POSTED, decrementa stock y vincula el movimiento a la venta. |
| **CancelSaleUseCase** | `cancelSaleUseCase.ts` | Cancela una venta (desde DRAFT, CONFIRMED o PICKING). Registra razon y usuario que cancela. |
| **AddSaleLineUseCase** | `addSaleLineUseCase.ts` | Agrega una linea a una venta DRAFT. Valida que el producto exista. Usa metodo atomico del repositorio para prevenir condiciones de carrera. |
| **RemoveSaleLineUseCase** | `removeSaleLineUseCase.ts` | Elimina una linea de una venta DRAFT. |
| **StartPickingSaleUseCase** | `startPickingSaleUseCase.ts` | Transiciona una venta CONFIRMED a estado PICKING. Requiere la configuracion `pickingEnabled` de la organizacion. |
| **ShipSaleUseCase** | `shipSaleUseCase.ts` | Envia una venta en PICKING. Acepta numero de seguimiento, transportista y notas de envio opcionales. Requiere `pickingEnabled`. |
| **CompleteSaleUseCase** | `completeSaleUseCase.ts` | Marca una venta SHIPPED como COMPLETED. Requiere `pickingEnabled`. |
| **MarkSaleReturnedUseCase** | `markSaleReturnedUseCase.ts` | Marca una venta COMPLETED o SHIPPED como RETURNED (tipicamente activado por una devolucion de cliente). |
| **SwapSaleLineUseCase** | `swapSaleLineUseCase.ts` | Intercambia un producto en una venta CONFIRMED o PICKING. Soporta intercambios totales y parciales con ajustes de inventario atomicos (ADJUST_IN para producto devuelto, ADJUST_OUT para reemplazo). Soporta intercambios entre almacenes y dos estrategias de precio (KEEP_ORIGINAL, NEW_PRICE). |
| **GetSaleMovementUseCase** | `getSaleMovementUseCase.ts` | Obtiene el movimiento de inventario asociado a una venta confirmada. |
| **GetSaleSwapsUseCase** | `getSaleSwapsUseCase.ts` | Obtiene el historial completo de intercambios de una venta, incluyendo detalles del producto original y de reemplazo. |

---

## Entidades y Objetos de Valor

### Sale (Aggregate Root)

Archivo: `src/sales/domain/entities/sale.entity.ts`

La clase `Sale` es el aggregate root. Extiende `AggregateRoot` y gestiona una coleccion de entidades `SaleLine`. Todas las transiciones de estado estan protegidas por reglas de negocio aplicadas a traves del value object `SaleStatus`.

**Propiedades Clave:**
- `saleNumber: SaleNumber` - Identificador unico de venta (SALE-YYYY-NNN)
- `status: SaleStatus` - Estado actual del ciclo de vida
- `warehouseId: string` - Almacen destino
- `contactId?: string` - Contacto del cliente opcional
- `customerReference?: string` - Referencia visible para el cliente
- `externalReference?: string` - Referencia de sistema externo (factura, orden)
- `movementId?: string` - Movimiento de inventario vinculado (establecido en confirmacion)
- `trackingNumber?, shippingCarrier?, shippingNotes?` - Detalles de envio
- Campos de auditoria: `createdBy`, `confirmedBy`, `cancelledBy`, `pickedBy`, `shippedBy`, `completedBy`, `returnedBy` con timestamps correspondientes

### SaleLine (Entity)

Archivo: `src/sales/domain/entities/saleLine.entity.ts`

Representa una linea de producto individual dentro de una venta.

**Propiedades:**
- `productId: string` - Producto siendo vendido
- `locationId?: string` - Ubicacion opcional del almacen (opcional para MVP)
- `quantity: Quantity` - Cantidad vendida (debe ser positiva)
- `salePrice: SalePrice` - Precio unitario de venta
- `extra?: Record<string, unknown>` - Metadatos adicionales

### SaleLineSwap (Entity)

Archivo: `src/sales/domain/entities/saleLineSwap.entity.ts`

Registra el historial de una operacion de intercambio de linea de producto. Rastrea detalles del producto original y de reemplazo, estrategia de precios y movimientos de inventario asociados.

### Objetos de Valor

| Objeto de Valor | Archivo | Descripcion |
|---|---|---|
| **SaleStatus** | `saleStatus.valueObject.ts` | Enum: DRAFT, CONFIRMED, PICKING, SHIPPED, COMPLETED, CANCELLED, RETURNED. Aplica transiciones validas mediante `canConfirm()`, `canStartPicking()`, `canShip()`, `canComplete()`, `canReturn()`, `canCancel()`, `canSwapLine()`. |
| **SaleNumber** | `saleNumber.valueObject.ts` | Formato `SALE-YYYY-NNN` (secuencia de 3-6 digitos). Valida formato en construccion. |
| **SalePrice** | `salePrice.valueObject.ts` | Envuelve el value object `Money`. Debe ser positivo. Soporta multiplicacion para calculo de total de linea. |

---

## Servicios de Dominio

| Servicio | Archivo | Descripcion |
|---|---|---|
| **InventoryIntegrationService** | `inventoryIntegration.service.ts` | Genera una entidad `Movement` de tipo OUT desde una Venta. Mapea lineas de venta a lineas de movimiento preservando producto, ubicacion, cantidad y moneda. |
| **SaleCalculationService** | `saleCalculation.service.ts` | Funciones puras para calcular subtotal y total (con descuentos e impuestos opcionales). |
| **SaleNumberGenerationService** | `saleNumberGeneration.service.ts` | Genera el siguiente numero de venta atomico mediante el metodo `getNextSaleNumber()` del repositorio. |
| **SaleValidationService** | `saleValidation.service.ts` | Valida disponibilidad de stock, prerequisitos de confirmacion, elegibilidad de intercambio y reglas de cancelacion. |

---

## Eventos de Dominio

| Evento | Disparador | Descripcion |
|---|---|---|
| `SaleCreatedEvent` | `Sale.create()` | Emitido cuando se crea una nueva venta. |
| `SaleConfirmedEvent` | `Sale.confirm()` | Emitido cuando una venta es confirmada, incluye `movementId`. |
| `SaleCancelledEvent` | `Sale.cancel()` | Emitido cuando una venta es cancelada, incluye razon opcional. |
| `SalePickingStartedEvent` | `Sale.startPicking()` | Emitido cuando comienza el picking. |
| `SaleShippedEvent` | `Sale.ship()` | Emitido cuando una venta es enviada, incluye detalles de seguimiento. |
| `SaleCompletedEvent` | `Sale.complete()` | Emitido cuando una venta es marcada como completada. |
| `SaleReturnedEvent` | `Sale.markAsReturned()` | Emitido cuando una venta es marcada como devuelta. |
| `SaleLineSwappedEvent` | `SwapSaleLineUseCase` | Emitido despues de que una transaccion de intercambio de producto se completa. |
| `InventoryOutGeneratedEvent` | `ConfirmSaleUseCase` | Emitido despues de que el movimiento de inventario OUT es publicado. |

Los manejadores de eventos se registran en `SalesHttpModule.onModuleInit()`:
- `SaleCreatedEventHandler`
- `SaleConfirmedEventHandler`
- `SaleCancelledEventHandler`
- `SaleLineSwappedEventHandler`

---

## Especificaciones (Filtros de Consulta)

Archivo: `src/sales/domain/specifications/saleSpecifications.ts`

| Especificacion | Filtro | Descripcion |
|---|---|---|
| `SaleAllSpecification` | (ninguno) | Especificacion base que coincide con todas las ventas de una organizacion. |
| `SaleByStatusSpecification` | `status` | Filtrar por uno o mas estados (separados por coma). |
| `SaleByWarehouseSpecification` | `warehouseId` | Filtrar por uno o mas almacenes (separados por coma). |
| `SaleByDateRangeSpecification` | `startDate`, `endDate` | Filtrar por rango de fecha de creacion. |
| `SaleBySearchSpecification` | `search` | Busqueda libre sobre saleNumber, customerReference, externalReference (insensible a mayusculas). |
| `SaleByCompanySpecification` | `companyId` | Filtrar por empresa del producto via relacion de lineas de venta. |
| `SaleByCustomerSpecification` | `customerReference` | Filtrar por referencia exacta del cliente. |

Las especificaciones implementan `IPrismaSpecification<Sale>` y son componibles mediante `.and()` para filtrado combinado.

---

## Endpoints de la API

Ruta base: `/sales`

Todos los endpoints requieren autenticacion JWT y autorizacion basada en roles.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| `POST` | `/sales` | `SALES_CREATE` | Crear nueva venta (DRAFT) |
| `GET` | `/sales` | `SALES_READ` | Listar ventas con filtros y paginacion |
| `GET` | `/sales/:id` | `SALES_READ` | Obtener venta por ID con lineas y nombres resueltos |
| `PATCH` | `/sales/:id` | `SALES_UPDATE` | Actualizar metadatos de venta (solo DRAFT) |
| `POST` | `/sales/:id/confirm` | `SALES_CONFIRM` | Confirmar venta y generar movimiento de inventario |
| `POST` | `/sales/:id/cancel` | `SALES_CANCEL` | Cancelar venta (DRAFT/CONFIRMED/PICKING) |
| `POST` | `/sales/:id/pick` | `SALES_PICK` | Iniciar picking (CONFIRMED -> PICKING) |
| `POST` | `/sales/:id/ship` | `SALES_SHIP` | Enviar venta (PICKING -> SHIPPED) |
| `POST` | `/sales/:id/complete` | `SALES_COMPLETE` | Completar venta (SHIPPED -> COMPLETED) |
| `POST` | `/sales/:id/return` | `SALES_RETURN` | Marcar venta como devuelta |
| `POST` | `/sales/:id/swap` | `SALES_SWAP` | Intercambiar producto de linea de venta |
| `POST` | `/sales/:id/lines` | `SALES_UPDATE` | Agregar linea a venta (solo DRAFT) |
| `DELETE` | `/sales/:id/lines/:lineId` | `SALES_UPDATE` | Eliminar linea de venta (solo DRAFT) |
| `GET` | `/sales/:id/movement` | `SALES_READ` | Obtener movimiento de inventario asociado |
| `GET` | `/sales/:id/returns` | `SALES_READ` | Obtener devoluciones asociadas a la venta |
| `GET` | `/sales/:id/swaps` | `SALES_READ` | Obtener historial de intercambios de la venta |

---

## Integracion con Inventario

### Flujo de Confirmacion

Cuando una venta es confirmada (`ConfirmSaleUseCase`), lo siguiente ocurre dentro de una sola transaccion atomica (`UnitOfWork`):

1. **Validacion de stock**: Verifica previamente que todos los productos tengan stock suficiente en el almacen.

2. **Generacion de movimiento**: `InventoryIntegrationService.generateMovementFromSale()` crea un movimiento `OUT` con razon `SALE`, mapeando cada linea de venta a una linea de movimiento.

3. **Creacion de movimiento**: El movimiento se crea directamente con estado `POSTED` (no DRAFT -> POSTED).

4. **Decremento de stock**: Para cada linea de movimiento, el stock se decrementa atomicamente usando SQL directo (`UPDATE stock SET quantity = quantity - N WHERE ... AND quantity >= N`). Si alguna linea falla (stock insuficiente), toda la transaccion se revierte.

5. **Actualizacion de venta**: El estado de la venta se establece en `CONFIRMED` y se vincula al movimiento mediante `movementId`.

6. **Eventos**: `SaleConfirmedEvent` e `InventoryOutGeneratedEvent` se despachan despues de que la transaccion se confirma.

### Flujo de Intercambio

Cuando una linea es intercambiada (`SwapSaleLineUseCase`), la transaccion atomica:

1. **Devuelve producto original**: Incrementa stock del producto original (movimiento ADJUST_IN).

2. **Deduce producto de reemplazo**: Decrementa stock del reemplazo (movimiento ADJUST_OUT).

3. **Actualiza lineas de venta**: Para intercambios parciales, reduce la cantidad de la linea original y crea una nueva linea. Para intercambios totales, reemplaza el producto en la linea existente.

4. **Registra intercambio**: Crea un registro `SaleLineSwap` para trazabilidad.

### Referencias entre Modulos

- Ventas se vinculan a Devoluciones mediante `GET /sales/:id/returns` (delegado a `GetReturnsBySaleUseCase` en el modulo de Devoluciones).

- Una devolucion de cliente confirmada puede transicionar la venta vinculada al estado `RETURNED`.
