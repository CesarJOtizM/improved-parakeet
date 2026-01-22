# Inventory MVP - Plan de correcciones

## Contexto
El inventario no necesita ubicaciones internas (location). La ubicacion es el mismo warehouse.
Las transferencias deben poder completarse (confirmar, recibir, rechazar, cancelar).

## Objetivo
Cerrar el flujo completo de inventario para MVP:
- Productos, bodegas, movimientos y stock funcionales.
- Ventas y devoluciones impactan stock.
- Transferencias con ciclo completo (draft -> in_transit -> received/rejected/canceled).
- Dejar listo el camino para ubicaciones internas (bin/rack/aisle) sin bloquear MVP.

## Correcciones necesarias

### 1) Eliminar dependencia real de `location`
- Hacer `locationId` opcional en DTOs y dominio:
  - Movements: `CreateMovementLineDto`.
  - Sales: `CreateSaleLineDto`.
  - Returns: `CreateReturnLineDto`.
  - MovementLine entity: `locationId?: string`.
- Ajustar servicios/validaciones para aceptar `locationId` undefined.
- Ajustar repositorios para no exigir location (ya es ignorado en Stock).
- Mantener campo nullable en DB (ya existe `locationId` nullable en MovementLine).

Resultado: no se requiere tabla `Location` para MVP.

## Flujo simple de ubicaciones (bin/rack/aisle) para el futuro
Objetivo: habilitar ubicaciones internas sin cambiar la logica base.

### Modelo minimo
- `Location`: id, warehouseId, code (A01-R03-B12), name, isDefault, isActive, orgId.
- `Stock` por `productId + warehouseId + locationId` (en vez de solo bodega).
- `MovementLine.locationId` se mantiene opcional en MVP; se vuelve obligatorio al activar ubicaciones.

### Flujos base
- **Recepcion**: movimiento IN al `default location` (receiving).
- **Almacenamiento**: movimiento interno OUT desde receiving, IN a bin destino.
- **Picking**: ventas salen desde bins especificos.
- **Conteo ciclico**: ajustes por bin.
- **Reposicion**: mover stock de bin bulk a bin picking.

### Migracion cuando se active
- Crear `Location` por bodega (al menos 1 default).
- Migrar stock actual a `default location`.
- Hacer `locationId` requerido en DTOs y dominio.

### 2) Post de movimientos debe cambiar estado y disparar eventos
- En `PostMovementUseCase`:
  - Usar la instancia retornada por `movement.post()`.
  - Guardarla y despachar eventos con `DomainEventDispatcher`.

Resultado: el movimiento pasa a POSTED y se actualiza stock via `MovementPostedEventHandler`.

### 3) Confirmacion de ventas
- `InventoryIntegrationService.generateMovementFromSale` debe aceptar ventas en estado DRAFT.
- En `ConfirmSaleUseCase`:
  - Generar movimiento desde venta DRAFT.
  - Postear movimiento (crea y dispara evento de stock).
  - Confirmar venta con movementId.

Resultado: venta confirmada sin error y stock descontado.

### 4) Confirmacion de devoluciones
- `InventoryIntegrationService` (returns) debe aceptar devolucion en estado DRAFT.
- En `ConfirmReturnUseCase`:
  - Generar movimiento desde devolucion DRAFT.
  - Postear movimiento.
  - Confirmar devolucion con returnMovementId.

Resultado: devoluciones impactan stock correctamente.

### 5) Transferencias con flujo completo
- Agregar casos de uso y endpoints:
  - `ConfirmTransferUseCase`: cambia a IN_TRANSIT y crea movimiento OUT (post).
  - `ReceiveTransferUseCase`: cambia a RECEIVED y crea movimiento IN (post).
  - `RejectTransferUseCase`: cambia a REJECTED.
  - `CancelTransferUseCase`: cambia a CANCELED (solo si DRAFT).
- Actualizar controlador `TransfersController` con rutas:
  - `POST /inventory/transfers/:id/confirm`
  - `POST /inventory/transfers/:id/receive`
  - `POST /inventory/transfers/:id/reject`
  - `POST /inventory/transfers/:id/cancel`
- En el dominio, reutilizar `transfer.confirm()`, `receive()`, `reject()` y `cancel()`.
- Integrar con movimientos de inventario:
  - Confirm: OUT en bodega origen.
  - Receive: IN en bodega destino.

Resultado: transferencias afectan stock y completan ciclo de vida.

### 6) Exponer consulta de stock (basico MVP)
- Crear `GetStockUseCase` + endpoint:
  - `GET /inventory/stock` (filtros: warehouseId, productId, lowStock).

Resultado: visibilidad de existencias actuales.

## Orden recomendado de implementacion
1) Ajustar `locationId` a opcional en DTOs y entidades.
2) Corregir `PostMovementUseCase`.
3) Arreglar confirmacion de ventas.
4) Arreglar confirmacion de devoluciones.
5) Completar flujo de transferencias.
6) Agregar endpoint de stock.

## Pruebas minimas
- Crear producto, bodega.
- Crear movimiento IN y postear: stock sube.
- Crear venta y confirmar: stock baja.
- Crear devolucion cliente y confirmar: stock sube.
- Crear transferencia, confirmar (OUT) y recibir (IN): stock se mueve.
- GET stock muestra cantidades correctas.
