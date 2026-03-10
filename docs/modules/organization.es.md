> [English](./organization.md) | **[Español](./organization.es.md)**

# Modulo de Organizacion

## Descripcion General

El modulo de Organizacion es la base de la arquitectura multi-inquilino de Nevada Inventory. Gestiona el ciclo de vida de las organizaciones (inquilinos), sus configuraciones, analiticas del panel de control y capacidades de auditoria. Cada entidad en el sistema esta asociada a una organizacion mediante una clave foranea `orgId`, garantizando un aislamiento estricto de datos entre inquilinos.

---

## Multi-inquilino

### Identificacion de Inquilino

Las organizaciones se identifican mediante multiples mecanismos, resueltos en orden de prioridad por el decorador `@OrgId()` (`src/shared/decorators/orgId.decorator.ts`):

1. **`req.orgId`** - Establecido por TenantMiddleware (prioridad maxima)
2. **Header `X-Organization-ID`** - ID de organizacion directo
3. **Header `X-Organization-Slug`** - Resuelto a ID mediante consulta al repositorio
4. **`orgId` en el cuerpo de la solicitud** - Los slugs se resuelven automaticamente a IDs
5. **Extraccion de subdominio** - Del header `Host` (ej., `acme.example.com`)
6. **Respaldo** - Variable de entorno `DEFAULT_ORG_ID` o `'dev-org'`

### Aislamiento de Datos

Cada consulta a la base de datos esta filtrada por `orgId`, aplicada en la capa de repositorio. La clase base `Entity` (`src/shared/domain/base/entity.base.ts`) incluye `_orgId` como propiedad fundamental en todas las entidades de dominio.

---

## Configuraciones de la Organizacion

La entidad `Organization` almacena un campo JSON flexible `settings: Record<string, unknown>` que soporta configuracion dinamica por inquilino. Configuraciones soportadas actualmente:

| Clave de Configuracion | Tipo | Descripcion |
|---|---|---|
| `pickingEnabled` | `boolean` | Si el flujo de picking esta activo |
| `pickingMode` | `'OFF' \| 'OPTIONAL' \| 'REQUIRED_FULL' \| 'REQUIRED_PARTIAL'` | Nivel de aplicacion del picking |
| `multiCompanyEnabled` | `boolean` | Habilitar lineas de negocio (empresas) |
| `language` | `string` | Preferencia de idioma de la organizacion |

### Propiedades de la Organizacion

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `name` | `string` | Nombre visible de la organizacion |
| `taxId` | `string?` | Numero de identificacion fiscal |
| `timezone` | `string` | Zona horaria IANA (ej., `America/Santiago`) |
| `currency` | `string` | Codigo de moneda ISO 4217 (ej., `CLP`, `USD`) |
| `dateFormat` | `string` | Formato de visualizacion de fecha (ej., `YYYY-MM-DD`) |
| `isActive` | `boolean` | Si la organizacion esta activa |

---

## Panel de Control

El caso de uso del panel de control proporciona analiticas en tiempo real delimitadas a una organizacion, con filtrado opcional a nivel de empresa para inquilinos multi-empresa.

### Metricas Proporcionadas

- **Resumen de inventario** - Productos totales, cantidad en stock, valor del inventario
- **Conteo de bajo stock** - Productos por debajo de los umbrales de reorden
- **Ventas mensuales** - Conteo e ingresos del mes actual
- **Tendencia de ventas** - Datos graficos de 7 dias (fecha, conteo, ingresos)
- **Productos principales** - Top 5 por ingresos del mes actual
- **Stock por bodega** - Cantidad y valor por bodega
- **Actividad reciente** - Ultimos 5 eventos entre ventas, movimientos, devoluciones, transferencias

### Archivo Clave

- `src/application/dashboardUseCases/getDashboardMetricsUseCase.ts` - `GetDashboardMetricsUseCase`

---

## Auditoria

El subsistema de auditoria proporciona un registro completo de todas las acciones realizadas en el sistema, incluyendo solicitudes HTTP, acciones de dominio y eventos de dominio.

### Entidad de Auditoria

`AuditLog` (`src/shared/audit/domain/entities/auditLog.entity.ts`) captura:

- `entityType` (Objeto de Valor) - El tipo de entidad afectada (ej., `Product`, `Sale`, `System`)
- `entityId` - El ID de la entidad especifica
- `action` (Objeto de Valor) - Que ocurrio (ej., `CREATE`, `UPDATE`, `HTTP_REQUEST`)
- `performedBy` - ID del usuario que realizo la accion
- `metadata` (Objeto de Valor) - Datos JSON estructurados con redaccion automatica de campos sensibles
- `ipAddress`, `userAgent` - Contexto del cliente
- `httpMethod`, `httpUrl`, `httpStatusCode`, `duration` - Detalles de la solicitud HTTP

### Servicio de Auditoria

`AuditService` (`src/shared/audit/domain/services/auditService.ts`) proporciona metodos estaticos para registro de auditoria no bloqueante:

- `logAction()` - Registrar acciones de dominio
- `logEvent()` - Registrar eventos de dominio
- `logHttpRequest()` - Registrar solicitudes HTTP
- `logError()` - Registrar errores con contexto

Los campos sensibles (`password`, `token`, `apiKey`, `creditCard`, etc.) se redactan automaticamente de los metadatos mediante `sanitizeMetadata()`.

### Especificaciones de Auditoria

El modulo de auditoria utiliza el Patron de Especificacion para filtros de consulta componibles (`src/shared/audit/domain/specifications/auditLogSpecifications.ts`):

- `AuditLogByEntityTypeSpecification`
- `AuditLogByEntityIdSpecification`
- `AuditLogByActionSpecification`
- `AuditLogByUserSpecification`
- `AuditLogByHttpMethodSpecification`
- `AuditLogByDateRangeSpecification`

Las especificaciones se combinan con logica AND/OR/NOT para consultas complejas.

---

## Casos de Uso

### Casos de Uso de Organizacion

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `CreateOrganizationUseCase` | `src/application/organizationUseCases/createOrganizationUseCase.ts` | Crea organizacion con usuario admin opcional y asignacion de rol ADMIN |
| `GetOrganizationByIdUseCase` | `src/application/organizationUseCases/getOrganizationByIdUseCase.ts` | Obtiene organizacion por ID o slug (auto-detectado) |
| `UpdateOrganizationUseCase` | `src/application/organizationUseCases/updateOrganizationUseCase.ts` | Actualiza propiedades de la organizacion con validacion de conflictos de slug/dominio |
| `TogglePickingSettingUseCase` | `src/application/organizationUseCases/togglePickingSettingUseCase.ts` | Configura el modo de flujo de picking (OFF, OPTIONAL, REQUIRED_FULL, REQUIRED_PARTIAL) |
| `ToggleMultiCompanySettingUseCase` | `src/application/organizationUseCases/toggleMultiCompanySettingUseCase.ts` | Habilita/deshabilita la funcionalidad multi-empresa (lineas de negocio) |

### Casos de Uso del Panel de Control

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `GetDashboardMetricsUseCase` | `src/application/dashboardUseCases/getDashboardMetricsUseCase.ts` | Obtiene metricas completas del panel con filtro opcional por empresa |

### Casos de Uso de Auditoria

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `GetAuditLogsUseCase` | `src/application/auditUseCases/getAuditLogsUseCase.ts` | Logs de auditoria paginados con filtros de especificacion componibles |
| `GetAuditLogUseCase` | `src/application/auditUseCases/getAuditLogUseCase.ts` | Log de auditoria individual por ID |
| `GetEntityHistoryUseCase` | `src/application/auditUseCases/getEntityHistoryUseCase.ts` | Historial de cambios de una entidad especifica (tipo + ID) |
| `GetUserActivityUseCase` | `src/application/auditUseCases/getUserActivityUseCase.ts` | Todas las acciones realizadas por un usuario especifico |

---

## Entidades

### Entidad Organizacion

- **Archivo**: `src/organization/domain/entities/organization.entity.ts`
- **Clase Base**: `AggregateRoot<IOrganizationProps>` (soporta eventos de dominio)
- **Metodos Clave**: `create()`, `reconstitute()`, `update()`, `updateSettings()`, `getSetting()`, `setSetting()`, `activate()`, `deactivate()`

### Entidad AuditLog

- **Archivo**: `src/shared/audit/domain/entities/auditLog.entity.ts`
- **Clase Base**: `Entity<IAuditLogProps>`
- **Objetos de Valor**: `EntityType`, `AuditAction`, `AuditMetadata`

### Objetos de Valor

- `EntityType` (`src/shared/audit/domain/valueObjects/entityType.valueObject.ts`) - Nombres de tipo de entidad validados
- `AuditAction` (`src/shared/audit/domain/valueObjects/auditAction.valueObject.ts`) - Nombres de accion de auditoria validados
- `AuditMetadata` (`src/shared/audit/domain/valueObjects/auditMetadata.valueObject.ts`) - Contenedor inmutable de metadatos con serializacion JSON

---

## Endpoints de la API

Todos los endpoints de organizacion requieren rol `SYSTEM_ADMIN` y autenticacion JWT.

### Controlador de Organizacion

**Archivo**: `src/organization/organization.controller.ts`

| Metodo | Endpoint | Descripcion |
|---|---|---|
| `POST` | `/organizations` | Crear nueva organizacion (con usuario admin opcional) |
| `GET` | `/organizations/:id` | Obtener organizacion por ID o slug |
| `PUT` | `/organizations/:id` | Actualizar organizacion |
| `PATCH` | `/organizations/:id/settings/picking` | Alternar configuracion de picking |
| `PATCH` | `/organizations/:id/settings/multi-company` | Alternar configuracion multi-empresa |

### DTOs

- `CreateOrganizationDto` (`src/organization/dto/createOrganization.dto.ts`) - Incluye `AdminUserDto` opcional para inicializacion
- `UpdateOrganizationDto` (`src/organization/dto/updateOrganization.dto.ts`) - Todos los campos opcionales para actualizaciones parciales
- `CreateOrganizationResponseDto`, `GetOrganizationResponseDto`, `UpdateOrganizationResponseDto` - Envoltorios de respuesta

### Registro del Modulo

**Archivo**: `src/organization/organization.module.ts`

El `OrganizationModule` registra los casos de uso, vincula `OrganizationRepository` al token de inyeccion `'OrganizationRepository'` y lo exporta para uso de otros modulos.
