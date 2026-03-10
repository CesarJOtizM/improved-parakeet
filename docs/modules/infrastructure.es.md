> [English](./infrastructure.md) | **[Español](./infrastructure.es.md)**

# Modulo de Infraestructura

## Descripcion General

El modulo de Infraestructura proporciona todas las implementaciones concretas para dependencias externas: acceso a base de datos via Prisma ORM, integraciones con servicios externos (email, notificaciones, generacion de documentos, parseo de archivos), tareas programadas y monitoreo de salud. Siguiendo la Arquitectura Hexagonal, estas implementaciones satisfacen interfaces de puerto definidas en las capas de dominio y compartida, permitiendo reemplazarlas sin afectar la logica de negocio.

### Estructura de Directorios

```
src/infrastructure/
  database/
    generated/prisma/    -- Cliente Prisma auto-generado
    migrations/          -- Archivos de migracion SQL
    prisma/
      schema.prisma      -- Definicion del esquema Prisma
      seed.ts            -- Orquestador de sembrado de base de datos
      seeds/             -- Datos semilla (auth, inventario, demo)
      views.sql          -- Vistas de base de datos
    repositories/        -- Implementaciones de repositorios
    services/            -- Servicio base de repositorio
    utils/               -- Optimizador de consultas, utilidades de stream query
    prisma.module.ts     -- Modulo global de NestJS
    prisma.service.ts    -- Servicio del cliente Prisma
    unitOfWork.service.ts -- Gestion de transacciones
  externalServices/
    emailService.ts          -- Email via API de Resend
    notificationService.ts   -- Notificaciones de alertas de stock
    documentGenerationService.ts -- Generacion de PDF/Excel
    fileParsingService.ts    -- Parseo de archivos Excel/CSV
    excelGenerationService.ts -- Servicio de exportacion Excel
    templates/               -- Plantillas HTML de email
  healthCheck/
    healthCheck.adapter.ts   -- Adaptador de infraestructura de health check
  jobs/
    stockValidationJob.ts    -- Validacion programada de niveles de stock
```

---

## Capa de Base de Datos

### Configuracion de Prisma

#### PrismaService

**Archivo**: `src/infrastructure/database/prisma.service.ts`

El `PrismaService` extiende `PrismaClient` e implementa hooks del ciclo de vida de NestJS:

- **Gestion de conexion** - `onModuleInit()` conecta, `onModuleDestroy()` desconecta de forma ordenada
- **Pool de conexiones** - Configurable via las variables de entorno `DB_CONNECTION_LIMIT` (defecto: 10) y `DB_POOL_TIMEOUT` (defecto: 10s)
- **Soporte SSL** - SSL automatico para hostnames de Supabase y AWS
- **Adaptador** - Usa `@prisma/adapter-pg` (`PrismaPg`) para conexion PostgreSQL
- **Logging** - Logs de consultas, errores y advertencias en desarrollo; solo errores en produccion

#### PrismaModule

**Archivo**: `src/infrastructure/database/prisma.module.ts`

Modulo global de NestJS (`@Global()`) que provee y exporta `PrismaService` y `UnitOfWork` a toda la aplicacion.

#### UnitOfWork

**Archivo**: `src/infrastructure/database/unitOfWork.service.ts`

Proporciona limites transaccionales para flujos de trabajo con multiples operaciones:

```typescript
interface IUnitOfWork {
  execute<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
```

- **Nivel de aislamiento** - `ReadCommitted`
- **Tiempo de espera** - 30 segundos
- **Espera maxima** - 10 segundos
- **Rollback automatico** en caso de fallo

#### Schema

**Archivo**: `src/infrastructure/database/prisma/schema.prisma`

Define el modelo de datos completo de la aplicacion incluyendo organizaciones, usuarios, roles, permisos, productos, stock, bodegas, movimientos, ventas, transferencias, devoluciones, logs de auditoria, reportes, empresas, contactos, integraciones y mas.

### Repositorios

Todos los repositorios implementan interfaces de puerto de la capa de dominio, aplican consultas delimitadas por `orgId` y usan Prisma Client para acceso a datos.

#### BaseRepositoryService

**Archivo**: `src/infrastructure/database/services/base.repository.service.ts`

Clase base abstracta que provee operaciones CRUD comunes para todos los repositorios:

| Metodo | Descripcion |
|---|---|
| `create(data, orgId)` | Crear entidad delimitada por organizacion |
| `findById(id, orgId)` | Buscar por ID dentro de la organizacion |
| `findAll(orgId, options?)` | Buscar todo paginado con filtros opcionales |
| `update(id, data, orgId)` | Actualizar entidad |
| `delete(id, orgId)` | Eliminacion logica (establece `deletedAt`) |
| `hardDelete(id, orgId)` | Eliminacion permanente |
| `exists(id, orgId)` | Verificar existencia |
| `count(orgId, where?)` | Contar registros |
| `findWithFilters(orgId, filters)` | Busqueda con filtros de texto, categoria, estado y rango de fechas |

#### Repositorios de Dominio

| Repositorio | Archivo | Puerto |
|---|---|---|
| `OrganizationRepository` | `repositories/organization.repository.ts` | `IOrganizationRepository` |
| `UserRepository` | `repositories/user.repository.ts` | `IUserRepository` |
| `RoleRepository` | `repositories/role.repository.ts` | `IRoleRepository` |
| `ProductRepository` | `repositories/product.repository.ts` | `IProductRepository` |
| `CategoryRepository` | `repositories/category.repository.ts` | `ICategoryRepository` |
| `WarehouseRepository` | `repositories/warehouse.repository.ts` | `IWarehouseRepository` |
| `LocationRepository` | `repositories/location.repository.ts` | `ILocationRepository` |
| `StockRepository` | `repositories/stock.repository.ts` | `IStockRepository` |
| `MovementRepository` | `repositories/movement.repository.ts` | `IMovementRepository` |
| `TransferRepository` | `repositories/transfer.repository.ts` | `ITransferRepository` |
| `SaleRepository` | `repositories/sale.repository.ts` | `ISaleRepository` |
| `ReturnRepository` | `repositories/return.repository.ts` | `IReturnRepository` |
| `ContactRepository` | `repositories/contact.repository.ts` | `IContactRepository` |
| `CompanyRepository` | `repositories/company.repository.ts` | `ICompanyRepository` |
| `AuditLogRepository` | `repositories/auditLog.repository.ts` | `IAuditLogRepository` |
| `ReorderRuleRepository` | `repositories/reorderRule.repository.ts` | `IReorderRuleRepository` |
| `ReportRepository` | `repositories/report.repository.ts` | `IReportRepository` |
| `ReportTemplateRepository` | `repositories/reportTemplate.repository.ts` | `IReportTemplateRepository` |
| `SessionRepository` | `repositories/session.repository.ts` | `ISessionRepository` |
| `OtpRepository` | `repositories/otp.repository.ts` | `IOtpRepository` |
| `ImportBatchRepository` | `repositories/prismaImportBatchRepository.ts` | `IImportBatchRepository` |
| `IntegrationConnectionRepository` | `repositories/integrationConnection.repository.ts` | `IIntegrationConnectionRepository` |
| `IntegrationSkuMappingRepository` | `repositories/integrationSkuMapping.repository.ts` | `IIntegrationSkuMappingRepository` |
| `IntegrationSyncLogRepository` | `repositories/integrationSyncLog.repository.ts` | `IIntegrationSyncLogRepository` |

### Migraciones

| Migracion | Archivo | Descripcion |
|---|---|---|
| Esquema inicial | `migrations/20260226100000_init_migration/migration.sql` | Esquema de base de datos inicial completo |
| Funciones de numero de documento | `migrations/20260226200000_add_document_number_functions/migration.sql` | Funciones PostgreSQL para generacion automatica de numeros de documento |

### Utilidades de Base de Datos

#### QueryPagination

**Archivo**: `src/infrastructure/database/utils/queryOptimizer.ts`

- `QueryPagination.fromPage(page, pageSize)` - Convierte page/pageSize a skip/take
- `QueryPagination.create(options)` - Crea opciones de paginacion (soporta basada en cursor)
- `QueryPagination.createResult(data, total, options)` - Crea resultado paginado con `hasMore` y `nextCursor`

#### FieldSelector

- `FieldSelector.create(fields)` - Crea objetos select de Prisma
- `FieldSelector.createWithRelations(fields, relations)` - Crea select con relaciones anidadas

#### BatchOperations

- `BatchOperations.chunk(array, size)` - Divide arrays en fragmentos
- `BatchOperations.executeInBatches(items, batchSize, operation)` - Ejecuta operaciones en lotes
- `BatchOperations.batchCreate()`, `batchUpdate()`, `batchDelete()` - Operaciones CRUD en lote
- Tamano de lote por defecto: 1000

#### StreamQuery

**Archivo**: `src/infrastructure/database/utils/streamQuery.ts`

Paginacion basada en cursor para procesar grandes conjuntos de resultados sin cargar todo en memoria:

- `StreamQuery.stream(queryFn, options, onBatch)` - Stream con callback por lote
- `StreamQuery.streamAll(queryFn, options)` - Recolectar todos los items (usar con precaucion)
- `StreamQuery.createPrismaQuery(prismaQuery)` - Crea funcion de consulta basada en cursor a partir de Prisma findMany

### Datos Semilla

**Archivo**: `src/infrastructure/database/prisma/seed.ts`

Orquesta el sembrado de base de datos en dos categorias:

- **Seeds de autenticacion** (`seeds/auth/`) - Roles, permisos, mapeos rol-permiso, admin del sistema, usuarios
- **Seeds de demo** (`seeds/demo/`) - Organizaciones, empresas, categorias, bodegas, productos, stock, movimientos, ventas, transferencias, devoluciones, contactos, usuarios, logs de auditoria

---

## Patrones de Resiliencia

Todas las utilidades de resiliencia se encuentran en `src/shared/infrastructure/resilience/` y son utilizadas por las implementaciones de servicios externos en la capa de infraestructura.

### Circuit Breaker

**Archivo**: `src/shared/infrastructure/resilience/circuitBreaker.ts`

Previene fallos en cascada monitoreando llamadas a servicios externos con tres estados:

| Estado | Comportamiento |
|---|---|
| `CLOSED` | Operacion normal, todas las llamadas pasan |
| `OPEN` | Fallos excedieron umbral, todas las llamadas fallan rapido con `CircuitBreakerOpenError` |
| `HALF_OPEN` | Intento de recuperacion, llamadas limitadas para probar si el servicio se recupero |

**Configuracion**:
- `failureThreshold` (defecto: 5) - Fallos antes de abrir
- `resetTimeout` (defecto: 30s) - Tiempo antes de intento de recuperacion
- `successThreshold` (defecto: 2) - Exitos en HALF_OPEN antes de cerrar

```typescript
const breaker = new CircuitBreaker({ name: 'EmailService', failureThreshold: 3 });
const result = await breaker.execute(() => emailService.send(email));
```

### Reintento con Backoff Exponencial

**Archivo**: `src/shared/infrastructure/resilience/retry.ts`

Reintenta operaciones fallidas con retrasos crecientes entre intentos, incluyendo jitter para prevenir problemas de estampida.

**Configuracion**:
- `maxAttempts` (defecto: 3) - Intentos maximos de reintento
- `initialDelay` (defecto: 200ms) - Retraso del primer reintento
- `backoffMultiplier` (defecto: 2) - Multiplicador de retraso por intento
- `maxDelay` (defecto: 10s) - Limite maximo de retraso
- `isRetryable` (opcional) - Predicado para filtrar errores reintentables

**Formula de jitter**: `delay * (0.5 + random() * 0.5)` -- previene reintentos sincronizados

```typescript
const result = await retry(
  () => externalApi.call(),
  { maxAttempts: 3, name: 'ExternalAPI' }
);
```

### Timeout

**Archivo**: `src/shared/infrastructure/resilience/timeout.ts`

Envuelve una operacion asincrona con un tiempo de espera. Si la operacion excede la duracion especificada, se rechaza con un `TimeoutError`.

```typescript
const result = await withTimeout(
  () => externalApi.call(),
  5000,  // 5 segundos
  'ExternalAPI'
);
```

### ResilientCall

**Archivo**: `src/shared/infrastructure/resilience/resilientCall.ts`

Compone los tres patrones de resiliencia en un unico punto de entrada. Orden de ejecucion: **Circuit Breaker -> Retry (con Timeout por intento)**.

```typescript
const resilient = new ResilientCall({
  name: 'EmailService',
  timeoutMs: 5000,
  retry: { maxAttempts: 3 },
  circuitBreaker: { failureThreshold: 5 },
});

const result = await resilient.execute(() => emailService.send(email));
```

**Uso actual en el codigo**:
- `EmailService` - 10s timeout, 3 reintentos (500ms inicial), circuit breaker (5 fallos, 60s reset)
- `NotificationService` - 15s timeout, 2 reintentos (1s inicial), circuit breaker (10 fallos, 120s reset)

---

## Servicios Externos

### EmailService

**Archivo**: `src/infrastructure/externalServices/emailService.ts`

Implementa `IEmailService` usando la API de **Resend** para envio de emails transaccionales. Registra en log si `RESEND_API_KEY` no esta configurado.

**Plantillas de Email** (`src/infrastructure/externalServices/templates/`):

| Plantilla | Metodo | Descripcion |
|---|---|---|
| `welcome.template.ts` | `sendWelcomeEmail()` | Bienvenida a nuevo usuario |
| `welcomeWithCredentials.template.ts` | `sendWelcomeWithCredentialsEmail()` | Bienvenida con contrasena temporal |
| `passwordReset.template.ts` | `sendPasswordResetOtpEmail()` | Codigo OTP para restablecimiento de contrasena |
| `accountActivation.template.ts` | `sendAccountActivationEmail()` | Notificacion de cuenta activada |
| `accountDeactivation.template.ts` | `sendAccountDeactivationEmail()` | Notificacion de cuenta desactivada |
| `adminNotification.template.ts` | `sendNewUserNotificationToAdmin()` | Nuevo usuario requiere atencion del admin |
| `lowStockAlert.template.ts` | (usado por NotificationService) | Email de alerta de bajo stock |
| `stockAlertDigest.template.ts` | (usado por NotificationService) | Resumen consolidado de alertas de stock |
| `emailLayout.template.ts` | Layout base | Layout HTML compartido para todos los emails |

**Traducciones**: `templates/translations/email-translations.ts` - Contenido bilingue de emails (Ingles/Espanol)

### NotificationService

**Archivo**: `src/infrastructure/externalServices/notificationService.ts`

Implementa `INotificationService` para envio de notificaciones relacionadas con stock:

- `sendLowStockAlert(notification)` - Alerta individual de bajo stock
- `sendStockThresholdExceededAlert(notification)` - Alerta de exceso de stock
- `sendStockAlertDigest(notification)` - Email de resumen consolidado con items de bajo stock + exceso de stock, soportando contenido bilingue (en/es)

Usa `ResilientCall` para entrega confiable.

### DocumentGenerationService

**Archivo**: `src/infrastructure/externalServices/documentGenerationService.ts`

Implementa `IDocumentGenerationService` para generacion de reportes:

- `generateExcel(request)` - Generacion completa de Excel (.xlsx) usando ExcelJS con cabeceras estilizadas, rayas cebra, auto-filtros, secciones de resumen, formato numerico y paneles congelados
- `generatePDF(request)` - Generacion de PDF mock (placeholder basado en texto)

### FileParsingService

**Archivo**: `src/infrastructure/externalServices/fileParsingService.ts`

Implementa `IFileParsingService` para importacion de datos desde archivos:

- `validateFileFormat(file)` - Valida tamano de archivo (max 10MB), extension (.xlsx, .xls, .csv), tipo MIME y bytes magicos para deteccion de manipulacion
- `parseFile(file)` - Parsea archivos Excel (via ExcelJS) o CSV a datos estructurados `{ headers, rows, totalRows, fileType }`

### ExcelGenerationService

**Archivo**: `src/infrastructure/externalServices/excelGenerationService.ts`

Implementa `IExcelGenerationService` para funcionalidad de exportacion Excel.

---

## Health Check

El sistema de health check sigue la Arquitectura Hexagonal con una separacion limpia entre logica de dominio, servicio de aplicacion y adaptador de infraestructura.

### Capa de Dominio

**Archivo**: `src/healthCheck/services/healthCheck.service.ts`

Funciones puras para logica de health check (sin efectos secundarios):

- `createHealthCheckResult(status, version, environment)` - Crea resultado basico de salud
- `createDetailedHealthCheck(result, database, system, services, metrics?)` - Crea resultado detallado
- `determineOverallStatus(basic, database, system, services)` - Deriva estado general de los componentes
- `performHealthCheck(port, version, environment)` - Orquesta un health check completo

### Tipos

**Archivo**: `src/healthCheck/types/healthCheck.types.ts`

| Tipo | Descripcion |
|---|---|
| `HealthStatus` | `'healthy' \| 'unhealthy' \| 'degraded'` |
| `HealthCheckResult` | Estado basico, timestamp, uptime, version, entorno |
| `DatabaseHealth` | Estado, tiempo de respuesta, ultima verificacion |
| `SystemHealth` | Memoria (usada/total/%), CPU (carga/nucleos), Disco (usado/total/%) |
| `DetailedHealthCheck` | Resultado completo con estados de base de datos, sistema y servicios |

### Interfaz de Puerto

**Archivo**: `src/healthCheck/ports/healthCheck.port.ts`

```typescript
interface IHealthCheckPort {
  checkBasic(): Promise<HealthCheckResult>;
  checkDetailed(): Promise<DetailedHealthCheck>;
  checkDatabase(): Promise<boolean>;
  checkSystem(): Promise<boolean>;
}
```

### Servicio de Aplicacion

**Archivo**: `src/application/healthCheck/healthCheck.application.service.ts`

`HealthCheckApplicationService` coordina health checks via inyeccion de dependencias (token: `'HealthCheckPort'`):

- `getBasicHealth()` - Verificacion rapida de actividad (liveness)
- `getDetailedHealth()` - Verificacion completa de preparacion (readiness)
- `getFullHealthCheck()` - Health check orquestado por dominio con version y entorno

### Adaptador de Infraestructura

**Archivo**: `src/infrastructure/healthCheck/healthCheck.adapter.ts`

`HealthCheckAdapter` implementa `IHealthCheckPort`:

- **Verificacion de base de datos** - Ejecuta `SELECT 1` via Prisma, considera no saludable si la respuesta > 1 segundo
- **Verificacion de sistema** - Monitorea uso de memoria heap, considera degradado sobre 90%
- **Metricas de sistema** - Reporta uso de memoria heap, cantidad de nucleos CPU (via `os.cpus()`)

---

## Tareas Programadas

### StockValidationJob

**Archivo**: `src/infrastructure/jobs/stockValidationJob.ts`

Un cron job (`@Cron(CronExpression.EVERY_HOUR)`) que valida niveles de stock en todas las organizaciones:

**Flujo de trabajo**:

1. Obtiene todas las organizaciones activas
2. Para cada organizacion, verifica `AlertConfiguration` (debe estar explicitamente habilitada)
3. Respeta la frecuencia configurada (`EVERY_HOUR`, `EVERY_6_HOURS`, `EVERY_12_HOURS`, `EVERY_DAY`, `EVERY_WEEK`, etc.)
4. Para cada combinacion producto-bodega:
   - Evalua nivel de stock usando `AlertService.evaluateStockLevel()`
   - Verifica contra `minQuantity`, `safetyStock`, `maxQuantity` de las reglas de reorden
   - Emite eventos de dominio `LowStockAlertEvent` o `StockThresholdExceededEvent`
   - Respeta configuracion de nivel de severidad (`notifyLowStock`, `notifyCriticalStock`, `notifyOutOfStock`)
5. Envia email de resumen consolidado a los destinatarios configurados via `NotificationService`
6. Actualiza timestamp `lastRunAt` en `AlertConfiguration`

**Severidades de Alerta**: `LOW`, `CRITICAL`, `OUT_OF_STOCK`

**Dependencias**: `ProductRepository`, `StockRepository`, `WarehouseRepository`, `ReorderRuleRepository`, `OrganizationRepository`, `DomainEventBus`, `PrismaService`, `NotificationService`
