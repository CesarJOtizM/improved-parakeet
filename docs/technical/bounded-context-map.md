# Bounded Context Map

## Overview

This document defines the bounded contexts in the multi-tenant inventory system and their integration patterns.

## Context Boundaries

### 1. Authentication & Authorization Context
**Responsibility**: User authentication, authorization, RBAC, JWT management

**Key Entities**:
- User
- Role
- Permission
- Session
- OTP

**Integration**:
- **Upstream**: None (entry point)
- **Downstream**: All other contexts (provides user context and permissions)

**Integration Pattern**: Published Language (JWT tokens, user claims)

---

### 2. Inventory Context
**Responsibility**: Core inventory management (products, warehouses, stock, movements, transfers)

**Key Entities**:
- Product
- Warehouse
- Stock
- Movement
- Transfer
- ReorderRule

**Integration**:
- **Upstream**: Authentication (requires user context)
- **Downstream**: Sales, Returns, Reports

**Integration Pattern**: 
- **With Sales/Returns**: Shared Kernel (Product, Warehouse entities)
- **With Reports**: Published Language (domain events)

---

### 3. Sales Context
**Responsibility**: Sales order management

**Key Entities**:
- Sale
- SaleLine

**Integration**:
- **Upstream**: Inventory (references Product, Warehouse), Authentication
- **Downstream**: Returns, Reports

**Integration Pattern**:
- **With Inventory**: Shared Kernel (Product, Warehouse)
- **With Returns**: Published Language (Sale reference)
- **With Reports**: Published Language (domain events)

---

### 4. Returns Context
**Responsibility**: Return order management

**Key Entities**:
- Return
- ReturnLine

**Integration**:
- **Upstream**: Sales (references Sale), Inventory, Authentication
- **Downstream**: Reports

**Integration Pattern**:
- **With Sales**: Published Language (Sale reference)
- **With Inventory**: Shared Kernel (Product, Warehouse)
- **With Reports**: Published Language (domain events)

---

### 5. Reports Context
**Responsibility**: Report generation and templates

**Key Entities**:
- Report
- ReportTemplate

**Integration**:
- **Upstream**: Inventory, Sales, Returns (reads data via domain events or direct queries)
- **Downstream**: None

**Integration Pattern**:
- **With Inventory/Sales/Returns**: Published Language (domain events, read models)

---

### 6. Import Context
**Responsibility**: Bulk data import

**Key Entities**:
- ImportBatch
- ImportRow

**Integration**:
- **Upstream**: Inventory (imports products, stock), Authentication
- **Downstream**: None

**Integration Pattern**:
- **With Inventory**: Published Language (imports create domain events)

---

### 7. Organization Context
**Responsibility**: Multi-tenant organization management

**Key Entities**:
- Organization
- OrganizationBranding (future)

**Integration**:
- **Upstream**: None (entry point for tenant resolution)
- **Downstream**: All contexts (provides orgId context)

**Integration Pattern**: Published Language (orgId in all entities)

---

## Integration Patterns Used

### Shared Kernel
- **Product** and **Warehouse** entities are shared between Inventory, Sales, and Returns contexts
- Changes to shared entities require coordination

### Published Language
- Domain events published by Inventory, Sales, Returns contexts
- Reports context subscribes to events for read model updates
- JWT tokens as published language for authentication

### Anti-Corruption Layer
- Repository interfaces act as anti-corruption layers
- Mappers convert between DTOs and domain entities

## Context Relationships Diagram

```
┌─────────────────────┐
│  Authentication     │
│  Context            │
└──────────┬──────────┘
           │ (provides user context)
           │
           ▼
┌─────────────────────┐
│  Organization       │
│  Context            │
└──────────┬──────────┘
           │ (provides orgId)
           │
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Inventory          │◄─────┤  Sales Context      │
│  Context            │      │  (Shared Kernel)    │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           │ (domain events)            │ (domain events)
           │                            │
           ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Reports Context    │◄─────┤  Returns Context    │
│  (subscribes)       │      │  (references Sale)  │
└─────────────────────┘      └─────────────────────┘
```

## Upstream/Downstream Relationships

| Context | Upstream | Downstream |
|---------|----------|------------|
| Authentication | None | All contexts |
| Organization | None | All contexts |
| Inventory | Authentication, Organization | Sales, Returns, Reports, Import |
| Sales | Inventory, Authentication, Organization | Returns, Reports |
| Returns | Sales, Inventory, Authentication, Organization | Reports |
| Reports | Inventory, Sales, Returns | None |
| Import | Inventory, Authentication, Organization | None |

## Notes

- **Tenant Isolation**: All contexts (except Organization) enforce orgId filtering
- **Event-Driven**: Reports context uses domain events for real-time updates
- **Shared Entities**: Product and Warehouse are shared kernel - changes require careful coordination
- **Future**: Branding context will be added as a subdomain of Organization context

