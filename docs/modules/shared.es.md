> [English](./shared.md) | **[Español](./shared.es.md)**

# Modulo Compartido

## Descripcion General

El modulo Compartido contiene preocupaciones transversales, abstracciones fundamentales y utilidades de infraestructura utilizadas en toda la aplicacion Nevada Inventory. Proporciona los bloques de construccion para Diseno Dirigido por Dominio (DDD), patrones de programacion funcional, middleware de seguridad, servicios de observabilidad y mecanismos de resiliencia.

### Estructura de Directorios

```
src/shared/
  audit/           -- Subsistema de auditoria (entidades, servicios, especificaciones, objetos de valor)
  config/          -- Configuracion de la aplicacion (cache, logging, limitacion de tasa, seguridad, validacion de env)
  constants/       -- Constantes del sistema (codigos de error, headers de seguridad, roles, permisos)
  decorators/      -- Decoradores NestJS personalizados (@OrgId, @RequirePermissions, @ApiResponse)
  domain/          -- Bloques de construccion DDD (clases base, monada Result, especificaciones, eventos)
  filters/         -- Filtro global de excepciones
  guards/          -- Guard de permisos
  infrastructure/  -- Implementaciones de cache y resiliencia
  interceptors/    -- Interceptores HTTP (auditoria, metricas, respuesta)
  middleware/      -- Middleware de seguridad
  middlewares/     -- Middleware de ID de correlacion
  ports/           -- Definiciones de interfaces (repositorios, cache, eventos, servicios externos)
  services/        -- Servicios de metricas y logging estructurado
  types/           -- Definiciones de tipos TypeScript (HTTP, respuesta API, base de datos)
  utils/           -- Funciones utilitarias (helpers funcionales, constructores de respuesta, Result-a-HTTP)
```

---

## Monada Result

La monada Result es el mecanismo principal de manejo de errores en toda la aplicacion. En lugar de lanzar excepciones, los casos de uso retornan `Result<T, DomainError>` para hacer explicitas y seguras en tipos las rutas de exito y fallo.

### Tipos Fundamentales

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

- **Archivo**: `src/shared/domain/result/result.types.ts`

### Clase Ok

**Archivo**: `src/shared/domain/result/ok.ts`

Representa un resultado exitoso. Proporciona:
- `map(fn)` - Transformar el valor de exito
- `flatMap(fn)` - Encadenar operaciones que retornan Result
- `unwrap()` - Extraer valor (lanza si es Err)
- `unwrapOr(default)` - Extraer valor con valor por defecto
- `match(onOk, onErr)` - Coincidencia de patrones sobre el resultado

### Clase Err

**Archivo**: `src/shared/domain/result/err.ts`

Representa un resultado fallido. Proporciona la misma API que `Ok` pero con semantica de ruta de error:
- `map()` - Sin operacion, propaga el error
- `mapErr(fn)` - Transformar el valor del error
- `unwrapErr()` - Extraer el error
- `match(onOk, onErr)` - Ejecuta la rama `onErr`

### Funciones Factoria

```typescript
ok(value)   // Crea Ok<T, E>
err(error)  // Crea Err<T, E>
```

### Utilidades Result

**Archivo**: `src/shared/domain/result/resultUtils.ts`

- `fromPromise(promise)` - Convierte una Promise a `Result<T, Error>`
- `fromThrowable(fn, errorMapper?)` - Envuelve una funcion que puede lanzar en un Result
- `combine(results)` - Combina multiples Results en uno (falla en el primer error)

### Puente Result-a-HTTP

**Archivo**: `src/shared/utils/resultToHttp.ts`

- `resultToHttpResponse(result)` - Extrae el valor de Ok o lanza la `HttpException` apropiada de NestJS con mapeo correcto de codigo de estado

---

## Errores de Dominio

**Archivo**: `src/shared/domain/result/domainError.ts`

Una jerarquia de errores tipados usados como tipo `E` en `Result<T, E>`:

| Clase de Error | Estado HTTP | Codigo por Defecto | Descripcion |
|---|---|---|---|
| `DomainError` | - | - | Clase base abstracta |
| `ValidationError` | 400 | `VALIDATION_ERROR` | Fallos de validacion de entrada |
| `NotFoundError` | 404 | `NOT_FOUND` | Entidad no encontrada |
| `ConflictError` | 409 | `CONFLICT` | Datos duplicados o en conflicto |
| `BusinessRuleError` | 400 | `BUSINESS_RULE_VIOLATION` | Violaciones de logica de negocio |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` | Fallos de autenticacion (mensaje generico por seguridad) |
| `TokenError` | 401 | `TOKEN_ERROR` | Fallos de token (mensaje generico por seguridad) |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` | Demasiadas solicitudes |
| `InsufficientStockError` | 400 | `INSUFFICIENT_STOCK` | Stock por debajo de la cantidad solicitada |
| `StockNotFoundError` | 404 | `STOCK_NOT_FOUND` | No existe registro de stock |

### Codigos de Error

**Archivo**: `src/shared/constants/error-codes.ts`

Constantes centralizadas de codigos de error siguiendo la convencion `MODULE_ACTION` o `MODULE_ENTITY_REASON` en `UPPER_SNAKE_CASE`. Mas de 100 codigos de error organizados por modulo: Auth, Users, Roles, Products, Categories, Warehouses, Stock, Movements, Transfers, Sales, Returns, Reports, Companies, Organizations, Imports, Dashboard, Audit, Reorder Rules.

---

## Patron de Especificaciones

El Patron de Especificacion encapsula reglas de negocio como objetos componibles y reutilizables que pueden combinarse con logica booleana.

### Interfaz

**Archivo**: `src/shared/domain/specifications/iSpecification.port.ts`

```typescript
interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean;
  and(spec: ISpecification<T>): ISpecification<T>;
  or(spec: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}
```

### Implementacion Base

**Archivo**: `src/shared/domain/specifications/baseSpecification.ts`

`BaseSpecification<T>` proporciona implementaciones por defecto de `and()`, `or()`, `not()` usando clases compuestas: `AndSpecification`, `OrSpecification`, `NotSpecification`.

### Especificaciones Prisma

**Archivo**: `src/shared/domain/specifications/prismaSpecification.base.ts`

`PrismaSpecification<T>` extiende `BaseSpecification<T>` con un metodo `toPrismaWhere(orgId): PrismaWhereInput` que convierte especificaciones a clausulas where compatibles con Prisma. Las clases compuestas (`PrismaAndSpecification`, `PrismaOrSpecification`, `PrismaNotSpecification`) componen correctamente condiciones `AND`, `OR`, `NOT` de Prisma.

---

## Eventos de Dominio

El sistema de eventos de dominio permite acoplamiento debil entre agregados y efectos secundarios (notificaciones, registro de auditoria, actualizaciones de stock).

### Base DomainEvent

**Archivo**: `src/shared/domain/events/domainEvent.base.ts`

Clase base abstracta con `eventName`, `occurredOn` y un mecanismo `markForDispatch()` para controlar cuando se publican los eventos.

### DomainEventBus

**Archivo**: `src/shared/domain/events/domainEventBus.service.ts`

Bus de eventos en memoria que soporta:
- `registerHandler(eventType, handler)` - Registrar handlers para tipos de eventos
- `publish(event)` - Publicar a todos los handlers registrados (ejecucion paralela, aislamiento de errores)
- `publishAll(events)` - Publicar multiples eventos

### DomainEventDispatcher

**Archivo**: `src/shared/domain/events/domainEventDispatcher.service.ts`

Orquesta el despacho de eventos desde aggregate roots:
- `dispatchEvents(events)` - Despacha solo eventos marcados para despacho
- `markAndDispatch(events)` - Marca todos los eventos y los despacha

### EventIdempotencyService

**Archivo**: `src/shared/domain/events/eventIdempotency.service.ts`

Asegura que los handlers procesen eventos como maximo una vez usando una tabla de base de datos `processedEvent`:
- `tryMarkAsProcessed(eventType, eventId, orgId)` - Retorna `true` la primera vez, `false` en duplicados
- `isProcessed()` - Verificar si ya fue procesado
- `cleanupOldRecords(olderThanDays)` - Limpieza periodica de registros antiguos

### Interfaz de Handler de Eventos

**Archivo**: `src/shared/ports/events/iDomainEventHandler.port.ts`

```typescript
interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}
```

---

## Guards y Decoradores

### Guard de Permisos

**Archivo**: `src/shared/guards/permission.guard.ts`

`PermissionGuard` aplica control de acceso basado en permisos:
- Lee permisos requeridos de los metadatos de la ruta (establecidos por decoradores)
- Otorga acceso automatico a roles `ADMIN` y `SYSTEM_ADMIN`
- Soporta modos `ALL` (todos los permisos requeridos) y `ANY` (al menos uno)

### Decoradores

**Archivo**: `src/shared/decorators/requirePermissions.decorator.ts`

| Decorador | Descripcion |
|---|---|
| `@RequirePermissions(...perms)` | Requerir todos los permisos especificados |
| `@RequireAnyPermission(...perms)` | Requerir al menos un permiso |
| `@RequireAllPermissions(...perms)` | Requerir explicitamente todos los permisos |
| `@RequireRoles(...roles)` | Requerir roles especificos |
| `@RequireOrganization()` | Requerir pertenencia a una organizacion |
| `@RequireWarehouseAccess()` | Requerir acceso a bodega |

**Archivo**: `src/shared/decorators/orgId.decorator.ts`

| Decorador | Descripcion |
|---|---|
| `@OrgId()` | Decorador de parametro que extrae el ID de organizacion de la solicitud |

**Archivo**: `src/shared/decorators/apiResponse.decorator.ts`

| Decorador | Descripcion |
|---|---|
| `@ApiSuccessResponse(model)` | Envoltorio de respuesta exitosa Swagger |
| `@ApiErrorResponses(...codes)` | Respuestas de error Swagger |
| `@ApiStandardResponses(model)` | Respuestas combinadas de exito + errores estandar |

---

## Interceptores

### AuditInterceptor

**Archivo**: `src/shared/interceptors/audit.interceptor.ts`

Registra automaticamente cada solicitud HTTP en el sistema de auditoria:
- Captura metodo, URL, usuario, organizacion, IP, user agent
- Registra exito/fallo con duracion
- Redacta campos sensibles (`password`, `token`, `otp`, etc.)

### MetricsInterceptor

**Archivo**: `src/shared/interceptors/metrics.interceptor.ts`

Registra metricas de solicitudes HTTP:
- Duracion de solicitud (histograma)
- Conteo de solicitudes por metodo, ruta, codigo de estado (contador)

### ResponseInterceptor

**Archivo**: `src/shared/interceptors/responseInterceptor.ts`

Normaliza todas las respuestas exitosas en un formato de envoltorio consistente:

```json
{ "success": true, "message": "...", "data": { ... }, "timestamp": "..." }
```

---

## Middleware

### SecurityMiddleware

**Archivo**: `src/shared/middleware/securityMiddleware.ts`

Aplica headers de seguridad estandar a todas las respuestas:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Request-ID` (generado por solicitud)
- `X-Response-Time` (timestamp)

### CorrelationIdMiddleware

**Archivo**: `src/shared/middlewares/correlationId.middleware.ts`

Agrega soporte de trazabilidad distribuida:
- Extrae el header `X-Correlation-ID` si esta presente, de lo contrario genera un UUID
- Lo adjunta a `req.correlationId` y lo refleja en el header de respuesta
- Disponible en el contexto del logger estructurado para trazabilidad de solicitudes de extremo a extremo

### GlobalExceptionFilter

**Archivo**: `src/shared/filters/globalExceptionFilter.ts`

Captura todas las excepciones no manejadas y retorna una respuesta de error estandarizada. Se integra con Sentry para seguimiento de errores en produccion. Mapea detalles de `HttpException` (message, errorCode, details) al cuerpo de la respuesta.

---

## Constantes

### Constantes de Seguridad

**Archivo**: `src/shared/constants/security.constants.ts`

- `SYSTEM_ROLES` - Nombres de roles predefinidos: `SYSTEM_ADMIN`, `ADMIN`, `SUPERVISOR`, `WAREHOUSE_OPERATOR`, `CONSULTANT`, `IMPORT_OPERATOR`, `SALES_PERSON`
- `SYSTEM_PERMISSIONS` - Mas de 50 permisos granulares organizados por modulo (Users, Roles, Organizations, Warehouses, Products, Inventory, Sales, Returns, Reports, Audit, Companies, Contacts, Settings, Integrations)
- `SECURITY_HEADERS` - Headers de seguridad HTTP estandar
- `SECURITY_CONFIG` - Configuracion de CORS, politica de contrasenas, sesion

### Configuracion

| Archivo | Descripcion |
|---|---|
| `src/shared/config/env.validation.ts` | Validacion tipada de variables de entorno con `class-validator`, aplicacion de requisitos especificos para produccion |
| `src/shared/config/cache.config.ts` | Configuracion de TTL y almacen de cache |
| `src/shared/config/logging.config.ts` | Configuracion de nivel y formato de logging |
| `src/shared/config/rateLimit.config.ts` | Umbrales de limitacion de tasa |
| `src/shared/config/security.config.ts` | Configuracion relacionada con seguridad |
| `src/shared/config/validation.config.ts` | Configuracion del pipeline de validacion |

---

## Utilidades

### Utilidades de Programacion Funcional

| Archivo | Exportacion | Descripcion |
|---|---|---|
| `src/shared/utils/functional/pipe.ts` | `pipe(f, g, h)` | Composicion de funciones de izquierda a derecha: `h(g(f(x)))` |
| `src/shared/utils/functional/compose.ts` | `compose(f, g, h)` | Composicion de funciones de derecha a izquierda: `f(g(h(x)))` |
| `src/shared/utils/functional/curry.ts` | `curry` | Utilidad de currying de funciones |
| `src/shared/utils/functional/helpers.ts` | Varios | Helpers funcionales generales |

### Utilidades de Respuesta

**Archivo**: `src/shared/utils/responseUtils.ts`

- `createSuccessResponse(message, data)` - Envoltorio de exito estandar
- `createErrorResponse(message, statusCode, path, method, errorCode, details)` - Envoltorio de error estandar

### Servicios

| Archivo | Clase | Descripcion |
|---|---|---|
| `src/shared/services/metrics.service.ts` | `MetricsService` | Coleccion de metricas en memoria (contadores, histogramas, gauges) con formato de exportacion listo para Prometheus. Registra duraciones de solicitudes HTTP y consultas a base de datos. |
| `src/shared/services/structuredLogger.service.ts` | `StructuredLoggerService` | Logging JSON estructurado con ID de correlacion, contexto de usuario y metadatos de solicitud. Implementa `LoggerService` de NestJS. |

### Infraestructura de Cache

| Archivo | Descripcion |
|---|---|
| `src/shared/infrastructure/cache/functionalCache.service.ts` | `FunctionalCacheService` implementando `ICacheService` con retornos de monada Result. Soporta `get`, `set`, `delete`, `exists`, `getMany`, `setMany`, `deleteMany`, `clear`. |
| `src/shared/infrastructure/cache/cacheDecorators.ts` | Utilidades de decoradores de cache |
| `src/shared/infrastructure/cache/cacheHelpers.ts` | Helpers de generacion de claves de cache |
| `src/shared/infrastructure/cache/cache.factory.ts` | Factoria de proveedor de cache |

### Interfaces de Puerto

| Archivo | Interfaz | Descripcion |
|---|---|---|
| `src/shared/ports/repositories/iReadRepository.port.ts` | `IReadRepository<T>` | Contrato de repositorio de solo lectura |
| `src/shared/ports/repositories/iWriteRepository.port.ts` | `IWriteRepository<T>` | Contrato de repositorio de escritura |
| `src/shared/ports/repositories/iRepository.port.ts` | `IRepository<T>` | Contrato combinado lectura/escritura |
| `src/shared/ports/cache/iCacheService.port.ts` | `ICacheService` | Contrato de servicio de cache |
| `src/shared/ports/events/` | `IDomainEventDispatcher`, `IDomainEventHandler` | Contratos del sistema de eventos |
| `src/shared/ports/externalServices/` | `IEmailService`, `INotificationService`, `IDocumentGenerationService`, `IFileParsingService`, `IExcelGenerationService` | Contratos de servicios externos |

### Clases Base DDD

| Archivo | Clase | Descripcion |
|---|---|---|
| `src/shared/domain/base/entity.base.ts` | `Entity<T>` | Entidad base con `id` (CUID2), `orgId`, `createdAt`, `updatedAt`, igualdad por ID + orgId |
| `src/shared/domain/base/aggregateRoot.base.ts` | `AggregateRoot<T>` | Extiende Entity con coleccion de eventos de dominio (`addDomainEvent`, `clearEvents`, `markEventsForDispatch`) |
| `src/shared/domain/base/valueObject.base.ts` | `ValueObject<T>` | Objeto de valor inmutable con igualdad estructural (`equals()`) y `getValue()` |
