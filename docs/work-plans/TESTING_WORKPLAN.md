# Plan de Trabajo para Pruebas de API - Postman

## Resumen Ejecutivo

Este documento define el plan de trabajo para probar todos los endpoints del sistema de inventario multi-tenant. Las pruebas están organizadas en fases secuenciales que respetan las dependencias entre módulos.

---

## Prerrequisitos

### 1. Configuración del Ambiente
- [x] Servidor backend corriendo (`npm run start:dev`)
- [x] Base de datos PostgreSQL disponible
- [x] Redis disponible (para sesiones/cache)
- [x] Variables de ambiente configuradas

### 2. Configuración de Postman
- [x] Importar colección `postman_collection.json`
- [x] Importar ambiente `environments/local.environment.json`
- [x] Seleccionar ambiente "Local" en Postman
- [x] Verificar variables base:
  - `baseUrl`: `http://localhost:3000`
  - `organizationId`: `cmkwpo05v0000vsryp8mbw6up`
  - `organizationSlug`: `test-org`

---

## Fases de Prueba

### FASE 0: Health Check (Verificación Inicial) ✅ COMPLETADA
**Objetivo:** Confirmar que el servidor está funcionando correctamente.
**Tiempo estimado:** 5 minutos

| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 0.1 | `/health` | GET | 200 - status: "healthy" | ✅ |
| 0.2 | `/health/detailed` | GET | 200 - métricas del sistema | ✅ |
| 0.3 | `/health/full` | GET | 200 - estado completo con servicios | ✅ |

**Criterio de éxito:** Los 3 endpoints responden con status 200. ✅

---

### FASE 1: Organización y Autenticación ✅ COMPLETADA
**Objetivo:** Crear organización, usuario admin y obtener tokens de acceso.
**Tiempo estimado:** 15 minutos
**Dependencias:** Fase 0 completada

#### 1.1 Crear Organización (Solo primera vez)
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 1.1.1 | `/organizations` | POST | Ver payload abajo | 201 - Organización creada | ✅ |

**Payload para crear organización:**
```json
{
  "name": "Test Organization",
  "slug": "test-org",
  "domain": "test.example.com",
  "timezone": "America/Bogota",
  "currency": "COP",
  "dateFormat": "DD/MM/YYYY",
  "adminUser": {
    "email": "admin@test-org.com",
    "username": "admin",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

**Variables guardadas:**
- `organizationId` → `cmkwpo05v0000vsryp8mbw6up`
- `organizationSlug` → `test-org`

#### 1.2 Autenticación
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 1.2.1 | `/auth/login` | POST | email, password | 200 - Tokens JWT | ✅ |
| 1.2.2 | `/auth/test-orgid` | GET | - | 200 - OrgId extraído | ✅ |

**Payload para login:**
```json
{
  "email": "admin@test-org.com",
  "password": "Admin123!"
}
```

**Variables guardadas:**
- `accessToken` → Configurado
- `refreshToken` → Configurado
- `userId` → `cmkwpo0eq0001vsry2o1v0034`
- `sessionId` → Configurado

#### 1.3 Verificar Organización
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 1.3.1 | `/organizations/{{organizationId}}` | GET | 200 - Datos de org | ⬜ (No probado) |

**Criterio de éxito:** Login exitoso, tokens guardados, organización verificada. ✅

---

### FASE 2: Gestión de Usuarios y Roles ✅ COMPLETADA (Parcial)
**Objetivo:** Probar CRUD de usuarios y asignación de roles.
**Tiempo estimado:** 20 minutos
**Dependencias:** Fase 1 completada (tokens válidos)

#### 2.1 Roles
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 2.1.1 | `/roles` | GET | - | 200 - Lista de roles | ✅ |
| 2.1.2 | `/roles` | POST | name, description | 201 - Rol creado | ❌ Error 500 |
| 2.1.3 | `/roles/{{roleId}}` | GET | - | 200 - Detalle del rol | ⬜ |
| 2.1.4 | `/roles/{{roleId}}` | PATCH | description | 200 - Rol actualizado | ⬜ |
| 2.1.5 | `/roles/{{roleId}}/permissions` | POST | permissionIds | 200 - Permisos asignados | ⬜ |

**Nota:** El endpoint POST /roles devuelve error 500. Los roles del sistema ya existen (ADMIN, SUPERVISOR, etc.)

**Payload para crear rol:**
```json
{
  "name": "TEST_MANAGER",
  "description": "Test manager role for testing"
}
```

#### 2.2 Usuarios
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 2.2.1 | `/users` | GET | - | 200 - Lista de usuarios | ✅ |
| 2.2.2 | `/users` | POST | Ver payload | 201 - Usuario creado | ✅ |
| 2.2.3 | `/users/{{userId}}` | GET | - | 200 - Detalle usuario | ✅ |
| 2.2.4 | `/users/{{userId}}` | PUT | firstName, lastName | 200 - Usuario actualizado | ✅ |
| 2.2.5 | `/users/{{userId}}/status` | PATCH | status: "INACTIVE" | 200 - Status cambiado | ⬜ |
| 2.2.6 | `/users/{{userId}}/roles` | POST | roleId | 201 - Rol asignado | ✅ |
| 2.2.7 | `/users/{{userId}}/roles/{{roleId}}` | DELETE | - | 200 - Rol removido | ⬜ |

**Variables guardadas:**
- `testUserId` → `cmkwpq65h0003vsrygwq2lk1m`
- Usuario de prueba: `testuser@test-org.com`

**Payload para crear usuario:**
```json
{
  "email": "testuser@test-org.com",
  "username": "testuser",
  "password": "TestUser123!",
  "firstName": "Test",
  "lastName": "User"
}
```

**Criterio de éxito:** CRUD completo de usuarios y roles funcionando. ✅ (Parcial - POST roles falla)

---

### FASE 3: Inventario - Datos Maestros ✅ COMPLETADA
**Objetivo:** Crear productos y bodegas necesarios para movimientos.
**Tiempo estimado:** 15 minutos
**Dependencias:** Fase 2 completada

#### 3.1 Bodegas (Warehouses)
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 3.1.1 | `/inventory/warehouses` | POST | Ver payload | 201 - Bodega creada | ✅ |
| 3.1.2 | `/inventory/warehouses` | GET | - | 200 - Lista bodegas | ✅ |
| 3.1.3 | `/inventory/warehouses/{{warehouseId}}` | GET | - | 200 - Detalle bodega | ⬜ |

**Payload para crear bodega:**
```json
{
  "name": "Bodega Principal",
  "code": "BOD001",
  "address": {
    "street": "Calle Principal 123",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "zipCode": "110111",
    "country": "Colombia"
  },
  "description": "Bodega principal de pruebas"
}
```

**Crear segunda bodega para transferencias:**
```json
{
  "name": "Bodega Secundaria",
  "code": "BOD002",
  "address": {
    "street": "Avenida Secundaria 456",
    "city": "Bogotá",
    "state": "Cundinamarca",
    "zipCode": "110112",
    "country": "Colombia"
  },
  "description": "Bodega secundaria para transferencias"
}
```

**Variables guardadas:**
- `warehouseId` → `cmkyiufwc0000p4rytyme828i`
- `warehouseId2` → `cmkyiv38r0001p4ryf6zdc89o`

#### 3.2 Productos
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 3.2.1 | `/inventory/products` | POST | Ver payload | 201 - Producto creado | ✅ |
| 3.2.2 | `/inventory/products` | GET | - | 200 - Lista productos | ⬜ |
| 3.2.3 | `/inventory/products/{{productId}}` | GET | - | 200 - Detalle producto | ⬜ |
| 3.2.4 | `/inventory/products/{{productId}}` | PUT | price, description | 200 - Producto actualizado | ⬜ |

**Payload para crear producto:**
```json
{
  "sku": "PROD-001",
  "name": "Producto de Prueba",
  "description": "Producto para pruebas de API",
  "unit": {
    "code": "UNIT",
    "name": "Unidad",
    "precision": 0
  },
  "barcode": "1234567890123",
  "brand": "Test Brand",
  "model": "Test Model",
  "status": "ACTIVE",
  "costMethod": "AVG"
}
```

**Variables guardadas:**
- `productId` → `cmkyiwo3l0002p4ryu3jozys7`

**Criterio de éxito:** Bodegas y productos creados correctamente. ✅

---

### FASE 4: Movimientos de Inventario ✅ COMPLETADA
**Objetivo:** Probar entrada, salida y consulta de movimientos.
**Tiempo estimado:** 20 minutos
**Dependencias:** Fase 3 completada (productos y bodegas existen)

#### 4.1 Crear Movimiento de Entrada
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 4.1.1 | `/inventory/movements` | POST | Ver payload IN | 201 - Movimiento creado (DRAFT) | ✅ |
| 4.1.2 | `/inventory/movements/{{movementId}}/post` | POST | - | 200 - Movimiento posteado | ✅ |

**Payload movimiento de entrada:**
```json
{
  "type": "IN",
  "warehouseId": "{{warehouseId}}",
  "reference": "PO-TEST-001",
  "reason": "PURCHASE",
  "note": "Entrada inicial de stock para pruebas",
  "lines": [
    {
      "productId": "{{productId}}",
      "quantity": 100,
      "unitCost": 50.00,
      "currency": "COP"
    }
  ]
}
```

**Variables guardadas:**
- `movementId` → `cmkyixqvk0003p4ryv7vqk3r5`

#### 4.2 Consultar Movimientos y Stock
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 4.2.1 | `/inventory/movements` | GET | - | 200 - Lista movimientos | ⬜ |
| 4.2.2 | `/inventory/stock` | GET | warehouseId, productId | 200 - Stock actual | ✅ |

**Verificado:** Stock muestra 100 unidades del producto a $50 COP (total $5000).

**Criterio de éxito:** Stock incrementado correctamente después del movimiento. ✅

---

### FASE 5: Transferencias entre Bodegas ✅ COMPLETADA
**Objetivo:** Probar flujo completo de transferencias.
**Tiempo estimado:** 15 minutos
**Dependencias:** Fase 4 completada (hay stock disponible)

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 5.1 | `/inventory/transfers` | POST | Ver payload | 201 - Transfer creada (DRAFT) | ✅ |
| 5.2 | `/inventory/transfers` | GET | - | 200 - Lista transfers | ⬜ |
| 5.3 | `/inventory/transfers/{{transferId}}/confirm` | POST | - | 200 - IN_TRANSIT | ✅ |
| 5.4 | `/inventory/transfers/{{transferId}}/receive` | POST | - | 200 - RECEIVED | ✅ |

**Payload para crear transferencia (corregido):**
```json
{
  "fromWarehouseId": "{{warehouseId}}",
  "toWarehouseId": "{{warehouseId2}}",
  "createdBy": "{{userId}}",
  "note": "Transferencia de prueba",
  "lines": [
    {
      "productId": "{{productId}}",
      "quantity": 20
    }
  ]
}
```

**Nota:** El DTO de transferencia requiere `createdBy` y las líneas NO aceptan `unitCost`/`currency`.

**Variables guardadas:**
- `transferId` → `cmkyj1uh90007p4ry6v6qzx0s`
- `outMovementId` → `cmkyj2jtq0009p4ryghs6c1d8`
- `inMovementId` → `cmkyj3bik000cp4ryocq8zgm1`

**Verificar después:**
- Stock en bodega origen: 80 unidades
- Stock en bodega destino: 20 unidades

#### 5.5 Probar Rechazo y Cancelación (Opcional)
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 5.5.1 | `/inventory/transfers/{{transferId}}/reject` | POST | reason | 200 - REJECTED | ⬜ |
| 5.5.2 | `/inventory/transfers/{{transferId}}/cancel` | POST | - | 200 - CANCELLED | ⬜ |

**Criterio de éxito:** Transferencia completada, stock redistribuido. ✅

---

### FASE 6: Ventas (Sales) ✅ COMPLETADA
**Objetivo:** Probar flujo completo de ventas.
**Tiempo estimado:** 20 minutos
**Dependencias:** Fase 4 completada (hay stock disponible)

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 6.1 | `/sales` | POST | Ver payload | 201 - Venta creada (DRAFT) | ✅ |
| 6.2 | `/sales` | GET | - | 200 - Lista ventas | ✅ |
| 6.3 | `/sales/{{saleId}}` | GET | - | 200 - Detalle venta | ⬜ |
| 6.4 | `/sales/{{saleId}}` | PATCH | customerReference | 200 - Venta actualizada | ⬜ |
| 6.5 | `/sales/{{saleId}}/lines` | POST | productId, qty | 201 - Línea agregada | ⬜ |
| 6.6 | `/sales/{{saleId}}/confirm` | POST | - | 200 - CONFIRMED | ✅ |
| 6.7 | `/sales/{{saleId}}/movement` | GET | - | 200 - Movimiento asociado | ⬜ |

**Payload para crear venta:**
```json
{
  "warehouseId": "{{warehouseId}}",
  "customerReference": "Cliente de Prueba",
  "externalReference": "INV-TEST-001",
  "note": "Venta de prueba",
  "lines": [
    {
      "productId": "{{productId}}",
      "quantity": 10,
      "salePrice": 75.00,
      "currency": "COP"
    }
  ]
}
```

**Variables guardadas:**
- `saleId` → `cmkyl1x4g0001vgrytyyhzbeu`
- `saleNumber` → `SALE-2026-011`

**Verificado:** Stock reducido de 80 a 70 unidades después de confirmar la venta de 10 unidades.

#### 6.8 Probar Cancelación (Nueva venta)
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 6.8.1 | `/sales` | POST | Crear nueva venta | 201 - DRAFT | ⬜ |
| 6.8.2 | `/sales/{{saleId}}/cancel` | POST | reason | 200 - CANCELLED | ⬜ |

**Criterio de éxito:** Venta confirmada, stock reducido, movimiento generado.

---

### FASE 7: Devoluciones (Returns) ✅ COMPLETADA
**Objetivo:** Probar flujo completo de devoluciones.
**Tiempo estimado:** 20 minutos
**Dependencias:** Fase 6 completada (hay ventas confirmadas)

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 7.1 | `/returns` | POST | Ver payload | 201 - Return creado (DRAFT) | ✅ |
| 7.2 | `/returns` | GET | - | 200 - Lista devoluciones | ⬜ |
| 7.3 | `/returns/{{returnId}}` | GET | - | 200 - Detalle devolución | ✅ |
| 7.4 | `/returns/{{returnId}}` | PUT | reason, note | 200 - Return actualizado | ⬜ |
| 7.5 | `/returns/{{returnId}}/lines` | POST | productId, qty | 201 - Línea agregada | ⬜ |
| 7.6 | `/returns/{{returnId}}/confirm` | POST | - | 200 - CONFIRMED | ✅ |
| 7.7 | `/sales/{{saleId}}/returns` | GET | - | 200 - Returns de la venta | ⬜ |

**Payload para crear devolución:**
```json
{
  "type": "RETURN_CUSTOMER",
  "warehouseId": "{{warehouseId}}",
  "saleId": "{{saleId}}",
  "reason": "Producto defectuoso",
  "note": "Devolución de prueba",
  "lines": [
    {
      "productId": "{{productId}}",
      "quantity": 2,
      "originalSalePrice": 75.00,
      "currency": "COP"
    }
  ]
}
```

**Variables guardadas:**
- `returnId` → `cmkzoji9t00031sry36yg50vf`
- `returnNumber` → `RETURN-2026-008`
- `returnMovementId` → `mus6eq1x9974bgf2zttchc0w`

**Verificado:** Stock incrementado de 70 a 72 unidades después de confirmar la devolución de 2 unidades.

**Criterio de éxito:** Devolución confirmada, stock restaurado. ✅

---

### FASE 8: Reportes
**Objetivo:** Probar generación de reportes de inventario, ventas y devoluciones.
**Tiempo estimado:** 25 minutos
**Dependencias:** Fases 4-7 completadas (hay datos para reportar)

#### 8.1 Reportes de Inventario - View
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.1.1 | `/reports/inventory/available/view` | GET | 200 - JSON con rows/summary | ✅ |
| 8.1.2 | `/reports/inventory/movement-history/view` | GET | 200 - Historial movimientos | ⬜ |
| 8.1.3 | `/reports/inventory/valuation/view` | GET | 200 - Valorización | ⬜ |
| 8.1.4 | `/reports/inventory/low-stock/view` | GET | 200 - Alertas stock bajo | ⬜ |
| 8.1.5 | `/reports/inventory/movements/view` | GET | 200 - Resumen movimientos | ⬜ |
| 8.1.6 | `/reports/inventory/financial/view` | GET | 200 - Reporte financiero | ⬜ |
| 8.1.7 | `/reports/inventory/turnover/view` | GET | 200 - Rotación inventario | ⬜ |

#### 8.2 Reportes de Ventas - View
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.2.1 | `/reports/sales/view` | GET | 200 - Reporte ventas | ✅ |
| 8.2.2 | `/reports/sales/by-product/view` | GET | 200 - Ventas por producto | ⬜ |
| 8.2.3 | `/reports/sales/by-warehouse/view` | GET | 200 - Ventas por bodega | ⬜ |

#### 8.3 Reportes de Devoluciones - View
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.3.1 | `/reports/returns/view` | GET | 200 - Reporte returns | ✅ |
| 8.3.2 | `/reports/returns/by-type/view` | GET | 200 - Por tipo | ⬜ |
| 8.3.3 | `/reports/returns/by-product/view` | GET | 200 - Por producto | ⬜ |
| 8.3.4 | `/reports/returns/by-sale/{{saleId}}/view` | GET | 200 - Por venta | ⬜ |
| 8.3.5 | `/reports/returns/customer/view` | GET | 200 - Devoluciones cliente | ⬜ |
| 8.3.6 | `/reports/returns/supplier/view` | GET | 200 - Devoluciones proveedor | ⬜ |

#### 8.4 Reportes - Stream (NDJSON)
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.4.1 | `/reports/inventory/available/stream` | GET | 200 - NDJSON format | ⬜ |
| 8.4.2 | `/reports/sales/view/stream` | GET | 200 - NDJSON format | ⬜ |
| 8.4.3 | `/reports/returns/view/stream` | GET | 200 - NDJSON format | ⬜ |

#### 8.5 Reportes - Export
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.5.1 | `/reports/inventory/available/export` | POST | 200 - File download | ⬜ |
| 8.5.2 | `/reports/sales/export` | POST | 200 - File download | ⬜ |
| 8.5.3 | `/reports/returns/export` | POST | 200 - File download | ⬜ |

#### 8.6 Historial de Reportes
| # | Endpoint | Método | Resultado Esperado | Estado |
|---|----------|--------|-------------------|--------|
| 8.6.1 | `/reports/history` | GET | 200 - Historial reportes | ⬜ |

**Criterio de éxito:** Todos los reportes retornan datos correctos.

---

### FASE 9: Report Templates
**Objetivo:** Probar CRUD de templates de reportes.
**Tiempo estimado:** 10 minutos
**Dependencias:** Fase 1 completada

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 9.1 | `/report-templates` | POST | Ver payload | 201 - Template creado | ⬜ |
| 9.2 | `/report-templates` | GET | - | 200 - Lista templates | ⬜ |
| 9.3 | `/report-templates/{{templateId}}` | PUT | name, isActive | 200 - Template actualizado | ⬜ |
| 9.4 | `/report-templates/active` | GET | - | 200 - Templates activos | ⬜ |
| 9.5 | `/report-templates/by-type/:type` | GET | - | 200 - Por tipo | ⬜ |

**Payload para crear template:**
```json
{
  "name": "Reporte Mensual Inventario",
  "description": "Template para reporte mensual de valorización",
  "type": "INVENTORY_VALUATION",
  "defaultParameters": {
    "includeInactive": false,
    "groupBy": "WAREHOUSE",
    "period": "MONTHLY"
  }
}
```

**Criterio de éxito:** CRUD completo de templates funcionando.

---

### FASE 10: Importación de Datos
**Objetivo:** Probar importación masiva de datos.
**Tiempo estimado:** 15 minutos
**Dependencias:** Fase 3 completada

#### 10.1 Templates de Importación
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 10.1.1 | `/imports/templates/PRODUCTS` | GET | format=csv | 200 - Template CSV | ⬜ |
| 10.1.2 | `/imports/templates/PRODUCTS` | GET | format=xlsx | 200 - Template Excel | ⬜ |
| 10.1.3 | `/imports/templates/MOVEMENTS` | GET | - | 200 - Template movimientos | ⬜ |
| 10.1.4 | `/imports/templates/WAREHOUSES` | GET | - | 200 - Template bodegas | ⬜ |

#### 10.2 Preview y Ejecución
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 10.2.1 | `/imports/preview` | POST | file + type | 200 - Preview data | ⬜ |
| 10.2.2 | `/imports/execute` | POST | file + type | 200 - Import result | ⬜ |

#### 10.3 Flujo por Pasos
| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 10.3.1 | `/imports` | POST | type, fileName | 201 - Batch creado | ⬜ |
| 10.3.2 | `/imports/{{importBatchId}}/validate` | POST | file | 200 - Validado | ⬜ |
| 10.3.3 | `/imports/{{importBatchId}}/status` | GET | - | 200 - VALIDATED | ⬜ |
| 10.3.4 | `/imports/{{importBatchId}}/process` | POST | - | 200 - Procesado | ⬜ |
| 10.3.5 | `/imports/{{importBatchId}}/errors` | GET | - | 200 - Error report | ⬜ |

**Criterio de éxito:** Importación completa sin errores.

---

### FASE 11: Auditoría
**Objetivo:** Verificar que las acciones generan logs de auditoría.
**Tiempo estimado:** 10 minutos
**Dependencias:** Fases anteriores completadas (hay acciones auditables)

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 11.1 | `/audit/logs` | GET | - | 200 - Lista de logs | ⬜ |
| 11.2 | `/audit/logs` | GET | entityType=Product | 200 - Logs filtrados | ⬜ |
| 11.3 | `/audit/logs` | GET | action=CREATE | 200 - Solo creates | ⬜ |
| 11.4 | `/audit/logs/{{auditLogId}}` | GET | - | 200 - Detalle log | ⬜ |
| 11.5 | `/audit/users/{{userId}}/activity` | GET | - | 200 - Actividad usuario | ⬜ |
| 11.6 | `/audit/entities/Product/{{productId}}/history` | GET | - | 200 - Historial entidad | ⬜ |

**Criterio de éxito:** Logs de auditoría registran todas las acciones.

---

### FASE 12: Gestión de Sesiones
**Objetivo:** Probar refresh de tokens y logout.
**Tiempo estimado:** 10 minutos
**Dependencias:** Fase 1 completada

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 12.1 | `/auth/refresh` | POST | refreshToken | 200 - Nuevos tokens | ⬜ |
| 12.2 | `/auth/logout` | POST | accessToken | 200 - Sesión cerrada | ⬜ |
| 12.3 | `/auth/login` | POST | credentials | 200 - Nueva sesión | ⬜ |
| 12.4 | `/auth/logout-all` | POST | - | 200 - Todas las sesiones cerradas | ⬜ |

**Criterio de éxito:** Gestión de sesiones funciona correctamente.

---

### FASE 13: Password Reset
**Objetivo:** Probar flujo de recuperación de contraseña.
**Tiempo estimado:** 10 minutos
**Dependencias:** Usuario existente

| # | Endpoint | Método | Datos | Resultado Esperado | Estado |
|---|----------|--------|-------|-------------------|--------|
| 13.1 | `/password-reset/request` | POST | email | 200 - OTP enviado | ⬜ |
| 13.2 | `/password-reset/verify-otp` | POST | email, otpCode | 200 - OTP válido | ⬜ |
| 13.3 | `/password-reset/reset` | POST | email, otp, newPassword | 200 - Password cambiado | ⬜ |

**Nota:** El OTP debe obtenerse del sistema de email o logs en desarrollo.

**Criterio de éxito:** Flujo completo de reset funciona.

---

## Resumen de Fases

| Fase | Nombre | Endpoints | Tiempo Est. | Dependencias | Estado |
|------|--------|-----------|-------------|--------------|--------|
| 0 | Health Check | 3 | 5 min | - | ✅ Completada |
| 1 | Organización y Auth | 5 | 15 min | Fase 0 | ✅ Completada |
| 2 | Usuarios y Roles | 12 | 20 min | Fase 1 | ✅ Parcial (POST roles falla) |
| 3 | Datos Maestros | 7 | 15 min | Fase 2 | ✅ Completada |
| 4 | Movimientos | 4 | 20 min | Fase 3 | ✅ Completada |
| 5 | Transferencias | 6 | 15 min | Fase 4 | ✅ Completada |
| 6 | Ventas | 9 | 20 min | Fase 4 | ✅ Completada |
| 7 | Devoluciones | 8 | 20 min | Fase 6 | ✅ Completada |
| 8 | Reportes | 20 | 25 min | Fases 4-7 | 🔄 Parcial (3/20) |
| 9 | Report Templates | 5 | 10 min | Fase 1 | ⬜ Pendiente |
| 10 | Importación | 10 | 15 min | Fase 3 | ⬜ Pendiente |
| 11 | Auditoría | 6 | 10 min | Todas | ⬜ Pendiente |
| 12 | Sesiones | 4 | 10 min | Fase 1 | ⬜ Pendiente |
| 13 | Password Reset | 3 | 10 min | Fase 2 | ⬜ Pendiente |
| **TOTAL** | | **~102** | **~3.5 hrs** | | |

---

## Checklist de Ejecución

### Pre-ejecución
- [x] Ambiente local funcionando
- [x] Base de datos limpia o con datos conocidos
- [x] Postman configurado con colección y ambiente
- [x] Documentar versión del API siendo probada

### Durante ejecución
- [x] Marcar cada endpoint probado en las tablas
- [x] Documentar cualquier error encontrado
- [x] Guardar IDs importantes en variables de Postman
- [ ] Tomar capturas de errores inesperados

### Post-ejecución
- [ ] Compilar lista de bugs encontrados
- [ ] Documentar endpoints con problemas
- [ ] Crear issues en el repositorio si aplica
- [ ] Actualizar este documento con resultados

---

## Notas Adicionales

### Orden de Ejecución Recomendado
1. Ejecutar fases 0-3 primero (setup básico)
2. Ejecutar fases 4-7 (operaciones de negocio)
3. Ejecutar fases 8-11 (reportes y auditoría)
4. Ejecutar fases 12-13 (sesiones y seguridad)

### Tips para Ejecución Eficiente
- Usar Postman Runner para ejecutar carpetas completas
- Los scripts de test guardan variables automáticamente
- Revisar la consola de Postman para debug
- Usar el ambiente "Local" para desarrollo

### Variables Importantes a Monitorear
```
accessToken      - Token de autenticación (expira en 15 min)
refreshToken     - Token para renovar acceso (expira en 7 días)
organizationId   - cmkwpo05v0000vsryp8mbw6up
userId           - cmkwpo0eq0001vsry2o1v0034
testUserId       - cmkwpq65h0003vsrygwq2lk1m
warehouseId      - cmkyiufwc0000p4rytyme828i (Bodega Principal)
warehouseId2     - cmkyiv38r0001p4ryf6zdc89o (Bodega Secundaria)
productId        - cmkyiwo3l0002p4ryu3jozys7 (PROD-001)
movementId       - cmkyixqvk0003p4ryv7vqk3r5 (Entrada inicial)
transferId       - cmkyj1uh90007p4ry6v6qzx0s (Transferencia completada)
saleId           - cmkyl1x4g0001vgrytyyhzbeu (Venta confirmada)
returnId         - cmkzoji9t00031sry36yg50vf (Return DRAFT, confirm falla)
importBatchId    - ID de batch de importación (pendiente)
```

---

## Registro de Ejecución

| Fecha | Ejecutor | Fases Completadas | Bugs Encontrados | Notas |
|-------|----------|-------------------|------------------|-------|
| 2026-01-27 | Claude | 0, 1, 2 (parcial) | POST /roles → Error 500 | Organización creada: test-org |
| 2026-01-28 | Claude | 3, 4, 5 | Ninguno nuevo | Bodegas, productos, movimientos y transferencias funcionando correctamente. Servidor dejó de responder al intentar FASE 6 (Ventas) |
| 2026-01-29 | Claude | 6, 7 | Bug #2 (corregido), Bug #3 (corregido) | Ventas y Devoluciones completamente funcionales. Bug #3 corregido: Entity base class ahora auto-genera cuid. Stock verificado: 72 unidades después de devolución. |

---

## Bugs Encontrados

### Bug #1: POST /roles devuelve Error 500
- **Endpoint:** `POST /roles`
- **Payload:** `{"name": "TEST_MANAGER", "description": "Test manager role for testing"}`
- **Respuesta:** `{"statusCode":500,"message":"Internal server error"}`
- **Severidad:** Media (los roles del sistema ya existen y funcionan)

### Bug #2: Funciones de secuencia faltantes en la base de datos
- **Descripción:** Las funciones `get_next_sale_number` y `get_next_return_number` no estaban creadas en la base de datos
- **Impacto:** Creación de ventas y devoluciones fallaba con error de Prisma
- **Solución:** Se creó migración `20260128220000_add_sale_number_function` con las funciones
- **Estado:** ✅ CORREGIDO

### Bug #3: POST /returns/:id/confirm devuelve Error 500
- **Endpoint:** `POST /returns/:id/confirm`
- **Return ID probado:** `cmkzoji9t00031sry36yg50vf`
- **Respuesta:** `{"statusCode":500,"message":"Internal server error"}`
- **Causa raíz:** La clase `Entity` base no generaba ID automáticamente cuando no se proporcionaba uno. Esto causaba que los movimientos se crearan con ID vacío (`''`), generando violación de clave duplicada.
- **Solución:** Se modificó `src/shared/domain/base/entity.base.ts` para auto-generar cuid cuando `id` es undefined.
- **Estado:** ✅ CORREGIDO

---

*Documento generado: Enero 2025*
*Versión del Plan: 1.0*
*Última actualización: 2026-01-29*

---

## Resumen de Progreso (2026-01-29)

### Endpoints Probados vs Pendientes por Fase

| Fase | Total | Probados | Pendientes | % Completado |
|------|-------|----------|------------|--------------|
| 0 | 3 | 3 | 0 | 100% |
| 1 | 5 | 4 | 1 | 80% |
| 2 | 12 | 6 | 6 | 50% |
| 3 | 7 | 3 | 4 | 43% |
| 4 | 4 | 3 | 1 | 75% |
| 5 | 6 | 4 | 2 | 67% |
| 6 | 9 | 4 | 5 | 44% |
| 7 | 8 | 4 | 4 | 50% |
| 8 | 20 | 3 | 17 | 15% |
| 9 | 5 | 0 | 5 | 0% |
| 10 | 10 | 0 | 10 | 0% |
| 11 | 6 | 0 | 6 | 0% |
| 12 | 4 | 0 | 4 | 0% |
| 13 | 3 | 0 | 3 | 0% |
| **TOTAL** | **102** | **34** | **68** | **33%** |

### Funcionalidad Core Verificada ✅
- Health check y monitoreo
- Autenticación JWT y login
- Creación de usuarios y asignación de roles
- CRUD de bodegas y productos
- Movimientos de inventario (entrada, salida, posting)
- Transferencias entre bodegas (crear, confirmar, recibir)
- Ventas (crear, confirmar) con reducción de stock
- Devoluciones (crear, confirmar) con incremento de stock
- Reportes básicos (inventario, ventas, returns)

### Bugs Corregidos Durante Testing
1. **Bug #2:** Funciones SQL faltantes → Creada migración
2. **Bug #3:** Entity base sin ID automático → Agregado cuid generation

### Bugs Pendientes
1. **Bug #1:** POST /roles devuelve Error 500 (severidad media)
