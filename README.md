<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<h1 align="center">📦 Sistema de Inventarios Multi-Tenant</h1>

<p align="center">
  Sistema de gestión de inventarios multi-tenant construido con <strong>NestJS</strong>, siguiendo principios de <strong>Domain-Driven Design (DDD)</strong>, <strong>Arquitectura Hexagonal</strong> y <strong>Screaming Architecture</strong>.
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
  <a href="#"><img src="https://img.shields.io/badge/tests-5288%20passing-success.svg" alt="Tests Passing" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage" /></a>
  <a href="#"><img src="https://img.shields.io/badge/build-passing-success.svg" alt="Build Status" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript Strict" /></a>
</p>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características-principales)
- [Quick Start](#-quick-start)
- [Instalación](#-instalación-y-configuración)
- [Configuración](#%EF%B8%8F-configuración)
- [Uso](#-uso)
- [API Documentation](#-api-documentation)
- [Arquitectura](#%EF%B8%8F-arquitectura)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [Contribución](#-contribución)
- [Licencia](#-licencia)
- [Autor](#-autor)

---

## 📋 Descripción

Sistema de inventarios diseñado para optimizar el control, registro y gestión de existencias en múltiples bodegas y organizaciones. El sistema garantiza visibilidad en tiempo real sobre entradas, salidas, movimientos y disponibilidad de productos, mejorando la eficiencia operativa y facilitando la toma de decisiones a través de reportes confiables y trazables.

### 🎯 Objetivos

| Objetivo                   | Descripción                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| **Control en tiempo real** | Visibilidad instantánea del inventario en múltiples bodegas y organizaciones |
| **Trazabilidad completa**  | Registro detallado de todos los movimientos de inventario                    |
| **Reducción de pérdidas**  | Alertas automáticas de stock bajo/máximo para prevenir quiebres              |
| **Soporte a decisiones**   | Reportes confiables en múltiples formatos (PDF, Excel, CSV)                  |
| **Escalabilidad**          | Diseñado para 50+ bodegas y 100,000+ productos                               |

---

## ✨ Características Principales

### 🔐 Autenticación y Autorización

- **JWT Authentication** con access tokens (15 min) y refresh tokens (7 días)
- **Sistema RBAC** (Role-Based Access Control) con permisos granulares
- **Roles predefinidos**: ADMIN, SUPERVISOR, WAREHOUSE_OPERATOR, CONSULTANT, IMPORT_OPERATOR
- **Roles personalizados**: Cada organización puede crear roles con permisos específicos
- **Multi-tenancy**: Aislamiento completo de datos por organización
- **Rate limiting** y blacklisting de tokens con Redis

### 📦 Gestión de Inventario

- **Productos**: SKU único, categorías, unidades de medida, códigos de barras, tracking de status
- **Bodegas y Ubicaciones**: Gestión de múltiples bodegas con ubicaciones internas
- **Movimientos**: Entradas, salidas y ajustes (IN/OUT/ADJUST_IN/ADJUST_OUT/TRANSFER_IN/TRANSFER_OUT) con workflow DRAFT → POSTED → VOID
- **Transferencias**: Entre bodegas con estados (DRAFT, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED)
- **Empresas (Multi-Company)**: Líneas de negocio por organización, filtrado global por empresa
- **Valorización**: Promedio Ponderado Móvil (PPM) automático
- **Alertas de stock**: Notificaciones configurables (frecuencia, destinatarios, tipos de alerta)

### 💰 Ventas y Devoluciones

- **Ventas**: Workflow completo DRAFT → CONFIRMED → PICKING → SHIPPED → COMPLETED con acciones por estado
- **Numeración automática**: SALE-YYYY-NNN / RETURN-YYYY-NNN
- **Devoluciones**: De clientes (RETURN_CUSTOMER) y a proveedores (RETURN_SUPPLIER) con tracking de precios originales
- **Product Swap**: Intercambio de productos en ventas con ajustes automáticos de inventario (ADJUST_IN/ADJUST_OUT)
- **Integración**: Generación automática de movimientos de inventario

### 📊 Reportes y Análisis

- **17 tipos de reportes**: Inventario disponible, historial de movimientos, valorización, stock bajo, ABC Analysis (Pareto), Dead Stock, ventas por producto/bodega, devoluciones por tipo/producto, financiero, rotación
- **Exportación**: PDF, Excel, CSV
- **ABC Analysis**: Clasificación Pareto (A=top 80% ingresos, B=15%, C=5%)
- **Dead Stock**: Productos sin ventas en N días con niveles de riesgo (HIGH/MEDIUM/LOW)
- **Dashboard**: Endpoint dedicado `/dashboard/metrics` con 7 queries optimizadas (inventario, stock bajo, ventas mensuales, tendencia 7d, top productos, stock por bodega, actividad reciente)

### 📥 Importaciones

- **Importación masiva**: Productos, movimientos, bodegas desde Excel/CSV
- **Flujo Preview/Execute**: Validación previa antes de importar

### 📋 Auditoría

- **Registro completo**: Todas las operaciones con entity type, action, HTTP method, usuario, timestamps
- **Filtros avanzados**: Por tipo de entidad, acción, método HTTP, usuario, rango de fechas
- **Consultas**: Actividad por usuario, historial por entidad

### ⚙️ Configuración y Personalización

- **Perfil de usuario**: phone, timezone, language, jobTitle, department
- **Alertas de stock**: Configuración por organización (frecuencia cron, tipos de alerta, destinatarios, habilitación)
- **Multi-Company**: Toggle por organización para habilitar líneas de negocio
- **API Versioning**: Header-based (`X-API-Version`), default version 1

### 🛡️ Resiliencia

- **Circuit Breaker**: Protección contra fallos en cascada (CLOSED → OPEN → HALF_OPEN)
- **Retry**: Exponential backoff con jitter para servicios externos
- **Timeout**: Wrapper configurable por operación
- **ResilientCall**: Composición de los tres patrones, aplicado a EmailService y NotificationService
- **Graceful Shutdown**: Cierre ordenado de conexiones Prisma y procesos

---

## 🚀 Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/your-username/improved-parakeet.git
cd improved-parakeet

# Instalar dependencias (Bun recomendado)
bun install

# Configurar variables de entorno
cp example.env .env

# Levantar servicios con Docker
bun run docker:up

# Ejecutar migraciones y seeds
bun run db:migrate
bun run db:seed

# Iniciar en modo desarrollo
bun run dev

# 🎉 Abre http://localhost:3000/api para ver la documentación
```

---

## 📦 Instalación y Configuración

### Prerrequisitos

| Herramienta | Versión | Requerido                         |
| ----------- | ------- | --------------------------------- |
| Node.js     | 18+     | ✅                                |
| Bun         | 1.0+    | ⭐ Recomendado                    |
| PostgreSQL  | 15+     | ✅                                |
| Redis       | 7+      | ⚠️ Opcional (para sesiones/caché) |
| Docker      | 20+     | ⚠️ Opcional (para desarrollo)     |

### Instalación Paso a Paso

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/your-username/improved-parakeet.git
cd improved-parakeet
```

#### 2. Instalar Dependencias

```bash
# Con Bun (recomendado - más rápido)
bun install

# Con npm
npm install

# Con yarn
yarn install
```

#### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp example.env .env

# Editar con tu editor favorito
nano .env  # o vim, code, etc.
```

#### 4. Configurar Base de Datos

**Para Desarrollo (Dev):**

En desarrollo, solo se levanta Redis como contenedor. La base de datos debe estar desplegada externamente y se configura mediante un query string en la variable `DATABASE_URL`.

```bash
# Configurar DATABASE_URL en .env con tu conexión externa
# Ejemplo con query string completo:
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public&connection_limit=10&pool_timeout=10

# Levantar solo Redis y la aplicación
bun run docker:dev

# Verificar que están corriendo
docker ps
```

**Para Producción:**

En producción, la base de datos está desplegada externamente (en un admin de DB). Solo se levanta Redis como contenedor.

```bash
# Configurar DATABASE_URL en .env con tu conexión externa
# Ejemplo con query string completo:
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public&connection_limit=10&pool_timeout=10

# Levantar solo Redis y la aplicación
docker-compose -f docker-compose.prod.yml up -d

# Verificar que están corriendo
docker ps
```

**Base de Datos Local (Alternativa)**

```bash
# Crear base de datos manualmente
createdb inventory_system

# Actualizar DATABASE_URL en .env
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_system?schema=public
```

#### 5. Ejecutar Migraciones

```bash
# Generar cliente Prisma
bun run db:generate

# Ejecutar migraciones
bun run db:migrate

# Poblar con datos de prueba (opcional)
bun run db:seed
```

#### 6. Iniciar el Servidor

```bash
# Modo desarrollo (con hot reload)
bun run dev

# Modo debug
bun run debug

# Modo producción
bun run build && bun run prod
```

---

## ⚙️ Configuración

### Variables de Entorno Principales

```env
# 🔧 General
NODE_ENV=development
PORT=3000

# 🗄️ Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_system

# 📦 Redis (Opcional)
REDIS_URL=redis://localhost:6379

# 🔐 JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=900      # 15 minutos
JWT_REFRESH_TOKEN_EXPIRES_IN=604800  # 7 días

# 🛡️ Seguridad
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS_PER_IP=100

# 📚 Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=api
```

<details>
<summary>📋 Ver todas las variables de entorno</summary>

Consulta el archivo `example.env` para una lista completa de variables configurables, incluyendo:

- Configuración de Rate Limiting
- Logging y Monitoreo
- SMTP para correos
- Almacenamiento (S3, local)
- Configuraciones multi-tenant

</details>

---

## 🎮 Uso

### Scripts Disponibles

```bash
# 🚀 Desarrollo
bun run dev              # Modo desarrollo con watch
bun run dev:tsx          # Modo desarrollo con tsx
bun run debug            # Modo debug con inspector

# 🏗️ Build y Producción
bun run build            # Compilar TypeScript
bun run prod             # Ejecutar en producción

# 🗄️ Base de Datos
bun run db:generate      # Generar cliente Prisma
bun run db:migrate       # Ejecutar migraciones
bun run db:migrate:deploy # Migrar en producción
bun run db:studio        # Abrir Prisma Studio
bun run db:seed          # Poblar con datos de prueba
bun run db:reset         # Resetear base de datos

# 🧪 Testing
bun run test             # Tests unitarios
bun run test:watch       # Tests en modo watch
bun run test:cov         # Tests con cobertura
bun run test:e2e         # Tests end-to-end

# ✨ Calidad de Código
bun run lint             # Ejecutar ESLint y corregir
bun run lint:check       # Verificar sin corregir
bun run format           # Formatear con Prettier
bun run format:check     # Verificar formato

# 🐳 Docker
bun run docker:up        # Levantar servicios
bun run docker:down      # Detener servicios
bun run docker:logs      # Ver logs
bun run docker:dev       # Ambiente de desarrollo completo
```

### Ejemplo de Uso de la API

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Respuesta:
# { "accessToken": "eyJ...", "refreshToken": "eyJ..." }

# 2. Crear un producto
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-001",
    "name": "Producto de Ejemplo",
    "unit": { "code": "UNIT", "name": "Unidad", "precision": 0 },
    "costMethod": "AVG"
  }'

# 3. Listar productos
curl http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid"
```

---

## 📚 API Documentation

### Endpoints Principales

| Módulo         | Endpoint                   | Descripción            |
| -------------- | -------------------------- | ---------------------- |
| **Auth**       | `POST /auth/login`         | Iniciar sesión         |
|                | `POST /auth/refresh`       | Renovar token          |
|                | `POST /auth/logout`        | Cerrar sesión          |
| **Users**      | `GET /users`               | Listar usuarios        |
|                | `POST /users`              | Crear usuario          |
|                | `POST /users/:id/roles`    | Asignar rol            |
| **Products**   | `GET /products`            | Listar productos       |
|                | `POST /products`           | Crear producto         |
|                | `PUT /products/:id`        | Actualizar producto    |
| **Warehouses** | `GET /warehouses`          | Listar bodegas         |
|                | `POST /warehouses`         | Crear bodega           |
| **Movements**  | `GET /movements`           | Listar movimientos     |
|                | `POST /movements`          | Crear movimiento       |
|                | `POST /movements/:id/post` | Confirmar movimiento   |
| **Transfers**  | `GET /transfers`           | Listar transferencias  |
|                | `POST /transfers`          | Iniciar transferencia  |
| **Sales**      | `GET /sales`               | Listar ventas          |
|                | `POST /sales`              | Crear venta            |
|                | `POST /sales/:id/confirm`  | Confirmar venta        |
| **Returns**    | `GET /returns`             | Listar devoluciones    |
|                | `POST /returns`            | Crear devolución       |
| **Reports**    | `GET /reports/{mod}/{name}/view` | Ver datos del reporte  |
|                | `POST /reports/{mod}/{name}/export` | Exportar reporte    |
| **Dashboard**  | `GET /dashboard/metrics`   | Métricas del dashboard |
| **Audit**      | `GET /audit/logs`          | Listar logs            |
|                | `GET /audit/logs/:id`      | Detalle de log         |
|                | `GET /audit/users/:id/activity` | Actividad de usuario |
|                | `GET /audit/entities/:type/:id/history` | Historial de entidad |
| **Settings**   | `GET /settings/alerts`     | Config de alertas      |
|                | `PUT /settings/alerts`     | Actualizar alertas     |
| **Companies**  | `GET /inventory/companies` | Listar empresas        |
|                | `POST /inventory/companies`| Crear empresa          |
| **Imports**    | `POST /imports/preview`    | Preview de importación |
|                | `POST /imports/execute`    | Ejecutar importación   |

### Documentación Interactiva

Cuando el servidor está corriendo, accede a:

- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)
- **OpenAPI JSON**: [http://localhost:3000/api-json](http://localhost:3000/api-json)

### Colecciones de Postman

Las colecciones de Postman están disponibles en `docs/postman/`:

- `auth.collection.json` - Autenticación
- `inventory.collection.json` - Inventario
- `sales.collection.json` - Ventas
- `returns.collection.json` - Devoluciones
- `reports.collection.json` - Reportes

---

## 🏗️ Arquitectura

### Diagrama de Arquitectura Hexagonal

```mermaid
flowchart TB
    subgraph Interfaces["🌐 INTERFACES (HTTP)"]
        Controllers
        DTOs
        Guards
        Interceptors
        Decorators
    end

    subgraph Application["🚀 APPLICATION"]
        UseCases[Use Cases]
        AppServices[Application Services]
    end

    subgraph Domain["💎 DOMAIN"]
        Entities
        ValueObjects[Value Objects]
        Aggregates
        DomainEvents[Domain Events]
        DomainServices[Domain Services]
        Ports[Repository Interfaces]
    end

    subgraph Infrastructure["🔌 INFRASTRUCTURE"]
        PrismaRepos[Prisma Repositories]
        Redis
        ExternalServices[External Services]
    end

    Interfaces --> Application
    Application --> Domain
    Infrastructure --> Domain

    style Interfaces fill:#3b82f6,color:#fff
    style Application fill:#10b981,color:#fff
    style Domain fill:#f59e0b,color:#fff
    style Infrastructure fill:#8b5cf6,color:#fff
```

### Flujo de una Petición HTTP

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
    subgraph Core["🎯 CORE DOMAIN"]
        Inventory["📦 Inventory<br/>Products, Warehouses<br/>Movements, Transfers"]
    end

    subgraph Supporting["💼 SUPPORTING DOMAINS"]
        Sales["💰 Sales<br/>Orders, Invoices"]
        Returns["🔄 Returns<br/>Customer & Supplier"]
        Reports["📊 Reports<br/>Analytics, Exports"]
        Imports["📥 Imports<br/>Bulk Operations"]
    end

    subgraph Generic["🔧 GENERIC SUBDOMAINS"]
        Auth["🔐 Authentication<br/>Users, Roles, Sessions"]
        Org["🏢 Organization<br/>Multi-tenancy"]
    end

    Sales --> Inventory
    Returns --> Sales
    Returns --> Inventory
    Reports --> Inventory
    Reports --> Sales
    Imports --> Inventory
    Auth --> Org

    style Core fill:#f59e0b,color:#fff
    style Supporting fill:#3b82f6,color:#fff
    style Generic fill:#6b7280,color:#fff
```

### Estructura del Proyecto (Screaming Architecture)

```
src/
├── inventory/          # 🎯 Dominio principal (Screaming Architecture)
│   ├── products/       # Productos
│   │   ├── domain/     # Entidades, Value Objects, Ports
│   │   ├── dto/        # DTOs para capa HTTP
│   │   └── mappers/    # Conversores DTO ↔ Domain
│   ├── warehouses/     # Bodegas
│   ├── movements/      # Movimientos de inventario
│   ├── transfers/      # Transferencias entre bodegas
│   ├── companies/      # Empresas (multi-company)
│   └── stock/          # Control de stock
├── sales/              # 💰 Dominio de ventas
├── returns/            # 🔄 Dominio de devoluciones
├── authentication/     # 🔐 Autenticación y autorización
├── organization/       # 🏢 Multi-tenancy
├── report/             # 📊 Reportes (17 tipos)
├── import/             # 📥 Importaciones
├── application/        # 🚀 Casos de uso (131+)
│   ├── dashboardUseCases/  # Métricas del dashboard
│   ├── auditUseCases/      # Logs de auditoría
│   ├── companyUseCases/    # CRUD de empresas
│   └── ...
├── infrastructure/     # 🔌 Adaptadores de salida (Prisma, Redis)
│   └── resilience/     # CircuitBreaker, Retry, Timeout
├── interfaces/         # 🌐 Adaptadores de entrada (HTTP)
│   ├── dashboard/      # Dashboard metrics controller
│   ├── audit/          # Audit logs controller
│   └── ...
├── shared/             # 🛠️ Utilidades compartidas
│   ├── guards/         # PermissionGuard
│   └── infrastructure/ # Cache, Resilience
└── healthCheck/        # ❤️ Health checks
```

### Modelo de Entidades

```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Product : owns
    Organization ||--o{ Warehouse : owns
    Organization ||--o{ Sale : owns

    Product ||--o{ MovementLine : "appears in"
    Product ||--o{ SaleLine : "sold in"

    Warehouse ||--o{ Location : contains
    Warehouse ||--o{ Movement : receives

    Movement ||--o{ MovementLine : contains
    Movement }o--|| Warehouse : "belongs to"

    Sale ||--o{ SaleLine : contains
    Sale ||--o{ Return : "may have"

    Transfer ||--o{ TransferLine : contains
    Transfer }o--|| Warehouse : "from/to"

    User }o--o{ Role : has
    Role }o--o{ Permission : grants
```

### Patrones Implementados

| Patrón             | Implementación                  | Ubicación                       |
| ------------------ | ------------------------------- | ------------------------------- |
| **Result Monad**   | `Result<T, DomainError>`        | `@shared/domain/result`         |
| **Ports**          | Repository + Service interfaces | `{domain}/domain/ports/`        |
| **Mappers**        | DTO ↔ Domain conversion         | `{domain}/mappers/`             |
| **Domain Events**  | `IDomainEventDispatcher`        | `@shared/domain/events`         |
| **Aggregate Root** | Base entity class               | `@shared/domain/base`           |
| **Value Objects**  | Immutable domain concepts       | `{domain}/domain/valueObjects/` |
| **Specification**  | Business rules                  | `@shared/domain/specifications` |

---

## 🧪 Testing

### Estadísticas de Tests

| Tipo            | Archivos | Tests  | Estado     |
| --------------- | -------- | ------ | ---------- |
| **Unitarios**   | 380+     | 5000+  | ✅ Passing |
| **Integración** | 12+      | 100+   | ✅ Passing |
| **E2E**         | 12+      | 100+   | ✅ Passing |
| **Total**       | 404      | 5,288  | ✅         |

### Cobertura de Código

| Métrica        | Porcentaje |
| -------------- | ---------- |
| **Statements** | 92.07%     |
| **Branches**   | 75.63%     |
| **Functions**  | 93.22%     |
| **Lines**      | 92.18%     |

Threshold global: 70% (jest.config.js). Exclusiones: `instrument.ts`, `seed.ts`, `seeds/**/*.ts`.

### Ejecutar Tests

```bash
# Tests unitarios
bun run test

# Tests con cobertura
bun run test:cov

# Tests E2E
bun run test:e2e

# Tests en modo watch
bun run test:watch
```

### Estructura de Tests

```
test/
├── application/           # Tests de casos de uso
│   ├── authUseCases/
│   ├── productUseCases/
│   ├── saleUseCases/
│   └── ...
├── domain/                # Tests de dominio
│   ├── entities/
│   ├── valueObjects/
│   └── services/
├── infrastructure/        # Tests de infraestructura
│   └── repositories/
├── integration/           # Tests de integración
│   ├── rbac.integration.spec.ts
│   ├── movements.integration.spec.ts
│   └── ...
└── e2e/                   # Tests end-to-end
    ├── authentication.e2e-spec.ts
    ├── products.e2e-spec.ts
    └── ...
```

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor, sigue estas guías para contribuir al proyecto.

### Flujo de Trabajo

1. **Fork** el repositorio
2. **Crea** una rama desde `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Desarrolla** tu funcionalidad siguiendo las convenciones
4. **Ejecuta** los tests:
   ```bash
   bun run test
   bun run lint
   bun run format
   bun run build
   ```
5. **Commit** usando conventional commits:
   ```bash
   git commit -m "feat(inventory): add stock alert notifications"
   ```
6. **Push** y crea un Pull Request hacia `dev`

### Convenciones de Código

| Aspecto                 | Convención                                           |
| ----------------------- | ---------------------------------------------------- |
| **Idioma del código**   | Inglés (variables, funciones, mensajes, comentarios) |
| **Variables/Funciones** | camelCase                                            |
| **Clases**              | PascalCase                                           |
| **Interfaces**          | `I` + PascalCase (ej: `IProductRepository`)          |
| **Archivos**            | camelCase.ts                                         |
| **Carpetas**            | camelCase                                            |
| **Tests**               | `Given-When-Then` pattern                            |
| **Imports**             | Path aliases (`@src/*`, `@inventory/*`, etc.)        |

### Conventional Commits

```bash
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
style(scope): formatting, missing semi colons
refactor(scope): code restructuring
test(scope): add/update tests
chore(scope): maintenance tasks
```

### Checklist para PRs

- [ ] Código sigue las convenciones del proyecto
- [ ] Tests escritos y pasando
- [ ] Linter sin errores (`bun run lint`)
- [ ] Build exitoso (`bun run build`)
- [ ] Documentación actualizada si es necesario
- [ ] Swagger actualizado para nuevos endpoints

### Recursos

- [Documentación de NestJS](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

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

## 👥 Autor

<p align="center">
  <strong>Cesar Javier Ortiz Montero</strong>
</p>

<p align="center">
  <a href="mailto:your-email@example.com">📧 Email</a> •
  <a href="https://github.com/your-username">🐙 GitHub</a> •
  <a href="https://linkedin.com/in/your-profile">💼 LinkedIn</a>
</p>

---

## 📚 Documentación Adicional

| Documento                                                          | Descripción                        |
| ------------------------------------------------------------------ | ---------------------------------- |
| [Arquitectura](docs/technical/architecture.md)                     | Arquitectura detallada del sistema |
| [Patrones de Diseno](docs/technical/patterns.md)                   | Patrones implementados (14+)       |
| [API Reference](docs/technical/api-reference.md)                   | Referencia completa de endpoints   |
| [Bounded Context Map](docs/technical/bounded-context-map.md)       | Mapa de contextos acotados (DDD)   |
| [Result Monad Guide](docs/technical/result-monad-guide.md)         | Guia del patron Result<T, E>       |
| [Modelo de Datos](docs/technical/data_model.md)                    | Estructura de la base de datos     |
| [Guia de Testing](docs/technical/testing-structure.md)             | Estructura y convenciones de tests |
| [Error Codes](docs/technical/error-codes.md)                       | Catalogo de codigos de error (80+) |
| [Requerimientos](docs/Requirement.md)                              | Especificacion de requerimientos   |
| [Coleccion Postman](docs/postman/)                                 | Colecciones y documentacion de API |

---

<p align="center">
  <sub>Construido con ❤️ usando <a href="https://nestjs.com">NestJS</a> | Powered by <a href="https://bun.sh">Bun</a></sub>
</p>

<p align="center">
  <sub>⭐ Si este proyecto te es útil, considera darle una estrella en GitHub ⭐</sub>
</p>
