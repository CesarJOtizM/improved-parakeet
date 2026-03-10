> [English](./integrations.md) | **[Español](./integrations.es.md)**

# Modulo de Integraciones

## Tabla de Contenidos

- [Vision General](#vision-general)
- [Arquitectura](#arquitectura)
- [Estructura del Modulo](#estructura-del-modulo)
- [Entidades de Dominio](#entidades-de-dominio)
- [Encriptacion de Credenciales](#encriptacion-de-credenciales)
- [API Endpoints](#api-endpoints)
- [Casos de Uso](#casos-de-uso)
- [Flujo de Sincronizacion Inbound (VTEX a Nevada)](#flujo-de-sincronizacion-inbound-vtex-a-nevada)
- [Flujo de Sincronizacion Outbound (Nevada a VTEX)](#flujo-de-sincronizacion-outbound-nevada-a-vtex)
- [Webhook](#webhook)
- [Polling Job](#polling-job)
- [Testing](#testing)

---

## Vision General

El modulo de integraciones permite la **sincronizacion bidireccional** entre Nevada Inventory System y plataformas de e-commerce externas. Su diseno es extensible: actualmente soporta **VTEX** como proveedor, con la arquitectura preparada para incorporar **MercadoLibre** u otros en el futuro.

### Proposito

- Importar ordenes de VTEX como ventas en Nevada (inbound sync)
- Reflejar cambios de estado de ventas de Nevada hacia VTEX (outbound sync)
- Resolver y crear contactos automaticamente a partir de datos del comprador
- Mapear SKUs entre la plataforma externa y el catalogo interno de productos

### Feature Gate

El modulo esta protegido por un **feature flag** a nivel de organizacion:

```
Organization.settings.integrationsEnabled = true
```

Si el flag esta desactivado, las paginas de integraciones no aparecen en el sidebar del frontend y los endpoints retornan 403.

### Proveedores Soportados

| Proveedor | Estado | Descripcion |
|-----------|--------|-------------|
| **VTEX** | Implementado | E-commerce (OMS API v2) |
| **MercadoLibre** | Planificado | Marketplace (API REST) |

---

## Arquitectura

### Diagrama de Capas

```
┌───────────────────────────────────────────────────────────────────────┐
│                  INTERFACE (HTTP Layer)                                │
│  IntegrationsController (auth + guards)                               │
│  VtexWebhookController (publico, sin TenantMiddleware)                │
├───────────────────────────────────────────────────────────────────────┤
│                  APPLICATION (Use Cases)                               │
│  Shared: CRUD Connection, SkuMapping, Retry, GetUnmatched             │
│  VTEX:   TestConnection, SyncOrder, PollOrders,                       │
│          RegisterWebhook, OutboundSync                                │
├───────────────────────────────────────────────────────────────────────┤
│                    DOMAIN (Core)                                      │
│  Entities: IntegrationConnection, IntegrationSyncLog,                 │
│            IntegrationSkuMapping                                      │
│  Ports:    IIntegrationConnectionRepository,                          │
│            IIntegrationSyncLogRepository,                             │
│            IIntegrationSkuMappingRepository                           │
├───────────────────────────────────────────────────────────────────────┤
│                 INFRASTRUCTURE (Adapters)                              │
│  PrismaIntegrationConnectionRepository                                │
│  PrismaIntegrationSyncLogRepository                                   │
│  PrismaIntegrationSkuMappingRepository                                │
│  VtexApiClient (Axios → VTEX OMS API)                                 │
│  EncryptionService (AES-256-GCM)                                      │
└───────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos: Inbound (VTEX a Nevada)

```
VTEX (orden nueva/actualizada)
  ├─→ Webhook: POST /vtex/webhook/:accountName?secret=...
  │     ↓
  │   VtexWebhookController
  │     ↓ (busca connection por accountName, valida secret)
  │   VtexSyncOrderUseCase.execute()
  │     ↓
  │   1. Idempotency check (busca SyncLog existente para el externalOrderId)
  │   2. Decrypt credenciales (EncryptionService)
  │   3. Fetch order detail (VtexApiClient.getOrder)
  │   4. Resolve contact (4 niveles de fallback)
  │   5. Match SKUs (mapping manual + auto-match por SKU + fallback)
  │   6. Crear venta en Nevada
  │   7. Guardar SyncLog (SYNCED o FAILED)
  │   8. Actualizar lastSyncAt en connection
  │
  └─→ Polling: VtexPollingJob (cron cada 10 min)
        ↓
      VtexPollOrdersUseCase.execute()
        ↓
      Para cada conexion CONNECTED con syncStrategy POLLING o BOTH:
        1. Decrypt credenciales
        2. VtexApiClient.listOrders (filtro fecha: lastSyncAt → now)
        3. Para cada orden: VtexSyncOrderUseCase.execute()
```

### Flujo de Datos: Outbound (Nevada a VTEX)

```
Nevada (cambio de estado de venta)
  ↓
SaleConfirmedEvent / SaleCompletedEvent / SaleCancelledEvent
  ↓
VtexOutboundSyncHandler.handle(event)
  ↓
Para cada conexion CONNECTED con syncDirection != INBOUND_ONLY:
  1. Buscar SyncLog que referencia el saleId
  2. Si existe → VtexOutboundSyncUseCase.execute()
       ↓
     Segun action:
       START_HANDLING → vtexApiClient.startHandling()
       INVOICE        → vtexApiClient.sendInvoice()
       CANCEL         → vtexApiClient.cancelOrder()
```

### Anti-Loop Guard

Para evitar loops infinitos entre inbound y outbound sync:

- Cuando una venta se crea via inbound sync (VTEX → Nevada), el flag `skipOutbound` se establece en el SyncLog
- El `VtexOutboundSyncHandler` verifica este flag antes de disparar la sincronizacion inversa
- La guardia de direccion (`syncDirection`) en la entidad `IntegrationConnection` tambien previene loops:
  - `INBOUND` → Solo VTEX a Nevada
  - `OUTBOUND` → Solo Nevada a VTEX
  - `BIDIRECTIONAL` → Ambas direcciones (con anti-loop guard)

---

## Estructura del Modulo

```
src/integrations/
├── integrations.module.ts              # Modulo principal: DI, imports, exports
│
├── shared/                             # Componentes compartidos (provider-agnostic)
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── integrationConnection.entity.ts    # Conexion a plataforma externa
│   │   │   ├── integrationSyncLog.entity.ts       # Log de cada sincronizacion
│   │   │   └── integrationSkuMapping.entity.ts    # Mapeo SKU externo ↔ productId
│   │   └── ports/
│   │       ├── iIntegrationConnectionRepository.port.ts
│   │       ├── iIntegrationSyncLogRepository.port.ts
│   │       └── iIntegrationSkuMappingRepository.port.ts
│   └── encryption/
│       └── encryption.service.ts                   # AES-256-GCM encrypt/decrypt
│
└── vtex/                               # Provider-specific: VTEX
    ├── vtex.module.ts                  # Modulo VTEX: use cases, jobs, handlers
    ├── application/
    │   ├── vtexTestConnectionUseCase.ts        # Probar conexion (ping)
    │   ├── vtexSyncOrderUseCase.ts             # Sincronizar una orden individual
    │   ├── vtexPollOrdersUseCase.ts            # Polling de ordenes
    │   ├── vtexRegisterWebhookUseCase.ts       # Registrar webhook en VTEX
    │   └── vtexOutboundSyncUseCase.ts          # Sync saliente (Nevada → VTEX)
    ├── dto/
    │   └── vtex-api.types.ts                   # Tipos de la API de VTEX
    ├── events/
    │   └── vtexOutboundSyncHandler.ts          # Handler de domain events
    ├── infrastructure/
    │   └── vtexApiClient.ts                    # Cliente HTTP para VTEX OMS API
    └── jobs/
        └── vtexPollingJob.ts                   # Cron job (cada 10 minutos)

src/application/integrationUseCases/     # Use cases compartidos (CRUD)
├── createIntegrationConnectionUseCase.ts
├── getIntegrationConnectionsUseCase.ts
├── getIntegrationConnectionByIdUseCase.ts
├── updateIntegrationConnectionUseCase.ts
├── deleteIntegrationConnectionUseCase.ts
├── createSkuMappingUseCase.ts
├── deleteSkuMappingUseCase.ts
├── getSkuMappingsUseCase.ts
├── getUnmatchedSkusUseCase.ts
├── retrySyncUseCase.ts
└── retryAllFailedSyncsUseCase.ts

src/interfaces/http/integrations/        # Controllers HTTP
├── integrationsHttp.module.ts           # Modulo HTTP (importa IntegrationsModule)
├── integrations.controller.ts           # Endpoints autenticados (guards)
└── vtex-webhook.controller.ts           # Endpoint publico (sin guards)

src/infrastructure/database/repositories/ # Repositorios Prisma
├── integrationConnection.repository.ts
├── integrationSyncLog.repository.ts
└── integrationSkuMapping.repository.ts
```

---

## Entidades de Dominio

### IntegrationConnection

Representa una conexion activa con una plataforma e-commerce.

```typescript
interface IIntegrationConnectionProps {
  provider: string;            // 'VTEX' | 'MERCADOLIBRE' (extensible)
  accountName: string;         // Nombre de cuenta en la plataforma (e.g., 'mi-tienda')
  storeName: string;           // Nombre legible de la tienda
  status: string;              // CONNECTED | DISCONNECTED | ERROR
  syncStrategy: string;        // WEBHOOK | POLLING | BOTH
  syncDirection: string;       // INBOUND | OUTBOUND | BIDIRECTIONAL
  encryptedAppKey: string;     // Credencial encriptada (AES-256-GCM)
  encryptedAppToken: string;   // Credencial encriptada (AES-256-GCM)
  webhookSecret: string;       // Secret para validar webhooks entrantes
  defaultWarehouseId: string;  // Bodega por defecto para ventas sincronizadas
  defaultContactId?: string;   // Contacto fallback si no se resuelve el comprador
  connectedAt?: Date;          // Fecha de ultima conexion exitosa
  lastSyncAt?: Date;           // Fecha de ultima sincronizacion
  lastSyncError?: string;      // Ultimo error de sincronizacion
  companyId?: string;          // Company ID (multi-company)
  createdBy: string;           // ID del usuario que creo la conexion
}
```

**Transiciones de estado:**

```
                 connect()
DISCONNECTED ─────────────→ CONNECTED
     ↑                         │
     │     disconnect()        │ markError()
     │←────────────────────    │
     │                    ↓    ↓
     │                    ERROR
     │                      │
     └──────────────────────┘
           connect()
```

**Metodos de dominio:**

| Metodo | Efecto |
|--------|--------|
| `connect()` | Estado → CONNECTED, registra `connectedAt`, limpia `lastSyncError` |
| `disconnect()` | Estado → DISCONNECTED |
| `markError(message)` | Estado → ERROR, registra `lastSyncError` |
| `updateLastSync()` | Actualiza `lastSyncAt`, limpia `lastSyncError` |
| `updateCredentials(key, token)` | Actualiza credenciales encriptadas |
| `update(props)` | Actualiza campos editables (storeName, syncStrategy, etc.) |

### IntegrationSyncLog

Registra cada intento de sincronizacion de una orden externa.

```typescript
interface IIntegrationSyncLogProps {
  connectionId: string;                  // FK a IntegrationConnection
  externalOrderId: string;               // ID de la orden en la plataforma externa
  action: string;                        // SYNCED | FAILED | ALREADY_SYNCED
  saleId?: string;                       // FK a Sale (si sync exitoso)
  contactId?: string;                    // FK a Contact (si se resolvio/creo)
  errorMessage?: string;                 // Detalle del error (si FAILED)
  rawPayload?: Record<string, unknown>;  // Payload original de la orden
  processedAt: Date;                     // Timestamp del procesamiento
}
```

**Metodos de dominio:**

| Metodo | Efecto |
|--------|--------|
| `markSuccess(saleId, contactId?)` | action → SYNCED, asigna saleId, limpia error |
| `markFailed(errorMessage)` | action → FAILED, registra mensaje de error |

### IntegrationSkuMapping

Mapeo manual entre un SKU de la plataforma externa y un producto de Nevada.

```typescript
interface IIntegrationSkuMappingProps {
  connectionId: string;   // FK a IntegrationConnection
  externalSku: string;    // SKU en la plataforma externa (e.g., refId de VTEX)
  productId: string;      // FK a Product en Nevada
}
```

**Unicidad**: `(connectionId, externalSku)` — un SKU externo solo puede mapearse una vez por conexion.

---

## Encriptacion de Credenciales

Las credenciales de API (appKey, appToken) se almacenan encriptadas en la base de datos. Nunca se retornan al frontend.

### Algoritmo

- **AES-256-GCM** (authenticated encryption)
- IV (Initialization Vector): 12 bytes aleatorios
- Auth Tag: 16 bytes

### Variable de Entorno

```bash
# ENCRYPTION_KEY: String hexadecimal de 64 caracteres (32 bytes)
ENCRYPTION_KEY=a1b2c3d4e5f6...  # 64 hex chars
```

### Formato Almacenado

```
{iv_hex}:{ciphertext_hex}:{authTag_hex}
```

Ejemplo: `0a1b2c3d4e5f6a7b8c9d0e1f:abcdef1234567890:fedcba9876543210`

### Flujo de Encriptacion

```
1. Frontend envia appKey y appToken en plaintext via HTTPS
   POST /integrations/connections { appKey: "vtexappkey-...", appToken: "ABCDE..." }
     ↓
2. CreateIntegrationConnectionUseCase recibe el DTO
     ↓
3. EncryptionService.encrypt(appKey) → iv:ciphertext:authTag
   EncryptionService.encrypt(appToken) → iv:ciphertext:authTag
     ↓
4. Se almacena en BD como encryptedAppKey y encryptedAppToken
     ↓
5. Al necesitar las credenciales (sync, test, poll):
   EncryptionService.decrypt(encryptedAppKey) → appKey plaintext
```

### Seguridad

- Las credenciales **nunca** se retornan al frontend (no estan en el mapper de respuesta)
- Se transmiten via HTTPS (TLS)
- AES-256-GCM provee tanto confidencialidad como integridad (auth tag)
- Cada encriptacion usa un IV aleatorio diferente

---

## API Endpoints

Todos los endpoints (excepto el webhook) requieren autenticacion JWT y los headers estandar (`Authorization`, `X-Organization-Slug`).

### Endpoints del IntegrationsController

Ruta base: `/integrations/connections`

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `GET` | `/integrations/connections` | `INTEGRATIONS:READ` | Listar conexiones (filtros: provider, status) |
| `GET` | `/integrations/connections/:id` | `INTEGRATIONS:READ` | Obtener conexion por ID |
| `POST` | `/integrations/connections` | `INTEGRATIONS:CREATE` | Crear nueva conexion |
| `PUT` | `/integrations/connections/:id` | `INTEGRATIONS:UPDATE` | Actualizar conexion |
| `DELETE` | `/integrations/connections/:id` | `INTEGRATIONS:DELETE` | Eliminar conexion |
| `POST` | `/integrations/connections/:id/test` | `INTEGRATIONS:SYNC` | Probar conexion (ping a VTEX) |
| `POST` | `/integrations/connections/:id/sync` | `INTEGRATIONS:SYNC` | Disparar sincronizacion manual (polling) |
| `POST` | `/integrations/connections/:id/sync/:orderId` | `INTEGRATIONS:SYNC` | Sincronizar una orden especifica |
| `POST` | `/integrations/connections/:id/register-webhook` | `INTEGRATIONS:SYNC` | Registrar webhook en VTEX |
| `GET` | `/integrations/connections/:id/sku-mappings` | `INTEGRATIONS:READ` | Listar mapeos de SKU |
| `POST` | `/integrations/connections/:id/sku-mappings` | `INTEGRATIONS:CREATE` | Crear mapeo de SKU |
| `DELETE` | `/integrations/connections/:id/sku-mappings/:mappingId` | `INTEGRATIONS:DELETE` | Eliminar mapeo de SKU |
| `GET` | `/integrations/connections/:id/unmatched` | `INTEGRATIONS:READ` | Listar SKUs sin mapear / syncs fallidos |
| `POST` | `/integrations/connections/:id/retry/:syncLogId` | `INTEGRATIONS:SYNC` | Reintentar sync individual |
| `POST` | `/integrations/connections/:id/retry-all` | `INTEGRATIONS:SYNC` | Reintentar todos los syncs fallidos |

### Endpoint del VtexWebhookController

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| `POST` | `/vtex/webhook/:accountName` | Publico | Webhook de VTEX (valida secret via query param) |

### Formato de Respuesta

Todas las respuestas siguen el formato estandar:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### Ejemplo: Crear Conexion

**Request**:
```json
POST /integrations/connections
{
  "provider": "VTEX",
  "accountName": "mi-tienda",
  "storeName": "Mi Tienda VTEX",
  "appKey": "vtexappkey-mi-tienda-ABCDEF",
  "appToken": "GHIJKLMNOPQRSTUVWXYZ...",
  "syncStrategy": "BOTH",
  "syncDirection": "BIDIRECTIONAL",
  "defaultWarehouseId": "clxyz...",
  "defaultContactId": "clabc...",
  "companyId": "cldef..."
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Connection created successfully",
  "data": {
    "id": "clnew...",
    "provider": "VTEX",
    "accountName": "mi-tienda",
    "storeName": "Mi Tienda VTEX",
    "status": "DISCONNECTED",
    "syncStrategy": "BOTH",
    "syncDirection": "BIDIRECTIONAL",
    "defaultWarehouseId": "clxyz...",
    "defaultContactId": "clabc...",
    "connectedAt": null,
    "lastSyncAt": null,
    "createdAt": "2026-03-08T12:00:00.000Z"
  },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

> **Nota**: `encryptedAppKey` y `encryptedAppToken` nunca se incluyen en las respuestas.

---

## Casos de Uso

### CRUD de Conexiones (shared)

| Use Case | Archivo | Descripcion |
|----------|---------|-------------|
| `CreateIntegrationConnectionUseCase` | `createIntegrationConnectionUseCase.ts` | Encripta credenciales, verifica unicidad por provider+accountName+orgId, crea conexion |
| `GetIntegrationConnectionsUseCase` | `getIntegrationConnectionsUseCase.ts` | Lista conexiones filtradas por provider y/o status |
| `GetIntegrationConnectionByIdUseCase` | `getIntegrationConnectionByIdUseCase.ts` | Obtiene conexion por ID |
| `UpdateIntegrationConnectionUseCase` | `updateIntegrationConnectionUseCase.ts` | Actualiza campos editables, re-encripta credenciales si se envian nuevas |
| `DeleteIntegrationConnectionUseCase` | `deleteIntegrationConnectionUseCase.ts` | Elimina conexion y datos asociados |

### SKU Mappings (shared)

| Use Case | Archivo | Descripcion |
|----------|---------|-------------|
| `CreateSkuMappingUseCase` | `createSkuMappingUseCase.ts` | Crea mapeo externalSku ↔ productId, verifica que el producto existe |
| `GetSkuMappingsUseCase` | `getSkuMappingsUseCase.ts` | Lista mapeos de una conexion |
| `DeleteSkuMappingUseCase` | `deleteSkuMappingUseCase.ts` | Elimina un mapeo |

### Sync / Retry (shared)

| Use Case | Archivo | Descripcion |
|----------|---------|-------------|
| `GetUnmatchedSkusUseCase` | `getUnmatchedSkusUseCase.ts` | Lista logs con action FAILED para una conexion |
| `RetrySyncUseCase` | `retrySyncUseCase.ts` | Reintenta un sync fallido individual (re-ejecuta VtexSyncOrderUseCase) |
| `RetryAllFailedSyncsUseCase` | `retryAllFailedSyncsUseCase.ts` | Reintenta todos los syncs fallidos de una conexion |

### VTEX-Specific

| Use Case | Archivo | Descripcion |
|----------|---------|-------------|
| `VtexTestConnectionUseCase` | `vtexTestConnectionUseCase.ts` | Desencripta credenciales, hace ping a VTEX OMS API, actualiza status |
| `VtexSyncOrderUseCase` | `vtexSyncOrderUseCase.ts` | Sincroniza una orden individual: fetch, resolve contact, match SKUs, crear venta |
| `VtexPollOrdersUseCase` | `vtexPollOrdersUseCase.ts` | Consulta ordenes nuevas de VTEX (filtro por fecha) y sincroniza cada una |
| `VtexRegisterWebhookUseCase` | `vtexRegisterWebhookUseCase.ts` | Registra webhook en la configuracion de VTEX (POST /api/orders/hook/config) |
| `VtexOutboundSyncUseCase` | `vtexOutboundSyncUseCase.ts` | Refleja cambios de estado de Nevada en VTEX (start-handling, invoice, cancel) |

---

## Flujo de Sincronizacion Inbound (VTEX a Nevada)

### Estados Relevantes de VTEX

```
payment-approved → ready-for-handling → handling → invoiced
                                                      ↓
                                                  canceled
```

El webhook procesa estos estados:

| Estado VTEX | Accion en Nevada |
|-------------|------------------|
| `ready-for-handling` | Crear venta (DRAFT → CONFIRMED) |
| `handling` | Actualizar estado a picking |
| `invoiced` | Completar venta |
| `order-completed` | Completar venta |
| `canceled` | Cancelar venta |

### Resolucion de Contacto (4 niveles de fallback)

Cuando se sincroniza una orden de VTEX, el sistema intenta resolver el contacto del comprador:

```
1. Buscar contacto existente por email (clientProfileData.email)
   ↓ (si no se encuentra)
2. Buscar contacto existente por documento/identificacion (clientProfileData.document)
   ↓ (si no se encuentra)
3. Crear nuevo contacto automaticamente con los datos del perfil VTEX:
   - name: corporateName (si isCorporate) o firstName + lastName
   - identification: document || email || "vtex-{timestamp}"
   - type: CUSTOMER
   - email, phone, address (del shippingData)
   ↓ (si falla la creacion)
4. Usar defaultContactId de la conexion (fallback final)
```

### Matcheo de SKU

Para cada item de la orden VTEX:

```
1. Obtener refId del item (o id si refId no existe)
   ↓
2. Buscar en IntegrationSkuMapping por (connectionId, externalSku = refId)
   ↓ (si no hay mapping manual)
3. Auto-match: buscar producto en Nevada por SKU exacto (Product.sku = refId)
   ↓ (si no se encuentra)
4. Agregar a lista de "unmatched SKUs" → sync falla con error VTEX_SKU_MISMATCH
```

Si **todos** los items matchean, se crea la venta. Si **alguno** falla, toda la sincronizacion se marca como FAILED y se puede reintentar despues de crear los mappings manuales.

### Idempotencia

Antes de procesar una orden, el sistema verifica:

```typescript
const existingLog = await syncLogRepository.findByExternalOrderId(connectionId, externalOrderId);
if (existingLog && existingLog.action === 'SYNCED') {
  return ok({ action: 'ALREADY_SYNCED', saleId: existingLog.saleId });
}
```

Si la orden ya fue sincronizada exitosamente, se retorna inmediatamente sin reprocesar. Si el log previo tiene action `FAILED`, se reintenta.

### Precios

Los precios de VTEX vienen en **centavos** (e.g., `sellingPrice: 2999` = $29.99). El use case divide entre 100 al crear las lineas de venta:

```typescript
salePrice: item.sellingPrice / 100
```

---

## Flujo de Sincronizacion Outbound (Nevada a VTEX)

### Domain Events que Disparan Outbound Sync

| Evento de Dominio | Accion en VTEX |
|--------------------|----------------|
| `SaleConfirmedEvent` | `START_HANDLING` → `vtexApiClient.startHandling()` |
| `SaleCompletedEvent` | `INVOICE` → `vtexApiClient.sendInvoice()` |
| `SaleCancelledEvent` | `CANCEL` → `vtexApiClient.cancelOrder()` |

### VtexOutboundSyncHandler

El handler se suscribe a los domain events de ventas y coordina la sincronizacion saliente:

```
SaleConfirmedEvent / SaleCompletedEvent / SaleCancelledEvent
  ↓
VtexOutboundSyncHandler.handle(event)
  ↓
1. Extraer saleId y orgId del evento
  ↓
2. Buscar todas las conexiones CONNECTED de la org
  ↓
3. Para cada conexion:
   a. Verificar syncDirection != INBOUND_ONLY
   b. Buscar SyncLog que referencia este saleId
   c. Si existe → tiene el externalOrderId
   d. VtexOutboundSyncUseCase.execute({ connectionId, externalOrderId, action })
```

### Guardia de Direccion

El `VtexOutboundSyncUseCase` verifica la direccion de sincronizacion antes de ejecutar:

```typescript
if (connection.syncDirection === 'INBOUND_ONLY') {
  return ok({ synced: false, message: 'Outbound sync skipped' });
}
```

| syncDirection | Inbound | Outbound |
|---------------|---------|----------|
| `INBOUND` | Si | No |
| `OUTBOUND` | No | Si |
| `BIDIRECTIONAL` | Si | Si |

### VtexApiClient - Acciones Outbound

| Metodo | VTEX API Endpoint | Proposito |
|--------|-------------------|-----------|
| `startHandling()` | `POST /api/oms/pvt/orders/{orderId}/start-handling` | Notificar que la orden esta en preparacion |
| `sendInvoice()` | `POST /api/oms/pvt/orders/{orderId}/invoice` | Enviar datos de factura |
| `cancelOrder()` | `POST /api/oms/pvt/orders/{orderId}/cancel` | Cancelar la orden |

### Manejo de Errores en Outbound

El handler **no lanza excepciones** para no interrumpir el flujo principal de la venta:

```typescript
catch (error) {
  this.logger.error('Error in VTEX outbound sync handler', { ... });
  // No throw - event handlers should not break the main flow
}
```

---

## Webhook

### Endpoint

```
POST /vtex/webhook/:accountName?secret={webhookSecret}
```

### Caracteristicas

- **Publico**: No usa `JwtAuthGuard`, `RoleBasedAuthGuard`, ni `PermissionGuard`
- **Sin TenantMiddleware**: El webhook no lleva header `X-Organization-Slug`. El controller busca la conexion globalmente por `accountName`
- **Validacion de secret**: El query param `secret` se compara contra `connection.webhookSecret`

### Payload de VTEX

```typescript
interface VtexWebhookPayload {
  Domain: string;
  OrderId: string;          // ID de la orden en VTEX
  State: string;            // Estado actual (e.g., 'handling')
  LastState: string;        // Estado anterior
  LastChange: string;       // Timestamp del cambio anterior
  CurrentChange: string;    // Timestamp del cambio actual
  Origin: {
    Account: string;        // Nombre de cuenta VTEX
    Key: string;
  };
}
```

### Estados Procesados

```typescript
const relevantStates = [
  'order-completed',
  'handling',
  'invoiced',
  'canceled',
  'ready-for-handling',
];
```

Estados no incluidos en esta lista se ignoran con respuesta `{ success: true, message: 'State ignored' }`.

### Flujo del Webhook

```
1. Recibir POST con payload
   ↓
2. Buscar conexion por provider='VTEX' y accountName (lookup global, sin orgId)
   ↓ (si no existe → 404)
3. Validar secret del query param contra connection.webhookSecret
   ↓ (si no coincide → 401)
4. Verificar si el State es relevante
   ↓ (si no es relevante → ignorar)
5. VtexSyncOrderUseCase.execute({ connectionId, externalOrderId, orgId })
```

### Registro del Webhook en VTEX

Para activar los webhooks, se usa `VtexRegisterWebhookUseCase`:

```
POST /integrations/connections/:id/register-webhook
Body: { "webhookBaseUrl": "https://api.nevada.com" }
```

Esto llama a la API de VTEX para registrar:

```
POST https://{accountName}.vtexcommercestable.com.br/api/orders/hook/config
{
  "filter": {
    "status": ["order-completed", "handling", "invoiced", "canceled"]
  },
  "hook": {
    "url": "https://api.nevada.com/vtex/webhook/{accountName}?secret={webhookSecret}"
  }
}
```

---

## Polling Job

### Configuracion

```typescript
@Cron(CronExpression.EVERY_10_MINUTES)
async pollOrders(): Promise<void> { ... }
```

El `VtexPollingJob` se ejecuta cada **10 minutos** usando `@nestjs/schedule`.

### Flujo

```
1. VtexPollingJob.pollOrders() (trigger automatico por cron)
   ↓
2. VtexPollOrdersUseCase.execute({})
   ↓
3. connectionRepository.findAllConnectedForPolling()
   → Retorna conexiones con status=CONNECTED y syncStrategy=POLLING|BOTH
   ↓
4. Para cada conexion:
   a. Decrypt credenciales
   b. Construir filtro de fecha:
      creationDate:[{lastSyncAt} TO {now}]
   c. vtexApiClient.listOrders(accountName, appKey, appToken, { creationDate, perPage: 50 })
   d. Para cada orden: vtexSyncOrderUseCase.execute()
   ↓
5. Retornar totales: { polled, synced, failed }
```

### Filtro por Fecha

Si la conexion tiene `lastSyncAt`, el polling solo consulta ordenes creadas desde esa fecha:

```typescript
if (connection.lastSyncAt) {
  const from = connection.lastSyncAt.toISOString();
  const to = new Date().toISOString();
  creationDate = `creationDate:[${from} TO ${to}]`;
}
```

Si no tiene `lastSyncAt` (primera vez), se traen todas las ordenes disponibles.

### Manejo de Errores por Conexion

Si el polling falla para una conexion especifica, se marca con error pero no se detiene el procesamiento de las demas:

```typescript
catch (pollError) {
  connection.markError(pollError.message);
  await connectionRepository.update(connection);
  // Continua con la siguiente conexion
}
```

### Sincronizacion Manual

El endpoint `POST /integrations/connections/:id/sync` ejecuta el mismo `VtexPollOrdersUseCase` pero para una conexion especifica:

```typescript
vtexPollOrdersUseCase.execute({ connectionId, orgId })
```

---

## Testing

### Estructura de Tests

```
test/
├── integrations/
│   ├── shared/
│   │   ├── integrationConnection.entity.spec.ts       # Tests unitarios de entidad
│   │   ├── integrationSyncLog.entity.spec.ts          # Tests unitarios de entidad
│   │   ├── integrationSkuMapping.entity.spec.ts       # Tests unitarios de entidad
│   │   └── encryption.service.spec.ts                 # Tests de EncryptionService
│   └── vtex/
│       ├── vtexTestConnectionUseCase.spec.ts          # Test de conexion (ping)
│       ├── vtexSyncOrderUseCase.spec.ts               # Sync de orden (idempotencia, SKU match, contacto)
│       ├── vtexPollOrdersUseCase.spec.ts              # Logica de polling
│       ├── vtexRegisterWebhookUseCase.spec.ts         # Registro de webhook
│       ├── vtexOutboundSyncUseCase.spec.ts            # Acciones de sync outbound
│       ├── vtexOutboundSyncHandler.spec.ts            # Handler de eventos
│       ├── vtexPollingJob.spec.ts                     # Cron job
│       └── vtexApiClient.spec.ts                      # Cliente HTTP (mocks de axios)
├── application/integrationUseCases/
│   ├── createIntegrationConnectionUseCase.spec.ts     # Tests de use cases CRUD
│   ├── getIntegrationConnectionsUseCase.spec.ts
│   ├── getIntegrationConnectionByIdUseCase.spec.ts
│   ├── updateIntegrationConnectionUseCase.spec.ts
│   └── deleteIntegrationConnectionUseCase.spec.ts
├── infrastructure/database/repositories/
│   ├── integrationConnection.repository.spec.ts       # Tests de repositorios Prisma
│   ├── integrationSyncLog.repository.spec.ts
│   └── integrationSkuMapping.repository.spec.ts
└── interfaces/http/integrations/
    ├── integrations.controller.spec.ts                # Tests de controller
    └── vtex-webhook.controller.spec.ts                # Tests de controller de webhook
```

### Mocks Principales

| Mock | Proposito |
|------|-----------|
| `IIntegrationConnectionRepository` | Simula el repositorio de conexiones |
| `IIntegrationSyncLogRepository` | Simula el repositorio de logs de sync |
| `IIntegrationSkuMappingRepository` | Simula el repositorio de mapeos SKU |
| `IContactRepository` | Simula busqueda/creacion de contactos |
| `IProductRepository` | Simula busqueda de productos por SKU |
| `EncryptionService` | Mock de encrypt/decrypt (retorna valores predecibles) |
| `VtexApiClient` | Mock de todas las llamadas HTTP a VTEX (ping, getOrder, listOrders, etc.) |

### Cobertura de Escenarios Clave

- **Idempotencia**: Verifica que una orden ya sincronizada retorna `ALREADY_SYNCED`
- **SKU mismatch**: Verifica que items sin mapeo generan error `VTEX_SKU_MISMATCH`
- **Resolucion de contacto**: Verifica los 4 niveles de fallback (email, documento, creacion, default)
- **Validacion de webhook**: Verifica rechazo con secret invalido
- **Guardia de direccion outbound**: Verifica que `INBOUND_ONLY` bloquea sync outbound
- **Filtro de fecha en polling**: Verifica que se usa `lastSyncAt` como inicio del rango
- **Round-trip de encriptacion**: Verifica que encrypt → decrypt retorna el valor original

### Ejecutar Tests

```bash
# Todos los tests del modulo de integraciones
npx jest --testPathPattern="integrations"

# Solo tests de entidades
npx jest --testPathPattern="integrations/shared"

# Solo tests de VTEX
npx jest --testPathPattern="integrations/vtex"

# Solo tests de use cases CRUD
npx jest --testPathPattern="integrationUseCases"
```

---

## Documentacion Relacionada

| Documento | Descripcion |
|-----------|-------------|
| [Arquitectura](architecture.md) | Arquitectura general del backend |
| [Referencia de API](api-reference.md) | Referencia completa de endpoints |
| [Modelo de Datos](data_model.md) | Modelo de datos (Prisma schema) |
| [Mapa de Contextos Acotados](bounded-context-map.md) | Mapa de contextos acotados |
| [Patrones](patterns.md) | Patrones de diseno utilizados |
| [Estructura de Testing](testing-structure.md) | Convenciones de testing |
