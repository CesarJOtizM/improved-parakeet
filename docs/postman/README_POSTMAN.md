# Colección de Postman - Sistema de Inventario

Esta colección de Postman contiene todos los endpoints disponibles del Sistema de Inventario Multi-Tenant con arquitectura DDD y Hexagonal.

## 🔧 Configuración de Variables

### Variables de Entorno Requeridas

La colección utiliza las siguientes variables que debes configurar:

- **`baseUrl`**: URL base de la API (ej: `http://localhost:3000`)
- **`accessToken`**: Token JWT de acceso (se obtiene al hacer login)
- **`refreshToken`**: Token JWT de refresco (se obtiene al hacer login)
- **`organizationId`**: ID de la organización (ej: `dev-org`)
- **`organizationSlug`**: Slug de la organización (ej: `demo-org`) - Coincide con valores de seeders
- **`userAgent`**: User-Agent del cliente (ej: `PostmanRuntime/7.32.3`)
- **`requestId`**: ID único para correlación de requests (opcional)
- **`userId`**: ID del usuario actual (se extrae del login)
- **`roleId`**: ID de rol actual (se extrae automáticamente)
- **`transferId`**: ID de transferencia actual (se extrae automáticamente)
- **`saleId`**: ID de venta actual (se extrae automáticamente)
- **`returnId`**: ID de devolución actual (se extrae automáticamente)
- **`returnLineId`**: ID de línea de devolución (se extrae automáticamente)
- **`reportType`**: Tipo de reporte actual (ej: `AVAILABLE_INVENTORY`, `SALES`, `RETURNS`)
- **`reportFormat`**: Formato de exportación (ej: `PDF`, `EXCEL`, `CSV`)
- **`importType`**: Tipo de importación (ej: `PRODUCTS`, `MOVEMENTS`, `WAREHOUSES`, `STOCK`, `TRANSFERS`)
- **`importBatchId`**: ID del batch de importación actual (se extrae automáticamente)
- **`warehouseId`**: ID de bodega para filtros de reportes
- **`productId`**: ID de producto para filtros de reportes
- **`locationId`**: ID de ubicacion para filtros de reportes
- **`dateRangeStart`**: Fecha de inicio para rangos de fecha (formato: `YYYY-MM-DD`)
- **`dateRangeEnd`**: Fecha de fin para rangos de fecha (formato: `YYYY-MM-DD`)

### Headers Requeridos

#### Headers Obligatorios

- **`Content-Type`**: `application/json` (para requests con body)
- **`Authorization`**: `Bearer {{accessToken}}` (para endpoints protegidos)
- **`X-Organization-ID`**: ID de la organización (ej: `dev-org`)
- **`X-Organization-Slug`**: Slug de la organización (ej: `demo-org`) - Alternativo al X-Organization-ID

#### Headers Recomendados

- **`User-Agent`**: Identificador del cliente (ej: `PostmanRuntime/7.32.3`)
- **`Accept`**: `application/json` (tipo de respuesta esperada)
- **`Accept-Language`**: `es-ES,es;q=0.9,en;q=0.8` (idioma preferido)

#### Headers Opcionales

- **`X-Request-ID`**: ID único para correlación de requests
- **`X-Forwarded-For`**: IP del cliente (cuando se usa proxy)

### Cuándo Usar Cada Header

- **`X-Organization-ID`**: Requerido en endpoints de autenticación, registro, recuperación de contraseña y todos los endpoints de inventario
- **`X-Organization-Slug`**: Alternativo al X-Organization-ID, puede usarse en lugar del ID de la organización
- **`Authorization`**: Requerido en todos los endpoints protegidos (logout, refresh, inventario, etc.)
- **`User-Agent`**: Recomendado en todos los endpoints para tracking de sesiones y auditoría
- **`Accept`**: Recomendado en todos los endpoints para especificar el tipo de respuesta
- **`Accept-Language`**: Recomendado para internacionalización

## 📋 Contenido de la Colección

### 🔐 Authentication

- **POST** `/auth/login` - Iniciar sesión de usuario
- **POST** `/auth/logout` - Cerrar sesión del usuario
- **POST** `/auth/refresh` - Refrescar token de acceso
- **POST** `/auth/logout-all` - Cerrar todas las sesiones activas
- **GET** `/auth/test-orgid` - Test de extracción de orgId (solo desarrollo)

### 🔑 Password Reset

- **POST** `/password-reset/request` - Solicitar recuperación de contraseña
- **POST** `/password-reset/verify-otp` - Verificar código OTP
- **POST** `/password-reset/reset` - Restablecer contraseña

### 👥 Users Management

- **POST** `/users` - Crear nuevo usuario (Requiere USERS:CREATE)
- **GET** `/users` - Obtener lista paginada de usuarios (Requiere USERS:READ)
- **GET** `/users/:id` - Obtener usuario por ID (Requiere USERS:READ)
- **PUT** `/users/:id` - Actualizar información de usuario (Requiere USERS:UPDATE)
- **PATCH** `/users/:id/status` - Cambiar estado de usuario (Requiere USERS:UPDATE)
- **POST** `/users/:id/roles` - Asignar rol a usuario (Requiere USERS:MANAGE_ROLES)
- **DELETE** `/users/:id/roles/:roleId` - Remover rol de usuario (Requiere USERS:MANAGE_ROLES)

### 🛡️ Roles Management

- **POST** `/roles` - Crear nuevo rol (Requiere ROLES:CREATE)
- **GET** `/roles` - Obtener lista de roles (Requiere ROLES:READ)
- **GET** `/roles/:id` - Obtener rol por ID (Requiere ROLES:READ)
- **PATCH** `/roles/:id` - Actualizar rol (Requiere ROLES:UPDATE)
- **DELETE** `/roles/:id` - Eliminar rol (Requiere ROLES:DELETE)
- **POST** `/roles/:id/permissions` - Asignar permisos a rol (Requiere ROLES:UPDATE)

### 🏥 Health Check

- **GET** `/health` - Verificación básica de salud del sistema
- **GET** `/health/detailed` - Verificación detallada con métricas
- **GET** `/health/full` - Verificación completa orquestada por dominio

### 📦 Inventory Management

- **GET** `/inventory/products` - Obtener todos los productos
- **GET** `/inventory/products/:id` - Obtener producto por ID
- **POST** `/inventory/products` - Crear nuevo producto
- **PUT** `/inventory/products/:id` - Actualizar producto
- **GET** `/inventory/warehouses` - Obtener todas las bodegas
- **GET** `/inventory/warehouses/:id` - Obtener bodega por ID
- **POST** `/inventory/warehouses` - Crear nueva bodega
- **GET** `/inventory/movements` - Obtener movimientos de inventario
- **POST** `/inventory/movements` - Crear movimiento
- **POST** `/inventory/movements/:id/post` - Confirmar movimiento
- **GET** `/inventory/transfers` - Obtener transferencias entre bodegas
- **POST** `/inventory/transfers` - Iniciar transferencia
- **POST** `/inventory/transfers/:id/confirm` - Confirmar transferencia
- **POST** `/inventory/transfers/:id/receive` - Recibir transferencia
- **POST** `/inventory/transfers/:id/reject` - Rechazar transferencia
- **POST** `/inventory/transfers/:id/cancel` - Cancelar transferencia
- **GET** `/inventory/stock` - Obtener stock actual (filtros: warehouseId, productId, lowStock)

**Nota**: Los reportes de stock bajo están disponibles en `/reports/inventory/low-stock/view`.

### 🧾 Sales

- **POST** `/sales` - Crear venta (DRAFT)
- **GET** `/sales` - Listar ventas
- **GET** `/sales/:id` - Obtener venta por ID
- **PATCH** `/sales/:id` - Actualizar venta (solo DRAFT)
- **POST** `/sales/:id/confirm` - Confirmar venta
- **POST** `/sales/:id/cancel` - Cancelar venta
- **POST** `/sales/:id/lines` - Agregar linea a venta
- **DELETE** `/sales/:id/lines/:lineId` - Remover linea de venta
- **GET** `/sales/:id/movement` - Obtener movimiento asociado
- **GET** `/sales/:id/returns` - Obtener devoluciones asociadas

### ↩️ Returns

- **POST** `/returns` - Crear devolucion (DRAFT)
- **GET** `/returns` - Listar devoluciones
- **GET** `/returns/:id` - Obtener devolucion por ID
- **PUT** `/returns/:id` - Actualizar devolucion (solo DRAFT)
- **POST** `/returns/:id/confirm` - Confirmar devolucion
- **POST** `/returns/:id/cancel` - Cancelar devolucion
- **POST** `/returns/:id/lines` - Agregar linea a devolucion
- **DELETE** `/returns/:id/lines/:lineId` - Remover linea de devolucion

### 📊 Reports

La sección de Reports incluye endpoints para generar, visualizar y exportar reportes del sistema.

#### Inventory Reports - View

Endpoints GET que retornan datos JSON para visualización en frontend:

- **GET** `/reports/inventory/available/view` - Vista de inventario disponible
- **GET** `/reports/inventory/movement-history/view` - Histórico de movimientos
- **GET** `/reports/inventory/valuation/view` - Valorización de inventario (PPM)
- **GET** `/reports/inventory/low-stock/view` - Alertas de stock bajo
- **GET** `/reports/inventory/movements/view` - Resumen de movimientos
- **GET** `/reports/inventory/financial/view` - Reporte financiero
- **GET** `/reports/inventory/turnover/view` - Rotación de inventario

#### Sales Reports - View

- **GET** `/reports/sales/view` - Reporte de ventas
- **GET** `/reports/sales/by-product/view` - Ventas por producto
- **GET** `/reports/sales/by-warehouse/view` - Ventas por bodega

#### Returns Reports - View

- **GET** `/reports/returns/view` - Reporte de devoluciones
- **GET** `/reports/returns/by-type/view` - Devoluciones por tipo
- **GET** `/reports/returns/by-product/view` - Devoluciones por producto
- **GET** `/reports/returns/by-sale/:saleId/view` - Devoluciones por venta
- **GET** `/reports/returns/customer/view` - Devoluciones de cliente
- **GET** `/reports/returns/supplier/view` - Devoluciones a proveedor

#### Stream Endpoints (NDJSON)

Endpoints GET que retornan datos en formato NDJSON (Newline Delimited JSON) para grandes volúmenes:

- **GET** `/reports/inventory/available/stream` - Stream de inventario disponible
- **GET** `/reports/sales/view/stream` - Stream de ventas
- **GET** `/reports/returns/view/stream` - Stream de devoluciones

#### Export Endpoints

Endpoints POST que retornan archivos en diferentes formatos (PDF, Excel, CSV):

- **POST** `/reports/inventory/available/export` - Exportar inventario disponible
- **POST** `/reports/inventory/movement-history/export` - Exportar histórico
- **POST** `/reports/inventory/valuation/export` - Exportar valorización
- **POST** `/reports/inventory/low-stock/export` - Exportar stock bajo
- **POST** `/reports/inventory/movements/export` - Exportar movimientos
- **POST** `/reports/inventory/financial/export` - Exportar reporte financiero
- **POST** `/reports/inventory/turnover/export` - Exportar rotación
- **POST** `/reports/sales/export` - Exportar ventas
- **POST** `/reports/sales/by-product/export` - Exportar ventas por producto
- **POST** `/reports/sales/by-warehouse/export` - Exportar ventas por bodega
- **POST** `/reports/returns/export` - Exportar devoluciones
- **POST** `/reports/returns/by-type/export` - Exportar devoluciones por tipo
- **POST** `/reports/returns/by-product/export` - Exportar devoluciones por producto

#### Report History

- **GET** `/reports/history` - Historial de ejecución de reportes (filtros: type, status, generatedBy, dateRange)

### 🏢 Organization Management

Endpoints para gestión de organizaciones (multi-tenancy):

- **POST** `/organizations` - Crear nueva organización multi-tenant (Requiere SYSTEM_ADMIN role)
- **GET** `/organizations/:id` - Obtener organización por ID o slug (Requiere SYSTEM_ADMIN role)
- **PUT** `/organizations/:id` - Actualizar organización (Requiere SYSTEM_ADMIN role)
  - Acepta tanto el ID de la organización (formato CUID) como el slug
  - Ejemplos: `/organizations/clx1234567890abcdef` o `/organizations/demo-org`

**Nota**: Solo los super-admins pueden crear y acceder a organizaciones. Estos endpoints no requieren el header `X-Organization-ID` ya que se refieren a la organización misma.

### 🔍 Audit

Endpoints para auditoría y seguimiento de actividad:

- **GET** `/audit/logs` - Obtener logs de auditoría (filtros: page, limit, entityType, entityId, action, performedBy, startDate, endDate)
- **GET** `/audit/logs/:id` - Obtener log de auditoría por ID
- **GET** `/audit/users/:userId/activity` - Obtener actividad de un usuario (filtros: page, limit)
- **GET** `/audit/entities/:entityType/:entityId/history` - Obtener historial de cambios de una entidad (filtros: page, limit)

**Requisitos**: Todos los endpoints requieren permiso `AUDIT:VIEW_LOGS`

### 📋 Report Templates

Endpoints para gestionar plantillas de reportes:

- **GET** `/report-templates` - Obtener todas las plantillas (filtros: type, activeOnly, createdBy)
- **GET** `/report-templates/active` - Obtener solo plantillas activas
- **GET** `/report-templates/by-type/:type` - Obtener plantillas por tipo
- **POST** `/report-templates` - Crear nueva plantilla
- **PUT** `/report-templates/:id` - Actualizar plantilla existente

**Headers requeridos**:
- `X-Organization-ID`: ID de la organización
- `X-User-ID`: ID del usuario (para POST y PUT)

**Parámetros comunes para View endpoints:**

- `dateRange[startDate]` / `dateRange[endDate]`: Rango de fechas
- `warehouseId`: Filtrar por bodega
- `productId`: Filtrar por producto
- `category`: Filtrar por categoría
- `status`: Filtrar por estado
- `groupBy`: Agrupar resultados (DAY, WEEK, MONTH, PRODUCT, WAREHOUSE, etc.)

**Body para Export endpoints:**

```json
{
  "format": "EXCEL",
  "parameters": {
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    },
    "warehouseId": "warehouse-id"
  },
  "options": {
    "includeHeader": true,
    "includeSummary": true,
    "title": "Custom Report Title"
  },
  "saveMetadata": true
}
```

### 📥 Imports

La sección de Imports incluye endpoints para importaciones masivas de datos.

#### Import Operations

- **POST** `/imports/preview` - Previsualizar y validar archivo sin persistir
- **POST** `/imports/execute` - Ejecutar importación completa (validate + create + process)
- **POST** `/imports` - Crear batch de importación

#### Import Batch Management

- **POST** `/imports/:id/validate` - Validar batch de importación con archivo
- **POST** `/imports/:id/process` - Procesar batch validado
- **GET** `/imports/:id/status` - Obtener estado del batch

#### Import Templates & Reports

- **GET** `/imports/templates/:type` - Descargar plantilla de importación (format: csv o xlsx)
- **GET** `/imports/:id/errors` - Descargar reporte de errores (format: csv o xlsx)

**Tipos de importación soportados:**

- `PRODUCTS` - Importación de productos
- `MOVEMENTS` - Importación de movimientos
- `WAREHOUSES` - Importación de bodegas
- `STOCK` - Importación de stock
- `TRANSFERS` - Importación de transferencias

**Estados de batch:**

- `PENDING` - Batch creado, pendiente de validación
- `VALIDATING` - En proceso de validación
- `VALIDATED` - Validado, listo para procesar
- `PROCESSING` - En proceso de importación
- `COMPLETED` - Importación completada
- `FAILED` - Importación fallida

**Ejemplo de uso:**

1. Descargar plantilla: `GET /imports/templates/PRODUCTS?format=csv`
2. Llenar plantilla con datos
3. Previsualizar: `POST /imports/preview` (con archivo adjunto)
4. Ejecutar importación: `POST /imports/execute` (con archivo adjunto)
5. Verificar estado: `GET /imports/:batchId/status`
6. Si hay errores: `GET /imports/:batchId/errors?format=csv`

## 🚀 Instalación y Uso

### 1. Importar la Colección Principal

1. Abre Postman
2. Haz clic en "Import" en la esquina superior izquierda
3. Selecciona el archivo `postman_collection.json`
4. La colección se importará automáticamente

### 2. Importar Colección de Smoke Tests (Opcional pero Recomendado)

1. Repite el proceso anterior
2. Selecciona el archivo `smoke-tests.postman_collection.json`
3. Esta colección contiene tests rápidos para validación después de despliegues

### 3. Importar Entornos de Postman

Para facilitar el cambio entre diferentes ambientes (Local, Staging, Production):

1. Haz clic en "Environments" en el panel izquierdo (o usa el ícono de engranaje)
2. Haz clic en "Import"
3. Importa los siguientes archivos desde `environments/`:
   - `local.environment.json` - Para desarrollo local
   - `staging.environment.json` - Para ambiente de staging
   - `production.environment.json` - Para producción
4. Selecciona el entorno deseado desde el selector en la esquina superior derecha

### 4. Configurar Variables de Entorno

Cada entorno ya tiene variables predefinidas. Solo necesitas actualizar:

- **baseUrl**: URL base de tu API
  - Local: `http://localhost:3000`
  - Staging: `https://staging-api.inventory.com`
  - Production: `https://api.inventory.com`
- **organizationId**: ID de la organización
  - Local: `dev-org` (coincide con DEFAULT_ORG_ID del código)
  - Staging/Production: Configurar según el entorno
- **organizationSlug**: Slug de la organización
  - Local: `demo-org` (coincide con seed.ts)
  - Staging/Production: Configurar según el entorno
- **accessToken**: Se actualiza automáticamente al hacer login
- **refreshToken**: Se actualiza automáticamente al hacer login

**Nota**: Los valores de `organizationId` y `organizationSlug` en el entorno local coinciden con los valores definidos en los seeders del proyecto.

### 3. Flujo de Autenticación

1. **Ejecuta el endpoint de Login** con tus credenciales
2. **Los tokens se guardan automáticamente** en las variables de la colección
3. **Formato de respuesta**: La API retorna un objeto con `success`, `message`, `data` y `timestamp`
   - Los tokens están en `data.accessToken` y `data.refreshToken`
   - Los scripts de Postman extraen automáticamente estos valores
4. **Si necesitas copiar manualmente**: Accede a `data.accessToken` y `data.refreshToken` en la respuesta

### 4. Usar Endpoints Protegidos

Una vez configurado el token, todos los endpoints protegidos funcionarán automáticamente usando la autenticación Bearer.

## 🔧 Configuración de Variables

### Variables de Colección

```json
{
  "baseUrl": "http://localhost:3000",
  "accessToken": "",
  "refreshToken": "",
  "organizationId": "dev-org",
  "organizationSlug": "demo-org",
  "userId": "",
  "roleId": "",
  "transferId": "",
  "saleId": "",
  "returnId": "",
  "returnLineId": "",
  "reportType": "AVAILABLE_INVENTORY",
  "reportFormat": "EXCEL",
  "importType": "PRODUCTS",
  "importBatchId": "",
  "warehouseId": "",
  "productId": "",
  "locationId": "",
  "dateRangeStart": "2024-01-01",
  "dateRangeEnd": "2024-12-31"
}
```

**Nota**: Los valores `organizationId` y `organizationSlug` coinciden con los valores definidos en los seeders:
- `organizationId`: `dev-org` (DEFAULT_ORG_ID en el código)
- `organizationSlug`: `demo-org` (slug definido en seed.ts)

### Variables de Entorno (Opcional)

Puedes crear un entorno en Postman con estas variables para mayor flexibilidad.

## 📝 Notas Importantes

### Endpoints Implementados

- ✅ **Authentication**: Completamente implementado (login, logout, refresh, logout-all)
- ✅ **User Registration**: Completamente implementado
- ✅ **Password Reset**: Completamente implementado (request, verify-otp, reset)
- ✅ **Users Management**: Completamente implementado
- ✅ **Roles Management**: Completamente implementado
- ✅ **Health Check**: Completamente implementado
- ✅ **Products**: Completamente implementado (CRUD)
- ✅ **Warehouses**: Completamente implementado (create, list)
- ✅ **Movements**: Completamente implementado (create, list, post)
- ✅ **Transfers**: Completamente implementado (create, list, confirm, receive, reject, cancel)
- ✅ **Sales**: Completamente implementado
- ✅ **Returns**: Completamente implementado
- ✅ **Stock**: Completamente implementado (listado con filtros)
- ✅ **Reports**: Completamente implementado (View, Stream, Export, History)
- ✅ **Report Templates**: Completamente implementado (CRUD, active, by-type)
- ✅ **Imports**: Completamente implementado (Preview, Execute, Batch Management, Templates)
- ✅ **Audit**: Completamente implementado (logs, logs/:id, users/:userId/activity, entities/:entityType/:entityId/history)

### Endpoints No Implementados

- ❌ **Organization Management**: Settings, branding y tenant info no están implementados (solo existen POST /organizations para crear y GET /organizations/:id para obtener)

### Autenticación

- Todos los endpoints protegidos requieren el header `Authorization: Bearer {token}`
- Los tokens JWT tienen tiempo de expiración configurado
- Usa el endpoint de refresh para renovar tokens expirados

### Rate Limiting

- Los endpoints de autenticación tienen rate limiting por IP
- Respeta los límites para evitar bloqueos temporales

## 🧪 Testing Automático

La colección incluye scripts de test automático que:

- Verifican que el código de estado sea correcto (200, 201, etc.)
- Validan que el tiempo de respuesta sea razonable
- Validan estructura de respuestas JSON
- Extraen y guardan IDs automáticamente (importBatchId, etc.)
- Validan formatos de archivo (PDF, Excel, CSV)
- Validan formato NDJSON en streams
- Pueden ser personalizados según tus necesidades

### Scripts de Testing Masivo

La colección incluye scripts especiales para testing masivo:

#### Export Validation Scripts

- **Test All Export Formats**: Prueba todos los formatos (PDF, EXCEL, CSV) para un reporte
- Valida Content-Type y Content-Disposition headers
- Verifica tamaño mínimo de archivos

#### Stream Testing Scripts

- **Test Stream with Large Dataset**: Valida streams NDJSON con grandes volúmenes
- Verifica formato de cada línea JSON
- Valida performance (tiempo de respuesta < 30s)

## 🔍 Swagger Documentation

El sistema también incluye documentación Swagger disponible en:

```
http://localhost:3000/api
```

## 📞 Soporte

Para soporte técnico o preguntas sobre la API:

- Revisa la documentación Swagger
- Consulta los logs del servidor
- Verifica la configuración de variables en Postman

## 🧪 Smoke Tests

La colección de **Smoke Tests** (`smoke-tests.postman_collection.json`) contiene tests rápidos para validar que los endpoints críticos funcionen correctamente.

### Endpoints Incluidos en Smoke Tests

- ✅ Health Check
- ✅ Login
- ✅ Refresh Token
- ✅ Get Products
- ✅ Get Warehouses
- ✅ Get Reports

### Cómo Usar Smoke Tests

1. Importa la colección `smoke-tests.postman_collection.json`
2. Selecciona el entorno correcto (Local, Staging, o Production)
3. Ejecuta la colección completa usando Collection Runner
4. Revisa los resultados - todos los tests deben pasar

**Recomendación**: Ejecuta smoke tests después de cada despliegue o cambio importante.

Para más detalles, consulta la [Guía de Usuario](USER_GUIDE.md#usar-smoke-tests).

## 📚 Documentación Adicional

- **[Guía de Usuario Completa](USER_GUIDE.md)**: Guía paso a paso para usar Postman con este sistema
- **[Documentación Técnica](../technical-documentation.md)**: Documentación completa de todos los módulos
- **Swagger UI**: `http://localhost:3000/api` (cuando el servidor está corriendo)

## 🔄 Actualizaciones

Esta colección se actualizará automáticamente cuando se implementen nuevos endpoints en el sistema.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Compatibilidad**: Postman v10+
