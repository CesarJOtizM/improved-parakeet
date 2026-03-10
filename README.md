<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<h1 align="center">Multi-Tenant Inventory System</h1>

> **[English](./README.md)** | [Espanol](./README.es.md)

<p align="center">
  Multi-tenant inventory management system built with <strong>NestJS</strong>, following <strong>Domain-Driven Design (DDD)</strong>, <strong>Hexagonal Architecture</strong>, and <strong>Screaming Architecture</strong> principles.
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-0.0.1-blue.svg" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/bun-%3E%3D1.0.0-orange.svg" alt="Bun Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/NestJS-11+-red.svg" alt="NestJS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-15+-blue.svg" alt="PostgreSQL" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Prisma-7+-purple.svg" alt="Prisma" /></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/tests-7749%20total-success.svg" alt="Tests" /></a>
  <a href="#"><img src="https://img.shields.io/badge/passing-7661-brightgreen.svg" alt="Passing" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage" /></a>
  <a href="#"><img src="https://img.shields.io/badge/build-passing-success.svg" alt="Build Status" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript Strict" /></a>
</p>

---

## Table of Contents

- [Description](#description)
- [Key Features](#key-features)
- [Modules](#modules)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [Documentation Index](#documentation-index)

---

## Description

Inventory management system designed to optimize control, tracking, and management of stock across multiple warehouses and organizations. The system provides real-time visibility into entries, exits, movements, and product availability, improving operational efficiency and supporting decision-making through reliable, traceable reports. It also integrates with external e-commerce platforms (VTEX) for automated order synchronization.

### Objectives

| Objective | Description |
| --- | --- |
| **Real-time control** | Instant visibility of inventory across multiple warehouses and organizations |
| **Full traceability** | Detailed record of all inventory movements |
| **Loss reduction** | Automatic low/max stock alerts to prevent stockouts |
| **Decision support** | Reliable reports in multiple formats (PDF, Excel, CSV) |
| **E-commerce integration** | Automated sync with VTEX (orders, products, fulfillment) |
| **Scalability** | Designed for 50+ warehouses and 100,000+ products |

---

## Key Features

### Authentication & Authorization
- **JWT Authentication** with access tokens (15 min) and refresh tokens (7 days)
- **RBAC** (Role-Based Access Control) with granular permissions (80+)
- **Predefined roles**: ADMIN, SUPERVISOR, WAREHOUSE_OPERATOR, CONSULTANT, IMPORT_OPERATOR
- **Custom roles**: Each organization can create roles with specific permissions
- **Multi-tenancy**: Complete data isolation per organization
- **Rate limiting** and token blacklisting with Redis

### Inventory Management
- **Products**: Unique SKU, categories, units of measure, barcodes, status tracking
- **Warehouses & Locations**: Multiple warehouse management with internal locations
- **Movements**: Entries, exits, and adjustments (IN/OUT/ADJUST_IN/ADJUST_OUT/TRANSFER_IN/TRANSFER_OUT) with DRAFT -> POSTED -> VOID workflow
- **Transfers**: Inter-warehouse with states (DRAFT, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED)
- **Multi-Company**: Business lines per organization with global filtering
- **Valuation**: Automatic Weighted Moving Average (WMA/PPM)
- **Stock alerts**: Configurable notifications (frequency, recipients, alert types)

### Sales & Returns
- **Sales**: Complete workflow DRAFT -> CONFIRMED -> PICKING -> SHIPPED -> COMPLETED
- **Automatic numbering**: SALE-YYYY-NNN / RETURN-YYYY-NNN
- **Returns**: Customer (RETURN_CUSTOMER) and supplier (RETURN_SUPPLIER) with original price tracking
- **Product Swap**: Product exchange in sales with automatic inventory adjustments
- **Automatic inventory movements** generated from sales/returns

### Contacts
- **Contact management**: Customers, suppliers, and other business parties
- **Unique identification** per organization with email, phone, address
- **Integration**: Contacts linked to sales and external platform orders

### Third-Party Integrations
- **VTEX e-commerce**: Bidirectional order synchronization
- **Webhook + polling**: Dual sync strategy for reliability
- **SKU mapping**: Map external product IDs to internal products
- **Encrypted credentials**: Secure storage of API keys and tokens
- **Sync logging**: Full audit trail with retry capability

### Reports & Analytics
- **17 report types**: Available inventory, movement history, valuation, low stock, ABC Analysis (Pareto), Dead Stock, sales by product/warehouse, returns by type/product, financial, turnover
- **Export**: PDF, Excel, CSV
- **Dashboard**: Dedicated `/dashboard/metrics` endpoint with 7 optimized queries

### Bulk Import
- **Mass import**: Products, movements, warehouses from Excel/CSV
- **Preview/Execute flow**: Validation before importing

### Audit
- **Complete logging**: All operations with entity type, action, HTTP method, user, timestamps
- **Advanced filters**: By entity type, action, HTTP method, user, date range

### Resilience
- **Circuit Breaker**: Cascade failure protection (CLOSED -> OPEN -> HALF_OPEN)
- **Retry**: Exponential backoff with jitter for external services
- **Timeout**: Configurable wrapper per operation
- **ResilientCall**: Composition of all three patterns
- **Graceful Shutdown**: Orderly closure of Prisma connections and processes

---

## Modules

The system is organized into 9 bounded contexts. Each module has its own detailed documentation.

| Module | Type | Description | Docs |
| --- | --- | --- | --- |
| **Inventory** | Core Domain | Products, warehouses, movements, transfers, stock, companies | [inventory.md](docs/modules/inventory.md) |
| **Authentication** | Generic | JWT auth, RBAC, users, roles, sessions | [authentication.md](docs/modules/authentication.md) |
| **Sales** | Supporting | Sales orders with complete lifecycle workflow | [sales.md](docs/modules/sales.md) |
| **Returns** | Supporting | Customer and supplier return management | [returns.md](docs/modules/returns.md) |
| **Contacts** | Supporting | Customer/supplier contact management | [contacts.md](docs/modules/contacts.md) |
| **Integrations** | Supporting | Third-party integrations (VTEX) | [integrations.md](docs/modules/integrations.md) |
| **Reports** | Supporting | 17 report types with export capabilities | [reports.md](docs/modules/reports.md) |
| **Import** | Supporting | Bulk Excel/CSV import operations | [import.md](docs/modules/import.md) |
| **Organization** | Generic | Multi-tenancy, settings, dashboard, audit | [organization.md](docs/modules/organization.md) |

Cross-cutting documentation:

| Module | Description | Docs |
| --- | --- | --- |
| **Shared** | Result monad, domain errors, specifications, guards, interceptors | [shared.md](docs/modules/shared.md) |
| **Infrastructure** | Database, repositories, resilience, external services, jobs | [infrastructure.md](docs/modules/infrastructure.md) |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/improved-parakeet.git
cd improved-parakeet

# Install dependencies (Bun recommended)
bun install

# Configure environment
cp example.env .env

# Start services with Docker
bun run docker:up

# Run migrations and seeds
bun run db:migrate
bun run db:seed

# Start in development mode
bun run dev

# Open http://localhost:3000/api for Swagger documentation
```

---

## Installation

### Prerequisites

| Tool | Version | Required |
| --- | --- | --- |
| Node.js | 18+ | Yes |
| Bun | 1.0+ | Recommended |
| PostgreSQL | 15+ | Yes |
| Redis | 7+ | Optional (sessions/cache) |
| Docker | 20+ | Optional (development) |

### Step by Step

#### 1. Clone

```bash
git clone https://github.com/your-username/improved-parakeet.git
cd improved-parakeet
```

#### 2. Install Dependencies

```bash
# Bun (recommended)
bun install

# npm
npm install
```

#### 3. Environment Variables

```bash
cp example.env .env
# Edit .env with your configuration
```

#### 4. Database Setup

**Development:**

```bash
# Set DATABASE_URL in .env with your external connection
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Start Redis and app
bun run docker:dev
```

**Production:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. Migrations

```bash
bun run db:generate
bun run db:migrate
bun run db:seed  # optional
```

#### 6. Start Server

```bash
bun run dev        # Development with hot reload
bun run debug      # Debug mode
bun run build && bun run prod  # Production
```

---

## Configuration

### Main Environment Variables

```env
# General
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_system

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=900      # 15 minutes
JWT_REFRESH_TOKEN_EXPIRES_IN=604800  # 7 days

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS_PER_IP=100

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=api

# Integration encryption key (for VTEX credentials)
INTEGRATION_ENCRYPTION_KEY=your-32-char-encryption-key
```

<details>
<summary>All environment variables</summary>

See `example.env` for a complete list including rate limiting, logging, SMTP, storage, and multi-tenant configurations.

</details>

---

## Usage

### Available Scripts

```bash
# Development
bun run dev              # Dev mode with watch
bun run dev:tsx          # Dev mode with tsx
bun run debug            # Debug mode with inspector

# Build & Production
bun run build            # Compile TypeScript
bun run prod             # Run in production
bun run start:prod       # Run migrations then production

# Database
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Run migrations (dev)
bun run db:migrate:deploy # Run migrations (prod)
bun run db:studio        # Open Prisma Studio
bun run db:seed          # Seed demo data
bun run db:reset         # Reset database

# Testing
bun run test             # Unit tests
bun run test:watch       # Watch mode
bun run test:cov         # Coverage report
bun run test:ci          # CI mode (unit only)
bun run test:integration # Integration tests
bun run test:e2e         # End-to-end tests

# Code Quality
bun run lint             # ESLint + fix
bun run lint:check       # Check only
bun run format           # Prettier format
bun run format:check     # Check only

# Docker
bun run docker:up        # Start services
bun run docker:down      # Stop services
bun run docker:logs      # View logs
bun run docker:dev       # Full dev environment
```

### API Usage Example

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# 2. Create a product
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid" \
  -H "Content-Type: application/json" \
  -d '{"sku": "PROD-001", "name": "Example Product", "unit": {"code": "UNIT", "name": "Unit", "precision": 0}, "costMethod": "AVG"}'

# 3. List products
curl http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid"
```

---

## API Documentation

### Main Endpoints

| Module | Endpoint | Description |
| --- | --- | --- |
| **Auth** | `POST /auth/login` | Login |
| | `POST /auth/refresh` | Refresh token |
| | `POST /auth/logout` | Logout |
| **Users** | `GET /users` | List users |
| | `POST /users` | Create user |
| | `POST /users/:id/roles` | Assign role |
| **Products** | `GET /products` | List products |
| | `POST /products` | Create product |
| | `PUT /products/:id` | Update product |
| **Warehouses** | `GET /warehouses` | List warehouses |
| | `POST /warehouses` | Create warehouse |
| **Movements** | `GET /movements` | List movements |
| | `POST /movements` | Create movement |
| | `POST /movements/:id/post` | Post movement |
| **Transfers** | `GET /transfers` | List transfers |
| | `POST /transfers` | Create transfer |
| **Sales** | `GET /sales` | List sales |
| | `POST /sales` | Create sale |
| | `POST /sales/:id/confirm` | Confirm sale |
| **Returns** | `GET /returns` | List returns |
| | `POST /returns` | Create return |
| **Contacts** | `GET /contacts` | List contacts |
| | `POST /contacts` | Create contact |
| | `PUT /contacts/:id` | Update contact |
| **Integrations** | `GET /integrations/connections` | List connections |
| | `POST /integrations/connections` | Create connection |
| | `POST /integrations/connections/:id/test` | Test connection |
| | `GET /integrations/sku-mappings` | List SKU mappings |
| | `POST /integrations/sku-mappings` | Create SKU mapping |
| | `GET /integrations/unmatched-skus` | List unmatched SKUs |
| | `POST /integrations/sync/:id/retry` | Retry failed sync |
| **VTEX Webhook** | `POST /integrations/vtex/webhook` | Receive VTEX webhook |
| **Reports** | `GET /reports/{mod}/{name}/view` | View report data |
| | `POST /reports/{mod}/{name}/export` | Export report |
| **Dashboard** | `GET /dashboard/metrics` | Dashboard metrics |
| **Audit** | `GET /audit/logs` | List audit logs |
| | `GET /audit/users/:id/activity` | User activity |
| **Companies** | `GET /inventory/companies` | List companies |
| | `POST /inventory/companies` | Create company |
| **Imports** | `POST /imports/preview` | Import preview |
| | `POST /imports/execute` | Execute import |

### Interactive Documentation

- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)
- **OpenAPI JSON**: [http://localhost:3000/api-json](http://localhost:3000/api-json)

### Postman Collections

Available in `docs/postman/`. See [Postman Guide](docs/postman/USER_GUIDE.md).

---

## Architecture

### Hexagonal Architecture Diagram

```mermaid
flowchart TB
    subgraph Interfaces["INTERFACES (HTTP)"]
        Controllers
        DTOs
        Guards
        Interceptors
        Decorators
    end

    subgraph Application["APPLICATION"]
        UseCases[Use Cases - 150+]
        AppServices[Application Services]
        EventHandlers[Event Handlers]
    end

    subgraph Domain["DOMAIN"]
        Entities
        ValueObjects[Value Objects]
        Aggregates
        DomainEvents[Domain Events]
        DomainServices[Domain Services]
        Ports[Repository Interfaces]
    end

    subgraph Infrastructure["INFRASTRUCTURE"]
        PrismaRepos[Prisma Repositories - 20+]
        Redis
        ExternalServices[External Services]
        VtexClient[VTEX API Client]
    end

    Interfaces --> Application
    Application --> Domain
    Infrastructure --> Domain

    style Interfaces fill:#3b82f6,color:#fff
    style Application fill:#10b981,color:#fff
    style Domain fill:#f59e0b,color:#fff
    style Infrastructure fill:#8b5cf6,color:#fff
```

### HTTP Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant UseCase
    participant Domain
    participant Repository
    participant Database

    Client->>Controller: HTTP Request
    Controller->>Controller: Validate DTO
    Controller->>UseCase: Execute(request)
    UseCase->>Domain: Business Logic
    Domain->>Repository: Save/Query
    Repository->>Database: SQL Query
    Database-->>Repository: Result
    Repository-->>Domain: Entity
    Domain-->>UseCase: Result<T, Error>
    UseCase-->>Controller: Response DTO
    Controller-->>Client: HTTP Response
```

### Bounded Contexts (DDD)

```mermaid
graph TB
    subgraph Core["CORE DOMAIN"]
        Inventory["Inventory<br/>Products, Warehouses<br/>Movements, Transfers"]
    end

    subgraph Supporting["SUPPORTING DOMAINS"]
        Sales["Sales<br/>Orders, Workflow"]
        Returns["Returns<br/>Customer & Supplier"]
        Contacts["Contacts<br/>Customers, Suppliers"]
        Integrations["Integrations<br/>VTEX, Webhooks"]
        Reports["Reports<br/>Analytics, Exports"]
        Imports["Imports<br/>Bulk Operations"]
    end

    subgraph Generic["GENERIC SUBDOMAINS"]
        Auth["Authentication<br/>Users, Roles, Sessions"]
        Org["Organization<br/>Multi-tenancy"]
    end

    Sales --> Inventory
    Sales --> Contacts
    Returns --> Sales
    Returns --> Inventory
    Reports --> Inventory
    Reports --> Sales
    Imports --> Inventory
    Integrations --> Inventory
    Integrations --> Sales
    Integrations --> Contacts
    Auth --> Org

    style Core fill:#f59e0b,color:#fff
    style Supporting fill:#3b82f6,color:#fff
    style Generic fill:#6b7280,color:#fff
```

### Project Structure (Screaming Architecture)

```
src/
├── inventory/            # Core: Products, warehouses, movements, transfers
│   ├── products/         #   Product domain (entities, VOs, ports, mappers)
│   ├── warehouses/       #   Warehouse domain
│   ├── movements/        #   Inventory movement domain
│   ├── transfers/        #   Inter-warehouse transfer domain
│   ├── companies/        #   Multi-company (business lines)
│   ├── stock/            #   Stock balance domain
│   └── locations/        #   Warehouse location domain
├── sales/                # Sales order domain
├── returns/              # Return order domain
├── contacts/             # Contact management domain
├── integrations/         # Third-party integrations
│   ├── shared/           #   Shared entities, ports, encryption
│   └── vtex/             #   VTEX integration (sync, webhook, polling)
├── authentication/       # JWT auth, RBAC, security guards
├── organization/         # Multi-tenancy management
├── report/               # 17 report types
├── import/               # Bulk import operations
├── application/          # Use cases (150+ files)
│   ├── authUseCases/
│   ├── productUseCases/
│   ├── saleUseCases/
│   ├── contactUseCases/
│   ├── integrationUseCases/
│   ├── reportUseCases/
│   ├── eventHandlers/
│   └── ...
├── infrastructure/       # Output adapters (Prisma, Redis, external services)
│   ├── database/         #   Prisma schema, migrations, 20+ repositories
│   ├── externalServices/ #   Email, notifications, file parsing
│   ├── resilience/       #   CircuitBreaker, Retry, Timeout
│   └── jobs/             #   Scheduled tasks
├── interfaces/http/      # Input adapters (HTTP controllers)
│   ├── inventory/        #   Products, categories, warehouses, stock
│   ├── sales/            #   Sales endpoints
│   ├── returns/          #   Returns endpoints
│   ├── contacts/         #   Contacts endpoints
│   ├── integrations/     #   Integration + VTEX webhook endpoints
│   ├── dashboard/        #   Dashboard metrics
│   └── ...
├── shared/               # Cross-cutting concerns
│   ├── domain/           #   Result monad, base classes, events, specs
│   ├── guards/           #   PermissionGuard
│   ├── interceptors/     #   Response interceptor
│   ├── filters/          #   Global exception filter
│   └── infrastructure/   #   Cache, resilience patterns
└── healthCheck/          # Health monitoring
```

### Entity Model

```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Product : owns
    Organization ||--o{ Warehouse : owns
    Organization ||--o{ Sale : owns
    Organization ||--o{ Contact : manages
    Organization ||--o{ IntegrationConnection : configures

    Product ||--o{ MovementLine : "appears in"
    Product ||--o{ SaleLine : "sold in"
    Product ||--o{ IntegrationSkuMapping : "mapped by"

    Warehouse ||--o{ Location : contains
    Warehouse ||--o{ Movement : receives

    Movement ||--o{ MovementLine : contains

    Sale ||--o{ SaleLine : contains
    Sale ||--o{ Return : "may have"
    Sale }o--o| Contact : "sold to"

    Transfer ||--o{ TransferLine : contains

    User }o--o{ Role : has
    Role }o--o{ Permission : grants

    IntegrationConnection ||--o{ IntegrationSkuMapping : has
    IntegrationConnection ||--o{ IntegrationSyncLog : logs
```

### Implemented Patterns

| Pattern | Implementation | Location |
| --- | --- | --- |
| **Result Monad** | `Result<T, DomainError>` | `@shared/domain/result` |
| **Ports & Adapters** | Repository + Service interfaces | `{domain}/domain/ports/` |
| **Mappers** | DTO <-> Domain conversion | `{domain}/mappers/` |
| **Domain Events** | `IDomainEventDispatcher` | `@shared/domain/events` |
| **Aggregate Root** | Base entity class | `@shared/domain/base` |
| **Value Objects** | Immutable domain concepts | `{domain}/domain/valueObjects/` |
| **Specification** | Composable business rules | `@shared/domain/specifications` |
| **Circuit Breaker** | Cascade failure protection | `@shared/infrastructure/resilience` |
| **Retry** | Exponential backoff with jitter | `@shared/infrastructure/resilience` |
| **Unit of Work** | Atomic transactions | `infrastructure/database/unitOfWork` |

---

## Testing

### Test Statistics

| Type | Files | Tests | Status |
| --- | --- | --- | --- |
| **Unit** | 450 | 7,661 | Passing |
| **Integration** | 12+ | 100+ | Passing |
| **E2E** | 14 | 88+ | Passing |
| **Total** | 465 | 7,749 | 7,661 passing |

### Code Coverage

| Metric | Percentage |
| --- | --- |
| **Statements** | 97.26% |
| **Branches** | 88.43% |
| **Functions** | 96.66% |
| **Lines** | 97.35% |

Global threshold: 70% (jest.config.js). Exclusions: `instrument.ts`, `seed.ts`, `seeds/**/*.ts`.

### Run Tests

```bash
bun run test           # Unit tests
bun run test:cov       # With coverage
bun run test:e2e       # End-to-end
bun run test:watch     # Watch mode
bun run test:integration # Integration tests
```

### Test Structure

```
test/
├── application/              # Use case tests (140 files)
│   ├── auditUseCases/        #   Audit log queries
│   ├── authUseCases/         #   Login, register, token refresh
│   ├── categoryUseCases/     #   Category CRUD
│   ├── companyUseCases/      #   Company CRUD + listing
│   ├── contactUseCases/      #   Contact CRUD
│   ├── dashboardUseCases/    #   Dashboard metrics
│   ├── eventHandlers/        #   Domain event handlers (20+)
│   ├── importUseCases/       #   Import preview/execute
│   ├── integrationUseCases/  #   Integration connection, SKU mapping, sync
│   ├── movementUseCases/     #   Movement CRUD + posting
│   ├── organizationUseCases/ #   Organization settings
│   ├── productUseCases/      #   Product CRUD + search
│   ├── reorderRuleUseCases/  #   Reorder rule management
│   ├── reportUseCases/       #   Report generation
│   ├── returnUseCases/       #   Return CRUD + confirmation
│   ├── roleUseCases/         #   Role management
│   ├── saleUseCases/         #   Sale lifecycle + swap
│   ├── stockUseCases/        #   Stock queries
│   ├── transferUseCases/     #   Transfer workflow
│   ├── userUseCases/         #   User management
│   └── warehouseUseCases/    #   Warehouse CRUD
├── authentication/           # Auth domain tests (guards, strategies, decorators)
├── infrastructure/           # Repository + service tests (34 files)
│   ├── database/
│   │   ├── repositories/     #   20+ Prisma repository tests
│   │   ├── services/         #   Unit of work, query optimizer
│   │   └── utils/            #   Query utilities
│   ├── externalServices/     #   Email, notifications, file parsing, templates
│   └── jobs/                 #   Scheduled task tests
├── integrations/             # VTEX integration tests (12 files)
│   ├── shared/               #   Encryption, entities
│   └── vtex/                 #   API client, sync, polling, webhook
├── interfaces/http/          # Controller tests (24 files)
│   ├── audit/                #   Audit log endpoints
│   ├── contacts/             #   Contact endpoints
│   ├── dashboard/            #   Dashboard metrics
│   ├── import/               #   Import preview/execute
│   ├── integrations/         #   Integration + webhook controllers
│   ├── inventory/            #   Products, categories, warehouses, stock
│   ├── report/               #   Report view/export/stream
│   ├── returns/              #   Return endpoints
│   ├── sales/                #   Sale endpoints
│   └── users/                #   User + role endpoints
├── inventory/                # Inventory domain tests (71 files)
│   ├── locations/            #   Location entities + mappers
│   ├── movements/            #   Movement entities + mappers
│   ├── products/             #   Product entities, factories, mappers
│   ├── stock/                #   Stock entities + DTOs
│   ├── transfers/            #   Transfer entities
│   └── warehouses/           #   Warehouse entities, factories, mappers
├── shared/                   # Cross-cutting tests (57 files)
│   ├── domain/               #   Result monad, base classes, events, specs
│   ├── filters/              #   Global exception filter
│   ├── guards/               #   Permission guard
│   ├── infrastructure/       #   Cache, resilience patterns
│   ├── interceptors/         #   Audit, metrics, response
│   └── services/             #   Metrics, structured logger
├── report/                   # Report domain tests
│   ├── domain/               #   Report generation service (196 tests)
│   └── interceptors/         #   Report logging
├── sales/                    # Sales domain tests
├── returns/                  # Returns domain tests
├── organization/             # Organization domain tests
└── import/                   # Import domain tests + e2e
```

---

## Contributing

Contributions are welcome!

### Workflow

1. **Fork** the repository
2. **Create** a branch from `dev`:
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Develop** following the conventions
4. **Run** tests:
   ```bash
   bun run test && bun run lint && bun run format && bun run build
   ```
5. **Commit** using conventional commits:
   ```bash
   git commit -m "feat(inventory): add stock alert notifications"
   ```
6. **Push** and create a Pull Request to `dev`

### Code Conventions

| Aspect | Convention |
| --- | --- |
| **Code language** | English (variables, functions, messages) |
| **Variables/Functions** | camelCase |
| **Classes** | PascalCase |
| **Interfaces** | `I` + PascalCase (e.g., `IProductRepository`) |
| **Files** | camelCase.ts |
| **Folders** | camelCase |
| **Tests** | `Given-When-Then` pattern |
| **Imports** | Path aliases (`@src/*`, `@inventory/*`, etc.) |

### Conventional Commits

```bash
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
refactor(scope): code restructuring
test(scope): add/update tests
chore(scope): maintenance tasks
```

### PR Checklist

- [ ] Code follows project conventions
- [ ] Tests written and passing
- [ ] Linter passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] Documentation updated if needed
- [ ] Swagger updated for new endpoints

---

## License

This project is under the **MIT License**. See [LICENSE](LICENSE) for details.

```
MIT License

Copyright (c) 2025 Cesar Javier Ortiz Montero

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Author

<p align="center">
  <strong>Cesar Javier Ortiz Montero</strong>
</p>

---

## Documentation Index

### Module Documentation

| Document | Description |
| --- | --- |
| [Inventory Module](docs/modules/inventory.md) | Products, warehouses, movements, transfers, stock |
| [Authentication Module](docs/modules/authentication.md) | JWT auth, RBAC, users, roles, sessions |
| [Sales Module](docs/modules/sales.md) | Sales order lifecycle and workflow |
| [Returns Module](docs/modules/returns.md) | Customer and supplier returns |
| [Contacts Module](docs/modules/contacts.md) | Contact management |
| [Integrations Module](docs/modules/integrations.md) | VTEX integration, webhooks, sync |
| [Reports Module](docs/modules/reports.md) | 17 report types and exports |
| [Import Module](docs/modules/import.md) | Bulk import from Excel/CSV |
| [Organization Module](docs/modules/organization.md) | Multi-tenancy, settings, dashboard, audit |
| [Shared Module](docs/modules/shared.md) | Result monad, errors, specifications, guards |
| [Infrastructure Module](docs/modules/infrastructure.md) | Database, repositories, resilience, jobs |

### Technical Documentation

| Document | Description |
| --- | --- |
| [Architecture](docs/technical/architecture.md) | Detailed system architecture |
| [Design Patterns](docs/technical/patterns.md) | 14+ implemented patterns |
| [API Reference](docs/technical/api-reference.md) | Complete endpoint reference |
| [Bounded Context Map](docs/technical/bounded-context-map.md) | DDD context map (9 contexts) |
| [Result Monad Guide](docs/technical/result-monad-guide.md) | Result<T, E> pattern guide |
| [Data Model](docs/technical/data_model.md) | Database structure |
| [Testing Guide](docs/technical/testing-structure.md) | Test structure and conventions |
| [Error Codes](docs/technical/error-codes.md) | Error code catalog (100+) |

### API Testing

| Document | Description |
| --- | --- |
| [Postman Collections](docs/postman/) | API test collections |
| [Postman User Guide](docs/postman/USER_GUIDE.md) | How to use Postman collections |

---

<p align="center">
  <sub>Built with NestJS | Powered by Bun | PostgreSQL + Prisma + Redis</sub>
</p>
