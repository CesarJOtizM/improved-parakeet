> [English](./api-reference.md) | **[Español](./api-reference.es.md)**

# Referencia de la API

Referencia completa de todos los endpoints del Nevada Inventory System API.

**URL Base**: `http://localhost:3000` (desarrollo) | Configurar en produccion

**Formato de respuesta**: JSON

**Autenticacion**: JWT Bearer Token (excepto login y health check)

---

## Tabla de Contenidos

- [Headers Requeridos](#headers-requeridos)
- [Formato de Respuesta](#formato-de-respuesta)
- [Health Check](#health-check)
- [Authentication](#authentication)
- [Users](#users)
- [Roles & Permissions](#roles--permissions)
- [Settings](#settings)
- [Products](#products)
- [Categories](#categories)
- [Warehouses](#warehouses)
- [Locations](#locations)
- [Stock](#stock)
- [Reorder Rules](#reorder-rules)
- [Movements](#movements)
- [Transfers](#transfers)
- [Sales](#sales)
- [Returns](#returns)
- [Reports](#reports)
- [Dashboard](#dashboard)
- [Audit Logs](#audit-logs)
- [Imports](#imports)
- [Organizations](#organizations)
- [Contacts](#contacts)
- [Integrations](#integrations)

---

## Headers Requeridos

### Todas las peticiones autenticadas

| Header | Valor | Descripcion |
|--------|-------|-------------|
| `Authorization` | `Bearer {accessToken}` | Token JWT de acceso |
| `X-Organization-Slug` | `mi-organizacion` | Slug de la org activa |
| `Content-Type` | `application/json` | Para POST/PUT/PATCH |

### Opcionales

| Header | Valor | Descripcion |
|--------|-------|-------------|
| `X-Organization-ID` | `cuid2...` | ID de la organizacion |
| `X-User-ID` | `cuid2...` | ID del usuario |
| `X-API-Version` | `1` | Version de la API (default: 1) |

---

## Formato de Respuesta

### Respuesta Estandar

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### Respuesta Paginada

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  },
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### Respuesta de Error

```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404,
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

### Nota: Sales y Returns

Las respuestas de Sales y Returns estan envueltas en formato Effect:

```json
{
  "_tag": "Ok",
  "_value": {
    "success": true,
    "message": "...",
    "data": [ ... ],
    "pagination": { ... }
  }
}
```

---

## Health Check

### `GET /health`

Verifica el estado del sistema.

**Auth**: No requerida

**Respuesta**:
```json
{
  "status": "ok",
  "database": "connected",
  "cache": "connected"
}
```

---

## Authentication

### `POST /auth/login`

Iniciar sesion.

**Auth**: No requerida

**Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "organizationSlug": "mi-organizacion"
}
```

**Respuesta** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2026-02-28T12:15:00.000Z",
    "user": {
      "id": "cuid2...",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "roles": ["ADMIN"],
      "permissions": ["PRODUCTS:CREATE", "PRODUCTS:READ", ...]
    }
  }
}
```

### `POST /auth/refresh`

Renovar el access token.

**Body**:
```json
{
  "refreshToken": "eyJ..."
}
```

**Respuesta** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresAt": "2026-02-28T12:15:00.000Z"
  }
}
```

### `POST /auth/logout`

Cerrar sesion. Invalida el access token.

**Respuesta** (200):
```json
{ "success": true, "message": "Logged out successfully" }
```

### `POST /auth/password-reset/request`

Solicitar reset de password. Envia OTP por email.

**Body**: `{ "email": "user@example.com", "organizationSlug": "..." }`

### `POST /auth/password-reset/verify`

Verificar OTP.

**Body**: `{ "email": "...", "otp": "123456" }`

### `POST /auth/password-reset/confirm`

Establecer nueva password.

**Body**: `{ "email": "...", "otp": "123456", "newPassword": "..." }`

---

## Users

**Permiso requerido**: `USERS:*`

### `POST /users`

Crear usuario. Permiso: `USERS:CREATE`

**Body**:
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "securePassword123"
}
```

### `GET /users`

Listar usuarios. Permiso: `USERS:READ`

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `page` | number | Pagina (default: 1) |
| `limit` | number | Registros por pagina (default: 10) |
| `search` | string | Buscar por nombre o email |
| `status` | string | ACTIVE, INACTIVE, LOCKED |

### `GET /users/:id`

Obtener usuario por ID. Permiso: `USERS:READ`

### `PUT /users/:id`

Actualizar usuario. Permiso: `USERS:UPDATE`

### `PATCH /users/:id/status`

Cambiar estado del usuario. Permiso: `USERS:UPDATE`

**Body**: `{ "status": "INACTIVE" }`

### `POST /users/:id/roles`

Asignar rol a usuario. Permiso: `USERS:MANAGE_ROLES`

**Body**: `{ "roleId": "cuid2..." }`

### `DELETE /users/:id/roles/:roleId`

Remover rol de usuario. Permiso: `USERS:MANAGE_ROLES`

---

## Roles & Permissions

**Permiso requerido**: `ROLES:*`

### `POST /roles`

Crear rol custom. Permiso: `ROLES:CREATE`

**Body**: `{ "name": "Custom Role", "description": "..." }`

### `GET /roles`

Listar roles. Permiso: `ROLES:READ`

**Nota**: No tiene paginacion, retorna todos los roles.

### `GET /roles/:id`

Obtener rol por ID. Permiso: `ROLES:READ`

### `PUT /roles/:id`

Actualizar rol. Permiso: `ROLES:UPDATE`

**Nota**: Solo roles custom (isSystem=false).

### `DELETE /roles/:id`

Eliminar rol. Permiso: `ROLES:DELETE`

### `GET /roles/permissions`

Listar todos los permisos disponibles del sistema.

**Respuesta**:
```json
{
  "data": [
    { "code": "PRODUCTS:CREATE", "module": "PRODUCTS", "action": "CREATE" },
    { "code": "PRODUCTS:READ", "module": "PRODUCTS", "action": "READ" },
    ...
  ]
}
```

### `GET /roles/:id/permissions`

Obtener permisos asignados a un rol.

### `POST /roles/:id/permissions`

Asignar permisos a un rol.

**Body**:
```json
{
  "permissions": ["PRODUCTS:CREATE", "PRODUCTS:READ", "SALES:READ"]
}
```

---

## Settings

### `GET /users/me`

Obtener perfil del usuario actual.

### `PUT /users/me`

Actualizar perfil.

**Body**:
```json
{
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "language": "es",
  "jobTitle": "Warehouse Manager",
  "department": "Operations"
}
```

### `GET /settings/alerts`

Obtener configuracion de alertas. Permiso: `SETTINGS:MANAGE`

### `PUT /settings/alerts`

Actualizar configuracion de alertas. Permiso: `SETTINGS:MANAGE`

**Body**:
```json
{
  "cronFrequency": "EVERY_6_HOURS",
  "notifyLowStock": true,
  "notifyCriticalStock": true,
  "notifyOutOfStock": false,
  "recipientEmails": ["admin@example.com", "warehouse@example.com"],
  "isEnabled": true
}
```

---

## Products

**Permiso requerido**: `PRODUCTS:*`

### `POST /products`

Crear producto. Permiso: `PRODUCTS:CREATE`

**Body**:
```json
{
  "sku": "PROD-001",
  "name": "Widget A",
  "description": "...",
  "unit": { "code": "UNIT", "name": "Unidad", "precision": 0 },
  "costMethod": "AVG",
  "price": 29.99,
  "currency": "USD",
  "barcode": "1234567890",
  "brand": "WidgetCo"
}
```

### `GET /products`

Listar productos. Permiso: `PRODUCTS:READ`

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `page` | number | Pagina |
| `limit` | number | Registros por pagina |
| `search` | string | Buscar por nombre o SKU |
| `status` | string | `ACTIVE` o `INACTIVE` (NO usar `isActive`) |
| `categoryId` | string | Filtrar por categoria |
| `warehouseId` | string | Filtrar por bodega |

### `GET /products/:id`

Detalle del producto con stock por bodega.

### `PUT /products/:id`

Actualizar producto. Permiso: `PRODUCTS:UPDATE`

### `PATCH /products/:id/status`

Cambiar estado activo/inactivo. Permiso: `PRODUCTS:UPDATE`

**Body**: `{ "status": "INACTIVE" }`

Registra `statusChangedBy` y `statusChangedAt`.

### `DELETE /products/:id`

Eliminar producto (soft delete). Permiso: `PRODUCTS:DELETE`

---

## Categories

**Permiso requerido**: `PRODUCTS:*`

### `POST /categories`
### `GET /categories`
### `GET /categories/:id`
### `PUT /categories/:id`
### `DELETE /categories/:id`

CRUD estandar de categorias.

---

## Warehouses

**Permiso requerido**: `WAREHOUSES:*`

### `POST /warehouses`
### `GET /warehouses`
### `GET /warehouses/:id`

Incluye ubicaciones (locations).

### `PUT /warehouses/:id`
### `PATCH /warehouses/:id/status`

Toggle activo/inactivo.

---

## Locations

### `POST /warehouses/:warehouseId/locations`

Crear ubicacion dentro de una bodega. Soporta jerarquia.

### `GET /warehouses/:warehouseId/locations`

Listar ubicaciones (jerarquicas).

### `GET /locations/:id`
### `PUT /locations/:id`

---

## Stock

**Permiso requerido**: `PRODUCTS:READ`

### `GET /stock`

Listar stock.

**Query params**: `warehouseId`, `productId`, `page`, `limit`

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "productId": "...",
      "warehouseId": "...",
      "quantity": 150,
      "averageCost": 25.50,
      "totalValue": 3825.00,
      "currency": "USD"
    }
  ],
  "timestamp": "..."
}
```

**Nota**: No tiene campo `id`, no incluye nombres de producto/bodega.

### `GET /stock/:id`
### `PATCH /stock/:id/adjust`

Ajustar cantidad manualmente.

---

## Reorder Rules

### `POST /reorder-rules`
### `GET /reorder-rules`
### `PUT /reorder-rules/:id`
### `DELETE /reorder-rules/:id`

Configurar reglas de reorden (min stock, max stock, safety stock) por producto-bodega.

---

## Movements

**Permiso requerido**: `MOVEMENTS:*`

### `POST /movements`

Crear movimiento. Permiso: `MOVEMENTS:CREATE`

**Body**:
```json
{
  "type": "IN",
  "warehouseId": "...",
  "notes": "Recepcion de proveedor",
  "lines": [
    { "productId": "...", "quantity": 100, "unitCost": 25.50 }
  ]
}
```

**Tipos**: `IN` (entrada), `OUT` (salida), `ADJUSTMENT` (ajuste)

### `GET /movements`

**Query params**: `type`, `status`, `warehouseId`, `startDate`, `endDate`, `page`, `limit`

### `GET /movements/:id`

Detalle con lineas.

### `POST /movements/:id/post`

Confirmar movimiento: DRAFT -> POSTED. Permiso: `MOVEMENTS:CONFIRM`

Actualiza el stock real.

### `POST /movements/:id/void`

Anular movimiento: -> VOID. Permiso: `MOVEMENTS:VOID`

Revierte el efecto en stock.

---

## Transfers

**Permiso requerido**: `TRANSFERS:*`

### `POST /transfers`

Crear transferencia entre bodegas.

**Body**:
```json
{
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "notes": "Transfer to main warehouse",
  "lines": [
    { "productId": "...", "quantity": 50 }
  ]
}
```

### `GET /transfers`

**Nota**: La lista no incluye `lines`, `fromWarehouseName`, `toWarehouseName`.

### `GET /transfers/:id`

Detalle completo con lineas y nombres.

### `POST /transfers/:id/initiate`

DRAFT -> IN_TRANSIT. Permiso: `TRANSFERS:CONFIRM`

### `POST /transfers/:id/receive`

IN_TRANSIT -> RECEIVED. Permiso: `TRANSFERS:CONFIRM`

### `POST /transfers/:id/reject`

IN_TRANSIT -> REJECTED. Permiso: `TRANSFERS:CONFIRM`

### `POST /transfers/:id/cancel`

-> CANCELLED. Permiso: `TRANSFERS:CONFIRM`

---

## Sales

**Permiso requerido**: `SALES:*`

### `POST /sales`

Crear venta (estado DRAFT).

**Body**:
```json
{
  "customerId": "...",
  "warehouseId": "...",
  "notes": "Order for client X",
  "lines": [
    { "productId": "...", "quantity": 5, "unitPrice": 29.99 }
  ]
}
```

### `GET /sales`

**Query params**: `status`, `customerId`, `warehouseId`, `startDate`, `endDate`, `page`, `limit`

**Respuesta**: Envuelta en formato Effect (`_tag: "Ok"`, `_value: { ... }`).

### `GET /sales/:id`

**Nota**: `lines` puede faltar en la respuesta -- usar mapper `fromApiRaw()`.

### `PUT /sales/:id`

Actualizar venta. Solo en estado DRAFT.

### `POST /sales/:id/confirm`

DRAFT -> CONFIRMED. Permiso: `SALES:CONFIRM`

### `POST /sales/:id/pick`

CONFIRMED -> PICKING. Permiso: `SALES:PICK`

### `POST /sales/:id/ship`

PICKING -> SHIPPED. Permiso: `SALES:SHIP`

**Body** (opcional): `{ "trackingNumber": "TRACK-123" }`

### `POST /sales/:id/complete`

SHIPPED -> COMPLETED. Permiso: `SALES:COMPLETE`

### `POST /sales/:id/cancel`

-> CANCELLED. Permiso: `SALES:CANCEL`

---

## Returns

**Permiso requerido**: `RETURNS:*`

### `POST /returns`

Crear devolucion.

**Body**:
```json
{
  "returnType": "RETURN_CUSTOMER",
  "saleId": "...",
  "reason": "Defective product",
  "lines": [
    {
      "productId": "...",
      "quantity": 2,
      "originalSalePrice": 29.99,
      "originalUnitCost": 15.00
    }
  ]
}
```

**Tipos**: `RETURN_CUSTOMER`, `RETURN_SUPPLIER`

### `GET /returns`

**Query params**: `returnType`, `status`, `startDate`, `endDate`, `page`, `limit`

**Respuesta**: Envuelta en formato Effect.

### `GET /returns/:id`

### `POST /returns/:id/confirm`

DRAFT -> CONFIRMED. Permiso: `RETURNS:CONFIRM`

### `POST /returns/:id/cancel`

-> CANCELLED. Permiso: `RETURNS:CANCEL`

---

## Reports

**Permiso requerido**: `REPORTS:VIEW` / `REPORTS:EXPORT`

### `GET /reports/{module}/{name}/view`

Obtener datos del reporte.

**Modulos y nombres**:

| Modulo | Nombre | Descripcion |
|--------|--------|-------------|
| `inventory` | `available-inventory` | Stock disponible |
| `inventory` | `movement-history` | Historial de movimientos |
| `inventory` | `valuation` | Valoracion del inventario |
| `inventory` | `low-stock` | Productos con stock bajo |
| `inventory` | `movements` | Movimientos de inventario |
| `inventory` | `abc-analysis` | Analisis Pareto ABC |
| `inventory` | `dead-stock` | Stock muerto |
| `sales` | `sales` | Resumen de ventas |
| `sales` | `sales-by-product` | Ventas por producto |
| `sales` | `sales-by-warehouse` | Ventas por bodega |
| `sales` | `financial` | Impacto financiero |
| `sales` | `turnover` | Rotacion de inventario |
| `returns` | `returns` | Resumen de devoluciones |
| `returns` | `returns-by-type` | Por tipo (cliente/proveedor) |
| `returns` | `returns-by-product` | Por producto |
| `returns` | `returns-customer` | Devoluciones de clientes |
| `returns` | `returns-supplier` | Devoluciones a proveedores |

**Query params comunes**: `startDate`, `endDate`, `warehouseId`, `productId`, `page`, `limit`

**Params especificos**:
- ABC Analysis: `category`
- Dead Stock: `deadStockDays` (default: 90), `includeInactive`

### `POST /reports/{module}/{name}/export`

Exportar reporte a Excel/CSV.

---

## Dashboard

### `GET /dashboard/metrics`

Metricas agregadas del dashboard. Optimizado con 7 queries en paralelo.

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "inventorySummary": {
      "totalProducts": 150,
      "totalWarehouses": 3,
      "totalCategories": 12,
      "totalValue": 125000.00
    },
    "lowStockCount": 8,
    "monthlySales": {
      "count": 45,
      "totalValue": 52000.00
    },
    "salesTrend": [
      { "date": "2026-02-22", "revenue": 7500.00, "count": 6 },
      { "date": "2026-02-23", "revenue": 8200.00, "count": 7 },
      ...
    ],
    "topProducts": [
      { "productId": "...", "productName": "Widget A", "revenue": 15000.00, "quantity": 500 },
      ...
    ],
    "stockByWarehouse": [
      { "warehouseId": "...", "warehouseName": "Main", "totalStock": 5000, "value": 75000.00 },
      ...
    ],
    "recentActivity": [
      { "type": "SALE", "description": "Sale #SALE-2026-045 confirmed", "date": "..." },
      ...
    ]
  },
  "timestamp": "..."
}
```

---

## Audit Logs

**Permiso requerido**: `AUDIT:VIEW`

### `GET /audit/logs`

Listar logs de auditoria.

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `entityType` | string | Product, Sale, User, etc. |
| `entityId` | string | ID de la entidad |
| `action` | string | CREATE, UPDATE, DELETE, etc. |
| `performedBy` | string | ID del usuario |
| `httpMethod` | string | GET, POST, PUT, PATCH, DELETE |
| `startDate` | string | Fecha inicio (ISO 8601) |
| `endDate` | string | Fecha fin (ISO 8601) |
| `page` | number | Pagina |
| `limit` | number | Registros por pagina |

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "entityType": "Product",
      "entityId": "...",
      "action": "UPDATE",
      "httpMethod": "PUT",
      "performedBy": "...",
      "changes": { "before": { ... }, "after": { ... } },
      "ipAddress": "192.168.1.1",
      "userAgent": "...",
      "createdAt": "2026-02-28T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### `GET /audit/logs/:id`

Detalle completo de un log.

### `GET /audit/users/:userId/activity`

Actividad de un usuario especifico.

### `GET /audit/entities/:entityType/:entityId/history`

Historial de cambios de una entidad.

---

## Imports

**Permiso requerido**: `IMPORTS:EXECUTE`

### `POST /imports/products`

Importar productos desde archivo Excel/CSV.

**Content-Type**: `multipart/form-data`

**Form data**: `file` (Excel o CSV)

**Respuesta**: Resultado de la importacion con conteo de exitos/errores.

---

## Organizations

### `GET /organizations/current`

Obtener detalles de la organizacion actual.

### `PUT /organizations/:id`

Actualizar organizacion.

---

## Contacts

**Permiso requerido**: `CONTACTS:*`

### `POST /contacts`

Crear contacto. Permiso: `CONTACTS:CREATE`

**Body**:
```json
{
  "name": "Juan Perez",
  "identification": "12345678",
  "type": "CUSTOMER",
  "email": "juan@example.com",
  "phone": "+573001234567",
  "address": "Calle 123 #45-67, Bogota",
  "notes": "Cliente frecuente"
}
```

**Tipos**: `CUSTOMER`, `SUPPLIER`, `BOTH`

### `GET /contacts`

Listar contactos. Permiso: `CONTACTS:READ`

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `page` | number | Pagina (default: 1) |
| `limit` | number | Registros por pagina (default: 10) |
| `search` | string | Buscar por nombre o identificacion |
| `type` | string | CUSTOMER, SUPPLIER, BOTH |

### `GET /contacts/:id`

Obtener contacto por ID. Permiso: `CONTACTS:READ`

### `PUT /contacts/:id`

Actualizar contacto. Permiso: `CONTACTS:UPDATE`

### `DELETE /contacts/:id`

Eliminar contacto. Permiso: `CONTACTS:DELETE`

---

## Integrations

**Permiso requerido**: `INTEGRATIONS:*`

**Feature gate**: Requiere `integrationsEnabled = true` en la configuracion de la organizacion.

### `GET /integrations/connections`

Listar conexiones de integracion. Permiso: `INTEGRATIONS:READ`

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `provider` | string | Filtrar por proveedor (e.g., `VTEX`) |
| `status` | string | CONNECTED, DISCONNECTED, ERROR |

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Connections retrieved successfully",
  "data": [
    {
      "id": "clxyz...",
      "provider": "VTEX",
      "accountName": "mi-tienda",
      "storeName": "Mi Tienda VTEX",
      "status": "CONNECTED",
      "syncStrategy": "BOTH",
      "syncDirection": "BIDIRECTIONAL",
      "defaultWarehouseId": "clabc...",
      "connectedAt": "2026-03-01T10:00:00.000Z",
      "lastSyncAt": "2026-03-08T11:50:00.000Z",
      "createdAt": "2026-03-01T09:00:00.000Z"
    }
  ],
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### `GET /integrations/connections/:id`

Obtener conexion por ID. Permiso: `INTEGRATIONS:READ`

### `POST /integrations/connections`

Crear nueva conexion. Permiso: `INTEGRATIONS:CREATE`

**Body**:
```json
{
  "provider": "VTEX",
  "accountName": "mi-tienda",
  "storeName": "Mi Tienda VTEX",
  "appKey": "vtexappkey-mi-tienda-ABCDEF",
  "appToken": "GHIJKLMNOPQRSTUVWXYZ...",
  "syncStrategy": "BOTH",
  "syncDirection": "BIDIRECTIONAL",
  "defaultWarehouseId": "clabc...",
  "defaultContactId": "cldef...",
  "companyId": "clghi..."
}
```

**Nota**: `appKey` y `appToken` se envian en plaintext via HTTPS. El backend los encripta con AES-256-GCM antes de almacenarlos. Nunca se retornan en respuestas.

### `PUT /integrations/connections/:id`

Actualizar conexion. Permiso: `INTEGRATIONS:UPDATE`

**Body** (todos los campos opcionales):
```json
{
  "storeName": "Nuevo Nombre",
  "appKey": "nueva-key",
  "appToken": "nuevo-token",
  "syncStrategy": "WEBHOOK",
  "syncDirection": "INBOUND",
  "defaultWarehouseId": "clnew...",
  "defaultContactId": "clnew...",
  "companyId": "clnew..."
}
```

### `DELETE /integrations/connections/:id`

Eliminar conexion. Permiso: `INTEGRATIONS:DELETE`

### `POST /integrations/connections/:id/test`

Probar conexion (ping a VTEX OMS API). Permiso: `INTEGRATIONS:SYNC`

**Respuesta** (200):
```json
{
  "success": true,
  "message": "VTEX connection test successful",
  "data": { "connected": true },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### `POST /integrations/connections/:id/sync`

Disparar sincronizacion manual (polling de ordenes). Permiso: `INTEGRATIONS:SYNC`

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Polling completed. Polled: 5, Synced: 4, Failed: 1",
  "data": { "polled": 5, "synced": 4, "failed": 1 },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### `POST /integrations/connections/:id/sync/:orderId`

Sincronizar una orden especifica de VTEX. Permiso: `INTEGRATIONS:SYNC`

### `POST /integrations/connections/:id/register-webhook`

Registrar webhook en VTEX. Permiso: `INTEGRATIONS:SYNC`

**Body**:
```json
{
  "webhookBaseUrl": "https://api.nevada.com"
}
```

### `GET /integrations/connections/:id/sku-mappings`

Listar mapeos de SKU para una conexion. Permiso: `INTEGRATIONS:READ`

**Respuesta** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "clmap...",
      "connectionId": "clxyz...",
      "externalSku": "VTEX-SKU-001",
      "productId": "clprod..."
    }
  ],
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### `POST /integrations/connections/:id/sku-mappings`

Crear mapeo de SKU. Permiso: `INTEGRATIONS:CREATE`

**Body**:
```json
{
  "externalSku": "VTEX-SKU-001",
  "productId": "clprod..."
}
```

### `DELETE /integrations/connections/:id/sku-mappings/:mappingId`

Eliminar mapeo de SKU. Permiso: `INTEGRATIONS:DELETE`

### `GET /integrations/connections/:id/unmatched`

Listar SKUs sin mapear y syncs fallidos. Permiso: `INTEGRATIONS:READ`

### `POST /integrations/connections/:id/retry/:syncLogId`

Reintentar un sync fallido individual. Permiso: `INTEGRATIONS:SYNC`

### `POST /integrations/connections/:id/retry-all`

Reintentar todos los syncs fallidos para una conexion. Permiso: `INTEGRATIONS:SYNC`

### `POST /vtex/webhook/:accountName`

Webhook de VTEX. **Endpoint publico** (sin autenticacion JWT).

**Auth**: Validacion via query param `secret`

**Query params**:
| Param | Tipo | Descripcion |
|-------|------|-------------|
| `secret` | string | Webhook secret de la conexion |

**Body** (payload de VTEX):
```json
{
  "Domain": "Fulfillment",
  "OrderId": "v1234567890-01",
  "State": "ready-for-handling",
  "LastState": "payment-approved",
  "LastChange": "2026-03-08T11:00:00.000Z",
  "CurrentChange": "2026-03-08T11:05:00.000Z",
  "Origin": {
    "Account": "mi-tienda",
    "Key": "..."
  }
}
```

**Estados procesados**: `order-completed`, `handling`, `invoiced`, `canceled`, `ready-for-handling`

---

## Codigos de Error

| Status | Significado |
|--------|-------------|
| 400 | Bad Request - Datos de entrada invalidos |
| 401 | Unauthorized - Token invalido o expirado |
| 403 | Forbidden - Sin permisos suficientes |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - SKU duplicado, estado invalido |
| 422 | Unprocessable Entity - Regla de negocio violada |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |
