> **[English](./integrations.md)** | [Español](./integrations.es.md)

# Integrations Module

## Overview

The Integrations Module provides a provider-agnostic framework for connecting the system with external e-commerce platforms. It manages the full lifecycle of integration connections, including credential storage with encryption, bidirectional order synchronization, SKU mapping between external and internal catalogs, and sync failure tracking with retry capabilities. The first supported provider is **VTEX**.

---

## Architecture

The module follows a layered architecture consistent with the rest of the application:

```
src/integrations/                          # Domain + provider modules
  shared/                                  # Shared entities, ports, encryption
    domain/entities/                       # IntegrationConnection, IntegrationSyncLog, IntegrationSkuMapping
    domain/ports/                          # Repository interfaces (ports)
    encryption/                            # EncryptionService (AES-256-GCM)
  vtex/                                    # VTEX provider implementation
    application/                           # VTEX-specific use cases
    dto/                                   # VTEX API type definitions
    events/                                # Domain event handlers (outbound sync)
    infrastructure/                        # VtexApiClient (HTTP client)
    jobs/                                  # Cron-based polling job
    vtex.module.ts                         # NestJS module definition
  integrations.module.ts                   # Root integrations module

src/application/integrationUseCases/       # Generic CRUD use cases (connections, SKU mappings, retries)

src/interfaces/http/integrations/          # HTTP controllers
  integrations.controller.ts               # Main REST API (authenticated)
  vtex-webhook.controller.ts               # Public webhook endpoint
  integrationsHttp.module.ts               # HTTP module wiring

src/infrastructure/database/repositories/  # Prisma repository implementations
  integrationConnection.repository.ts
  integrationSkuMapping.repository.ts
  integrationSyncLog.repository.ts
```

**NestJS Module Graph:**

- `IntegrationsModule` imports `PrismaModule`, `ContactsModule`, `InventoryModule`, `VtexModule`
- `VtexModule` imports `PrismaModule`, `ContactsModule`, `InventoryModule`, `ScheduleModule`
- `IntegrationsHttpModule` imports `AuthenticationModule`, `IntegrationsModule`, `InventoryModule`, `SalesModule`

---

## Shared Components

### Integration Connection

**Entity:** `IntegrationConnection` (`src/integrations/shared/domain/entities/integrationConnection.entity.ts`)

Represents a configured connection to an external platform.

| Property | Type | Description |
|---|---|---|
| `provider` | `string` | Platform identifier (e.g., `"VTEX"`) |
| `accountName` | `string` | External account name |
| `storeName` | `string` | Store display name |
| `status` | `string` | `DISCONNECTED`, `CONNECTED`, `ERROR` |
| `syncStrategy` | `string` | `POLLING`, `WEBHOOK`, `BOTH` |
| `syncDirection` | `string` | `INBOUND_ONLY`, `OUTBOUND_ONLY`, `BIDIRECTIONAL` |
| `encryptedAppKey` | `string` | AES-256-GCM encrypted API key |
| `encryptedAppToken` | `string` | AES-256-GCM encrypted API token |
| `webhookSecret` | `string` | Auto-generated UUID for webhook auth |
| `defaultWarehouseId` | `string` | Target warehouse for synced inventory |
| `defaultContactId` | `string?` | Fallback contact for unresolved customers |
| `companyId` | `string?` | Optional company association |
| `lastSyncAt` | `Date?` | Timestamp of last successful sync |
| `lastSyncError` | `string?` | Last error message |

**Key methods:** `connect()`, `disconnect()`, `markError(message)`, `updateLastSync()`, `updateCredentials(key, token)`, `update(props)`

**Repository port:** `IIntegrationConnectionRepository` (`src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port.ts`)

Key operations: `findByOrgId`, `findById`, `findByProviderAndAccount`, `findByProviderAndAccountGlobal`, `findAllConnectedForPolling`, `save`, `update`, `delete`

---

### SKU Mapping

**Entity:** `IntegrationSkuMapping` (`src/integrations/shared/domain/entities/integrationSkuMapping.entity.ts`)

Maps an external SKU identifier to an internal product ID within a specific connection.

| Property | Type | Description |
|---|---|---|
| `connectionId` | `string` | Parent connection |
| `externalSku` | `string` | SKU in external platform |
| `productId` | `string` | Internal product ID |

**Repository port:** `IIntegrationSkuMappingRepository` (`src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.ts`)

Key operations: `findByConnectionId`, `findByExternalSku`, `save`, `delete`

---

### Sync Logs

**Entity:** `IntegrationSyncLog` (`src/integrations/shared/domain/entities/integrationSyncLog.entity.ts`)

Records the result of each order synchronization attempt, enabling idempotency checks and retry tracking.

| Property | Type | Description |
|---|---|---|
| `connectionId` | `string` | Source connection |
| `externalOrderId` | `string` | Order ID in external platform |
| `action` | `string` | `SYNCED`, `FAILED` |
| `saleId` | `string?` | Internal sale ID if synced |
| `contactId` | `string?` | Resolved contact ID |
| `errorMessage` | `string?` | Error details on failure |
| `rawPayload` | `Record?` | Original external order payload |
| `processedAt` | `Date` | Processing timestamp |

**Key methods:** `markSuccess(saleId, contactId?)`, `markFailed(errorMessage)`

**Repository port:** `IIntegrationSyncLogRepository` (`src/integrations/shared/domain/ports/iIntegrationSyncLogRepository.port.ts`)

Key operations: `save`, `findByExternalOrderId`, `findByConnectionId` (paginated), `findFailedByConnectionId`, `update`

---

### Encryption Service

**File:** `EncryptionService` (`src/integrations/shared/encryption/encryption.service.ts`)

Provides symmetric encryption and decryption for sensitive credentials (API keys and tokens).

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **IV:** 12 bytes, randomly generated per encryption operation
- **Auth tag:** 16 bytes (provides tamper detection)
- **Key source:** `ENCRYPTION_KEY` environment variable (64-character hex string = 32 bytes)
- **Ciphertext format:** `iv_hex:encrypted_hex:authTag_hex`

---

## VTEX Integration

### Overview

The VTEX integration enables bidirectional order synchronization between the system and VTEX e-commerce accounts. Orders can flow inbound (VTEX to system) via polling or webhooks, and status updates can flow outbound (system to VTEX) via domain event handlers.

**Module:** `VtexModule` (`src/integrations/vtex/vtex.module.ts`)

---

### Order Sync

**Use case:** `VtexSyncOrderUseCase` (`src/integrations/vtex/application/vtexSyncOrderUseCase.ts`)

Synchronizes a single VTEX order into the internal system. This is the core inbound sync operation used by both polling and webhook flows.

**Flow:**
1. Validate the connection exists
2. **Idempotency check:** skip if order already synced successfully
3. Decrypt credentials and fetch order details from VTEX API
4. **Contact resolution:** find existing contact by email or document, or create a new one from `clientProfileData`
5. **SKU matching:** resolve each order item via SKU mappings, then fallback to direct product SKU lookup
6. Log result as `SYNCED` or `FAILED`
7. Update connection `lastSyncAt` on success

**Note:** VTEX prices are in cents and are divided by 100 during sync.

---

### Webhook Handling

**Controller:** `VtexWebhookController` (`src/interfaces/http/integrations/vtex-webhook.controller.ts`)

**Endpoint:** `POST /vtex/webhook/:accountName?secret=<webhookSecret>`

This is a **public endpoint** (no JWT authentication) that receives VTEX order status change notifications.

**Authentication:** The webhook secret is passed as a query parameter and validated against the stored `webhookSecret` of the connection.

**Relevant states:** `order-completed`, `handling`, `invoiced`, `canceled`, `ready-for-handling`

**Webhook registration:** `VtexRegisterWebhookUseCase` (`src/integrations/vtex/application/vtexRegisterWebhookUseCase.ts`) registers the webhook URL in the VTEX platform via the VTEX Orders Hook Config API, subscribing to status filter: `order-completed`, `handling`, `invoiced`, `canceled`.

---

### Polling Strategy

**Job:** `VtexPollingJob` (`src/integrations/vtex/jobs/vtexPollingJob.ts`)

**Use case:** `VtexPollOrdersUseCase` (`src/integrations/vtex/application/vtexPollOrdersUseCase.ts`)

- Runs every **10 minutes** via `@Cron(CronExpression.EVERY_10_MINUTES)`
- Queries all connections with status `CONNECTED` (via `findAllConnectedForPolling`)
- Builds a date range filter from `lastSyncAt` to now
- Fetches up to 50 orders per connection per poll cycle
- Each order is processed individually through `VtexSyncOrderUseCase`
- Errors on individual connections do not block other connections
- Can also be triggered manually via the API for a specific connection

---

### Outbound Sync

**Event handler:** `VtexOutboundSyncHandler` (`src/integrations/vtex/events/vtexOutboundSyncHandler.ts`)

**Use case:** `VtexOutboundSyncUseCase` (`src/integrations/vtex/application/vtexOutboundSyncUseCase.ts`)

Listens for internal domain events and pushes status updates back to VTEX.

| Domain Event | VTEX Action | Description |
|---|---|---|
| `SaleConfirmedEvent` | `START_HANDLING` | Notifies VTEX that the order is being handled |
| `SaleCompletedEvent` | `INVOICE` | Sends invoice data to VTEX |
| `SaleCancelledEvent` | `CANCEL` | Cancels the order in VTEX |

Connections with `syncDirection = 'INBOUND_ONLY'` are skipped. The handler matches internal sales to external orders via sync log records.

---

### API Client

**File:** `VtexApiClient` (`src/integrations/vtex/infrastructure/vtexApiClient.ts`)

HTTP client that wraps all VTEX OMS API interactions using Axios.

| Method | VTEX Endpoint | Description |
|---|---|---|
| `ping(account, key, token)` | `GET /api/oms/pvt/orders?per_page=1` | Test connection |
| `getOrder(account, key, token, orderId)` | `GET /api/oms/pvt/orders/:orderId` | Fetch order detail |
| `listOrders(account, key, token, params)` | `GET /api/oms/pvt/orders` | List orders with filters |
| `registerWebhook(account, key, token, url)` | `POST /api/orders/hook/config` | Register webhook |
| `startHandling(account, key, token, orderId)` | `POST /api/oms/pvt/orders/:orderId/start-handling` | Start handling order |
| `sendInvoice(account, key, token, orderId, invoice)` | `POST /api/oms/pvt/orders/:orderId/invoice` | Send invoice |
| `cancelOrder(account, key, token, orderId, reason)` | `POST /api/oms/pvt/orders/:orderId/cancel` | Cancel order |

- **Base URL:** `https://{accountName}.vtexcommercestable.com.br`
- **Authentication headers:** `X-VTEX-API-AppKey`, `X-VTEX-API-AppToken`
- **Timeout:** 30 seconds

**DTO types:** `VtexOrderDetail`, `VtexOrderSummary`, `VtexOrderListResponse`, `VtexClientProfile`, `VtexAddress`, `VtexOrderItem`, `VtexWebhookPayload`, `VtexInvoiceData` (`src/integrations/vtex/dto/vtex-api.types.ts`)

---

## Use Cases

### Connection Management

| Use Case | File | Description |
|---|---|---|
| `CreateIntegrationConnectionUseCase` | `src/application/integrationUseCases/createIntegrationConnectionUseCase.ts` | Creates a new connection. Validates warehouse existence, checks for duplicates, encrypts credentials, generates webhook secret. |
| `GetIntegrationConnectionsUseCase` | `src/application/integrationUseCases/getIntegrationConnectionsUseCase.ts` | Lists all connections for an organization, with optional provider and status filters. |
| `GetIntegrationConnectionByIdUseCase` | `src/application/integrationUseCases/getIntegrationConnectionByIdUseCase.ts` | Retrieves a single connection by ID. |
| `UpdateIntegrationConnectionUseCase` | `src/application/integrationUseCases/updateIntegrationConnectionUseCase.ts` | Updates connection settings. Re-encrypts credentials if changed. Validates new warehouse if modified. |
| `DeleteIntegrationConnectionUseCase` | `src/application/integrationUseCases/deleteIntegrationConnectionUseCase.ts` | Deletes a connection after verifying it exists. |

### SKU Mapping

| Use Case | File | Description |
|---|---|---|
| `CreateSkuMappingUseCase` | `src/application/integrationUseCases/createSkuMappingUseCase.ts` | Creates a mapping between an external SKU and an internal product. Validates connection and product existence, checks for duplicates. |
| `GetSkuMappingsUseCase` | `src/application/integrationUseCases/getSkuMappingsUseCase.ts` | Lists all SKU mappings for a specific connection. |
| `DeleteSkuMappingUseCase` | `src/application/integrationUseCases/deleteSkuMappingUseCase.ts` | Deletes a specific SKU mapping. |
| `GetUnmatchedSkusUseCase` | `src/application/integrationUseCases/getUnmatchedSkusUseCase.ts` | Returns all failed sync logs for a connection, typically caused by unmatched SKUs. |

### Sync & Retry

| Use Case | File | Description |
|---|---|---|
| `RetrySyncUseCase` | `src/application/integrationUseCases/retrySyncUseCase.ts` | Retries a single failed sync by re-executing `VtexSyncOrderUseCase` with the original external order ID. |
| `RetryAllFailedSyncsUseCase` | `src/application/integrationUseCases/retryAllFailedSyncsUseCase.ts` | Retries all failed syncs for a connection. Returns counts of succeeded and failed retries. |
| `VtexTestConnectionUseCase` | `src/integrations/vtex/application/vtexTestConnectionUseCase.ts` | Pings the VTEX API to verify credentials are valid. Updates connection status to `CONNECTED` or `ERROR`. |
| `VtexSyncOrderUseCase` | `src/integrations/vtex/application/vtexSyncOrderUseCase.ts` | Core inbound sync: fetches a VTEX order, resolves contact, matches SKUs, creates sale, logs result. |
| `VtexPollOrdersUseCase` | `src/integrations/vtex/application/vtexPollOrdersUseCase.ts` | Polls VTEX for new orders across all (or a specific) connected integration(s). |
| `VtexRegisterWebhookUseCase` | `src/integrations/vtex/application/vtexRegisterWebhookUseCase.ts` | Registers a webhook URL in VTEX to receive order status change notifications. |
| `VtexOutboundSyncUseCase` | `src/integrations/vtex/application/vtexOutboundSyncUseCase.ts` | Pushes status updates (start-handling, invoice, cancel) from the system back to VTEX. |

---

## Entities & Value Objects

All entities extend the base `Entity<T>` class and use the factory pattern with `create()` (for new instances) and `reconstitute()` (for hydration from persistence).

| Entity | File | DB Table | Unique Constraint |
|---|---|---|---|
| `IntegrationConnection` | `src/integrations/shared/domain/entities/integrationConnection.entity.ts` | `integration_connections` | `(provider, accountName, orgId)` |
| `IntegrationSyncLog` | `src/integrations/shared/domain/entities/integrationSyncLog.entity.ts` | `integration_sync_logs` | `(connectionId, externalOrderId)` |
| `IntegrationSkuMapping` | `src/integrations/shared/domain/entities/integrationSkuMapping.entity.ts` | `integration_sku_mappings` | `(connectionId, externalSku)` |

---

## API Endpoints

### Authenticated Endpoints

**Controller:** `IntegrationsController` (`src/interfaces/http/integrations/integrations.controller.ts`)

**Base path:** `/integrations`

**Guards:** `JwtAuthGuard`, `RoleBasedAuthGuard`, `PermissionGuard`

**Interceptors:** `AuditInterceptor`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/connections` | `INTEGRATIONS:READ` | List all connections (optional `?provider=`, `?status=` filters) |
| `GET` | `/connections/:id` | `INTEGRATIONS:READ` | Get connection by ID |
| `POST` | `/connections` | `INTEGRATIONS:CREATE` | Create a new connection |
| `PUT` | `/connections/:id` | `INTEGRATIONS:UPDATE` | Update a connection |
| `DELETE` | `/connections/:id` | `INTEGRATIONS:DELETE` | Delete a connection |
| `POST` | `/connections/:id/test` | `INTEGRATIONS:SYNC` | Test connection credentials |
| `POST` | `/connections/:id/sync` | `INTEGRATIONS:SYNC` | Trigger manual sync (poll all orders) |
| `POST` | `/connections/:id/sync/:orderId` | `INTEGRATIONS:SYNC` | Sync a specific external order |
| `POST` | `/connections/:id/register-webhook` | `INTEGRATIONS:SYNC` | Register webhook in VTEX |
| `GET` | `/connections/:id/sku-mappings` | `INTEGRATIONS:READ` | List SKU mappings for a connection |
| `POST` | `/connections/:id/sku-mappings` | `INTEGRATIONS:CREATE` | Create a SKU mapping |
| `DELETE` | `/connections/:id/sku-mappings/:mappingId` | `INTEGRATIONS:DELETE` | Delete a SKU mapping |
| `GET` | `/connections/:id/unmatched` | `INTEGRATIONS:READ` | Get failed/unmatched sync logs |
| `POST` | `/connections/:id/retry/:syncLogId` | `INTEGRATIONS:SYNC` | Retry a specific failed sync |
| `POST` | `/connections/:id/retry-all` | `INTEGRATIONS:SYNC` | Retry all failed syncs for a connection |

### Public Endpoint

**Controller:** `VtexWebhookController` (`src/interfaces/http/integrations/vtex-webhook.controller.ts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/vtex/webhook/:accountName?secret=<secret>` | Webhook secret (query param) | Receive VTEX order status change notifications |

---

## Security

### Credential Encryption

- API keys and tokens are **never stored in plaintext**
- Encrypted at rest using **AES-256-GCM** (authenticated encryption with associated data)
- The encryption key is sourced from the `ENCRYPTION_KEY` environment variable (must be a 64-character hex string representing 32 bytes)
- Each encryption operation generates a unique random IV (12 bytes), ensuring identical plaintext produces different ciphertext
- The auth tag (16 bytes) provides integrity verification and tamper detection
- Credentials are decrypted only at the moment of API calls, never cached

### Webhook Security

- Each connection generates a unique `webhookSecret` (UUID v4) at creation time
- The webhook URL includes the secret as a query parameter: `/vtex/webhook/:accountName?secret=<webhookSecret>`
- The webhook controller validates the secret against the stored value before processing any payload
- Connection lookup uses `findByProviderAndAccountGlobal` (no org context from auth, since the endpoint is public)

### Access Control

All authenticated endpoints are protected by three guards:

1. `JwtAuthGuard` -- Validates JWT token
2. `RoleBasedAuthGuard` -- Validates user role
3. `PermissionGuard` -- Validates granular permissions via `@RequirePermissions()`

**Permissions defined in** `SYSTEM_PERMISSIONS` (`src/shared/constants/security.constants.ts`):

| Permission | Used for |
|---|---|
| `INTEGRATIONS:CREATE` | Creating connections and SKU mappings |
| `INTEGRATIONS:READ` | Listing/viewing connections, mappings, and unmatched SKUs |
| `INTEGRATIONS:UPDATE` | Updating connection settings |
| `INTEGRATIONS:DELETE` | Deleting connections and SKU mappings |
| `INTEGRATIONS:SYNC` | Testing connections, triggering syncs, registering webhooks, retrying failed syncs |
