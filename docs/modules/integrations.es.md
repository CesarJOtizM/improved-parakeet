> [English](./integrations.md) | **[Español](./integrations.es.md)**

# Modulo de Integraciones

## Descripcion General

El Modulo de Integraciones proporciona un framework agnostico de proveedor para conectar el sistema con plataformas externas de comercio electronico. Gestiona el ciclo de vida completo de las conexiones de integracion, incluyendo almacenamiento de credenciales con encriptacion, sincronizacion bidireccional de ordenes, mapeo de SKU entre catalogos externos e internos, y seguimiento de fallos de sincronizacion con capacidades de reintento. El primer proveedor soportado es **VTEX**.

---

## Arquitectura

El modulo sigue una arquitectura por capas consistente con el resto de la aplicacion:

```
src/integrations/                          # Dominio + modulos de proveedor
  shared/                                  # Entidades compartidas, puertos, encriptacion
    domain/entities/                       # IntegrationConnection, IntegrationSyncLog, IntegrationSkuMapping
    domain/ports/                          # Interfaces de repositorio (puertos)
    encryption/                            # EncryptionService (AES-256-GCM)
  vtex/                                    # Implementacion del proveedor VTEX
    application/                           # Casos de uso especificos de VTEX
    dto/                                   # Definiciones de tipos de la API VTEX
    events/                                # Manejadores de eventos de dominio (sincronizacion de salida)
    infrastructure/                        # VtexApiClient (cliente HTTP)
    jobs/                                  # Job de polling basado en cron
    vtex.module.ts                         # Definicion del modulo NestJS
  integrations.module.ts                   # Modulo raiz de integraciones

src/application/integrationUseCases/       # Casos de uso genericos CRUD (conexiones, mapeos de SKU, reintentos)

src/interfaces/http/integrations/          # Controladores HTTP
  integrations.controller.ts               # API REST principal (autenticada)
  vtex-webhook.controller.ts               # Endpoint publico de webhook
  integrationsHttp.module.ts               # Cableado del modulo HTTP

src/infrastructure/database/repositories/  # Implementaciones de repositorios Prisma
  integrationConnection.repository.ts
  integrationSkuMapping.repository.ts
  integrationSyncLog.repository.ts
```

**Grafo de Modulos NestJS:**

- `IntegrationsModule` importa `PrismaModule`, `ContactsModule`, `InventoryModule`, `VtexModule`
- `VtexModule` importa `PrismaModule`, `ContactsModule`, `InventoryModule`, `ScheduleModule`
- `IntegrationsHttpModule` importa `AuthenticationModule`, `IntegrationsModule`, `InventoryModule`, `SalesModule`

---

## Componentes Compartidos

### Conexion de Integracion

**Entidad:** `IntegrationConnection` (`src/integrations/shared/domain/entities/integrationConnection.entity.ts`)

Representa una conexion configurada a una plataforma externa.

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `provider` | `string` | Identificador de plataforma (ej: `"VTEX"`) |
| `accountName` | `string` | Nombre de cuenta externa |
| `storeName` | `string` | Nombre visible de la tienda |
| `status` | `string` | `DISCONNECTED`, `CONNECTED`, `ERROR` |
| `syncStrategy` | `string` | `POLLING`, `WEBHOOK`, `BOTH` |
| `syncDirection` | `string` | `INBOUND_ONLY`, `OUTBOUND_ONLY`, `BIDIRECTIONAL` |
| `encryptedAppKey` | `string` | Clave API encriptada con AES-256-GCM |
| `encryptedAppToken` | `string` | Token API encriptado con AES-256-GCM |
| `webhookSecret` | `string` | UUID auto-generado para autenticacion de webhooks |
| `defaultWarehouseId` | `string` | Almacen destino para inventario sincronizado |
| `defaultContactId` | `string?` | Contacto por defecto para clientes no resueltos |
| `companyId` | `string?` | Asociacion opcional de empresa |
| `lastSyncAt` | `Date?` | Marca temporal de ultima sincronizacion exitosa |
| `lastSyncError` | `string?` | Ultimo mensaje de error |

**Metodos clave:** `connect()`, `disconnect()`, `markError(message)`, `updateLastSync()`, `updateCredentials(key, token)`, `update(props)`

**Puerto de repositorio:** `IIntegrationConnectionRepository` (`src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port.ts`)

Operaciones clave: `findByOrgId`, `findById`, `findByProviderAndAccount`, `findByProviderAndAccountGlobal`, `findAllConnectedForPolling`, `save`, `update`, `delete`

---

### Mapeo de SKU

**Entidad:** `IntegrationSkuMapping` (`src/integrations/shared/domain/entities/integrationSkuMapping.entity.ts`)

Mapea un identificador SKU externo a un ID de producto interno dentro de una conexion especifica.

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `connectionId` | `string` | Conexion padre |
| `externalSku` | `string` | SKU en plataforma externa |
| `productId` | `string` | ID de producto interno |

**Puerto de repositorio:** `IIntegrationSkuMappingRepository` (`src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.ts`)

Operaciones clave: `findByConnectionId`, `findByExternalSku`, `save`, `delete`

---

### Logs de Sincronizacion

**Entidad:** `IntegrationSyncLog` (`src/integrations/shared/domain/entities/integrationSyncLog.entity.ts`)

Registra el resultado de cada intento de sincronizacion de orden, permitiendo verificaciones de idempotencia y seguimiento de reintentos.

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `connectionId` | `string` | Conexion de origen |
| `externalOrderId` | `string` | ID de orden en plataforma externa |
| `action` | `string` | `SYNCED`, `FAILED` |
| `saleId` | `string?` | ID de venta interna si fue sincronizado |
| `contactId` | `string?` | ID de contacto resuelto |
| `errorMessage` | `string?` | Detalles de error en caso de fallo |
| `rawPayload` | `Record?` | Payload original de la orden externa |
| `processedAt` | `Date` | Marca temporal de procesamiento |

**Metodos clave:** `markSuccess(saleId, contactId?)`, `markFailed(errorMessage)`

**Puerto de repositorio:** `IIntegrationSyncLogRepository` (`src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.ts`)

Operaciones clave: `save`, `findByExternalOrderId`, `findByConnectionId` (paginado), `findFailedByConnectionId`, `update`

---

### Servicio de Encriptacion

**Archivo:** `EncryptionService` (`src/integrations/shared/encryption/encryption.service.ts`)

Proporciona encriptacion y desencriptacion simetrica para credenciales sensibles (claves y tokens API).

- **Algoritmo:** AES-256-GCM (encriptacion autenticada)
- **IV:** 12 bytes, generado aleatoriamente por operacion de encriptacion
- **Tag de autenticacion:** 16 bytes (proporciona deteccion de manipulacion)
- **Fuente de la clave:** Variable de entorno `ENCRYPTION_KEY` (cadena hexadecimal de 64 caracteres = 32 bytes)
- **Formato del texto cifrado:** `iv_hex:encrypted_hex:authTag_hex`

---

## Integracion VTEX

### Descripcion

La integracion VTEX habilita la sincronizacion bidireccional de ordenes entre el sistema y cuentas de comercio electronico VTEX. Las ordenes pueden fluir de entrada (VTEX al sistema) via polling o webhooks, y las actualizaciones de estado pueden fluir de salida (sistema a VTEX) via manejadores de eventos de dominio.

**Modulo:** `VtexModule` (`src/integrations/vtex/vtex.module.ts`)

---

### Sincronizacion de Ordenes

**Caso de uso:** `VtexSyncOrderUseCase` (`src/integrations/vtex/application/vtexSyncOrderUseCase.ts`)

Sincroniza una orden individual de VTEX al sistema interno. Es la operacion central de sincronizacion de entrada utilizada tanto por el flujo de polling como por el de webhooks.

**Flujo:**
1. Validar que la conexion existe
2. **Verificacion de idempotencia:** omitir si la orden ya fue sincronizada exitosamente
3. Desencriptar credenciales y obtener detalles de la orden desde la API VTEX
4. **Resolucion de contacto:** buscar contacto existente por email o documento, o crear uno nuevo desde `clientProfileData`
5. **Coincidencia de SKU:** resolver cada item de la orden via mapeos de SKU, luego busqueda directa por SKU del producto como respaldo
6. Registrar resultado como `SYNCED` o `FAILED`
7. Actualizar `lastSyncAt` de la conexion en caso de exito

**Nota:** Los precios de VTEX estan en centavos y se dividen entre 100 durante la sincronizacion.

---

### Manejo de Webhooks

**Controlador:** `VtexWebhookController` (`src/interfaces/http/integrations/vtex-webhook.controller.ts`)

**Endpoint:** `POST /vtex/webhook/:accountName?secret=<webhookSecret>`

Este es un **endpoint publico** (sin autenticacion JWT) que recibe notificaciones de cambio de estado de ordenes de VTEX.

**Autenticacion:** El secreto del webhook se pasa como parametro de consulta y se valida contra el `webhookSecret` almacenado de la conexion.

**Estados relevantes:** `order-completed`, `handling`, `invoiced`, `canceled`, `ready-for-handling`

**Registro de webhook:** `VtexRegisterWebhookUseCase` (`src/integrations/vtex/application/vtexRegisterWebhookUseCase.ts`) registra la URL del webhook en la plataforma VTEX via la API de configuracion de hooks de ordenes, suscribiendose al filtro de estados: `order-completed`, `handling`, `invoiced`, `canceled`.

---

### Estrategia de Polling

**Job:** `VtexPollingJob` (`src/integrations/vtex/jobs/vtexPollingJob.ts`)

**Caso de uso:** `VtexPollOrdersUseCase` (`src/integrations/vtex/application/vtexPollOrdersUseCase.ts`)

- Se ejecuta cada **10 minutos** via `@Cron(CronExpression.EVERY_10_MINUTES)`
- Consulta todas las conexiones con estado `CONNECTED` (via `findAllConnectedForPolling`)
- Construye un filtro de rango de fechas desde `lastSyncAt` hasta ahora
- Obtiene hasta 50 ordenes por conexion por ciclo de polling
- Cada orden se procesa individualmente a traves de `VtexSyncOrderUseCase`
- Los errores en conexiones individuales no bloquean otras conexiones
- Tambien puede ser activado manualmente via la API para una conexion especifica

---

### Sincronizacion de Salida

**Manejador de eventos:** `VtexOutboundSyncHandler` (`src/integrations/vtex/events/vtexOutboundSyncHandler.ts`)

**Caso de uso:** `VtexOutboundSyncUseCase` (`src/integrations/vtex/application/vtexOutboundSyncUseCase.ts`)

Escucha eventos de dominio internos y envia actualizaciones de estado de regreso a VTEX.

| Evento de Dominio | Accion VTEX | Descripcion |
|---|---|---|
| `SaleConfirmedEvent` | `START_HANDLING` | Notifica a VTEX que la orden esta siendo procesada |
| `SaleCompletedEvent` | `INVOICE` | Envia datos de factura a VTEX |
| `SaleCancelledEvent` | `CANCEL` | Cancela la orden en VTEX |

Las conexiones con `syncDirection = 'INBOUND_ONLY'` se omiten. El handler relaciona ventas internas con ordenes externas a traves de registros de sync log.

---

### Cliente API

**Archivo:** `VtexApiClient` (`src/integrations/vtex/infrastructure/vtexApiClient.ts`)

Cliente HTTP que encapsula todas las interacciones con la API OMS de VTEX usando Axios.

| Metodo | Endpoint VTEX | Descripcion |
|---|---|---|
| `ping(account, key, token)` | `GET /api/oms/pvt/orders?per_page=1` | Probar conexion |
| `getOrder(account, key, token, orderId)` | `GET /api/oms/pvt/orders/:orderId` | Obtener detalle de orden |
| `listOrders(account, key, token, params)` | `GET /api/oms/pvt/orders` | Listar ordenes con filtros |
| `registerWebhook(account, key, token, url)` | `POST /api/orders/hook/config` | Registrar webhook |
| `startHandling(account, key, token, orderId)` | `POST /api/oms/pvt/orders/:orderId/start-handling` | Iniciar manejo de orden |
| `sendInvoice(account, key, token, orderId, invoice)` | `POST /api/oms/pvt/orders/:orderId/invoice` | Enviar factura |
| `cancelOrder(account, key, token, orderId, reason)` | `POST /api/oms/pvt/orders/:orderId/cancel` | Cancelar orden |

- **URL base:** `https://{accountName}.vtexcommercestable.com.br`
- **Headers de autenticacion:** `X-VTEX-API-AppKey`, `X-VTEX-API-AppToken`
- **Timeout:** 30 segundos

**Tipos DTO:** `VtexOrderDetail`, `VtexOrderSummary`, `VtexOrderListResponse`, `VtexClientProfile`, `VtexAddress`, `VtexOrderItem`, `VtexWebhookPayload`, `VtexInvoiceData` (`src/integrations/vtex/dto/vtex-api.types.ts`)

---

## Casos de Uso

### Gestion de Conexiones

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `CreateIntegrationConnectionUseCase` | `src/application/integrationUseCases/createIntegrationConnectionUseCase.ts` | Crea una nueva conexion. Valida existencia de almacen, verifica duplicados, encripta credenciales, genera secreto de webhook. |
| `GetIntegrationConnectionsUseCase` | `src/application/integrationUseCases/getIntegrationConnectionsUseCase.ts` | Lista todas las conexiones de una organizacion, con filtros opcionales por proveedor y estado. |
| `GetIntegrationConnectionByIdUseCase` | `src/application/integrationUseCases/getIntegrationConnectionByIdUseCase.ts` | Obtiene una conexion individual por ID. |
| `UpdateIntegrationConnectionUseCase` | `src/application/integrationUseCases/updateIntegrationConnectionUseCase.ts` | Actualiza configuracion de conexion. Re-encripta credenciales si cambian. Valida nuevo almacen si se modifica. |
| `DeleteIntegrationConnectionUseCase` | `src/application/integrationUseCases/deleteIntegrationConnectionUseCase.ts` | Elimina una conexion despues de verificar que existe. |

### Mapeo de SKU

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `CreateSkuMappingUseCase` | `src/application/integrationUseCases/createSkuMappingUseCase.ts` | Crea un mapeo entre un SKU externo y un producto interno. Valida existencia de conexion y producto, verifica duplicados. |
| `GetSkuMappingsUseCase` | `src/application/integrationUseCases/getSkuMappingsUseCase.ts` | Lista todos los mapeos de SKU para una conexion especifica. |
| `DeleteSkuMappingUseCase` | `src/application/integrationUseCases/deleteSkuMappingUseCase.ts` | Elimina un mapeo de SKU especifico. |
| `GetUnmatchedSkusUseCase` | `src/application/integrationUseCases/getUnmatchedSkusUseCase.ts` | Retorna todos los logs de sincronizacion fallidos para una conexion, tipicamente causados por SKUs no coincidentes. |

### Sincronizacion y Reintentos

| Caso de Uso | Archivo | Descripcion |
|---|---|---|
| `RetrySyncUseCase` | `src/application/integrationUseCases/retrySyncUseCase.ts` | Reintenta una sincronizacion fallida individual re-ejecutando `VtexSyncOrderUseCase` con el ID de orden externo original. |
| `RetryAllFailedSyncsUseCase` | `src/application/integrationUseCases/retryAllFailedSyncsUseCase.ts` | Reintenta todas las sincronizaciones fallidas de una conexion. Retorna contadores de reintentos exitosos y fallidos. |
| `VtexTestConnectionUseCase` | `src/integrations/vtex/application/vtexTestConnectionUseCase.ts` | Hace ping a la API de VTEX para verificar que las credenciales son validas. Actualiza el estado de la conexion a `CONNECTED` o `ERROR`. |
| `VtexSyncOrderUseCase` | `src/integrations/vtex/application/vtexSyncOrderUseCase.ts` | Sincronizacion de entrada principal: obtiene una orden VTEX, resuelve contacto, coincide SKUs, crea venta, registra resultado. |
| `VtexPollOrdersUseCase` | `src/integrations/vtex/application/vtexPollOrdersUseCase.ts` | Consulta VTEX por nuevas ordenes en todas (o una especifica) integracion(es) conectada(s). |
| `VtexRegisterWebhookUseCase` | `src/integrations/vtex/application/vtexRegisterWebhookUseCase.ts` | Registra una URL de webhook en VTEX para recibir notificaciones de cambio de estado de ordenes. |
| `VtexOutboundSyncUseCase` | `src/integrations/vtex/application/vtexOutboundSyncUseCase.ts` | Envia actualizaciones de estado (inicio de manejo, factura, cancelacion) del sistema de vuelta a VTEX. |

---

## Entidades y Objetos de Valor

Todas las entidades extienden la clase base `Entity<T>` y usan el patron factory con `create()` (para nuevas instancias) y `reconstitute()` (para hidratacion desde persistencia).

| Entidad | Archivo | Tabla BD | Restriccion Unica |
|---|---|---|---|
| `IntegrationConnection` | `src/integrations/shared/domain/entities/integrationConnection.entity.ts` | `integration_connections` | `(provider, accountName, orgId)` |
| `IntegrationSyncLog` | `src/integrations/shared/domain/entities/integrationSyncLog.entity.ts` | `integration_sync_logs` | `(connectionId, externalOrderId)` |
| `IntegrationSkuMapping` | `src/integrations/shared/domain/entities/integrationSkuMapping.entity.ts` | `integration_sku_mappings` | `(connectionId, externalSku)` |

---

## Endpoints de la API

### Endpoints Autenticados

**Controlador:** `IntegrationsController` (`src/interfaces/http/integrations/integrations.controller.ts`)

**Ruta base:** `/integrations`

**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`

**Interceptores:** `AuditInterceptor`

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| `GET` | `/connections` | `INTEGRATIONS:READ` | Listar todas las conexiones (filtros opcionales `?provider=`, `?status=`) |
| `GET` | `/connections/:id` | `INTEGRATIONS:READ` | Obtener conexion por ID |
| `POST` | `/connections` | `INTEGRATIONS:CREATE` | Crear nueva conexion |
| `PUT` | `/connections/:id` | `INTEGRATIONS:UPDATE` | Actualizar una conexion |
| `DELETE` | `/connections/:id` | `INTEGRATIONS:DELETE` | Eliminar una conexion |
| `POST` | `/connections/:id/test` | `INTEGRATIONS:SYNC` | Probar credenciales de conexion |
| `POST` | `/connections/:id/sync` | `INTEGRATIONS:SYNC` | Activar sincronizacion manual (consultar todas las ordenes) |
| `POST` | `/connections/:id/sync/:orderId` | `INTEGRATIONS:SYNC` | Sincronizar una orden externa especifica |
| `POST` | `/connections/:id/register-webhook` | `INTEGRATIONS:SYNC` | Registrar webhook en VTEX |
| `GET` | `/connections/:id/sku-mappings` | `INTEGRATIONS:READ` | Listar mapeos de SKU para una conexion |
| `POST` | `/connections/:id/sku-mappings` | `INTEGRATIONS:CREATE` | Crear un mapeo de SKU |
| `DELETE` | `/connections/:id/sku-mappings/:mappingId` | `INTEGRATIONS:DELETE` | Eliminar un mapeo de SKU |
| `GET` | `/connections/:id/unmatched` | `INTEGRATIONS:READ` | Obtener logs de sincronizacion fallidos/no coincidentes |
| `POST` | `/connections/:id/retry/:syncLogId` | `INTEGRATIONS:SYNC` | Reintentar una sincronizacion fallida especifica |
| `POST` | `/connections/:id/retry-all` | `INTEGRATIONS:SYNC` | Reintentar todas las sincronizaciones fallidas de una conexion |

### Endpoint Publico

**Controlador:** `VtexWebhookController` (`src/interfaces/http/integrations/vtex-webhook.controller.ts`)

| Metodo | Ruta | Autenticacion | Descripcion |
|---|---|---|---|
| `POST` | `/vtex/webhook/:accountName?secret=<secret>` | Secreto de webhook (parametro de consulta) | Recibir notificaciones de cambio de estado de ordenes VTEX |

---

## Seguridad

### Encriptacion de Credenciales

- Las claves y tokens API **nunca se almacenan en texto plano**
- Encriptados en reposo usando **AES-256-GCM** (encriptacion autenticada con datos asociados)
- La clave de encriptacion proviene de la variable de entorno `ENCRYPTION_KEY` (debe ser una cadena hexadecimal de 64 caracteres que representa 32 bytes)
- Cada operacion de encriptacion genera un IV aleatorio unico (12 bytes), asegurando que texto plano identico produzca texto cifrado diferente
- El tag de autenticacion (16 bytes) proporciona verificacion de integridad y deteccion de manipulacion
- Las credenciales se desencriptan solo en el momento de las llamadas API, nunca se almacenan en cache

### Seguridad de Webhooks

- Cada conexion genera un `webhookSecret` unico (UUID v4) al momento de creacion
- La URL del webhook incluye el secreto como parametro de consulta: `/vtex/webhook/:accountName?secret=<webhookSecret>`
- El controlador del webhook valida el secreto contra el valor almacenado antes de procesar cualquier payload
- La busqueda de conexion usa `findByProviderAndAccountGlobal` (sin contexto de organizacion de autenticacion, ya que el endpoint es publico)

### Control de Acceso

Todos los endpoints autenticados estan protegidos por tres guards:

1. `JwtAuthGuard` -- Valida token JWT
2. `RoleBasedAuthGuard` -- Valida rol del usuario
3. `PermissionGuard` -- Valida permisos granulares via `@RequirePermissions()`

**Permisos definidos en** `SYSTEM_PERMISSIONS` (`src/shared/constants/security.constants.ts`):

| Permiso | Usado para |
|---|---|
| `INTEGRATIONS:CREATE` | Crear conexiones y mapeos de SKU |
| `INTEGRATIONS:READ` | Listar/ver conexiones, mapeos y SKUs no coincidentes |
| `INTEGRATIONS:UPDATE` | Actualizar configuracion de conexiones |
| `INTEGRATIONS:DELETE` | Eliminar conexiones y mapeos de SKU |
| `INTEGRATIONS:SYNC` | Probar conexiones, activar sincronizaciones, registrar webhooks, reintentar sincronizaciones fallidas |
