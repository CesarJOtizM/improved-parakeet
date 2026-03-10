> [English](./returns.md) | **[Español](./returns.es.md)**

# Modulo de Devoluciones

## Descripcion General

El modulo de Devoluciones gestiona devoluciones de clientes (productos devueltos por clientes) y devoluciones a proveedores (productos devueltos a proveedores). Soporta el ciclo de vida completo desde la creacion en borrador hasta la confirmacion con ajuste automatico de inventario. El modulo sigue Domain-Driven Design (DDD) con Arquitectura Hexagonal, reflejando los patrones utilizados en el modulo de Ventas.

---

## Arquitectura

```
src/returns/                         # Capa de Dominio + DTO + Mapper
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
      inventoryIntegration.service.ts # Genera Movement desde Return
      returnCalculation.service.ts    # Funciones de calculo puras
      returnNumberGeneration.service.ts # Generacion atomica de numeros
      returnValidation.service.ts     # Validacion de reglas de negocio y cantidades
    ports/repositories/
      iReturnRepository.port.ts       # Interfaz de puerto de repositorio
  dto/
    createReturn.dto.ts              # CreateReturnDto, CreateReturnLineDto
    updateReturn.dto.ts              # UpdateReturnDto
    getReturns.dto.ts                # GetReturnsDto (filtros de consulta)
  mappers/
    return.mapper.ts                 # ReturnMapper (DTO <-> Dominio)
  returns.module.ts                  # Definicion del modulo NestJS

src/application/returnUseCases/      # Capa de aplicacion (casos de uso)
src/interfaces/http/returns/         # Capa de adaptador HTTP
  returns.controller.ts              # Controlador REST
  returnsHttp.module.ts              # Modulo HTTP
```

### Dependencias Clave

- **InventoryModule**: MovementRepository, StockRepository, ProductRepository, WarehouseRepository
- **SalesModule**: SaleRepository (para validacion de cantidades de devoluciones de cliente)
- **AuthenticationModule**: DomainEventDispatcher, guards JWT

---

## Flujo de Trabajo

### Maquina de Estados

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

### Transiciones Permitidas

| Desde | Hacia | Metodo | Condicion |
|---|---|---|---|
| DRAFT | CONFIRMED | `confirm()` | Debe tener >= 1 linea con cantidades positivas; la cantidad de devolucion no debe exceder las cantidades originales de venta/compra |
| DRAFT | CANCELLED | `cancel()` | -- |
| CONFIRMED | CANCELLED | `cancel()` | -- |

### Tipos de Devolucion

El modulo soporta dos tipos de devolucion fundamentalmente diferentes, cada uno con reglas de validacion y efectos de inventario distintos:

| Tipo | Valor | Campo Requerido | Efecto en Inventario |
|---|---|---|---|
| **Devolucion de Cliente** | `RETURN_CUSTOMER` | `saleId` | **Movimiento IN** (stock aumenta) |
| **Devolucion a Proveedor** | `RETURN_SUPPLIER` | `sourceMovementId` | **Movimiento OUT** (stock disminuye) |

### Formato del Numero de Devolucion

Patron: `RETURN-YYYY-NNN` (ej., `RETURN-2026-001`)
- Generado atomicamente mediante secuencia de base de datos para prevenir condiciones de carrera.

---

## Casos de Uso

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| **CreateReturnUseCase** | `createReturnUseCase.ts` | Crea una nueva devolucion en estado DRAFT. Valida que el almacen exista. Aplica requisitos especificos del tipo (saleId para devoluciones de cliente, sourceMovementId para devoluciones a proveedor). Genera numero de devolucion atomico. Opcionalmente incluye lineas iniciales. |
| **GetReturnsUseCase** | `getReturnsUseCase.ts` | Lista devoluciones con paginacion y filtrado por estado, tipo, almacen, empresa, rango de fechas y busqueda libre por numero de devolucion. Soporta ordenamiento. |
| **GetReturnByIdUseCase** | `getReturnByIdUseCase.ts` | Obtiene una devolucion individual con todas las lineas y nombres resueltos. |
| **UpdateReturnUseCase** | `updateReturnUseCase.ts` | Actualiza metadatos de la devolucion (razon, nota). Solo permitido en estado DRAFT. |
| **ConfirmReturnUseCase** | `confirmReturnUseCase.ts` | Confirma una devolucion DRAFT dentro de una transaccion atomica: valida cantidades contra la venta/compra original, crea el movimiento apropiado (IN u OUT), ajusta stock, y opcionalmente marca la venta/movimiento vinculado como RETURNED. |
| **CancelReturnUseCase** | `cancelReturnUseCase.ts` | Cancela una devolucion (desde DRAFT o CONFIRMED). Registra razon. |
| **AddReturnLineUseCase** | `addReturnLineUseCase.ts` | Agrega una linea a una devolucion DRAFT. Usa metodo atomico del repositorio para prevenir condiciones de carrera. |
| **RemoveReturnLineUseCase** | `removeReturnLineUseCase.ts` | Elimina una linea de una devolucion DRAFT. |
| **GetReturnsBySaleUseCase** | `getReturnsBySaleUseCase.ts` | Obtiene todas las devoluciones asociadas a una venta especifica. Valida que la venta exista. Usado por el controlador de Ventas (`GET /sales/:id/returns`). |
| **GetReturnsByMovementUseCase** | `getReturnsByMovementUseCase.ts` | Obtiene todas las devoluciones asociadas a un movimiento fuente especifico. Valida que el movimiento exista. |

---

## Entidades y Objetos de Valor

### Return (Aggregate Root)

Archivo: `src/returns/domain/entities/return.entity.ts`

La clase `Return` es el aggregate root. Extiende `AggregateRoot` y gestiona una coleccion de entidades `ReturnLine`. Valida requisitos especificos del tipo en la creacion (ej., devoluciones de cliente deben tener un `saleId`).

**Propiedades Clave:**
- `returnNumber: ReturnNumber` - Identificador unico de devolucion (RETURN-YYYY-NNN)
- `status: ReturnStatus` - Estado actual del ciclo de vida (DRAFT, CONFIRMED, CANCELLED)
- `type: ReturnType` - Tipo de devolucion (RETURN_CUSTOMER o RETURN_SUPPLIER)
- `reason: ReturnReason` - Razon de la devolucion (texto libre, maximo 500 caracteres)
- `warehouseId: string` - Almacen destino
- `saleId?: string` - Venta vinculada (para devoluciones de cliente)
- `sourceMovementId?: string` - Movimiento de compra vinculado (para devoluciones a proveedor)
- `returnMovementId?: string` - Movimiento de inventario generado (establecido en confirmacion)
- `note?: string` - Notas adicionales
- Campos de auditoria: `createdBy`, `confirmedAt`, `cancelledAt`
- `readMetadata?: IReturnReadMetadata` - Datos transitorios de modelo de lectura (warehouseName, saleNumber, lineProducts), no persistidos

### ReturnLine (Entity)

Archivo: `src/returns/domain/entities/returnLine.entity.ts`

Representa una linea de producto individual dentro de una devolucion. Soporta diferente informacion de precio dependiendo del tipo de devolucion.

**Propiedades:**
- `productId: string` - Producto siendo devuelto
- `locationId?: string` - Ubicacion opcional del almacen (opcional para MVP)
- `quantity: Quantity` - Cantidad devuelta (debe ser positiva)
- `originalSalePrice?: SalePrice` - Precio de venta original (requerido para devoluciones de cliente)
- `originalUnitCost?: Money` - Costo unitario original (requerido para devoluciones a proveedor)
- `currency: string` - Codigo de moneda (requerido)
- `extra?: Record<string, unknown>` - Metadatos adicionales

### Objetos de Valor

| Objeto de Valor | Archivo | Descripcion |
|---|---|---|
| **ReturnStatus** | `returnStatus.valueObject.ts` | Enum: DRAFT, CONFIRMED, CANCELLED. Aplica transiciones validas mediante `canConfirm()` (solo desde DRAFT) y `canCancel()` (desde DRAFT o CONFIRMED). |
| **ReturnNumber** | `returnNumber.valueObject.ts` | Formato `RETURN-YYYY-NNN` (secuencia de 3-6 digitos). Valida formato en construccion. |
| **ReturnType** | `returnType.valueObject.ts` | Enum: `RETURN_CUSTOMER`, `RETURN_SUPPLIER`. Provee helpers `isCustomerReturn()` e `isSupplierReturn()`. |
| **ReturnReason** | `returnReason.valueObject.ts` | Texto libre (anulable). Maximo 500 caracteres. No puede estar vacio si se proporciona. |

---

## Servicios de Dominio

| Servicio | Archivo | Descripcion |
|---|---|---|
| **InventoryIntegrationService** | `inventoryIntegration.service.ts` | Dos metodos: `generateMovementFromCustomerReturn()` crea un movimiento IN (razon: `RETURN_CUSTOMER`); `generateMovementFromSupplierReturn()` crea un movimiento OUT (razon: `RETURN_SUPPLIER`). Ambos mapean lineas de devolucion a lineas de movimiento. |
| **ReturnCalculationService** | `returnCalculation.service.ts` | Funciones puras para calcular subtotal y total con ajustes opcionales. Retorna `null` cuando ninguna linea tiene datos de precio. |
| **ReturnNumberGenerationService** | `returnNumberGeneration.service.ts` | Genera el siguiente numero de devolucion atomico mediante el metodo `getNextReturnNumber()` del repositorio. |
| **ReturnValidationService** | `returnValidation.service.ts` | Valida prerequisitos de confirmacion, reglas de cancelacion, cantidades de devolucion de cliente (contra lineas de venta) y cantidades de devolucion a proveedor (contra lineas de movimiento de compra). |

---

## Eventos de Dominio

| Evento | Disparador | Descripcion |
|---|---|---|
| `ReturnCreatedEvent` | `Return.create()` | Emitido cuando se crea una nueva devolucion. Incluye returnType, saleId y sourceMovementId. |
| `ReturnConfirmedEvent` | `Return.confirm()` | Emitido cuando una devolucion es confirmada. Incluye `returnMovementId`. |
| `ReturnCancelledEvent` | `Return.cancel()` | Emitido cuando una devolucion es cancelada. Incluye razon opcional. |
| `InventoryInGeneratedEvent` | `ConfirmReturnUseCase` | Emitido despues de que una devolucion de cliente genera un movimiento IN (stock agregado). |
| `InventoryOutGeneratedEvent` | `ConfirmReturnUseCase` | Emitido despues de que una devolucion a proveedor genera un movimiento OUT (stock removido). |

---

## Endpoints de la API

Ruta base: `/returns`

Todos los endpoints requieren autenticacion JWT y autorizacion basada en roles.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| `POST` | `/returns` | `RETURNS_CREATE` | Crear nueva devolucion (DRAFT) |
| `GET` | `/returns` | `RETURNS_READ` | Listar devoluciones con filtros y paginacion |
| `GET` | `/returns/:id` | `RETURNS_READ` | Obtener devolucion por ID con lineas |
| `PUT` | `/returns/:id` | `RETURNS_UPDATE` | Actualizar metadatos de devolucion (solo DRAFT) |
| `POST` | `/returns/:id/confirm` | `RETURNS_CONFIRM` | Confirmar devolucion y generar movimiento de inventario |
| `POST` | `/returns/:id/cancel` | `RETURNS_CANCEL` | Cancelar devolucion (DRAFT/CONFIRMED) |
| `POST` | `/returns/:id/lines` | `RETURNS_UPDATE` | Agregar linea a devolucion (solo DRAFT) |
| `DELETE` | `/returns/:id/lines/:lineId` | `RETURNS_UPDATE` | Eliminar linea de devolucion (solo DRAFT) |

### Endpoints Adicionales entre Modulos

Estos endpoints se exponen a traves del controlador de Ventas pero delegan a casos de uso de Devoluciones:

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| `GET` | `/sales/:id/returns` | `SALES_READ` | Obtener todas las devoluciones de una venta |

---

## Integracion con Inventario

### Flujo de Confirmacion de Devolucion de Cliente

Cuando una devolucion de cliente es confirmada (`ConfirmReturnUseCase`), lo siguiente ocurre dentro de una sola transaccion atomica (`UnitOfWork`):

1. **Bloqueo de fila**: La fila de la venta vinculada es bloqueada (`SELECT ... FOR UPDATE`) para prevenir que devoluciones concurrentes excedan las cantidades vendidas.

2. **Validacion de cantidad**: Verifica que la cantidad total devuelta (incluyendo todas las devoluciones existentes no canceladas) no exceda la cantidad vendida por producto.

3. **Generacion de movimiento**: `InventoryIntegrationService.generateMovementFromCustomerReturn()` crea un movimiento `IN` con razon `RETURN_CUSTOMER`.

4. **Creacion de movimiento**: El movimiento se crea directamente con estado `POSTED`.

5. **Incremento de stock**: Para cada linea de movimiento, el stock se incrementa atomicamente usando `INSERT ... ON CONFLICT DO UPDATE` (patron upsert).

6. **Actualizacion de devolucion**: El estado de la devolucion se establece en `CONFIRMED` y se vincula al movimiento mediante `returnMovementId`.

7. **Actualizacion de estado de venta**: Si la venta vinculada esta en estado `COMPLETED` o `SHIPPED`, se transiciona automaticamente a `RETURNED`.

8. **Eventos**: `ReturnConfirmedEvent` e `InventoryInGeneratedEvent` se despachan despues de que la transaccion se confirma.

### Flujo de Confirmacion de Devolucion a Proveedor

Cuando una devolucion a proveedor es confirmada, el flujo es similar pero con diferencias clave:

1. **Bloqueo de fila**: La fila del movimiento fuente es bloqueada para prevenir devoluciones concurrentes.

2. **Validacion de cantidad**: Verifica que la cantidad total devuelta no exceda la cantidad comprada por producto (del movimiento fuente IN/PURCHASE).

3. **Generacion de movimiento**: `InventoryIntegrationService.generateMovementFromSupplierReturn()` crea un movimiento `OUT` con razon `RETURN_SUPPLIER`.

4. **Decremento de stock**: Para cada linea de movimiento, el stock se decrementa atomicamente. Si no hay stock suficiente, la transaccion se revierte con un `InsufficientStockError`.

5. **Actualizacion de movimiento fuente**: Si el movimiento fuente esta en estado `POSTED`, se transiciona automaticamente a `RETURNED`.

6. **Eventos**: `ReturnConfirmedEvent` e `InventoryOutGeneratedEvent` se despachan despues de que la transaccion se confirma.

### Resumen de Movimientos de Inventario

| Tipo de Devolucion | Tipo de Movimiento | Razon del Movimiento | Efecto en Stock | Actualizacion de Entidad Vinculada |
|---|---|---|---|---|
| `RETURN_CUSTOMER` | `IN` | `RETURN_CUSTOMER` | Stock aumenta (producto devuelto al almacen) | Venta -> `RETURNED` (si COMPLETED o SHIPPED) |
| `RETURN_SUPPLIER` | `OUT` | `RETURN_SUPPLIER` | Stock disminuye (producto enviado de vuelta al proveedor) | Movimiento Fuente -> `RETURNED` (si POSTED) |

### Seguridad de Concurrencia

Ambos flujos de confirmacion usan bloqueo a nivel de fila `SELECT ... FOR UPDATE` dentro de la transaccion para prevenir la vulnerabilidad TOCTOU (Time-of-Check-Time-of-Use). Esto asegura que incluso si dos confirmaciones de devolucion ocurren concurrentemente para la misma venta o movimiento, las cantidades totales devueltas nunca excederan las cantidades originales.
