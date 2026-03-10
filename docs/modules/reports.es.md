> [English](./reports.md) | **[Español](./reports.es.md)**

# Modulo de Reportes

## Descripcion General

El modulo de Reportes proporciona capacidades de reporteria integral a traves de los dominios de inventario, ventas, devoluciones y analisis. Soporta visualizacion de reportes como JSON (para tablas de frontend), streaming de reportes grandes via NDJSON, y exportacion a multiples formatos de archivo. Los reportes pueden almacenarse en cache para rendimiento y soportan plantillas reutilizables con parametros guardados. El modulo sigue Diseno Dirigido por Dominio con objetos de valor, raices de agregado y eventos de dominio.

---

## Tipos de Reportes

Los 19 tipos de reportes estan definidos en `src/report/domain/valueObjects/reportType.valueObject.ts`.

### Reportes de Inventario (7)

| Tipo | Titulo | Descripcion |
|---|---|---|
| `AVAILABLE_INVENTORY` | Reporte de Inventario Disponible | Stock actual por producto, almacen y ubicacion |
| `MOVEMENT_HISTORY` | Reporte de Historial de Movimientos | Registro detallado de todos los movimientos de inventario |
| `VALUATION` | Reporte de Valoracion de Inventario | Valoracion de inventario usando costo promedio ponderado (PPP) |
| `LOW_STOCK` | Reporte de Alerta de Stock Bajo | Productos por debajo del minimo o punto de reorden, con niveles de severidad (CRITICAL, WARNING) |
| `MOVEMENTS` | Reporte Resumen de Movimientos | Datos de movimiento agregados por tipo, almacen o periodo |
| `FINANCIAL` | Reporte Financiero | Ingresos, costos, margen bruto y porcentaje de margen |
| `TURNOVER` | Reporte de Rotacion de Inventario | COGS, inventario promedio, tasa de rotacion, dias de inventario y clasificacion (SLOW_MOVING, NORMAL, FAST_MOVING) |

### Reportes de Ventas (4)

| Tipo | Titulo | Descripcion |
|---|---|---|
| `SALES` | Reporte de Ventas | Ventas individuales con totales, estado e informacion del cliente |
| `SALES_BY_PRODUCT` | Reporte de Ventas por Producto | Ingresos, cantidad y margen por producto |
| `SALES_BY_WAREHOUSE` | Reporte de Ventas por Almacen | Ventas agregadas por almacen |
| `SALES_BY_CLIENT` | Reporte de Ventas por Cliente | Ventas agregadas por cliente |

### Reportes de Devoluciones (6)

| Tipo | Titulo | Descripcion |
|---|---|---|
| `RETURNS` | Reporte de Devoluciones | Todas las devoluciones con detalles |
| `RETURNS_BY_TYPE` | Reporte de Devoluciones por Tipo | Devoluciones agregadas por tipo (CUSTOMER/SUPPLIER) |
| `RETURNS_BY_PRODUCT` | Reporte de Devoluciones por Producto | Cantidad y valor devuelto por producto |
| `RETURNS_BY_SALE` | Reporte de Devoluciones por Venta | Devoluciones asociadas a una venta especifica |
| `RETURNS_CUSTOMER` | Reporte de Devoluciones de Clientes | Devoluciones originadas por clientes |
| `RETURNS_SUPPLIER` | Reporte de Devoluciones a Proveedores | Devoluciones originadas por proveedores |

### Reportes de Analisis (2)

| Tipo | Titulo | Descripcion |
|---|---|---|
| `ABC_ANALYSIS` | Reporte de Analisis ABC | Productos clasificados A/B/C por contribucion de ingresos con porcentajes acumulados |
| `DEAD_STOCK` | Reporte de Stock Muerto | Productos sin ventas por un numero configurable de dias, con niveles de riesgo (HIGH, MEDIUM, LOW) |

---

## Formatos de Exportacion

Definidos en `src/report/domain/valueObjects/reportFormat.valueObject.ts`.

| Formato | Tipo MIME | Extension | Implementacion |
|---|---|---|---|
| `JSON` | `application/json` | `.json` | Nativo (incorporado) |
| `CSV` | `text/csv` | `.csv` | Nativo (incorporado) |
| `EXCEL` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` | Delegado a `IDocumentGenerationService` |
| `PDF` | `application/pdf` | `.pdf` | Delegado a `IDocumentGenerationService` |

El servicio de exportacion (`src/report/domain/services/export.service.ts`) genera CSV y JSON de forma nativa, mientras que la generacion de PDF y Excel se delega a un puerto de servicio externo siguiendo la arquitectura hexagonal.

---

## Ciclo de Vida del Estado del Reporte

Definido en `src/report/domain/valueObjects/reportStatus.valueObject.ts`.

```
PENDING --> GENERATING --> COMPLETED --> EXPORTED
   |            |
   v            v
 FAILED       FAILED
```

| Estado | Descripcion |
|---|---|
| `PENDING` | Reporte en cola para generacion |
| `GENERATING` | Reporte en proceso de generacion |
| `COMPLETED` | Reporte generado exitosamente |
| `FAILED` | Generacion del reporte fallida (estado terminal) |
| `EXPORTED` | Reporte exportado a formato de archivo |

---

## Parametros de Reportes

Definidos en `src/report/domain/valueObjects/reportParameters.valueObject.ts`. Todos los parametros son opcionales y varian por tipo de reporte.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `dateRange` | `{ startDate, endDate }` | Filtro de fecha; por defecto trimestre actual si se omite |
| `warehouseId` | `string` | Filtrar por almacen |
| `productId` | `string` | Filtrar por producto |
| `category` | `string` | Filtrar por categoria |
| `status` | `string` | Filtrar por estado |
| `returnType` | `CUSTOMER` \| `SUPPLIER` | Filtrar devoluciones por tipo |
| `groupBy` | `DAY` \| `WEEK` \| `MONTH` \| `PRODUCT` \| `WAREHOUSE` \| `CUSTOMER` \| `TYPE` | Agrupar resultados |
| `period` | `MONTHLY` \| `QUARTERLY` \| `YEARLY` | Periodo para analisis de rotacion |
| `severity` | `CRITICAL` \| `WARNING` | Filtro de severidad de stock bajo |
| `deadStockDays` | `number` | Umbral de dias sin ventas (por defecto: 90) |
| `includeInactive` | `boolean` | Incluir productos inactivos |

---

## Almacenamiento en Cache

Configurado en `src/report/domain/constants/reportCache.constants.ts` e implementado por `ReportCacheService` (`src/report/domain/services/reportCache.service.ts`).

- **Reportes de vista:** Cacheados por 1 hora (por defecto), solo cuando tienen parametro `dateRange`.
- **Reportes de exportacion:** Siempre cacheados por 24 horas (por defecto).
- **Reportes financieros:** TTL de cache mas corto de 30 minutos para vistas.
- El cache se habilita/deshabilita via la variable de entorno `REPORT_CACHE_ENABLED`.

---

## Casos de Uso

Todos los casos de uso estan en `src/application/reportUseCases/`.

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `ViewReportUseCase` | `viewReportUseCase.ts` | Generar datos de reporte como JSON para tablas del frontend, con soporte de cache |
| `StreamReportUseCase` | `streamReportUseCase.ts` | Transmitir datos de reporte en lotes NDJSON (100 filas por lote) |
| `ExportReportUseCase` | `exportReportUseCase.ts` | Exportar reporte a PDF, Excel o CSV con metadatos de auditoria opcionales |
| `CreateReportTemplateUseCase` | `createReportTemplateUseCase.ts` | Crear una plantilla de reporte reutilizable con nombre, tipo y parametros por defecto |
| `UpdateReportTemplateUseCase` | `updateReportTemplateUseCase.ts` | Actualizar nombre, descripcion, parametros o estado activo de la plantilla |
| `GetReportTemplatesUseCase` | `getReportTemplatesUseCase.ts` | Listar plantillas de reporte con filtros opcionales (tipo, activo, createdBy) |
| `GetReportsUseCase` | `getReportsUseCase.ts` | Obtener historial de ejecucion de reportes con filtros (tipo, estado, rango de fechas, generatedBy) |

---

## Endpoints de la API

### Controlador de Reportes (`src/interfaces/http/report/report.controller.ts`)

**Ruta base:** `/reports`
**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
**Interceptor:** `ReportLoggingInterceptor`

Los permisos se aplican por tipo de reporte. Los reportes sensibles (Financiero, Valoracion, Ventas, Ventas por Producto, Ventas por Almacen) requieren `REPORTS:READ_SENSITIVE` en lugar de `REPORTS:READ`.

#### Endpoints de Vista (GET - JSON)

| Endpoint | Tipo de Reporte |
|---|---|
| `GET /reports/inventory/available/view` | `AVAILABLE_INVENTORY` |
| `GET /reports/inventory/movement-history/view` | `MOVEMENT_HISTORY` |
| `GET /reports/inventory/valuation/view` | `VALUATION` |
| `GET /reports/inventory/low-stock/view` | `LOW_STOCK` |
| `GET /reports/inventory/movements/view` | `MOVEMENTS` |
| `GET /reports/inventory/financial/view` | `FINANCIAL` |
| `GET /reports/inventory/turnover/view` | `TURNOVER` |
| `GET /reports/sales/view` | `SALES` |
| `GET /reports/sales/by-product/view` | `SALES_BY_PRODUCT` |
| `GET /reports/sales/by-warehouse/view` | `SALES_BY_WAREHOUSE` |
| `GET /reports/sales/by-client/view` | `SALES_BY_CLIENT` |
| `GET /reports/returns/view` | `RETURNS` |
| `GET /reports/returns/by-type/view` | `RETURNS_BY_TYPE` |
| `GET /reports/returns/by-product/view` | `RETURNS_BY_PRODUCT` |
| `GET /reports/returns/by-sale/:saleId/view` | `RETURNS_BY_SALE` |
| `GET /reports/returns/customer/view` | `RETURNS_CUSTOMER` |
| `GET /reports/returns/supplier/view` | `RETURNS_SUPPLIER` |
| `GET /reports/inventory/abc-analysis/view` | `ABC_ANALYSIS` |
| `GET /reports/inventory/dead-stock/view` | `DEAD_STOCK` |

#### Endpoints de Streaming (GET - NDJSON)

| Endpoint | Tipo de Reporte |
|---|---|
| `GET /reports/inventory/available/stream` | `AVAILABLE_INVENTORY` |
| `GET /reports/sales/view/stream` | `SALES` |
| `GET /reports/returns/view/stream` | `RETURNS` |

#### Endpoints de Exportacion (POST - Descarga de Archivo)

Cada tipo de reporte tiene un endpoint de exportacion correspondiente que acepta un cuerpo con `format` (`PDF`, `EXCEL`, `CSV`), `parameters` opcionales y `options`.

| Endpoint | Tipo de Reporte |
|---|---|
| `POST /reports/inventory/available/export` | `AVAILABLE_INVENTORY` |
| `POST /reports/inventory/movement-history/export` | `MOVEMENT_HISTORY` |
| `POST /reports/inventory/valuation/export` | `VALUATION` |
| `POST /reports/inventory/low-stock/export` | `LOW_STOCK` |
| `POST /reports/inventory/movements/export` | `MOVEMENTS` |
| `POST /reports/inventory/financial/export` | `FINANCIAL` |
| `POST /reports/inventory/turnover/export` | `TURNOVER` |
| `POST /reports/sales/export` | `SALES` |
| `POST /reports/sales/by-product/export` | `SALES_BY_PRODUCT` |
| `POST /reports/sales/by-warehouse/export` | `SALES_BY_WAREHOUSE` |
| `POST /reports/sales/by-client/export` | `SALES_BY_CLIENT` |
| `POST /reports/returns/export` | `RETURNS` |
| `POST /reports/returns/by-type/export` | `RETURNS_BY_TYPE` |
| `POST /reports/returns/by-product/export` | `RETURNS_BY_PRODUCT` |
| `POST /reports/inventory/abc-analysis/export` | `ABC_ANALYSIS` |
| `POST /reports/inventory/dead-stock/export` | `DEAD_STOCK` |

#### Endpoint de Auditoria

| Metodo | Endpoint | Descripcion |
|---|---|---|
| `GET` | `/reports/history` | Obtener historial de ejecucion de reportes con filtros |

### Controlador de Plantillas de Reporte (`src/interfaces/http/report/reportTemplate.controller.ts`)

**Ruta base:** `/report-templates`

| Metodo | Endpoint | Descripcion |
|---|---|---|
| `GET` | `/report-templates` | Listar todas las plantillas (filtrable por tipo, activeOnly, createdBy) |
| `GET` | `/report-templates/active` | Listar solo plantillas activas |
| `GET` | `/report-templates/by-type/:type` | Listar plantillas por tipo de reporte |
| `POST` | `/report-templates` | Crear una nueva plantilla |
| `PUT` | `/report-templates/:id` | Actualizar una plantilla existente |

---

## Servicios de Dominio

| Servicio | Archivo | Descripcion |
|---|---|---|
| `ReportGenerationService` | `src/report/domain/services/reportGeneration.service.ts` | Genera datos crudos de reportes consultando puertos de repositorio (Product, Warehouse, Movement, Sale, Return) |
| `ReportViewService` | `src/report/domain/services/reportView.service.ts` | Transforma datos crudos en estructura lista para frontend con columnas, filas, metadatos y resumen |
| `ExportService` | `src/report/domain/services/export.service.ts` | Exporta datos de reporte a CSV, JSON (nativo), PDF, Excel (delegado) |
| `ReportCacheService` | `src/report/domain/services/reportCache.service.ts` | Gestiona cache de reportes con TTL configurable por tipo de reporte |

---

## Referencia de Archivos

| Capa | Ruta |
|---|---|
| Modulo | `src/report/report.module.ts` |
| Entidades | `src/report/domain/entities/report.entity.ts`, `reportTemplate.entity.ts` |
| Objetos de Valor | `src/report/domain/valueObjects/reportType.valueObject.ts`, `reportFormat.valueObject.ts`, `reportStatus.valueObject.ts`, `reportParameters.valueObject.ts` |
| Servicios de Dominio | `src/report/domain/services/*.ts` |
| Constantes | `src/report/domain/constants/reportCache.constants.ts`, `reportPermissions.constants.ts` |
| Eventos | `src/report/domain/events/*.ts` |
| DTOs | `src/report/dto/viewReport.dto.ts`, `exportReport.dto.ts`, `reportTemplate.dto.ts` |
| Casos de Uso | `src/application/reportUseCases/*.ts` |
| Controladores | `src/interfaces/http/report/report.controller.ts`, `reportTemplate.controller.ts` |
| Mappers | `src/report/mappers/report.mapper.ts`, `reportTemplate.mapper.ts` |
| Interceptors | `src/report/interceptors/reportLogging.interceptor.ts` |
| Decoradores | `src/report/decorators/requireReportPermission.decorator.ts` |
