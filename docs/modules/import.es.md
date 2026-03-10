> [English](./import.md) | **[Español](./import.es.md)**

# Modulo de Importacion

## Descripcion General

El modulo de Importacion permite la ingestion masiva de datos desde archivos Excel (`.xlsx`) y CSV. Soporta cinco tipos de importacion y sigue un flujo de dos fases: **Vista previa** (validar sin persistir) y **Ejecutar** (validar, crear y procesar en una operacion). Alternativamente, hay un flujo paso a paso disponible: Crear Lote, Validar y luego Procesar. El modulo usa diseno dirigido por dominio con entidades, objetos de valor, eventos de dominio y servicios de dominio.

---

## Tipos de Importacion Soportados

Definidos en `src/import/domain/valueObjects/importType.valueObject.ts`.

| Tipo | Descripcion |
|---|---|
| `PRODUCTS` | Importacion masiva de productos con SKU, nombre, unidad, codigo de barras, marca, categoria, etc. |
| `MOVEMENTS` | Movimientos de inventario (IN, OUT, ADJUST_IN, ADJUST_OUT) |
| `WAREHOUSES` | Definiciones de almacenes con codigo, nombre, descripcion y direccion |
| `STOCK` | Niveles de stock inicial por producto y almacen |
| `TRANSFERS` | Transferencias entre almacenes |

---

## Flujo de Trabajo

### Opcion A: Vista Previa y luego Ejecutar

Este es el flujo recomendado para usuarios finales.

```
1. POST /imports/preview          --> Validar archivo, retornar resumen (sin persistencia)
2. POST /imports/execute          --> Validar + Crear Lote + Procesar (todo en uno)
```

**Vista previa** analiza el archivo, valida las cabeceras contra la estructura esperada de la plantilla, y valida cada fila. Retorna un resumen con `canBeProcessed`, `totalRows`, `validRows`, `invalidRows`, errores de estructura y errores por fila -- sin crear registros en la base de datos.

**Ejecutar** realiza la canalizacion completa de importacion: validacion de tipo, validacion de formato de archivo, validacion de estructura de cabeceras, validacion de datos fila por fila, creacion de lote y procesamiento de filas. Si existe CUALQUIER error de validacion, la importacion se rechaza inmediatamente sin persistencia.

### Opcion B: Paso a Paso

```
1. POST /imports                  --> Crear un lote vacio (PENDING)
2. POST /imports/:id/validate     --> Subir archivo y validar (PENDING --> VALIDATING --> VALIDATED)
3. POST /imports/:id/process      --> Procesar filas validadas (VALIDATED --> PROCESSING --> COMPLETED/FAILED)
```

---

## Ciclo de Vida del Estado de Importacion

Definido en `src/import/domain/valueObjects/importStatus.valueObject.ts`.

```
PENDING --> VALIDATING --> VALIDATED --> PROCESSING --> COMPLETED
   |            |                          |
   v            v                          v
 FAILED       FAILED                     FAILED
```

| Estado | Descripcion |
|---|---|
| `PENDING` | Lote creado, esperando carga de archivo |
| `VALIDATING` | Archivo siendo analizado y validado |
| `VALIDATED` | Validacion completa; filas contadas como validas/invalidas |
| `PROCESSING` | Filas validas siendo procesadas en entidades de dominio |
| `COMPLETED` | Todas las filas procesadas exitosamente (terminal) |
| `FAILED` | Ocurrio un error durante validacion o procesamiento (terminal) |

---

## Casos de Uso

Todos los casos de uso estan en `src/application/importUseCases/`.

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `PreviewImportUseCase` | `previewImportUseCase.ts` | Validar archivo y retornar resumen sin persistir. Verifica tipo, formato de archivo, estructura de cabeceras y datos de filas. |
| `ExecuteImportUseCase` | `executeImportUseCase.ts` | Canalizacion completa de importacion: validar, crear lote, procesar todas las filas. Rechaza si hay errores de validacion. |
| `CreateImportBatchUseCase` | `createImportBatchUseCase.ts` | Crear un registro de lote de importacion vacio en estado PENDING. |
| `ValidateImportUseCase` | `validateImportUseCase.ts` | Subir archivo a un lote existente, analizar y validar. Transiciona de PENDING a VALIDATED. |
| `ProcessImportUseCase` | `processImportUseCase.ts` | Procesar filas validas de un lote VALIDATED. Usa `ImportRowProcessorFactory` para procesamiento especifico por tipo. |
| `GetImportStatusUseCase` | `getImportStatusUseCase.ts` | Obtener estado actual y progreso de un lote de importacion. |
| `ListImportBatchesUseCase` | `listImportBatchesUseCase.ts` | Listar lotes de importacion con paginacion y filtros (tipo, estado). |
| `DownloadImportTemplateUseCase` | `downloadImportTemplateUseCase.ts` | Generar y descargar un archivo de plantilla (CSV o XLSX) para un tipo de importacion dado. |
| `DownloadErrorReportUseCase` | `downloadErrorReportUseCase.ts` | Descargar reporte de errores de un lote mostrando errores de validacion por fila. |

---

## Endpoints de la API

**Ruta base:** `/imports`
**Controlador:** `src/interfaces/http/import/import.controller.ts`
**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`
**Permiso requerido:** `PRODUCTS_IMPORT`

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/imports/preview` | Vista previa y validacion de archivo sin persistir (multipart/form-data, max 10MB) |
| `POST` | `/imports/execute` | Ejecutar importacion completa (validar + crear + procesar) en una operacion |
| `POST` | `/imports` | Crear lote de importacion vacio |
| `POST` | `/imports/:id/validate` | Subir archivo y validar contra un lote existente (multipart/form-data) |
| `POST` | `/imports/:id/process` | Procesar un lote validado |
| `GET` | `/imports` | Listar lotes de importacion con paginacion y filtros |
| `GET` | `/imports/:id/status` | Obtener estado y progreso del lote de importacion |
| `GET` | `/imports/templates/:type` | Descargar plantilla de importacion (CSV o XLSX) |
| `GET` | `/imports/:id/errors` | Descargar reporte de errores de un lote de importacion |

### Parametros de Consulta

**Listar lotes (`GET /imports`):**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `page` | `number` | Numero de pagina |
| `limit` | `number` | Elementos por pagina |
| `type` | `PRODUCTS` \| `MOVEMENTS` \| `WAREHOUSES` \| `STOCK` \| `TRANSFERS` | Filtrar por tipo |
| `status` | `PENDING` \| `VALIDATING` \| `VALIDATED` \| `PROCESSING` \| `COMPLETED` \| `FAILED` | Filtrar por estado |

**Descargar plantilla (`GET /imports/templates/:type`):**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `format` | `xlsx` \| `csv` | Formato de plantilla (por defecto: `csv`) |

---

## Plantillas

Las plantillas son generadas por `ImportTemplateService` (`src/import/domain/services/importTemplate.service.ts`) usando las definiciones de columnas de `ImportValidationService` (`src/import/domain/services/importValidation.service.ts`).

Cada plantilla incluye filas de cabecera y filas de datos de ejemplo. Las plantillas estan disponibles en formatos CSV (con BOM UTF-8 para compatibilidad con Excel) y XLSX.

### Plantilla de Productos

| Columna | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `SKU` | string | Si | SKU unico del producto |
| `Name` | string | Si | Nombre del producto |
| `Description` | string | No | Descripcion del producto |
| `Unit Code` | string | Si | Codigo de unidad (UND, KG, etc.) |
| `Unit Name` | string | Si | Nombre de unidad |
| `Unit Precision` | number | Si | Precision decimal |
| `Barcode` | string | No | Codigo de barras del producto |
| `Brand` | string | No | Marca |
| `Model` | string | No | Modelo |
| `Status` | enum | No | `ACTIVE`, `INACTIVE`, `DISCONTINUED` |
| `Cost Method` | enum | No | `AVG`, `FIFO` |
| `Category` | string | No | Categoria |
| `Company Code` | string | No | Codigo de empresa para organizaciones multi-empresa |

### Plantilla de Movimientos

| Columna | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `Type` | enum | Si | `IN`, `OUT`, `ADJUST_IN`, `ADJUST_OUT` |
| `Warehouse Code` | string | Si | Codigo de almacen |
| `Product SKU` | string | Si | SKU del producto |
| `Location Code` | string | No | Codigo de ubicacion |
| `Quantity` | number | Si | Cantidad |
| `Unit Cost` | number | No | Costo unitario |
| `Currency` | string | No | Codigo de moneda (ej: COP) |
| `Reference` | string | No | Numero de referencia |
| `Reason` | string | No | Razon del movimiento |
| `Note` | string | No | Notas adicionales |

### Plantilla de Almacenes

| Columna | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `Code` | string | Si | Codigo unico del almacen |
| `Name` | string | Si | Nombre del almacen |
| `Description` | string | No | Descripcion |
| `Address` | string | No | Direccion fisica |

### Plantilla de Stock

| Columna | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `Product SKU` | string | Si | SKU del producto |
| `Warehouse Code` | string | Si | Codigo de almacen |
| `Location Code` | string | No | Codigo de ubicacion |
| `Quantity` | number | Si | Cantidad de stock |
| `Unit Cost` | number | No | Costo unitario |
| `Currency` | string | No | Codigo de moneda |

### Plantilla de Transferencias

| Columna | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `From Warehouse Code` | string | Si | Almacen origen |
| `To Warehouse Code` | string | Si | Almacen destino |
| `Product SKU` | string | Si | SKU del producto |
| `From Location Code` | string | No | Ubicacion origen |
| `To Location Code` | string | No | Ubicacion destino |
| `Quantity` | number | Si | Cantidad a transferir |
| `Note` | string | No | Nota de transferencia |

---

## Entidades de Dominio

### ImportBatch (`src/import/domain/entities/importBatch.entity.ts`)

La raiz de agregado que representa una operacion de importacion masiva. Gestiona transiciones de estado y contiene entidades `ImportRow`.

**Propiedades:** `type`, `status`, `fileName`, `totalRows`, `processedRows`, `validRows`, `invalidRows`, `startedAt`, `validatedAt`, `completedAt`, `errorMessage`, `note`, `createdBy`

### ImportRow (`src/import/domain/entities/importRow.entity.ts`)

Representa una fila individual en un archivo de importacion. Contiene los datos de la fila y su resultado de validacion.

**Propiedades:** `rowNumber`, `data` (mapa clave-valor), `validationResult`

---

## Servicios de Dominio

| Servicio | Archivo | Descripcion |
|---|---|---|
| `ImportValidationService` | `src/import/domain/services/importValidation.service.ts` | Valida estructura de archivo (cabeceras) y datos de filas contra definiciones de plantillas. Verifica tipos: strings, numeros, fechas, booleanos y enums. |
| `ImportTemplateService` | `src/import/domain/services/importTemplate.service.ts` | Genera plantillas CSV/XLSX con cabeceras y datos de ejemplo. Proporciona descripciones de columnas para documentacion. |
| `ImportProcessingService` | `src/import/domain/services/importProcessing.service.ts` | Procesa filas del lote usando una funcion `RowProcessor` conectable. Soporta callbacks de progreso e intervalos de checkpoint. Provee metodos de transformacion de datos especificos por tipo (`toProductData`, `toMovementData`, `toWarehouseData`, `toStockData`, `toTransferData`). |
| `ImportErrorReportService` | `src/import/domain/services/importErrorReport.service.ts` | Genera reportes de errores descargables para lotes de importacion. |
| `ImportRowProcessorFactory` | `src/import/application/services/importRowProcessorFactory.ts` | Fabrica que crea procesadores de filas especificos por tipo de importacion. |

---

## Eventos de Dominio

| Evento | Archivo | Disparador |
|---|---|---|
| `ImportStartedEvent` | `src/import/domain/events/importStarted.event.ts` | El lote transiciona a VALIDATING |
| `ImportValidatedEvent` | `src/import/domain/events/importValidated.event.ts` | La validacion del lote se completa |
| `ImportCompletedEvent` | `src/import/domain/events/importCompleted.event.ts` | El procesamiento del lote se completa exitosamente |

---

## Referencia de Archivos

| Capa | Ruta |
|---|---|
| Entidades | `src/import/domain/entities/importBatch.entity.ts`, `importRow.entity.ts` |
| Objetos de Valor | `src/import/domain/valueObjects/importType.valueObject.ts`, `importStatus.valueObject.ts`, `validationResult.valueObject.ts` |
| Servicios de Dominio | `src/import/domain/services/*.ts` |
| Servicios de Aplicacion | `src/import/application/services/importRowProcessorFactory.ts` |
| Eventos | `src/import/domain/events/*.ts` |
| Puerto de Repositorio | `src/import/domain/ports/repositories/iImportBatchRepository.port.ts` |
| DTOs | `src/import/dto/*.ts` |
| Casos de Uso | `src/application/importUseCases/*.ts` |
| Controlador | `src/interfaces/http/import/import.controller.ts` |
| Modulo HTTP | `src/interfaces/http/import/importHttp.module.ts` |
