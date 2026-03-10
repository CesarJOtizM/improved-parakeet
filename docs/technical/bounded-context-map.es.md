> [English](./bounded-context-map.md) | **[Español](./bounded-context-map.es.md)**

# Mapa de Contextos Acotados

## Descripcion General

Este documento define los contextos acotados (bounded contexts) del sistema de inventario multi-tenant y sus patrones de integracion.

## Limites de Contexto

### 1. Contexto de Autenticacion y Autorizacion
**Responsabilidad**: Autenticacion de usuarios, autorizacion, RBAC, gestion de JWT

**Entidades Clave**:
- User
- Role
- Permission
- Session
- OTP

**Integracion**:
- **Upstream**: Ninguno (punto de entrada)
- **Downstream**: Todos los demas contextos (provee contexto de usuario y permisos)

**Patron de Integracion**: Published Language (tokens JWT, claims de usuario)

---

### 2. Contexto de Inventario
**Responsabilidad**: Gestion central de inventario (productos, bodegas, stock, movimientos, transferencias)

**Entidades Clave**:
- Product
- Warehouse
- Stock
- Movement
- Transfer
- ReorderRule

**Integracion**:
- **Upstream**: Authentication (requiere contexto de usuario)
- **Downstream**: Sales, Returns, Reports

**Patron de Integracion**:
- **Con Sales/Returns**: Shared Kernel (entidades Product, Warehouse)
- **Con Reports**: Published Language (eventos de dominio)

---

### 3. Contexto de Ventas
**Responsabilidad**: Gestion de ordenes de venta

**Entidades Clave**:
- Sale
- SaleLine

**Integracion**:
- **Upstream**: Inventory (referencia Product, Warehouse), Authentication
- **Downstream**: Returns, Reports

**Patron de Integracion**:
- **Con Inventory**: Shared Kernel (Product, Warehouse)
- **Con Returns**: Published Language (referencia de Sale)
- **Con Reports**: Published Language (eventos de dominio)

---

### 4. Contexto de Devoluciones
**Responsabilidad**: Gestion de ordenes de devolucion

**Entidades Clave**:
- Return
- ReturnLine

**Integracion**:
- **Upstream**: Sales (referencia Sale), Inventory, Authentication
- **Downstream**: Reports

**Patron de Integracion**:
- **Con Sales**: Published Language (referencia de Sale)
- **Con Inventory**: Shared Kernel (Product, Warehouse)
- **Con Reports**: Published Language (eventos de dominio)

---

### 5. Contexto de Reportes
**Responsabilidad**: Generacion de reportes y plantillas

**Entidades Clave**:
- Report
- ReportTemplate

**Integracion**:
- **Upstream**: Inventory, Sales, Returns (lee datos via eventos de dominio o consultas directas)
- **Downstream**: Ninguno

**Patron de Integracion**:
- **Con Inventory/Sales/Returns**: Published Language (eventos de dominio, modelos de lectura)

---

### 6. Contexto de Importacion
**Responsabilidad**: Importacion masiva de datos

**Entidades Clave**:
- ImportBatch
- ImportRow

**Integracion**:
- **Upstream**: Inventory (importa productos, stock), Authentication
- **Downstream**: Ninguno

**Patron de Integracion**:
- **Con Inventory**: Published Language (las importaciones crean eventos de dominio)

---

### 7. Contexto de Organizacion
**Responsabilidad**: Gestion de organizaciones multi-tenant

**Entidades Clave**:
- Organization
- OrganizationBranding (futuro)

**Integracion**:
- **Upstream**: Ninguno (punto de entrada para resolucion de tenant)
- **Downstream**: Todos los contextos (provee contexto de orgId)

**Patron de Integracion**: Published Language (orgId en todas las entidades)

---

### 8. Contexto de Contactos
**Responsabilidad**: Gestion de contactos de clientes y proveedores

**Entidades Clave**:
- Contact (name, identification, type, email, phone, address)

**Integracion**:
- **Upstream**: Authentication (requiere contexto de usuario), Organization (provee orgId)
- **Downstream**: Sales (provee referencia de contacto para ventas), Integrations (provee resolucion de contactos)

**Patron de Integracion**:
- **Con Sales**: Shared Kernel (entidad Contact referenciada en Sale)
- **Con Integrations**: Published Language (resolucion de contacto por email/identificacion)

---

### 9. Contexto de Integraciones
**Responsabilidad**: Integraciones con plataformas de e-commerce de terceros (VTEX, etc.)

**Entidades Clave**:
- IntegrationConnection (credenciales del proveedor, estrategia de sync, estado)
- IntegrationSkuMapping (mapeo de SKU externo a producto interno)
- IntegrationSyncLog (historial de sync, rastreo de errores, gestion de reintentos)

**Integracion**:
- **Upstream**: Inventory (referencia Product), Sales (crea ordenes de venta), Contacts (resuelve/crea contactos), Authentication, Organization
- **Downstream**: Ninguno (contexto terminal que sincroniza datos entrantes/salientes)

**Patron de Integracion**:
- **Con Inventory**: Shared Kernel (entidad Product via mapeo de SKU)
- **Con Sales**: Published Language (crea ventas desde ordenes externas)
- **Con Contacts**: Published Language (resuelve contactos por email/documento)

**Sub-contextos**:
- **VTEX**: Sincronizacion de ordenes via polling y webhooks, sync saliente para fulfillment

---

## Patrones de Integracion Utilizados

### Shared Kernel
- Las entidades **Product** y **Warehouse** son compartidas entre los contextos de Inventory, Sales y Returns
- Los cambios en entidades compartidas requieren coordinacion

### Published Language
- Eventos de dominio publicados por los contextos de Inventory, Sales, Returns
- El contexto de Reports se suscribe a eventos para actualizar modelos de lectura
- Tokens JWT como lenguaje publicado para autenticacion

### Anti-Corruption Layer
- Las interfaces de repositorio actuan como capas anti-corrupcion
- Los mappers convierten entre DTOs y entidades de dominio

## Diagrama de Relaciones entre Contextos

```
┌─────────────────────┐
│  Authentication     │
│  Context            │
└──────────┬──────────┘
           │ (provee contexto de usuario)
           │
           ▼
┌─────────────────────┐
│  Organization       │
│  Context            │
└──────────┬──────────┘
           │ (provee orgId)
           │
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Inventory          │◄─────┤  Sales Context      │
│  Context            │      │  (Shared Kernel)    │
└──────┬───┬──────────┘      └──────────┬──────────┘
       │   │                            │
       │   │  ┌─────────────────────┐   │
       │   └──┤  Contacts Context   │   │
       │      │  (cliente/proveedor)│───┘
       │      └─────────┬───────────┘
       │                │
       │   (eventos de dominio) │ (eventos de dominio)
       │                │
       ▼                ▼
┌──────────────────┐  ┌─────────────────────┐
│  Reports Context │◄─┤  Returns Context    │
│  (se suscribe)   │  │  (referencia Sale)  │
└──────────────────┘  └─────────────────────┘
       ▲
       │
┌──────┴──────────────┐
│  Integrations       │──→ Inventory, Sales, Contacts
│  Context (VTEX)     │
└─────────────────────┘
```

## Relaciones Upstream/Downstream

| Contexto | Upstream | Downstream |
|----------|----------|------------|
| Authentication | Ninguno | Todos los contextos |
| Organization | Ninguno | Todos los contextos |
| Inventory | Authentication, Organization | Sales, Returns, Reports, Import, Integrations |
| Sales | Inventory, Contacts, Authentication, Organization | Returns, Reports |
| Returns | Sales, Inventory, Authentication, Organization | Reports |
| Reports | Inventory, Sales, Returns | Ninguno |
| Import | Inventory, Authentication, Organization | Ninguno |
| Contacts | Authentication, Organization | Sales, Integrations |
| Integrations | Inventory, Sales, Contacts, Authentication, Organization | Ninguno |

## Notas

- **Aislamiento de Tenant**: Todos los contextos (excepto Organization) filtran por orgId.
- **Orientado a Eventos**: El contexto de reportes usa eventos de dominio para actualizaciones en tiempo real.
- **Entidades Compartidas**: Las entidades Product, Warehouse y Contact son kernel compartido -- los cambios requieren coordinacion cuidadosa.
- **Integraciones**: El contexto de Integraciones conecta plataformas e-commerce externas (VTEX) con el inventario y ventas internas.
- **Futuro**: El contexto de Branding sera agregado como subdominio del contexto de Organization.
