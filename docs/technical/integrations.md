> **[English](./integrations.md)** | [Español](./integrations.es.md)

# Integrations Module

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Domain Entities](#domain-entities)
- [Credential Encryption](#credential-encryption)
- [API Endpoints](#api-endpoints)
- [Use Cases](#use-cases)
- [Inbound Sync Flow (VTEX to Nevada)](#inbound-sync-flow-vtex-to-nevada)
- [Outbound Sync Flow (Nevada to VTEX)](#outbound-sync-flow-nevada-to-vtex)
- [Webhook](#webhook)
- [Polling Job](#polling-job)
- [Testing](#testing)

---

## Overview

The integrations module enables **bidirectional synchronization** between Nevada Inventory System and external e-commerce platforms. Its design is extensible: it currently supports **VTEX** as a provider, with the architecture prepared to incorporate **MercadoLibre** or others in the future.

### Purpose

- Import VTEX orders as sales in Nevada (inbound sync)
- Reflect Nevada sale status changes to VTEX (outbound sync)
- Automatically resolve and create contacts from buyer data
- Map SKUs between the external platform and the internal product catalog

### Feature Gate

The module is protected by an **organization-level feature flag**:

```
Organization.settings.integrationsEnabled = true
```

If the flag is disabled, the integrations pages do not appear in the frontend sidebar and the endpoints return 403.

### Supported Providers

| Provider | Status | Description |
|----------|--------|-------------|
| **VTEX** | Implemented | E-commerce (OMS API v2) |
| **MercadoLibre** | Planned | Marketplace (REST API) |

---

## Architecture

### Layer Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                  INTERFACE (HTTP Layer)                                │
│  IntegrationsController (auth + guards)                               │
│  VtexWebhookController (public, no TenantMiddleware)                  │
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

### Data Flow: Inbound (VTEX to Nevada)

```
VTEX (new/updated order)
  ├─→ Webhook: POST /vtex/webhook/:accountName?secret=...
  │     ↓
  │   VtexWebhookController
  │     ↓ (looks up connection by accountName, validates secret)
  │   VtexSyncOrderUseCase.execute()
  │     ↓
  │   1. Idempotency check (looks for existing SyncLog for the externalOrderId)
  │   2. Decrypt credentials (EncryptionService)
  │   3. Fetch order detail (VtexApiClient.getOrder)
  │   4. Resolve contact (4 fallback levels)
  │   5. Match SKUs (manual mapping + auto-match by SKU + fallback)
  │   6. Create sale in Nevada
  │   7. Save SyncLog (SYNCED or FAILED)
  │   8. Update lastSyncAt on connection
  │
  └─→ Polling: VtexPollingJob (cron every 10 min)
        ↓
      VtexPollOrdersUseCase.execute()
        ↓
      For each CONNECTED connection with syncStrategy POLLING or BOTH:
        1. Decrypt credentials
        2. VtexApiClient.listOrders (date filter: lastSyncAt → now)
        3. For each order: VtexSyncOrderUseCase.execute()
```

### Data Flow: Outbound (Nevada to VTEX)

```
Nevada (sale status change)
  ↓
SaleConfirmedEvent / SaleCompletedEvent / SaleCancelledEvent
  ↓
VtexOutboundSyncHandler.handle(event)
  ↓
For each CONNECTED connection with syncDirection != INBOUND_ONLY:
  1. Look for SyncLog that references the saleId
  2. If found → VtexOutboundSyncUseCase.execute()
       ↓
     Based on action:
       START_HANDLING → vtexApiClient.startHandling()
       INVOICE        → vtexApiClient.sendInvoice()
       CANCEL         → vtexApiClient.cancelOrder()
```

### Anti-Loop Guard

To prevent infinite loops between inbound and outbound sync:

- When a sale is created via inbound sync (VTEX → Nevada), the `skipOutbound` flag is set on the SyncLog
- The `VtexOutboundSyncHandler` checks this flag before triggering reverse synchronization
- The direction guard (`syncDirection`) on the `IntegrationConnection` entity also prevents loops:
  - `INBOUND` → VTEX to Nevada only
  - `OUTBOUND` → Nevada to VTEX only
  - `BIDIRECTIONAL` → Both directions (with anti-loop guard)

---

## Module Structure

```
src/integrations/
├── integrations.module.ts              # Main module: DI, imports, exports
│
├── shared/                             # Shared components (provider-agnostic)
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── integrationConnection.entity.ts    # Connection to external platform
│   │   │   ├── integrationSyncLog.entity.ts       # Log of each synchronization
│   │   │   └── integrationSkuMapping.entity.ts    # External SKU ↔ productId mapping
│   │   └── ports/
│   │       ├── iIntegrationConnectionRepository.port.ts
│   │       ├── iIntegrationSyncLogRepository.port.ts
│   │       └── iIntegrationSkuMappingRepository.port.ts
│   └── encryption/
│       └── encryption.service.ts                   # AES-256-GCM encrypt/decrypt
│
└── vtex/                               # Provider-specific: VTEX
    ├── vtex.module.ts                  # VTEX module: use cases, jobs, handlers
    ├── application/
    │   ├── vtexTestConnectionUseCase.ts        # Test connection (ping)
    │   ├── vtexSyncOrderUseCase.ts             # Sync an individual order
    │   ├── vtexPollOrdersUseCase.ts            # Order polling
    │   ├── vtexRegisterWebhookUseCase.ts       # Register webhook in VTEX
    │   └── vtexOutboundSyncUseCase.ts          # Outbound sync (Nevada → VTEX)
    ├── dto/
    │   └── vtex-api.types.ts                   # VTEX API types
    ├── events/
    │   └── vtexOutboundSyncHandler.ts          # Domain event handler
    ├── infrastructure/
    │   └── vtexApiClient.ts                    # HTTP client for VTEX OMS API
    └── jobs/
        └── vtexPollingJob.ts                   # Cron job (every 10 minutes)

src/application/integrationUseCases/     # Shared use cases (CRUD)
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

src/interfaces/http/integrations/        # HTTP Controllers
├── integrationsHttp.module.ts           # HTTP module (imports IntegrationsModule)
├── integrations.controller.ts           # Authenticated endpoints (guards)
└── vtex-webhook.controller.ts           # Public endpoint (no guards)

src/infrastructure/database/repositories/ # Prisma repositories
├── integrationConnection.repository.ts
├── integrationSyncLog.repository.ts
└── integrationSkuMapping.repository.ts
```

---

## Domain Entities

### IntegrationConnection

Represents an active connection to an e-commerce platform.

```typescript
interface IIntegrationConnectionProps {
  provider: string;            // 'VTEX' | 'MERCADOLIBRE' (extensible)
  accountName: string;         // Account name on the platform (e.g., 'my-store')
  storeName: string;           // Human-readable store name
  status: string;              // CONNECTED | DISCONNECTED | ERROR
  syncStrategy: string;        // WEBHOOK | POLLING | BOTH
  syncDirection: string;       // INBOUND | OUTBOUND | BIDIRECTIONAL
  encryptedAppKey: string;     // Encrypted credential (AES-256-GCM)
  encryptedAppToken: string;   // Encrypted credential (AES-256-GCM)
  webhookSecret: string;       // Secret for validating incoming webhooks
  defaultWarehouseId: string;  // Default warehouse for synced sales
  defaultContactId?: string;   // Fallback contact if buyer cannot be resolved
  connectedAt?: Date;          // Date of last successful connection
  lastSyncAt?: Date;           // Date of last synchronization
  lastSyncError?: string;      // Last synchronization error
  companyId?: string;          // Company ID (multi-company)
  createdBy: string;           // ID of the user who created the connection
}
```

**State transitions:**

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

**Domain methods:**

| Method | Effect |
|--------|--------|
| `connect()` | Status → CONNECTED, records `connectedAt`, clears `lastSyncError` |
| `disconnect()` | Status → DISCONNECTED |
| `markError(message)` | Status → ERROR, records `lastSyncError` |
| `updateLastSync()` | Updates `lastSyncAt`, clears `lastSyncError` |
| `updateCredentials(key, token)` | Updates encrypted credentials |
| `update(props)` | Updates editable fields (storeName, syncStrategy, etc.) |

### IntegrationSyncLog

Records each synchronization attempt for an external order.

```typescript
interface IIntegrationSyncLogProps {
  connectionId: string;                  // FK to IntegrationConnection
  externalOrderId: string;               // Order ID on the external platform
  action: string;                        // SYNCED | FAILED | ALREADY_SYNCED
  saleId?: string;                       // FK to Sale (if sync successful)
  contactId?: string;                    // FK to Contact (if resolved/created)
  errorMessage?: string;                 // Error detail (if FAILED)
  rawPayload?: Record<string, unknown>;  // Original order payload
  processedAt: Date;                     // Processing timestamp
}
```

**Domain methods:**

| Method | Effect |
|--------|--------|
| `markSuccess(saleId, contactId?)` | action → SYNCED, assigns saleId, clears error |
| `markFailed(errorMessage)` | action → FAILED, records error message |

### IntegrationSkuMapping

Manual mapping between an external platform SKU and a Nevada product.

```typescript
interface IIntegrationSkuMappingProps {
  connectionId: string;   // FK to IntegrationConnection
  externalSku: string;    // SKU on the external platform (e.g., VTEX refId)
  productId: string;      // FK to Product in Nevada
}
```

**Uniqueness**: `(connectionId, externalSku)` -- an external SKU can only be mapped once per connection.

---

## Credential Encryption

API credentials (appKey, appToken) are stored encrypted in the database. They are never returned to the frontend.

### Algorithm

- **AES-256-GCM** (authenticated encryption)
- IV (Initialization Vector): 12 random bytes
- Auth Tag: 16 bytes

### Environment Variable

```bash
# ENCRYPTION_KEY: 64-character hexadecimal string (32 bytes)
ENCRYPTION_KEY=a1b2c3d4e5f6...  # 64 hex chars
```

### Stored Format

```
{iv_hex}:{ciphertext_hex}:{authTag_hex}
```

Example: `0a1b2c3d4e5f6a7b8c9d0e1f:abcdef1234567890:fedcba9876543210`

### Encryption Flow

```
1. Frontend sends appKey and appToken in plaintext over HTTPS
   POST /integrations/connections { appKey: "vtexappkey-...", appToken: "ABCDE..." }
     ↓
2. CreateIntegrationConnectionUseCase receives the DTO
     ↓
3. EncryptionService.encrypt(appKey) → iv:ciphertext:authTag
   EncryptionService.encrypt(appToken) → iv:ciphertext:authTag
     ↓
4. Stored in DB as encryptedAppKey and encryptedAppToken
     ↓
5. When credentials are needed (sync, test, poll):
   EncryptionService.decrypt(encryptedAppKey) → appKey plaintext
```

### Security

- Credentials are **never** returned to the frontend (not included in the response mapper)
- Transmitted over HTTPS (TLS)
- AES-256-GCM provides both confidentiality and integrity (auth tag)
- Each encryption uses a different random IV

---

## API Endpoints

All endpoints (except the webhook) require JWT authentication and the standard headers (`Authorization`, `X-Organization-Slug`).

### IntegrationsController Endpoints

Base path: `/integrations/connections`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/integrations/connections` | `INTEGRATIONS:READ` | List connections (filters: provider, status) |
| `GET` | `/integrations/connections/:id` | `INTEGRATIONS:READ` | Get connection by ID |
| `POST` | `/integrations/connections` | `INTEGRATIONS:CREATE` | Create new connection |
| `PUT` | `/integrations/connections/:id` | `INTEGRATIONS:UPDATE` | Update connection |
| `DELETE` | `/integrations/connections/:id` | `INTEGRATIONS:DELETE` | Delete connection |
| `POST` | `/integrations/connections/:id/test` | `INTEGRATIONS:SYNC` | Test connection (ping to VTEX) |
| `POST` | `/integrations/connections/:id/sync` | `INTEGRATIONS:SYNC` | Trigger manual sync (polling) |
| `POST` | `/integrations/connections/:id/sync/:orderId` | `INTEGRATIONS:SYNC` | Sync a specific order |
| `POST` | `/integrations/connections/:id/register-webhook` | `INTEGRATIONS:SYNC` | Register webhook in VTEX |
| `GET` | `/integrations/connections/:id/sku-mappings` | `INTEGRATIONS:READ` | List SKU mappings |
| `POST` | `/integrations/connections/:id/sku-mappings` | `INTEGRATIONS:CREATE` | Create SKU mapping |
| `DELETE` | `/integrations/connections/:id/sku-mappings/:mappingId` | `INTEGRATIONS:DELETE` | Delete SKU mapping |
| `GET` | `/integrations/connections/:id/unmatched` | `INTEGRATIONS:READ` | List unmatched SKUs / failed syncs |
| `POST` | `/integrations/connections/:id/retry/:syncLogId` | `INTEGRATIONS:SYNC` | Retry individual sync |
| `POST` | `/integrations/connections/:id/retry-all` | `INTEGRATIONS:SYNC` | Retry all failed syncs |

### VtexWebhookController Endpoint

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/vtex/webhook/:accountName` | Public | VTEX webhook (validates secret via query param) |

### Response Format

All responses follow the standard format:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

### Example: Create Connection

**Request**:
```json
POST /integrations/connections
{
  "provider": "VTEX",
  "accountName": "my-store",
  "storeName": "My VTEX Store",
  "appKey": "vtexappkey-my-store-ABCDEF",
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
    "accountName": "my-store",
    "storeName": "My VTEX Store",
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

> **Note**: `encryptedAppKey` and `encryptedAppToken` are never included in responses.

---

## Use Cases

### Connection CRUD (shared)

| Use Case | File | Description |
|----------|------|-------------|
| `CreateIntegrationConnectionUseCase` | `createIntegrationConnectionUseCase.ts` | Encrypts credentials, verifies uniqueness by provider+accountName+orgId, creates connection |
| `GetIntegrationConnectionsUseCase` | `getIntegrationConnectionsUseCase.ts` | Lists connections filtered by provider and/or status |
| `GetIntegrationConnectionByIdUseCase` | `getIntegrationConnectionByIdUseCase.ts` | Gets connection by ID |
| `UpdateIntegrationConnectionUseCase` | `updateIntegrationConnectionUseCase.ts` | Updates editable fields, re-encrypts credentials if new ones are provided |
| `DeleteIntegrationConnectionUseCase` | `deleteIntegrationConnectionUseCase.ts` | Deletes connection and associated data |

### SKU Mappings (shared)

| Use Case | File | Description |
|----------|------|-------------|
| `CreateSkuMappingUseCase` | `createSkuMappingUseCase.ts` | Creates externalSku ↔ productId mapping, verifies product exists |
| `GetSkuMappingsUseCase` | `getSkuMappingsUseCase.ts` | Lists mappings for a connection |
| `DeleteSkuMappingUseCase` | `deleteSkuMappingUseCase.ts` | Deletes a mapping |

### Sync / Retry (shared)

| Use Case | File | Description |
|----------|------|-------------|
| `GetUnmatchedSkusUseCase` | `getUnmatchedSkusUseCase.ts` | Lists logs with action FAILED for a connection |
| `RetrySyncUseCase` | `retrySyncUseCase.ts` | Retries an individual failed sync (re-executes VtexSyncOrderUseCase) |
| `RetryAllFailedSyncsUseCase` | `retryAllFailedSyncsUseCase.ts` | Retries all failed syncs for a connection |

### VTEX-Specific

| Use Case | File | Description |
|----------|------|-------------|
| `VtexTestConnectionUseCase` | `vtexTestConnectionUseCase.ts` | Decrypts credentials, pings VTEX OMS API, updates status |
| `VtexSyncOrderUseCase` | `vtexSyncOrderUseCase.ts` | Syncs an individual order: fetch, resolve contact, match SKUs, create sale |
| `VtexPollOrdersUseCase` | `vtexPollOrdersUseCase.ts` | Queries new VTEX orders (date filter) and syncs each one |
| `VtexRegisterWebhookUseCase` | `vtexRegisterWebhookUseCase.ts` | Registers webhook in VTEX configuration (POST /api/orders/hook/config) |
| `VtexOutboundSyncUseCase` | `vtexOutboundSyncUseCase.ts` | Reflects Nevada status changes in VTEX (start-handling, invoice, cancel) |

---

## Inbound Sync Flow (VTEX to Nevada)

### Relevant VTEX States

```
payment-approved → ready-for-handling → handling → invoiced
                                                      ↓
                                                  canceled
```

The webhook processes these states:

| VTEX State | Action in Nevada |
|------------|------------------|
| `ready-for-handling` | Create sale (DRAFT → CONFIRMED) |
| `handling` | Update status to picking |
| `invoiced` | Complete sale |
| `order-completed` | Complete sale |
| `canceled` | Cancel sale |

### Contact Resolution (4 fallback levels)

When syncing a VTEX order, the system attempts to resolve the buyer's contact:

```
1. Search for existing contact by email (clientProfileData.email)
   ↓ (if not found)
2. Search for existing contact by document/identification (clientProfileData.document)
   ↓ (if not found)
3. Automatically create new contact with VTEX profile data:
   - name: corporateName (if isCorporate) or firstName + lastName
   - identification: document || email || "vtex-{timestamp}"
   - type: CUSTOMER
   - email, phone, address (from shippingData)
   ↓ (if creation fails)
4. Use connection's defaultContactId (final fallback)
```

### SKU Matching

For each item in the VTEX order:

```
1. Get the item's refId (or id if refId doesn't exist)
   ↓
2. Look up in IntegrationSkuMapping by (connectionId, externalSku = refId)
   ↓ (if no manual mapping)
3. Auto-match: search for product in Nevada by exact SKU (Product.sku = refId)
   ↓ (if not found)
4. Add to "unmatched SKUs" list → sync fails with error VTEX_SKU_MISMATCH
```

If **all** items match, the sale is created. If **any** fails, the entire synchronization is marked as FAILED and can be retried after creating the manual mappings.

### Idempotency

Before processing an order, the system verifies:

```typescript
const existingLog = await syncLogRepository.findByExternalOrderId(connectionId, externalOrderId);
if (existingLog && existingLog.action === 'SYNCED') {
  return ok({ action: 'ALREADY_SYNCED', saleId: existingLog.saleId });
}
```

If the order was already successfully synced, it returns immediately without reprocessing. If the previous log has action `FAILED`, it retries.

### Prices

VTEX prices come in **cents** (e.g., `sellingPrice: 2999` = $29.99). The use case divides by 100 when creating sale lines:

```typescript
salePrice: item.sellingPrice / 100
```

---

## Outbound Sync Flow (Nevada to VTEX)

### Domain Events That Trigger Outbound Sync

| Domain Event | Action in VTEX |
|--------------|----------------|
| `SaleConfirmedEvent` | `START_HANDLING` → `vtexApiClient.startHandling()` |
| `SaleCompletedEvent` | `INVOICE` → `vtexApiClient.sendInvoice()` |
| `SaleCancelledEvent` | `CANCEL` → `vtexApiClient.cancelOrder()` |

### VtexOutboundSyncHandler

The handler subscribes to sale domain events and coordinates outbound synchronization:

```
SaleConfirmedEvent / SaleCompletedEvent / SaleCancelledEvent
  ↓
VtexOutboundSyncHandler.handle(event)
  ↓
1. Extract saleId and orgId from the event
  ↓
2. Find all CONNECTED connections for the org
  ↓
3. For each connection:
   a. Verify syncDirection != INBOUND_ONLY
   b. Look for SyncLog that references this saleId
   c. If found → it has the externalOrderId
   d. VtexOutboundSyncUseCase.execute({ connectionId, externalOrderId, action })
```

### Direction Guard

The `VtexOutboundSyncUseCase` verifies the sync direction before executing:

```typescript
if (connection.syncDirection === 'INBOUND_ONLY') {
  return ok({ synced: false, message: 'Outbound sync skipped' });
}
```

| syncDirection | Inbound | Outbound |
|---------------|---------|----------|
| `INBOUND` | Yes | No |
| `OUTBOUND` | No | Yes |
| `BIDIRECTIONAL` | Yes | Yes |

### VtexApiClient - Outbound Actions

| Method | VTEX API Endpoint | Purpose |
|--------|-------------------|---------|
| `startHandling()` | `POST /api/oms/pvt/orders/{orderId}/start-handling` | Notify that the order is being prepared |
| `sendInvoice()` | `POST /api/oms/pvt/orders/{orderId}/invoice` | Send invoice data |
| `cancelOrder()` | `POST /api/oms/pvt/orders/{orderId}/cancel` | Cancel the order |

### Outbound Error Handling

The handler **does not throw exceptions** to avoid interrupting the main sale flow:

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

### Characteristics

- **Public**: Does not use `JwtAuthGuard`, `RoleBasedAuthGuard`, or `PermissionGuard`
- **No TenantMiddleware**: The webhook does not carry the `X-Organization-Slug` header. The controller looks up the connection globally by `accountName`
- **Secret validation**: The `secret` query param is compared against `connection.webhookSecret`

### VTEX Payload

```typescript
interface VtexWebhookPayload {
  Domain: string;
  OrderId: string;          // Order ID in VTEX
  State: string;            // Current state (e.g., 'handling')
  LastState: string;        // Previous state
  LastChange: string;       // Previous change timestamp
  CurrentChange: string;    // Current change timestamp
  Origin: {
    Account: string;        // VTEX account name
    Key: string;
  };
}
```

### Processed States

```typescript
const relevantStates = [
  'order-completed',
  'handling',
  'invoiced',
  'canceled',
  'ready-for-handling',
];
```

States not included in this list are ignored with the response `{ success: true, message: 'State ignored' }`.

### Webhook Flow

```
1. Receive POST with payload
   ↓
2. Look up connection by provider='VTEX' and accountName (global lookup, no orgId)
   ↓ (if not found → 404)
3. Validate secret from query param against connection.webhookSecret
   ↓ (if mismatch → 401)
4. Check if the State is relevant
   ↓ (if not relevant → ignore)
5. VtexSyncOrderUseCase.execute({ connectionId, externalOrderId, orgId })
```

### Webhook Registration in VTEX

To activate webhooks, use `VtexRegisterWebhookUseCase`:

```
POST /integrations/connections/:id/register-webhook
Body: { "webhookBaseUrl": "https://api.nevada.com" }
```

This calls the VTEX API to register:

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

### Configuration

```typescript
@Cron(CronExpression.EVERY_10_MINUTES)
async pollOrders(): Promise<void> { ... }
```

The `VtexPollingJob` runs every **10 minutes** using `@nestjs/schedule`.

### Flow

```
1. VtexPollingJob.pollOrders() (automatic cron trigger)
   ↓
2. VtexPollOrdersUseCase.execute({})
   ↓
3. connectionRepository.findAllConnectedForPolling()
   → Returns connections with status=CONNECTED and syncStrategy=POLLING|BOTH
   ↓
4. For each connection:
   a. Decrypt credentials
   b. Build date filter:
      creationDate:[{lastSyncAt} TO {now}]
   c. vtexApiClient.listOrders(accountName, appKey, appToken, { creationDate, perPage: 50 })
   d. For each order: vtexSyncOrderUseCase.execute()
   ↓
5. Return totals: { polled, synced, failed }
```

### Date Filter

If the connection has `lastSyncAt`, polling only queries orders created since that date:

```typescript
if (connection.lastSyncAt) {
  const from = connection.lastSyncAt.toISOString();
  const to = new Date().toISOString();
  creationDate = `creationDate:[${from} TO ${to}]`;
}
```

If there is no `lastSyncAt` (first time), all available orders are fetched.

### Per-Connection Error Handling

If polling fails for a specific connection, it is marked with an error but processing of the others is not halted:

```typescript
catch (pollError) {
  connection.markError(pollError.message);
  await connectionRepository.update(connection);
  // Continue with the next connection
}
```

### Manual Sync

The `POST /integrations/connections/:id/sync` endpoint executes the same `VtexPollOrdersUseCase` but for a specific connection:

```typescript
vtexPollOrdersUseCase.execute({ connectionId, orgId })
```

---

## Testing

### Test Structure

```
test/
├── integrations/
│   ├── shared/
│   │   ├── integrationConnection.entity.spec.ts       # Entity unit tests
│   │   ├── integrationSyncLog.entity.spec.ts          # Entity unit tests
│   │   ├── integrationSkuMapping.entity.spec.ts       # Entity unit tests
│   │   └── encryption.service.spec.ts                 # EncryptionService tests
│   └── vtex/
│       ├── vtexTestConnectionUseCase.spec.ts          # Test connection ping
│       ├── vtexSyncOrderUseCase.spec.ts               # Order sync (idempotency, SKU match, contact)
│       ├── vtexPollOrdersUseCase.spec.ts              # Polling logic
│       ├── vtexRegisterWebhookUseCase.spec.ts         # Webhook registration
│       ├── vtexOutboundSyncUseCase.spec.ts            # Outbound sync actions
│       ├── vtexOutboundSyncHandler.spec.ts            # Event handler
│       ├── vtexPollingJob.spec.ts                     # Cron job
│       └── vtexApiClient.spec.ts                      # HTTP client (axios mocks)
├── application/integrationUseCases/
│   ├── createIntegrationConnectionUseCase.spec.ts     # CRUD use case tests
│   ├── getIntegrationConnectionsUseCase.spec.ts
│   ├── getIntegrationConnectionByIdUseCase.spec.ts
│   ├── updateIntegrationConnectionUseCase.spec.ts
│   └── deleteIntegrationConnectionUseCase.spec.ts
├── infrastructure/database/repositories/
│   ├── integrationConnection.repository.spec.ts       # Prisma repository tests
│   ├── integrationSyncLog.repository.spec.ts
│   └── integrationSkuMapping.repository.spec.ts
└── interfaces/http/integrations/
    ├── integrations.controller.spec.ts                # Controller tests
    └── vtex-webhook.controller.spec.ts                # Webhook controller tests
```

### Main Mocks

| Mock | Purpose |
|------|---------|
| `IIntegrationConnectionRepository` | Simulates the connection repository |
| `IIntegrationSyncLogRepository` | Simulates the sync log repository |
| `IIntegrationSkuMappingRepository` | Simulates the SKU mapping repository |
| `IContactRepository` | Simulates contact search/creation |
| `IProductRepository` | Simulates product search by SKU |
| `EncryptionService` | Mock of encrypt/decrypt (returns predictable values) |
| `VtexApiClient` | Mock of all HTTP calls to VTEX (ping, getOrder, listOrders, etc.) |

### Key Scenario Coverage

- **Idempotency**: Verifies that an already-synced order returns `ALREADY_SYNCED`
- **SKU mismatch**: Verifies that items without mapping generate error `VTEX_SKU_MISMATCH`
- **Contact resolution**: Verifies the 4 fallback levels (email, document, create, default)
- **Webhook validation**: Verifies rejection with invalid secret
- **Outbound direction guard**: Verifies that `INBOUND_ONLY` blocks outbound sync
- **Polling date filter**: Verifies that `lastSyncAt` is used as the start of the range
- **Encryption round-trip**: Verifies that encrypt → decrypt returns the original value

### Running Tests

```bash
# All integration module tests
npx jest --testPathPattern="integrations"

# Entity tests only
npx jest --testPathPattern="integrations/shared"

# VTEX tests only
npx jest --testPathPattern="integrations/vtex"

# CRUD use case tests only
npx jest --testPathPattern="integrationUseCases"
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | General backend architecture |
| [API Reference](api-reference.md) | Complete endpoint reference |
| [Data Model](data_model.md) | Data model (Prisma schema) |
| [Bounded Context Map](bounded-context-map.md) | Bounded context map |
| [Patterns](patterns.md) | Design patterns used |
| [Testing Structure](testing-structure.md) | Testing conventions |
