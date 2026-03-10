<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<h1 align="center">Sistema de Inventarios Multi-Tenant</h1>

> [English](./README.md) | **[Espanol](./README.es.md)**

<p align="center">
  Sistema de gestion de inventarios multi-tenant construido con <strong>NestJS</strong>, siguiendo principios de <strong>Domain-Driven Design (DDD)</strong>, <strong>Arquitectura Hexagonal</strong> y <strong>Screaming Architecture</strong>.
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-0.0.1-blue.svg" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="Licencia" /></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Version de Node" /></a>
  <a href="#"><img src="https://img.shields.io/badge/bun-%3E%3D1.0.0-orange.svg" alt="Version de Bun" /></a>
  <a href="#"><img src="https://img.shields.io/badge/NestJS-11+-red.svg" alt="NestJS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-15+-blue.svg" alt="PostgreSQL" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Prisma-7+-purple.svg" alt="Prisma" /></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/tests-7749%20total-success.svg" alt="Tests" /></a>
  <a href="#"><img src="https://img.shields.io/badge/passing-7661-brightgreen.svg" alt="Pasando" /></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Cobertura" /></a>
  <a href="#"><img src="https://img.shields.io/badge/build-passing-success.svg" alt="Estado del Build" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-strict-blue.svg" alt="TypeScript Strict" /></a>
</p>

---

## Tabla de Contenidos

- [Descripcion](#descripcion)
- [Caracteristicas Principales](#caracteristicas-principales)
- [Modulos](#modulos)
- [Inicio Rapido](#inicio-rapido)
- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Uso](#uso)
- [Documentacion de API](#documentacion-de-api)
- [Arquitectura](#arquitectura)
- [Testing](#testing)
- [Contribucion](#contribucion)
- [Licencia](#licencia)
- [Autor](#autor)
- [Indice de Documentacion](#indice-de-documentacion)

---

## Descripcion

Sistema de inventarios disenado para optimizar el control, registro y gestion de existencias en multiples bodegas y organizaciones. El sistema garantiza visibilidad en tiempo real sobre entradas, salidas, movimientos y disponibilidad de productos, mejorando la eficiencia operativa y facilitando la toma de decisiones a traves de reportes confiables y trazables. Tambien se integra con plataformas de e-commerce externas (VTEX) para sincronizacion automatizada de ordenes.

### Objetivos

| Objetivo | Descripcion |
| --- | --- |
| **Control en tiempo real** | Visibilidad instantanea del inventario en multiples bodegas y organizaciones |
| **Trazabilidad completa** | Registro detallado de todos los movimientos de inventario |
| **Reduccion de perdidas** | Alertas automaticas de stock minimo/maximo para prevenir desabastecimiento |
| **Soporte a decisiones** | Reportes confiables en multiples formatos (PDF, Excel, CSV) |
| **Integracion e-commerce** | Sincronizacion automatizada con VTEX (ordenes, productos, fulfillment) |
| **Escalabilidad** | Disenado para 50+ bodegas y 100,000+ productos |

---

## Caracteristicas Principales

### Autenticacion y Autorizacion
- **Autenticacion JWT** con tokens de acceso (15 min) y tokens de refresco (7 dias)
- **RBAC** (Control de Acceso Basado en Roles) con permisos granulares (80+)
- **Roles predefinidos**: ADMIN, SUPERVISOR, WAREHOUSE_OPERATOR, CONSULTANT, IMPORT_OPERATOR
- **Roles personalizados**: Cada organizacion puede crear roles con permisos especificos
- **Multi-tenancy**: Aislamiento completo de datos por organizacion
- **Rate limiting** y blacklisting de tokens con Redis

### Gestion de Inventario
- **Productos**: SKU unico, categorias, unidades de medida, codigos de barras, seguimiento de estado
- **Bodegas y Ubicaciones**: Gestion de multiples bodegas con ubicaciones internas
- **Movimientos**: Entradas, salidas y ajustes (IN/OUT/ADJUST_IN/ADJUST_OUT/TRANSFER_IN/TRANSFER_OUT) con flujo DRAFT -> POSTED -> VOID
- **Transferencias**: Inter-bodega con estados (DRAFT, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED)
- **Multi-Empresa**: Lineas de negocio por organizacion con filtrado global
- **Valuacion**: Promedio Ponderado Movil (PPM/WMA) automatico
- **Alertas de stock**: Notificaciones configurables (frecuencia, destinatarios, tipos de alerta)

### Ventas y Devoluciones
- **Ventas**: Flujo completo DRAFT -> CONFIRMED -> PICKING -> SHIPPED -> COMPLETED
- **Numeracion automatica**: SALE-YYYY-NNN / RETURN-YYYY-NNN
- **Devoluciones**: De cliente (RETURN_CUSTOMER) y de proveedor (RETURN_SUPPLIER) con seguimiento de precio original
- **Intercambio de productos**: Cambio de productos en ventas con ajustes automaticos de inventario
- **Movimientos de inventario automaticos** generados desde ventas/devoluciones

### Contactos
- **Gestion de contactos**: Clientes, proveedores y otras partes comerciales
- **Identificacion unica** por organizacion con email, telefono, direccion
- **Integracion**: Contactos vinculados a ventas y ordenes de plataformas externas

### Integraciones con Terceros
- **VTEX e-commerce**: Sincronizacion bidireccional de ordenes
- **Webhook + polling**: Estrategia dual de sincronizacion para confiabilidad
- **Mapeo de SKUs**: Vincular IDs de productos externos con productos internos
- **Credenciales encriptadas**: Almacenamiento seguro de claves API y tokens
- **Registro de sincronizacion**: Pista de auditoria completa con capacidad de reintento

### Reportes y Analitica
- **17 tipos de reportes**: Inventario disponible, historial de movimientos, valuacion, stock bajo, Analisis ABC (Pareto), Stock Muerto, ventas por producto/bodega, devoluciones por tipo/producto, financiero, rotacion
- **Exportacion**: PDF, Excel, CSV
- **Dashboard**: Endpoint dedicado `/dashboard/metrics` con 7 consultas optimizadas

### Importacion Masiva
- **Importacion masiva**: Productos, movimientos, bodegas desde Excel/CSV
- **Flujo Preview/Execute**: Validacion antes de importar

### Auditoria
- **Registro completo**: Todas las operaciones con tipo de entidad, accion, metodo HTTP, usuario, marcas de tiempo
- **Filtros avanzados**: Por tipo de entidad, accion, metodo HTTP, usuario, rango de fechas

### Resiliencia
- **Circuit Breaker**: Proteccion contra fallas en cascada (CLOSED -> OPEN -> HALF_OPEN)
- **Retry**: Backoff exponencial con jitter para servicios externos
- **Timeout**: Wrapper configurable por operacion
- **ResilientCall**: Composicion de los tres patrones
- **Graceful Shutdown**: Cierre ordenado de conexiones Prisma y procesos

---

## Modulos

El sistema esta organizado en 9 contextos acotados. Cada modulo tiene su propia documentacion detallada.

| Modulo | Tipo | Descripcion | Docs |
| --- | --- | --- | --- |
| **Inventory** | Dominio Central | Productos, bodegas, movimientos, transferencias, stock, empresas | [inventory.md](docs/modules/inventory.md) |
| **Authentication** | Generico | Autenticacion JWT, RBAC, usuarios, roles, sesiones | [authentication.md](docs/modules/authentication.md) |
| **Sales** | Soporte | Ordenes de venta con flujo de ciclo de vida completo | [sales.md](docs/modules/sales.md) |
| **Returns** | Soporte | Gestion de devoluciones de clientes y proveedores | [returns.md](docs/modules/returns.md) |
| **Contacts** | Soporte | Gestion de contactos (clientes/proveedores) | [contacts.md](docs/modules/contacts.md) |
| **Integrations** | Soporte | Integraciones con terceros (VTEX) | [integrations.md](docs/modules/integrations.md) |
| **Reports** | Soporte | 17 tipos de reportes con capacidad de exportacion | [reports.md](docs/modules/reports.md) |
| **Import** | Soporte | Importacion masiva desde Excel/CSV | [import.md](docs/modules/import.md) |
| **Organization** | Generico | Multi-tenancy, configuraciones, dashboard, auditoria | [organization.md](docs/modules/organization.md) |

Documentacion transversal:

| Modulo | Descripcion | Docs |
| --- | --- | --- |
| **Shared** | Monada Result, errores de dominio, especificaciones, guards, interceptores | [shared.md](docs/modules/shared.md) |
| **Infrastructure** | Base de datos, repositorios, resiliencia, servicios externos, tareas | [infrastructure.md](docs/modules/infrastructure.md) |

---

## Inicio Rapido

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

# Abrir http://localhost:3000/api para documentacion Swagger
```

---

## Instalacion

### Prerrequisitos

| Herramienta | Version | Requerido |
| --- | --- | --- |
| Node.js | 18+ | Si |
| Bun | 1.0+ | Recomendado |
| PostgreSQL | 15+ | Si |
| Redis | 7+ | Opcional (sesiones/cache) |
| Docker | 20+ | Opcional (desarrollo) |

### Paso a Paso

#### 1. Clonar

```bash
git clone https://github.com/your-username/improved-parakeet.git
cd improved-parakeet
```

#### 2. Instalar Dependencias

```bash
# Bun (recomendado)
bun install

# npm
npm install
```

#### 3. Variables de Entorno

```bash
cp example.env .env
# Editar .env con tu configuracion
```

#### 4. Configurar Base de Datos

**Desarrollo:**

```bash
# Configurar DATABASE_URL en .env con tu conexion externa
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Levantar Redis y app
bun run docker:dev
```

**Produccion:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. Migraciones

```bash
bun run db:generate
bun run db:migrate
bun run db:seed  # opcional
```

#### 6. Iniciar Servidor

```bash
bun run dev        # Desarrollo con hot reload
bun run debug      # Modo debug
bun run build && bun run prod  # Produccion
```

---

## Configuracion

### Variables de Entorno Principales

```env
# General
NODE_ENV=development
PORT=3000

# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_system

# Redis (Opcional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=tu-clave-secreta-cambiar-en-produccion
JWT_REFRESH_SECRET=tu-clave-refresh-cambiar-en-produccion
JWT_ACCESS_TOKEN_EXPIRES_IN=900      # 15 minutos
JWT_REFRESH_TOKEN_EXPIRES_IN=604800  # 7 dias

# Seguridad
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS_PER_IP=100

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=api

# Clave de encriptacion para integraciones (credenciales VTEX)
INTEGRATION_ENCRYPTION_KEY=tu-clave-encriptacion-32-caracteres
```

<details>
<summary>Todas las variables de entorno</summary>

Consulta `example.env` para la lista completa incluyendo rate limiting, logging, SMTP, almacenamiento y configuraciones multi-tenant.

</details>

---

## Uso

### Scripts Disponibles

```bash
# Desarrollo
bun run dev              # Modo dev con watch
bun run dev:tsx          # Modo dev con tsx
bun run debug            # Modo debug con inspector

# Build y Produccion
bun run build            # Compilar TypeScript
bun run prod             # Ejecutar en produccion
bun run start:prod       # Ejecutar migraciones y luego produccion

# Base de Datos
bun run db:generate      # Generar cliente Prisma
bun run db:migrate       # Ejecutar migraciones (dev)
bun run db:migrate:deploy # Ejecutar migraciones (prod)
bun run db:studio        # Abrir Prisma Studio
bun run db:seed          # Datos de ejemplo
bun run db:reset         # Resetear base de datos

# Testing
bun run test             # Tests unitarios
bun run test:watch       # Modo watch
bun run test:cov         # Reporte de cobertura
bun run test:ci          # Modo CI (solo unitarios)
bun run test:integration # Tests de integracion
bun run test:e2e         # Tests end-to-end

# Calidad de Codigo
bun run lint             # ESLint + fix
bun run lint:check       # Solo verificar
bun run format           # Formatear con Prettier
bun run format:check     # Solo verificar

# Docker
bun run docker:up        # Levantar servicios
bun run docker:down      # Detener servicios
bun run docker:logs      # Ver logs
bun run docker:dev       # Entorno de desarrollo completo
```

### Ejemplo de Uso de la API

```bash
# 1. Iniciar sesion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# 2. Crear un producto
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid" \
  -H "Content-Type: application/json" \
  -d '{"sku": "PROD-001", "name": "Producto Ejemplo", "unit": {"code": "UNIT", "name": "Unidad", "precision": 0}, "costMethod": "AVG"}'

# 3. Listar productos
curl http://localhost:3000/products \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Organization-ID: org-uuid"
```

---

## Documentacion de API

### Endpoints Principales

| Modulo | Endpoint | Descripcion |
| --- | --- | --- |
| **Auth** | `POST /auth/login` | Iniciar sesion |
| | `POST /auth/refresh` | Renovar token |
| | `POST /auth/logout` | Cerrar sesion |
| **Users** | `GET /users` | Listar usuarios |
| | `POST /users` | Crear usuario |
| | `POST /users/:id/roles` | Asignar rol |
| **Products** | `GET /products` | Listar productos |
| | `POST /products` | Crear producto |
| | `PUT /products/:id` | Actualizar producto |
| **Warehouses** | `GET /warehouses` | Listar bodegas |
| | `POST /warehouses` | Crear bodega |
| **Movements** | `GET /movements` | Listar movimientos |
| | `POST /movements` | Crear movimiento |
| | `POST /movements/:id/post` | Confirmar movimiento |
| **Transfers** | `GET /transfers` | Listar transferencias |
| | `POST /transfers` | Crear transferencia |
| **Sales** | `GET /sales` | Listar ventas |
| | `POST /sales` | Crear venta |
| | `POST /sales/:id/confirm` | Confirmar venta |
| **Returns** | `GET /returns` | Listar devoluciones |
| | `POST /returns` | Crear devolucion |
| **Contacts** | `GET /contacts` | Listar contactos |
| | `POST /contacts` | Crear contacto |
| | `PUT /contacts/:id` | Actualizar contacto |
| **Integrations** | `GET /integrations/connections` | Listar conexiones |
| | `POST /integrations/connections` | Crear conexion |
| | `POST /integrations/connections/:id/test` | Probar conexion |
| | `GET /integrations/sku-mappings` | Listar mapeos de SKU |
| | `POST /integrations/sku-mappings` | Crear mapeo de SKU |
| | `GET /integrations/unmatched-skus` | SKUs sin mapear |
| | `POST /integrations/sync/:id/retry` | Reintentar sincronizacion fallida |
| **VTEX Webhook** | `POST /integrations/vtex/webhook` | Recibir webhook de VTEX |
| **Reports** | `GET /reports/{mod}/{name}/view` | Ver datos del reporte |
| | `POST /reports/{mod}/{name}/export` | Exportar reporte |
| **Dashboard** | `GET /dashboard/metrics` | Metricas del dashboard |
| **Audit** | `GET /audit/logs` | Listar logs de auditoria |
| | `GET /audit/users/:id/activity` | Actividad de usuario |
| **Companies** | `GET /inventory/companies` | Listar empresas |
| | `POST /inventory/companies` | Crear empresa |
| **Imports** | `POST /imports/preview` | Preview de importacion |
| | `POST /imports/execute` | Ejecutar importacion |

### Documentacion Interactiva

- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)
- **OpenAPI JSON**: [http://localhost:3000/api-json](http://localhost:3000/api-json)

### Colecciones de Postman

Disponibles en `docs/postman/`. Ver [Guia de Postman](docs/postman/USER_GUIDE.md).

---

## Arquitectura

### Diagrama de Arquitectura Hexagonal

```mermaid
flowchart TB
    subgraph Interfaces["INTERFACES (HTTP)"]
        Controllers
        DTOs
        Guards
        Interceptors
        Decorators
    end

    subgraph Application["APLICACION"]
        UseCases[Casos de Uso - 150+]
        AppServices[Servicios de Aplicacion]
        EventHandlers[Manejadores de Eventos]
    end

    subgraph Domain["DOMINIO"]
        Entities[Entidades]
        ValueObjects[Objetos de Valor]
        Aggregates[Agregados]
        DomainEvents[Eventos de Dominio]
        DomainServices[Servicios de Dominio]
        Ports[Interfaces de Repositorio]
    end

    subgraph Infrastructure["INFRAESTRUCTURA"]
        PrismaRepos[Repositorios Prisma - 20+]
        Redis
        ExternalServices[Servicios Externos]
        VtexClient[Cliente API VTEX]
    end

    Interfaces --> Application
    Application --> Domain
    Infrastructure --> Domain

    style Interfaces fill:#3b82f6,color:#fff
    style Application fill:#10b981,color:#fff
    style Domain fill:#f59e0b,color:#fff
    style Infrastructure fill:#8b5cf6,color:#fff
```

### Flujo de una Peticion HTTP

```mermaid
sequenceDiagram
    participant Cliente as Cliente
    participant Controller as Controlador
    participant UseCase as Caso de Uso
    participant Domain as Dominio
    participant Repository as Repositorio
    participant Database as Base de Datos

    Cliente->>Controller: Peticion HTTP
    Controller->>Controller: Validar DTO
    Controller->>UseCase: Ejecutar(request)
    UseCase->>Domain: Logica de Negocio
    Domain->>Repository: Guardar/Consultar
    Repository->>Database: Consulta SQL
    Database-->>Repository: Resultado
    Repository-->>Domain: Entidad
    Domain-->>UseCase: Result<T, Error>
    UseCase-->>Controller: DTO de Respuesta
    Controller-->>Cliente: Respuesta HTTP
```

### Contextos Acotados (DDD)

```mermaid
graph TB
    subgraph Core["DOMINIO CENTRAL"]
        Inventory["Inventario<br/>Productos, Bodegas<br/>Movimientos, Transferencias"]
    end

    subgraph Supporting["DOMINIOS DE SOPORTE"]
        Sales["Ventas<br/>Ordenes, Flujo de Trabajo"]
        Returns["Devoluciones<br/>Clientes y Proveedores"]
        Contacts["Contactos<br/>Clientes, Proveedores"]
        Integrations["Integraciones<br/>VTEX, Webhooks"]
        Reports["Reportes<br/>Analitica, Exportaciones"]
        Imports["Importaciones<br/>Operaciones Masivas"]
    end

    subgraph Generic["SUBDOMINIOS GENERICOS"]
        Auth["Autenticacion<br/>Usuarios, Roles, Sesiones"]
        Org["Organizacion<br/>Multi-tenancy"]
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

### Estructura del Proyecto (Screaming Architecture)

```
src/
├── inventory/            # Central: Productos, bodegas, movimientos, transferencias
│   ├── products/         #   Dominio de productos (entidades, VOs, puertos, mappers)
│   ├── warehouses/       #   Dominio de bodegas
│   ├── movements/        #   Dominio de movimientos de inventario
│   ├── transfers/        #   Dominio de transferencias inter-bodega
│   ├── companies/        #   Multi-empresa (lineas de negocio)
│   ├── stock/            #   Dominio de saldos de stock
│   └── locations/        #   Dominio de ubicaciones en bodega
├── sales/                # Dominio de ordenes de venta
├── returns/              # Dominio de devoluciones
├── contacts/             # Dominio de gestion de contactos
├── integrations/         # Integraciones con terceros
│   ├── shared/           #   Entidades compartidas, puertos, encriptacion
│   └── vtex/             #   Integracion VTEX (sync, webhook, polling)
├── authentication/       # Autenticacion JWT, RBAC, guards de seguridad
├── organization/         # Gestion de multi-tenancy
├── report/               # 17 tipos de reportes
├── import/               # Operaciones de importacion masiva
├── application/          # Casos de uso (150+ archivos)
│   ├── authUseCases/
│   ├── productUseCases/
│   ├── saleUseCases/
│   ├── contactUseCases/
│   ├── integrationUseCases/
│   ├── reportUseCases/
│   ├── eventHandlers/
│   └── ...
├── infrastructure/       # Adaptadores de salida (Prisma, Redis, servicios externos)
│   ├── database/         #   Esquema Prisma, migraciones, 20+ repositorios
│   ├── externalServices/ #   Email, notificaciones, parsing de archivos
│   ├── resilience/       #   CircuitBreaker, Retry, Timeout
│   └── jobs/             #   Tareas programadas
├── interfaces/http/      # Adaptadores de entrada (controladores HTTP)
│   ├── inventory/        #   Productos, categorias, bodegas, stock
│   ├── sales/            #   Endpoints de ventas
│   ├── returns/          #   Endpoints de devoluciones
│   ├── contacts/         #   Endpoints de contactos
│   ├── integrations/     #   Endpoints de integracion + webhook VTEX
│   ├── dashboard/        #   Metricas del dashboard
│   └── ...
├── shared/               # Aspectos transversales
│   ├── domain/           #   Monada Result, clases base, eventos, specs
│   ├── guards/           #   PermissionGuard
│   ├── interceptors/     #   Interceptor de respuesta
│   ├── filters/          #   Filtro global de excepciones
│   └── infrastructure/   #   Cache, patrones de resiliencia
└── healthCheck/          # Monitoreo de salud
```

### Modelo de Entidades

```mermaid
erDiagram
    Organization ||--o{ User : tiene
    Organization ||--o{ Product : posee
    Organization ||--o{ Warehouse : posee
    Organization ||--o{ Sale : posee
    Organization ||--o{ Contact : gestiona
    Organization ||--o{ IntegrationConnection : configura

    Product ||--o{ MovementLine : "aparece en"
    Product ||--o{ SaleLine : "se vende en"
    Product ||--o{ IntegrationSkuMapping : "mapeado por"

    Warehouse ||--o{ Location : contiene
    Warehouse ||--o{ Movement : recibe

    Movement ||--o{ MovementLine : contiene

    Sale ||--o{ SaleLine : contiene
    Sale ||--o{ Return : "puede tener"
    Sale }o--o| Contact : "vendido a"

    Transfer ||--o{ TransferLine : contiene

    User }o--o{ Role : tiene
    Role }o--o{ Permission : otorga

    IntegrationConnection ||--o{ IntegrationSkuMapping : tiene
    IntegrationConnection ||--o{ IntegrationSyncLog : registra
```

### Patrones Implementados

| Patron | Implementacion | Ubicacion |
| --- | --- | --- |
| **Result Monad** | `Result<T, DomainError>` | `@shared/domain/result` |
| **Puertos y Adaptadores** | Interfaces de repositorio + servicio | `{dominio}/domain/ports/` |
| **Mappers** | Conversion DTO <-> Dominio | `{dominio}/mappers/` |
| **Eventos de Dominio** | `IDomainEventDispatcher` | `@shared/domain/events` |
| **Raiz de Agregado** | Clase base de entidad | `@shared/domain/base` |
| **Objetos de Valor** | Conceptos de dominio inmutables | `{dominio}/domain/valueObjects/` |
| **Specification** | Reglas de negocio componibles | `@shared/domain/specifications` |
| **Circuit Breaker** | Proteccion contra fallas en cascada | `@shared/infrastructure/resilience` |
| **Retry** | Backoff exponencial con jitter | `@shared/infrastructure/resilience` |
| **Unit of Work** | Transacciones atomicas | `infrastructure/database/unitOfWork` |

---

## Testing

### Estadisticas de Tests

| Tipo | Archivos | Tests | Estado |
| --- | --- | --- | --- |
| **Unitarios** | 450 | 7,661 | Pasando |
| **Integracion** | 12+ | 100+ | Pasando |
| **E2E** | 14 | 88+ | Pasando |
| **Total** | 465 | 7,749 | 7,661 pasando |

### Cobertura de Codigo

| Metrica | Porcentaje |
| --- | --- |
| **Statements** | 97.26% |
| **Branches** | 88.43% |
| **Functions** | 96.66% |
| **Lines** | 97.35% |

Umbral global: 70% (jest.config.js). Exclusiones: `instrument.ts`, `seed.ts`, `seeds/**/*.ts`.

### Ejecutar Tests

```bash
bun run test           # Tests unitarios
bun run test:cov       # Con cobertura
bun run test:e2e       # End-to-end
bun run test:watch     # Modo watch
bun run test:integration # Tests de integracion
```

### Estructura de Tests

```
test/
├── application/              # Tests de casos de uso (140 archivos)
│   ├── auditUseCases/        #   Consultas de logs de auditoria
│   ├── authUseCases/         #   Login, registro, refresco de token
│   ├── categoryUseCases/     #   CRUD de categorias
│   ├── companyUseCases/      #   CRUD de empresas + listado
│   ├── contactUseCases/      #   CRUD de contactos
│   ├── dashboardUseCases/    #   Metricas del dashboard
│   ├── eventHandlers/        #   Manejadores de eventos de dominio (20+)
│   ├── importUseCases/       #   Preview/ejecucion de importacion
│   ├── integrationUseCases/  #   Conexion de integracion, mapeo SKU, sync
│   ├── movementUseCases/     #   CRUD de movimientos + confirmacion
│   ├── organizationUseCases/ #   Configuraciones de organizacion
│   ├── productUseCases/      #   CRUD de productos + busqueda
│   ├── reorderRuleUseCases/  #   Gestion de reglas de reorden
│   ├── reportUseCases/       #   Generacion de reportes
│   ├── returnUseCases/       #   CRUD de devoluciones + confirmacion
│   ├── roleUseCases/         #   Gestion de roles
│   ├── saleUseCases/         #   Ciclo de vida de ventas + intercambio
│   ├── stockUseCases/        #   Consultas de stock
│   ├── transferUseCases/     #   Flujo de transferencias
│   ├── userUseCases/         #   Gestion de usuarios
│   └── warehouseUseCases/    #   CRUD de bodegas
├── authentication/           # Tests de dominio de auth (guards, strategies, decorators)
├── infrastructure/           # Tests de repositorios + servicios (34 archivos)
│   ├── database/
│   │   ├── repositories/     #   20+ tests de repositorios Prisma
│   │   ├── services/         #   Unit of work, optimizador de consultas
│   │   └── utils/            #   Utilidades de consulta
│   ├── externalServices/     #   Email, notificaciones, parsing, templates
│   └── jobs/                 #   Tests de tareas programadas
├── integrations/             # Tests de integracion VTEX (12 archivos)
│   ├── shared/               #   Encriptacion, entidades
│   └── vtex/                 #   Cliente API, sync, polling, webhook
├── interfaces/http/          # Tests de controladores (24 archivos)
│   ├── audit/                #   Endpoints de logs de auditoria
│   ├── contacts/             #   Endpoints de contactos
│   ├── dashboard/            #   Metricas del dashboard
│   ├── import/               #   Preview/ejecucion de importacion
│   ├── integrations/         #   Controladores de integracion + webhook
│   ├── inventory/            #   Productos, categorias, bodegas, stock
│   ├── report/               #   Vista/exportacion/stream de reportes
│   ├── returns/              #   Endpoints de devoluciones
│   ├── sales/                #   Endpoints de ventas
│   └── users/                #   Endpoints de usuarios + roles
├── inventory/                # Tests de dominio de inventario (71 archivos)
│   ├── locations/            #   Entidades + mappers de ubicaciones
│   ├── movements/            #   Entidades + mappers de movimientos
│   ├── products/             #   Entidades, factories, mappers de productos
│   ├── stock/                #   Entidades + DTOs de stock
│   ├── transfers/            #   Entidades de transferencias
│   └── warehouses/           #   Entidades, factories, mappers de bodegas
├── shared/                   # Tests transversales (57 archivos)
│   ├── domain/               #   Monada Result, clases base, eventos, specs
│   ├── filters/              #   Filtro global de excepciones
│   ├── guards/               #   Permission guard
│   ├── infrastructure/       #   Cache, patrones de resiliencia
│   ├── interceptors/         #   Auditoria, metricas, respuesta
│   └── services/             #   Metricas, logger estructurado
├── report/                   # Tests de dominio de reportes
│   ├── domain/               #   Servicio de generacion de reportes (196 tests)
│   └── interceptors/         #   Logging de reportes
├── sales/                    # Tests de dominio de ventas
├── returns/                  # Tests de dominio de devoluciones
├── organization/             # Tests de dominio de organizacion
└── import/                   # Tests de dominio de importacion + e2e
```

---

## Contribucion

Las contribuciones son bienvenidas!

### Flujo de Trabajo

1. **Fork** del repositorio
2. **Crear** una rama desde `dev`:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Desarrollar** siguiendo las convenciones
4. **Ejecutar** tests:
   ```bash
   bun run test && bun run lint && bun run format && bun run build
   ```
5. **Commit** usando commits convencionales:
   ```bash
   git commit -m "feat(inventory): add stock alert notifications"
   ```
6. **Push** y crear un Pull Request hacia `dev`

### Convenciones de Codigo

| Aspecto | Convencion |
| --- | --- |
| **Idioma del codigo** | Ingles (variables, funciones, mensajes) |
| **Variables/Funciones** | camelCase |
| **Clases** | PascalCase |
| **Interfaces** | `I` + PascalCase (ej., `IProductRepository`) |
| **Archivos** | camelCase.ts |
| **Carpetas** | camelCase |
| **Tests** | Patron `Given-When-Then` |
| **Imports** | Path aliases (`@src/*`, `@inventory/*`, etc.) |

### Commits Convencionales

```bash
feat(scope): agregar nueva funcionalidad
fix(scope): corregir error
docs(scope): actualizar documentacion
refactor(scope): reestructuracion de codigo
test(scope): agregar/actualizar tests
chore(scope): tareas de mantenimiento
```

### Checklist para PRs

- [ ] El codigo sigue las convenciones del proyecto
- [ ] Tests escritos y pasando
- [ ] Linter pasa (`bun run lint`)
- [ ] Build exitoso (`bun run build`)
- [ ] Documentacion actualizada si es necesario
- [ ] Swagger actualizado para nuevos endpoints

---

## Licencia

Este proyecto esta bajo la **Licencia MIT**. Consulta [LICENSE](LICENSE) para mas detalles.

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

## Autor

<p align="center">
  <strong>Cesar Javier Ortiz Montero</strong>
</p>

---

## Indice de Documentacion

### Documentacion de Modulos

| Documento | Descripcion |
| --- | --- |
| [Modulo de Inventario](docs/modules/inventory.md) | Productos, bodegas, movimientos, transferencias, stock |
| [Modulo de Autenticacion](docs/modules/authentication.md) | Autenticacion JWT, RBAC, usuarios, roles, sesiones |
| [Modulo de Ventas](docs/modules/sales.md) | Ciclo de vida de ordenes de venta |
| [Modulo de Devoluciones](docs/modules/returns.md) | Devoluciones de clientes y proveedores |
| [Modulo de Contactos](docs/modules/contacts.md) | Gestion de contactos |
| [Modulo de Integraciones](docs/modules/integrations.md) | Integracion VTEX, webhooks, sincronizacion |
| [Modulo de Reportes](docs/modules/reports.md) | 17 tipos de reportes y exportaciones |
| [Modulo de Importacion](docs/modules/import.md) | Importacion masiva desde Excel/CSV |
| [Modulo de Organizacion](docs/modules/organization.md) | Multi-tenancy, configuraciones, dashboard, auditoria |
| [Modulo Shared](docs/modules/shared.md) | Monada Result, errores, especificaciones, guards |
| [Modulo de Infraestructura](docs/modules/infrastructure.md) | Base de datos, repositorios, resiliencia, tareas |

### Documentacion Tecnica

| Documento | Descripcion |
| --- | --- |
| [Arquitectura](docs/technical/architecture.md) | Arquitectura detallada del sistema |
| [Patrones de Diseno](docs/technical/patterns.md) | 14+ patrones implementados |
| [Referencia de API](docs/technical/api-reference.md) | Referencia completa de endpoints |
| [Mapa de Contextos Acotados](docs/technical/bounded-context-map.md) | Mapa de contextos DDD (9 contextos) |
| [Guia de Monada Result](docs/technical/result-monad-guide.md) | Guia del patron Result<T, E> |
| [Modelo de Datos](docs/technical/data_model.md) | Estructura de la base de datos |
| [Guia de Testing](docs/technical/testing-structure.md) | Estructura y convenciones de tests |
| [Codigos de Error](docs/technical/error-codes.md) | Catalogo de codigos de error (100+) |

### Testing de API

| Documento | Descripcion |
| --- | --- |
| [Colecciones de Postman](docs/postman/) | Colecciones de prueba de API |
| [Guia de Postman](docs/postman/USER_GUIDE.md) | Como usar las colecciones de Postman |

---

<p align="center">
  <sub>Construido con NestJS | Impulsado por Bun | PostgreSQL + Prisma + Redis</sub>
</p>
