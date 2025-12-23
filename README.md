# 📦 Sistema de Inventarios Multi-Tenant

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  Sistema de gestión de inventarios multi-tenant construido con <strong>NestJS</strong>, siguiendo principios de <strong>Domain-Driven Design (DDD)</strong>, <strong>Arquitectura Hexagonal</strong> y <strong>Screaming Architecture</strong>.
</p>

## 📋 Descripción

Sistema de inventarios diseñado para optimizar el control, registro y gestión de existencias en múltiples bodegas y organizaciones. El sistema garantiza visibilidad en tiempo real sobre entradas, salidas, movimientos y disponibilidad de productos, mejorando la eficiencia operativa y facilitando la toma de decisiones a través de reportes confiables y trazables.

### 🎯 Objetivos

- **Control de inventario en tiempo real** en múltiples bodegas y organizaciones
- **Trazabilidad completa** de todos los movimientos de inventario
- **Reducción de pérdidas** por quiebres de stock o sobre-inventario
- **Soporte para toma de decisiones** mediante reportes confiables
- **Escalabilidad** para crecer hasta 50+ bodegas y 100,000+ productos

## 🏗️ Arquitectura

El proyecto sigue una arquitectura moderna y escalable:

### **Arquitectura Hexagonal (Ports & Adapters)**
- **Dominio**: Lógica de negocio pura, sin dependencias externas
- **Aplicación**: Casos de uso que orquestan el dominio
- **Infraestructura**: Adaptadores de salida (Prisma, Redis, etc.)
- **Interfaces**: Adaptadores de entrada (HTTP controllers, DTOs)

### **Domain-Driven Design (DDD)**
- **Bounded Contexts**: Separación clara entre dominios (Auth, Inventory, Reports)
- **Aggregates**: Agregados con raíces bien definidas y reglas de consistencia
- **Value Objects**: Objetos inmutables que representan conceptos del dominio
- **Domain Services**: Servicios que encapsulan lógica de negocio compleja
- **Repository Pattern**: Abstracción de la persistencia de datos

### **Screaming Architecture**
La estructura de carpetas "grita" el dominio del negocio:
- `inventory/` es el dominio principal que domina la estructura
- Carpetas como `products/`, `warehouses/`, `movements/` son claras y explícitas
- La jerarquía refleja la importancia del dominio de inventarios

## 🚀 Características Principales

### ✅ Autenticación y Autorización
- **Autenticación JWT** con refresh tokens
- **Sistema RBAC** (Role-Based Access Control) con permisos granulares
- **Roles predefinidos**: ADMIN, SUPERVISOR, WAREHOUSE_OPERATOR, CONSULTANT, IMPORT_OPERATOR
- **Roles personalizados**: Cada organización puede crear roles con permisos específicos
- **Multi-tenancy**: Aislamiento completo de datos por organización
- **Rate limiting** y blacklisting de tokens

### ✅ Gestión de Inventario
- **Productos**: Gestión completa con SKU único, categorías, unidades de medida
- **Bodegas y Ubicaciones**: Gestión de múltiples bodegas con ubicaciones internas
- **Movimientos**: Registro de entradas, salidas y ajustes con validación de stock
- **Transferencias**: Transferencias entre bodegas con estados (DRAFT, IN_TRANSIT, RECEIVED, etc.)
- **Valorización**: Cálculo automático de costos mediante Promedio Ponderado Móvil (PPM)
- **Alertas de stock**: Notificaciones automáticas de stock bajo/máximo

### ✅ Reportes e Importaciones
- **Reportes de inventario**: Disponible, histórico, valorización
- **Exportación**: PDF, Excel, CSV
- **Importación masiva**: Carga de productos desde Excel/CSV con validación
- **Auditoría completa**: Registro de todas las operaciones con trazabilidad

### ✅ Personalización
- **Branding por organización**: Logos, colores, fuentes personalizadas
- **Configuraciones**: Timezone, moneda, formato de fecha por organización
- **Preferencias de usuario**: Configuraciones individuales

## 📁 Estructura del Proyecto

```
src/
├── inventory/          # 🎯 Dominio principal (Screaming Architecture)
│   ├── products/      # Productos
│   ├── warehouses/    # Bodegas
│   ├── movements/     # Movimientos de inventario
│   ├── transfers/     # Transferencias entre bodegas
│   └── stock/         # Control de stock
├── authentication/    # 🔐 Autenticación y autorización
│   ├── users/         # Gestión de usuarios
│   ├── roles/         # Roles y permisos
│   ├── sessions/      # Sesiones y tokens
│   └── security/      # Guards, interceptors, decorators
├── organization/      # 🏢 Multi-tenancy y organización
├── application/       # 🚀 Casos de uso
├── infrastructure/    # 🔌 Adaptadores de salida
│   ├── database/      # Prisma + PostgreSQL
│   └── externalServices/ # Servicios externos
├── interfaces/        # 🌐 Adaptadores de entrada (HTTP)
├── shared/            # 🛠️ Utilidades compartidas
└── healthCheck/       # ❤️ Health checks
```

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js 18+ con TypeScript (strict mode)
- **Framework**: NestJS 11+
- **Base de Datos**: PostgreSQL 15+ con Prisma ORM
- **Caché**: Redis (para sesiones y datos frecuentes)
- **Autenticación**: JWT con Passport
- **Validación**: class-validator + class-transformer
- **Testing**: Jest + Supertest
- **Documentación**: Swagger/OpenAPI

## 📦 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ y npm/yarn
- PostgreSQL 15+
- Redis (opcional, para sesiones)
- Docker y Docker Compose (opcional, para desarrollo)

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd improved-parakeet

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

### Configuración de Base de Datos

```bash
# Generar cliente Prisma
yarn run db:generate

# Ejecutar migraciones
yarn run db:migrate

# Poblar con datos de prueba (opcional)
yarn run db:seed

# Abrir Prisma Studio (interfaz visual)
yarn run db:studio
```

## 🚀 Ejecución

### Desarrollo

```bash
# Modo desarrollo (watch)
yarn run dev

# Modo desarrollo con tsx
yarn run dev:tsx

# Modo debug
yarn run debug
```

### Producción

```bash
# Compilar
yarn run build

# Ejecutar
yarn run prod
```

### Docker

```bash
# Levantar servicios (PostgreSQL, Redis)
yarn run docker:up

# Ver logs
yarn run docker:logs

# Detener servicios
yarn run docker:down
```

## 🧪 Testing

```bash
# Tests unitarios
yarn run test

# Tests en modo watch
yarn run test:watch

# Tests con cobertura
yarn run test:cov

# Tests E2E
yarn run test:e2e
```

## 📚 Documentación

- **Documentación de API**: Disponible en `/api` cuando el servidor está corriendo (Swagger)
- **Plan de Trabajo**: Ver `docs/work_plan.md`
- **Requerimientos**: Ver `docs/Requirement.md`
- **Modelo de Datos**: Ver `docs/data_model.md`
- **Estructura de Tests**: Ver `docs/testing-structure.md`

## 🔐 Seguridad

- **Autenticación**: JWT con tokens de acceso (15 min) y refresh (7 días)
- **Autorización**: Permisos granulares por módulo y acción
- **Multi-tenancy**: Aislamiento completo de datos por organización
- **Rate Limiting**: Protección contra abuso por IP y usuario
- **Auditoría**: Registro completo de todas las operaciones
- **Validación**: Sanitización y validación de entrada en todos los endpoints

## 📊 Estado del Proyecto

### ✅ Completado

- ✅ Arquitectura base (Hexagonal + DDD + Screaming Architecture)
- ✅ Sistema de autenticación completo con JWT
- ✅ Sistema RBAC con roles predefinidos y personalizados
- ✅ Gestión de usuarios y permisos
- ✅ Estructura base del dominio de inventario
- ✅ Multi-tenancy implementado
- ✅ Tests unitarios y E2E para autenticación

### ⏳ En Progreso

- ⏳ Casos de uso y APIs REST de inventario
- ⏳ Sistema de reportes
- ⏳ Importaciones masivas

### 📋 Pendiente

- 📋 Personalización de marca
- 📋 Optimización y despliegue
- 📋 Documentación completa de API

## 🤝 Contribución

Este es un proyecto privado. Para contribuir:

1. Crear una rama desde `dev`: `git checkout -b feature/nueva-funcionalidad`
2. Realizar cambios siguiendo las convenciones del proyecto
3. Ejecutar tests: `yarn run test`
4. Verificar linting: `yarn run lint:check`
5. Crear un Pull Request hacia `dev`

### Convenciones de Código

- **Idioma**: Todo el código debe estar en inglés (variables, funciones, mensajes)
- **Naming**: camelCase para variables/funciones, PascalCase para clases
- **Imports**: Usar path aliases definidos en `tsconfig.json`
- **Testing**: Tests con patrón Given-When-Then
- Ver `.cursorrules` para más detalles

## 📝 Scripts Disponibles

```bash
# Desarrollo
yarn run dev              # Modo desarrollo con watch
yarn run dev:tsx          # Modo desarrollo con tsx
yarn run debug            # Modo debug

# Base de Datos
yarn run db:generate      # Generar cliente Prisma
yarn run db:migrate       # Ejecutar migraciones
yarn run db:studio        # Abrir Prisma Studio
yarn run db:seed          # Poblar con datos de prueba
yarn run db:reset         # Resetear base de datos

# Testing
yarn run test             # Tests unitarios
yarn run test:watch       # Tests en modo watch
yarn run test:cov         # Tests con cobertura
yarn run test:e2e         # Tests E2E

# Calidad de Código
yarn run lint             # Ejecutar ESLint
yarn run lint:check       # Verificar sin corregir
yarn run format           # Formatear con Prettier
yarn run format:check     # Verificar formato

# Docker
yarn run docker:up        # Levantar servicios
yarn run docker:down      # Detener servicios
yarn run docker:logs      # Ver logs
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autor

**Cesar Javier Ortiz Montero**

---

<p align="center">
  Construido con ❤️ usando <a href="https://nestjs.com">NestJS</a>
</p>
