> [English](./inventory.md) | **[Español](./inventory.es.md)**

# Modulo de Inventario

## Descripcion General

El Modulo de Inventario es el modulo de dominio principal del sistema, encargado de gestionar productos, bodegas, movimientos de inventario, transferencias entre bodegas, niveles de stock, empresas, ubicaciones, categorias y reglas de reorden. Sigue un patron de Arquitectura Hexagonal (Puertos y Adaptadores) con principios de Diseno Dirigido por Dominio (DDD), incluyendo Raices de Agregado, Entidades, Objetos de Valor, Eventos de Dominio y Especificaciones. El modulo esta construido sobre NestJS y utiliza Prisma como ORM.

---

## Arquitectura

El modulo esta organizado en las siguientes capas:

- **Capa de Dominio** (`src/inventory/*/domain/`): Contiene entidades, objetos de valor, eventos de dominio, servicios de dominio, especificaciones e interfaces de puertos de repositorio.
- **Capa de Aplicacion** (`src/application/*UseCases/`): Contiene casos de uso que orquestan la logica de dominio e interactuan con los puertos de repositorio.
- **Capa de Infraestructura** (`src/infrastructure/database/repositories/`): Contiene las implementaciones de repositorios basadas en Prisma.
- **Capa de Interfaz** (`src/interfaces/http/inventory/`): Contiene los controladores REST de NestJS que exponen los endpoints HTTP.

El modulo se registra a traves de `InventoryModule` (`src/inventory/inventory.module.ts`) y sus endpoints HTTP se exponen mediante `InventoryHttpModule` (`src/interfaces/http/inventory/inventoryHttp.module.ts`).

Todos los endpoints estan protegidos por autenticacion JWT, autorizacion basada en roles y guardias de permisos. El registro de auditoria se aplica mediante interceptores.

---

## Sub-modulos

### Productos

Gestiona el catalogo de productos incluyendo SKU, precios, categorizacion, metodos de costeo y estado del ciclo de vida.

**Archivos clave:**
- Entidad: `src/inventory/products/domain/entities/product.entity.ts` (`Product` - Raiz de Agregado)
- Entidad: `src/inventory/products/domain/entities/category.entity.ts` (`Category`)
- Entidad: `src/inventory/products/domain/entities/unit.entity.ts` (`Unit`)
- Objetos de Valor: `SKU`, `ProductName`, `ProductStatus`, `CostMethod`, `Price`, `UnitValueObject`
- Puerto de Repositorio: `src/inventory/products/domain/ports/repositories/iProductRepository.port.ts`
- Servicios de Dominio: `pricing.service.ts`, `productBusinessRules.service.ts`, `productValidation.service.ts`
- Eventos de Dominio: `ProductCreatedEvent`, `ProductUpdatedEvent`

**Propiedades del producto:**
`sku`, `name`, `description`, `categories`, `unit`, `barcode`, `brand`, `model`, `price`, `status`, `costMethod`, `companyId`

**Estados del producto:** `ACTIVE`, `INACTIVE`, `DISCONTINUED` (final/irreversible)

**Metodos de costeo:** `AVG` (promedio ponderado movil), `FIFO`

**Validacion de SKU:** 3-50 caracteres, alfanumerico con guiones y guiones bajos, no puede comenzar o terminar con caracteres especiales.

---

### Bodegas

Gestiona las bodegas fisicas y sus ubicaciones. Cada bodega tiene un codigo unico y puede contener multiples ubicaciones.

**Archivos clave:**
- Entidad: `src/inventory/warehouses/domain/entities/warehouse.entity.ts` (`Warehouse` - Raiz de Agregado)
- Entidad: `src/inventory/warehouses/domain/entities/location.entity.ts` (`Location` - Raiz de Agregado, dentro del contexto de bodega)
- Objetos de Valor: `WarehouseCode`, `LocationCode`, `Address`
- Puertos de Repositorio: `iWarehouseRepository.port.ts`, `iLocationRepository.port.ts`
- Servicios de Dominio: `warehouseAssignment.service.ts`, `warehouseBusinessRules.service.ts`
- Eventos de Dominio: `WarehouseCreatedEvent`, `LocationAddedEvent`

**Propiedades de la bodega:**
`code`, `name`, `description`, `address`, `isActive`, `statusChangedBy`, `statusChangedAt`

**Propiedades de ubicacion (contexto bodega):**
`code`, `name`, `warehouseId`, `isDefault`, `isActive`

---

### Movimientos

Gestiona los movimientos de inventario (entradas, salidas, ajustes y movimientos relacionados con transferencias). Los movimientos siguen un ciclo de vida: DRAFT -> POSTED -> VOID/RETURNED.

**Archivos clave:**
- Entidad: `src/inventory/movements/domain/entities/movement.entity.ts` (`Movement` - Raiz de Agregado)
- Entidad: `src/inventory/movements/domain/entities/movementLine.entity.ts` (`MovementLine`)
- Objetos de Valor: `MovementType`, `MovementStatus`, `UnitCost`
- Puerto de Repositorio: `src/inventory/movements/domain/ports/repositories/iMovementRepository.port.ts`
- Servicios de Dominio: `ppmService.ts` (Promedio Ponderado Movil)
- Especificaciones: `movementSpecifications.ts`
- Mapper: `movement.mapper.ts`

**Tipos de movimiento:**

| Tipo | Direccion | Descripcion |
|------|-----------|-------------|
| `IN` | Entrada | Entrada por compra/recepcion |
| `OUT` | Salida | Salida por venta/despacho |
| `ADJUST_IN` | Entrada | Ajuste positivo |
| `ADJUST_OUT` | Salida | Ajuste negativo |
| `TRANSFER_IN` | Entrada | Recepcion de transferencia |
| `TRANSFER_OUT` | Salida | Despacho de transferencia |

**Estados del movimiento:**

| Estado | Descripcion |
|--------|-------------|
| `DRAFT` | Borrador, aun no aplicado al stock |
| `POSTED` | Aplicado al stock, genera rastro de auditoria |
| `VOID` | Movimiento aplicado revertido |
| `RETURNED` | Marcado como devuelto |

**Propiedades de linea de movimiento:**
`productId`, `locationId`, `quantity`, `unitCost`, `currency`, `extra`

**Eventos de Dominio:**
`MovementPostedEvent`, `MovementVoidedEvent`, `MovementReturnedEvent`, `StockUpdatedEvent`, `PPMRecalculatedEvent`

---

### Transferencias

Gestiona las transferencias de stock entre bodegas con un flujo de trabajo de multiples pasos: DRAFT -> IN_TRANSIT -> RECEIVED/REJECTED/PARTIAL, o DRAFT -> CANCELED.

**Archivos clave:**
- Entidad: `src/inventory/transfers/domain/entities/transfer.entity.ts` (`Transfer` - Raiz de Agregado)
- Entidad: `src/inventory/transfers/domain/entities/transferLine.entity.ts` (`TransferLine`)
- Objetos de Valor: `TransferStatus`, `TransferDirection`
- Puerto de Repositorio: `src/inventory/transfers/domain/ports/repositories/iTransferRepository.port.ts`
- Servicios de Dominio: `transferValidation.service.ts`, `transferWorkflow.service.ts`

**Estados de la transferencia:**

| Estado | Descripcion |
|--------|-------------|
| `DRAFT` | Estado inicial, editable |
| `IN_TRANSIT` | Confirmada, stock descontado del origen |
| `PARTIAL` | Parcialmente recibida en destino |
| `RECEIVED` | Totalmente recibida en destino |
| `REJECTED` | Rechazada por la bodega destino |
| `CANCELED` | Cancelada antes del transito |

**Propiedades de linea de transferencia:**
`productId`, `quantity`, `fromLocationId`, `toLocationId`

**Eventos de Dominio:**
`TransferInitiatedEvent`, `TransferReceivedEvent`, `TransferRejectedEvent`

**Regla de negocio:** Las bodegas de origen y destino deben ser diferentes.

---

### Stock

Gestiona los niveles actuales de stock, alertas de stock y calculos de inventario. El stock se calcula a partir de movimientos publicados y se rastrea por combinacion de producto-bodega-ubicacion.

**Archivos clave:**
- Entidad: `src/inventory/stock/domain/entities/reorderRule.entity.ts` (`ReorderRule` - Raiz de Agregado)
- Objetos de Valor: `Quantity`, `Money`, `MinQuantity`, `MaxQuantity`, `SafetyStock`
- Puertos de Repositorio: `iStockRepository.port.ts`, `iReorderRuleRepository.port.ts`
- Servicios de Dominio: `inventoryCalculation.service.ts`, `alertService.ts`, `stockValidation.service.ts`, `noNegativeStockRule.service.ts`, `mandatoryAuditRule.service.ts`
- Eventos de Dominio: `LowStockAlertEvent` (severidades: LOW, CRITICAL, OUT_OF_STOCK), `StockThresholdExceededEvent`

**Objeto de valor Quantity:** Soporta precision 0-6, operaciones aritmeticas (sumar, restar, multiplicar, dividir), verificaciones de positividad.

**Objeto de valor Money:** Soporta moneda (defecto: COP), precision 0-6, aritmetica con validacion de moneda, formateo.

**Funciones de calculo clave:**
- `calculateAverageCost` - Costo promedio ponderado movil (PPM)
- `calculateInventoryBalance` - Cantidad total y costo a partir de movimientos
- `validateStockAvailability` - Verifica stock suficiente para salidas
- `calculateInventoryValue` - Valor total = cantidad x costo unitario
- `calculatePPM` / `recalculatePPM` - Calculo de PPM y recalculo historico

---

### Empresas

Gestiona empresas (marcas/subsidiarias) dentro de la organizacion. Los productos pueden asociarse a una empresa para la gestion de inventario multi-empresa.

**Archivos clave:**
- Entidad: `src/inventory/companies/domain/entities/company.entity.ts` (`Company`)
- Puerto de Repositorio: `src/inventory/companies/domain/ports/repositories/iCompanyRepository.port.ts`
- DTOs: `src/inventory/companies/dto/company.dto.ts`

**Propiedades de la empresa:**
`name`, `code`, `description`, `isActive`

**Reglas de negocio:** El codigo y nombre de la empresa deben ser unicos dentro de la organizacion. No se puede eliminar una empresa que tenga productos asociados.

---

### Ubicaciones

Gestiona ubicaciones de almacenamiento granulares dentro de las bodegas. Soporta una estructura jerarquica (zona > pasillo > estante > repisa > contenedor).

**Archivos clave:**
- Entidad: `src/inventory/locations/domain/entities/location.entity.ts` (`Location` - Raiz de Agregado)
- Objetos de Valor: `LocationCode` (max 50 caracteres, mayusculas), `LocationType` (ZONE, AISLE, RACK, SHELF, BIN)
- Interfaz de Repositorio: `src/inventory/locations/domain/repositories/locationRepository.interface.ts`
- Mapper: `location.mapper.ts`

**Propiedades de la ubicacion:**
`code`, `name`, `description`, `type`, `warehouseId`, `parentId`, `isActive`

**Tipos de ubicacion:** `ZONE`, `AISLE`, `RACK`, `SHELF`, `BIN`

---

### Categorias

Gestiona categorias de productos jerarquicas. Las categorias pueden tener relaciones padre-hijo (estructura de arbol).

**Archivos clave:**
- Entidad: `src/inventory/products/domain/entities/category.entity.ts` (`Category`)
- Puerto de Repositorio: `src/inventory/products/domain/ports/repositories/iCategoryRepository.port.ts`

**Propiedades de la categoria:**
`name`, `parentId`, `description`, `isActive`

**Reglas de negocio:** El nombre de la categoria debe ser unico dentro de la organizacion. No se pueden eliminar categorias que tengan subcategorias o productos asociados.

---

### Reglas de Reorden

Gestiona umbrales de reorden automaticos por combinacion producto-bodega, definiendo cantidades minimas, maximas y de stock de seguridad.

**Archivos clave:**
- Entidad: `src/inventory/stock/domain/entities/reorderRule.entity.ts` (`ReorderRule` - Raiz de Agregado)
- Puerto de Repositorio: `src/inventory/stock/domain/ports/repositories/iReorderRuleRepository.port.ts`

**Propiedades de la regla de reorden:**
`productId`, `warehouseId`, `minQty` (MinQuantity), `maxQty` (MaxQuantity), `safetyQty` (SafetyStock)

**Regla de negocio:** `maxQty` siempre debe ser mayor que `minQty`.

---

## Casos de Uso

### Casos de Uso de Productos

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateProductUseCase` | `src/application/productUseCases/createProductUseCase.ts` | Crear un nuevo producto con validacion de SKU |
| `GetProductsUseCase` | `src/application/productUseCases/getProductsUseCase.ts` | Listar productos con paginacion, filtrado y ordenamiento |
| `GetProductByIdUseCase` | `src/application/productUseCases/getProductByIdUseCase.ts` | Obtener un producto por ID |
| `UpdateProductUseCase` | `src/application/productUseCases/updateProductUseCase.ts` | Actualizar informacion y estado del producto |

### Casos de Uso de Bodegas

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateWarehouseUseCase` | `src/application/warehouseUseCases/createWarehouseUseCase.ts` | Crear una nueva bodega con codigo unico |
| `GetWarehousesUseCase` | `src/application/warehouseUseCases/getWarehousesUseCase.ts` | Listar bodegas con paginacion y filtrado |
| `GetWarehouseByIdUseCase` | `src/application/warehouseUseCases/getWarehouseByIdUseCase.ts` | Obtener una bodega por ID |
| `UpdateWarehouseUseCase` | `src/application/warehouseUseCases/updateWarehouseUseCase.ts` | Actualizar detalles y estado de la bodega |

### Casos de Uso de Movimientos

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateMovementUseCase` | `src/application/movementUseCases/createMovementUseCase.ts` | Crear un movimiento en estado DRAFT con lineas |
| `GetMovementsUseCase` | `src/application/movementUseCases/getMovementsUseCase.ts` | Listar movimientos con filtrado por tipo, estado, rango de fechas |
| `GetMovementByIdUseCase` | `src/application/movementUseCases/getMovementByIdUseCase.ts` | Obtener un movimiento con sus lineas |
| `UpdateMovementUseCase` | `src/application/movementUseCases/updateMovementUseCase.ts` | Actualizar un movimiento en estado DRAFT |
| `PostMovementUseCase` | `src/application/movementUseCases/postMovementUseCase.ts` | Publicar un movimiento (DRAFT -> POSTED), actualizando stock |
| `VoidMovementUseCase` | `src/application/movementUseCases/voidMovementUseCase.ts` | Anular un movimiento publicado (POSTED -> VOID) |
| `DeleteMovementUseCase` | `src/application/movementUseCases/deleteMovementUseCase.ts` | Eliminar un movimiento en estado DRAFT |
| `MarkMovementReturnedUseCase` | `src/application/movementUseCases/markMovementReturnedUseCase.ts` | Marcar un movimiento publicado como devuelto |

### Casos de Uso de Transferencias

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `InitiateTransferUseCase` | `src/application/transferUseCases/initiateTransferUseCase.ts` | Crear una nueva transferencia entre bodegas |
| `GetTransfersUseCase` | `src/application/transferUseCases/getTransfersUseCase.ts` | Listar transferencias con filtrado |
| `GetTransferByIdUseCase` | `src/application/transferUseCases/getTransferByIdUseCase.ts` | Obtener una transferencia con detalles |
| `ConfirmTransferUseCase` | `src/application/transferUseCases/confirmTransferUseCase.ts` | Confirmar transferencia (DRAFT -> IN_TRANSIT), descontando stock del origen |
| `ReceiveTransferUseCase` | `src/application/transferUseCases/receiveTransferUseCase.ts` | Recibir transferencia (IN_TRANSIT -> RECEIVED), agregando stock al destino |
| `RejectTransferUseCase` | `src/application/transferUseCases/rejectTransferUseCase.ts` | Rechazar transferencia (IN_TRANSIT -> REJECTED) |
| `CancelTransferUseCase` | `src/application/transferUseCases/cancelTransferUseCase.ts` | Cancelar una transferencia en estado DRAFT |

### Casos de Uso de Stock

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `GetStockUseCase` | `src/application/stockUseCases/getStockUseCase.ts` | Consultar niveles actuales de stock con filtros opcionales |

### Casos de Uso de Categorias

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateCategoryUseCase` | `src/application/categoryUseCases/createCategoryUseCase.ts` | Crear una nueva categoria |
| `GetCategoriesUseCase` | `src/application/categoryUseCases/getCategoriesUseCase.ts` | Listar categorias con paginacion |
| `GetCategoryByIdUseCase` | `src/application/categoryUseCases/getCategoryByIdUseCase.ts` | Obtener una categoria por ID |
| `UpdateCategoryUseCase` | `src/application/categoryUseCases/updateCategoryUseCase.ts` | Actualizar una categoria |
| `DeleteCategoryUseCase` | `src/application/categoryUseCases/deleteCategoryUseCase.ts` | Eliminar una categoria (si no tiene hijos ni productos) |

### Casos de Uso de Empresas

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateCompanyUseCase` | `src/application/companyUseCases/createCompanyUseCase.ts` | Crear una nueva empresa |
| `GetCompaniesUseCase` | `src/application/companyUseCases/getCompaniesUseCase.ts` | Listar empresas con paginacion |
| `GetCompanyByIdUseCase` | `src/application/companyUseCases/getCompanyByIdUseCase.ts` | Obtener una empresa por ID |
| `UpdateCompanyUseCase` | `src/application/companyUseCases/updateCompanyUseCase.ts` | Actualizar una empresa |
| `DeleteCompanyUseCase` | `src/application/companyUseCases/deleteCompanyUseCase.ts` | Eliminar una empresa (si no tiene productos asociados) |

### Casos de Uso de Reglas de Reorden

| Caso de Uso | Archivo | Descripcion |
|-------------|---------|-------------|
| `CreateReorderRuleUseCase` | `src/application/reorderRuleUseCases/createReorderRuleUseCase.ts` | Crear una regla de reorden para un par producto-bodega |
| `GetReorderRulesUseCase` | `src/application/reorderRuleUseCases/getReorderRulesUseCase.ts` | Listar todas las reglas de reorden |
| `UpdateReorderRuleUseCase` | `src/application/reorderRuleUseCases/updateReorderRuleUseCase.ts` | Actualizar umbrales de la regla de reorden |
| `DeleteReorderRuleUseCase` | `src/application/reorderRuleUseCases/deleteReorderRuleUseCase.ts` | Eliminar una regla de reorden |

---

## Entidades y Objetos de Valor

### Raices de Agregado

| Entidad | Archivo | Comportamientos Clave |
|---------|---------|----------------------|
| `Product` | `product.entity.ts` | crear, actualizar, activar, desactivar, validar activo para operacion |
| `Warehouse` | `warehouse.entity.ts` | crear, actualizar, activar, desactivar |
| `Location` (bodega) | `warehouses/.../location.entity.ts` | crear, actualizar, establecer como predeterminada, activar, desactivar |
| `Location` (modulo ubicaciones) | `locations/.../location.entity.ts` | crear, actualizar, activar, desactivar, establecer padre |
| `Movement` | `movement.entity.ts` | crear, agregar linea, eliminar linea, publicar, anular, marcar como devuelto, actualizar |
| `Transfer` | `transfer.entity.ts` | crear, agregar linea, eliminar linea, confirmar, recibir, recibir parcial, rechazar, cancelar |
| `ReorderRule` | `reorderRule.entity.ts` | crear, actualizar cantidad minima, actualizar cantidad maxima, actualizar stock de seguridad |

### Entidades

| Entidad | Archivo | Descripcion |
|---------|---------|-------------|
| `Category` | `category.entity.ts` | Categoria de producto jerarquica con soporte padre-hijo |
| `Company` | `company.entity.ts` | Empresa/marca dentro de la organizacion |
| `Unit` | `unit.entity.ts` | Unidad de medida (codigo, nombre, precision) |
| `MovementLine` | `movementLine.entity.ts` | Linea de un movimiento con producto, cantidad y costo |
| `TransferLine` | `transferLine.entity.ts` | Linea de una transferencia con producto y cantidad |

### Objetos de Valor

| Objeto de Valor | Descripcion |
|-----------------|-------------|
| `SKU` | Codigo de producto (3-50 caracteres, alfanumerico + guion/guion bajo) |
| `ProductName` | Nombre de producto validado |
| `ProductStatus` | ACTIVO, INACTIVO, DESCONTINUADO |
| `CostMethod` | PROMEDIO (promedio ponderado), FIFO |
| `Price` | Alias de Money en el contexto de productos |
| `UnitValueObject` | Referencia a unidad de medida |
| `WarehouseCode` | Codigo identificador unico de bodega |
| `Address` | Direccion de bodega (maximo 500 caracteres) |
| `LocationCode` | Codigo identificador de ubicacion (maximo 50 caracteres, mayusculas) |
| `LocationType` | ZONA, PASILLO, ESTANTE, REPISA, CONTENEDOR |
| `MovementType` | ENTRADA, SALIDA, AJUSTE_ENTRADA, AJUSTE_SALIDA, TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SALIDA |
| `MovementStatus` | BORRADOR, PUBLICADO, ANULADO, DEVUELTO |
| `UnitCost` | Costo por unidad para lineas de movimiento |
| `TransferStatus` | BORRADOR, EN_TRANSITO, PARCIAL, RECIBIDO, RECHAZADO, CANCELADO |
| `TransferDirection` | SALIENTE, ENTRANTE |
| `Quantity` | Cantidad numerica con precision 0-6 |
| `Money` | Monto monetario con moneda (defecto COP) y precision |
| `MinQuantity` | Umbral de stock minimo para reglas de reorden |
| `MaxQuantity` | Umbral de stock maximo para reglas de reorden |
| `SafetyStock` | Cantidad de stock de seguridad |

---

## Endpoints de la API

Todos los endpoints tienen el prefijo `/inventory/` y requieren autenticacion JWT (token `Bearer`).

Todos los endpoints requieren los permisos apropiados como se especifica en la columna Permiso.

### Productos

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/products` | PRODUCTS:CREATE | Crear un nuevo producto |
| `GET` | `/inventory/products` | PRODUCTS:READ | Listar productos (paginado, filtrable) |
| `GET` | `/inventory/products/:id` | PRODUCTS:READ | Obtener producto por ID |
| `PUT` | `/inventory/products/:id` | PRODUCTS:UPDATE | Actualizar un producto |

### Bodegas

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/warehouses` | WAREHOUSES:CREATE | Crear una nueva bodega |
| `GET` | `/inventory/warehouses` | WAREHOUSES:READ | Listar bodegas (paginado, filtrable) |
| `GET` | `/inventory/warehouses/:id` | WAREHOUSES:READ | Obtener bodega por ID |
| `PUT` | `/inventory/warehouses/:id` | WAREHOUSES:UPDATE | Actualizar una bodega |

### Movimientos

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/movements` | INVENTORY:ENTRY | Crear un movimiento en DRAFT |
| `GET` | `/inventory/movements` | INVENTORY:READ | Listar movimientos (paginado, filtrable) |
| `GET` | `/inventory/movements/:id` | INVENTORY:READ | Obtener movimiento por ID |
| `PATCH` | `/inventory/movements/:id` | INVENTORY:ENTRY | Actualizar un movimiento en DRAFT |
| `DELETE` | `/inventory/movements/:id` | INVENTORY:ENTRY | Eliminar un movimiento en DRAFT |
| `POST` | `/inventory/movements/:id/post` | INVENTORY:ENTRY | Publicar movimiento (DRAFT -> POSTED) |
| `POST` | `/inventory/movements/:id/void` | INVENTORY:ENTRY | Anular movimiento (POSTED -> VOID) |
| `POST` | `/inventory/movements/:id/return` | INVENTORY:ENTRY | Marcar como devuelto (POSTED -> RETURNED) |

### Transferencias

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/transfers` | INVENTORY:TRANSFER | Iniciar una nueva transferencia |
| `GET` | `/inventory/transfers` | INVENTORY:READ | Listar transferencias (paginado, filtrable) |
| `GET` | `/inventory/transfers/:id` | INVENTORY:READ | Obtener transferencia por ID |
| `POST` | `/inventory/transfers/:id/confirm` | INVENTORY:TRANSFER | Confirmar transferencia (DRAFT -> IN_TRANSIT) |
| `POST` | `/inventory/transfers/:id/receive` | INVENTORY:TRANSFER | Recibir transferencia (IN_TRANSIT -> RECEIVED) |
| `POST` | `/inventory/transfers/:id/reject` | INVENTORY:TRANSFER | Rechazar transferencia |
| `POST` | `/inventory/transfers/:id/cancel` | INVENTORY:TRANSFER | Cancelar transferencia (solo DRAFT) |

### Stock

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `GET` | `/inventory/stock` | INVENTORY:READ | Obtener niveles actuales de stock |

**Parametros de consulta:** `warehouseId` (separados por coma), `productId`, `lowStock`, `companyId`, `sortBy`, `sortOrder`

### Categorias

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/categories` | PRODUCTS:CREATE | Crear una nueva categoria |
| `GET` | `/inventory/categories` | PRODUCTS:READ | Listar categorias (paginado, filtrable) |
| `GET` | `/inventory/categories/:id` | PRODUCTS:READ | Obtener categoria por ID |
| `PUT` | `/inventory/categories/:id` | PRODUCTS:UPDATE | Actualizar una categoria |
| `DELETE` | `/inventory/categories/:id` | PRODUCTS:DELETE | Eliminar una categoria |

### Empresas

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/companies` | COMPANIES:CREATE | Crear una nueva empresa |
| `GET` | `/inventory/companies` | COMPANIES:READ | Listar empresas (paginado, filtrable) |
| `GET` | `/inventory/companies/:id` | COMPANIES:READ | Obtener empresa por ID |
| `PUT` | `/inventory/companies/:id` | COMPANIES:UPDATE | Actualizar una empresa |
| `DELETE` | `/inventory/companies/:id` | COMPANIES:DELETE | Eliminar una empresa |

### Reglas de Reorden

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/inventory/stock/reorder-rules` | INVENTORY:ADJUST | Crear una regla de reorden |
| `GET` | `/inventory/stock/reorder-rules` | INVENTORY:READ | Listar todas las reglas de reorden |
| `PUT` | `/inventory/stock/reorder-rules/:id` | INVENTORY:ADJUST | Actualizar una regla de reorden |
| `DELETE` | `/inventory/stock/reorder-rules/:id` | INVENTORY:ADJUST | Eliminar una regla de reorden |

---

## Eventos de Dominio

El modulo utiliza un bus de eventos de dominio (`DomainEventBus`) para desacoplar la logica de dominio de los efectos secundarios. Los eventos se registran en `InventoryModule.onModuleInit()`.

| Evento | Disparador | Handler(s) |
|--------|------------|------------|
| `ProductCreated` | Se crea un nuevo producto | `ProductCreatedEventHandler` |
| `ProductUpdated` | Se actualiza un producto | `ProductUpdatedEventHandler` |
| `WarehouseCreated` | Se crea una nueva bodega | `WarehouseCreatedEventHandler` |
| `LocationAdded` | Se agrega una ubicacion a una bodega | `LocationAddedEventHandler` |
| `MovementPosted` | El estado del movimiento cambia a POSTED | `MovementPostedEventHandler`, `MovementPostedAuditHandler` |
| `MovementVoided` | El estado del movimiento cambia a VOID | `MovementVoidedAuditHandler` |
| `MovementReturned` | El estado del movimiento cambia a RETURNED | *(emitido, handler en modulo de devoluciones)* |
| `StockUpdated` | Cambia la cantidad de stock para un producto-bodega | *(evento informativo)* |
| `PPMRecalculated` | Se recalcula el costo promedio ponderado | *(evento informativo)* |
| `TransferInitiated` | Transferencia confirmada y stock descontado del origen | `TransferInitiatedAuditHandler` |
| `TransferReceived` | Transferencia totalmente recibida en destino | `TransferReceivedAuditHandler` |
| `TransferRejected` | Transferencia rechazada por el destino | `TransferRejectedAuditHandler` |
| `LowStockAlert` | El stock cae por debajo de los umbrales minimos/seguridad | `LowStockAlertEventHandler` |
| `StockThresholdExceeded` | El stock excede el umbral maximo | `StockThresholdExceededEventHandler` |

---

## Interfaces de Repositorio

Todos los repositorios siguen el patron de Arquitectura Hexagonal: los puertos de dominio definen la interfaz, y los adaptadores de infraestructura (basados en Prisma) proporcionan la implementacion. Todos los metodos de repositorio estan aislados por `orgId` para soporte multi-inquilino.

| Interfaz de Puerto | Implementacion | Descripcion |
|--------------------|---------------|-------------|
| `IProductRepository` | `PrismaProductRepository` | CRUD de productos + busqueda por SKU, categoria, estado, bodega, stock bajo, especificacion |
| `ICategoryRepository` | `PrismaCategoryRepository` | CRUD de categorias + busqueda por nombre, padre, raiz |
| `ICompanyRepository` | `PrismaCompanyRepository` | CRUD de empresas + busqueda por codigo, nombre, validacion de existencia, conteo de productos |
| `IWarehouseRepository` | `PrismaWarehouseRepository` | CRUD de bodegas + busqueda por codigo, validacion de existencia, busqueda de activas |
| `IMovementRepository` | `PrismaMovementRepository` | CRUD de movimientos + busqueda por bodega, estado, tipo, rango de fechas, producto, especificacion, carga diferida |
| `ITransferRepository` | `PrismaTransferRepository` | CRUD de transferencias + busqueda por bodega origen, bodega destino, estado, rango de fechas, en transito, pendientes |
| `IStockRepository` | `PrismaStockRepository` | Obtener cantidad de stock, stock con costo, actualizar stock, incrementar, decrementar, listar todo |
| `IReorderRuleRepository` | `PrismaReorderRuleRepository` | CRUD de reglas de reorden + busqueda por producto y bodega |
| `ILocationRepository` (ubicaciones) | `PrismaLocationRepository` | CRUD de ubicaciones + busqueda por codigo, bodega, hijos |
