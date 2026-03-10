> [English](./testing-structure.md) | **[Español](./testing-structure.es.md)**

# Estructura de Tests - Sistema de Inventarios

## Descripcion

Este documento describe la estructura de tests del sistema de inventarios, que sigue los patrones **AAA (Arrange, Act, Assert)** y **Given-When-Then** para mayor claridad y mantenibilidad.

## Estructura de Carpetas

La estructura de tests refleja exactamente la estructura de `src/` para mantener consistencia:

```
test/
├── application/              # 140 archivos - Use cases y event handlers
│   ├── auditUseCases/        #   Consulta de logs de auditoria
│   ├── authUseCases/         #   Login, registro, refresh token
│   ├── categoryUseCases/     #   CRUD de categorias
│   ├── companyUseCases/      #   CRUD de empresas + listado
│   ├── contactUseCases/      #   CRUD de contactos
│   ├── dashboardUseCases/    #   Metricas del dashboard
│   ├── eventHandlers/        #   Handlers de eventos de dominio (20+)
│   ├── importUseCases/       #   Preview/ejecucion de importaciones
│   ├── integrationUseCases/  #   Conexiones, mapeo SKU, sincronizacion
│   ├── movementUseCases/     #   CRUD de movimientos + confirmacion
│   ├── productUseCases/      #   CRUD de productos + busqueda
│   ├── returnUseCases/       #   CRUD de devoluciones + confirmacion
│   ├── saleUseCases/         #   Ciclo de vida de ventas + swap
│   ├── transferUseCases/     #   Workflow de transferencias
│   └── ...                   #   + organization, report, role, stock, user, warehouse
├── authentication/           # Dominio de autenticacion (guards, strategies, decorators)
├── infrastructure/           # 34 archivos - Repositorios + servicios
│   ├── database/repositories/ #  20+ tests de repositorios Prisma
│   ├── externalServices/     #   Email, notificaciones, templates, file parsing
│   └── jobs/                 #   Tareas programadas
├── integrations/             # 12 archivos - VTEX
│   ├── shared/               #   Encriptacion, entidades compartidas
│   └── vtex/                 #   API client, sync, polling, webhook
├── interfaces/http/          # 24 archivos - Controllers
│   ├── audit/                #   Endpoints de auditoria
│   ├── contacts/             #   Endpoints de contactos
│   ├── integrations/         #   Endpoints de integraciones + webhook VTEX
│   ├── inventory/            #   Productos, categorias, bodegas, stock
│   ├── report/               #   View/export/stream de reportes
│   └── ...                   #   + dashboard, import, returns, sales, users
├── inventory/                # 71 archivos - Dominio core
│   ├── products/             #   Entidades, factories, mappers de productos
│   ├── movements/            #   Entidades, mappers de movimientos
│   ├── transfers/            #   Entidades de transferencias
│   ├── warehouses/           #   Entidades, factories, mappers de bodegas
│   └── ...                   #   + locations, stock
├── shared/                   # 57 archivos - Cross-cutting
│   ├── domain/               #   Result monad, base classes, events, specs
│   ├── infrastructure/       #   Cache, patrones de resiliencia
│   └── ...                   #   + filters, guards, interceptors, services
├── report/                   # Dominio de reportes (196 tests en reportGeneration)
├── sales/                    # Dominio de ventas
├── returns/                  # Dominio de devoluciones
└── organization/             # Dominio de organizacion
```

## Patrones de Testing

### **AAA (Arrange, Act, Assert)**

Cada test se estructura en tres secciones claras:

```typescript
it('Given: condition When: action Then: expected result', () => {
  // Arrange: Preparar datos y mocks
  const mockData = { status: 'healthy' };
  mockService.getHealth.mockResolvedValue(mockData);

  // Act: Ejecutar la funcion a testear
  const result = await service.getHealth();

  // Assert: Verificar el resultado
  expect(result).toEqual(mockData);
  expect(mockService.getHealth).toHaveBeenCalled();
});
```

### **Given-When-Then**

Los nombres de los tests siguen el patron BDD (Behavior Driven Development):

```typescript
it('Given: healthy database When: checking health Then: should return healthy status', () => {
  // Implementacion del test
});

it('Given: database failure When: checking health Then: should return unhealthy status', () => {
  // Implementacion del test
});
```

## Convenciones de Naming

### **Archivos de Test**

- **Unitarios**: `*.spec.ts`
- **End-to-End**: `*.e2e-spec.ts`
- **Integracion**: `*.integration-spec.ts`

### **Nombres de Tests**

- **Formato**: `Given: precondicion When: accion Then: resultado esperado`
- **Ejemplo**: `Given: valid user credentials When: logging in Then: should return JWT token`

### **Variables y Mocks**

- **Mocks**: `mockServiceName`
- **Variables de test**: `expectedResult`, `actualResult`
- **Datos de prueba**: `validUserData`, `invalidUserData`

## Tipos de Tests

### **1. Tests Unitarios (Domain Layer)**

```typescript
// test/shared/domain/healthCheck.service.spec.ts
describe('Health Check Domain Service', () => {
  describe('createHealthCheckResult', () => {
    it('Given: healthy status, version 1.0.0, test environment When: creating result Then: should return correct health check result', () => {
      // Arrange
      const status: HealthStatus = 'healthy';
      const version = '1.0.0';
      const environment = 'test';

      // Act
      const result = createHealthCheckResult(status, version, environment);

      // Assert
      expect(result.status).toBe(status);
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
    });
  });
});
```

### **2. Tests Unitarios (Application Layer)**

```typescript
// test/application/healthCheck/healthCheck.application.service.spec.ts
describe('HealthCheckApplicationService', () => {
  describe('getBasicHealth', () => {
    it('Given: healthy port response When: getting basic health Then: should return basic health from port', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        /* ... */
      };
      mockHealthCheckPort.checkBasic.mockResolvedValue(mockResult);

      // Act
      const result = await service.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckPort.checkBasic).toHaveBeenCalledTimes(1);
    });
  });
});
```

### **3. Tests Unitarios (Infrastructure Layer)**

```typescript
// test/infrastructure/healthCheck/healthCheck.adapter.spec.ts
describe('HealthCheckAdapter', () => {
  describe('checkDatabase', () => {
    it('Given: healthy database When: checking database health Then: should return true', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith('SELECT 1');
    });
  });
});
```

### **4. Tests Unitarios (Interface Layer)**

```typescript
// test/interfaces/http/healthCheck/healthCheck.controller.spec.ts
describe('HealthCheckController', () => {
  describe('getBasicHealth', () => {
    it('Given: healthy service response When: getting basic health Then: should return basic health status', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        /* ... */
      };
      mockHealthCheckService.getBasicHealth.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckService.getBasicHealth).toHaveBeenCalledTimes(1);
    });
  });
});
```

## Beneficios de esta Estructura

### **1. Claridad**

- **AAA**: Separacion clara de responsabilidades en cada test
- **Given-When-Then**: Descripcion natural del comportamiento esperado

### **2. Mantenibilidad**

- **Estructura consistente**: Facil de navegar y entender
- **Nombres descriptivos**: Codigo auto-documentado

### **3. Debugging**

- **Facil identificacion**: Problemas claramente identificables
- **Contexto claro**: Cada test tiene su propio contexto

### **4. Colaboracion**

- **Lenguaje comun**: El equipo puede entender tests facilmente
- **Documentacion viva**: Tests como especificacion de comportamiento

## Ejecucion de Tests

### **Tests Unitarios**

```bash
# Ejecutar todos los tests unitarios
bun run test

# Ejecutar tests especificos
bun run test test/shared/domain/healthCheck.service.spec.ts

# Ejecutar tests con coverage
bun run test:cov

# Ejecutar tests en modo CI (sin e2e)
npx jest --ci --coverage --watchAll=false --forceExit --testPathIgnorePatterns='e2e'

# Ejecutar un directorio especifico
npx jest --testPathPatterns='test/application/companyUseCases'
```

### **Tests End-to-End**

```bash
# Ejecutar tests e2e
bun run test:e2e

# Ejecutar tests e2e especificos
bun run test:e2e healthCheck.e2e-spec.ts
```

### **Tests de Integracion**

```bash
# Ejecutar tests de integracion
bun run test:integration
```

## Cobertura de Tests

### **Metricas Actuales**

| Metrica | Porcentaje | Threshold |
|---------|-----------|-----------|
| **Statements** | 97.26% | 70% |
| **Branches** | 88.43% | 70% |
| **Functions** | 96.66% | 70% |
| **Lines** | 97.35% | 70% |

### **Estadisticas de Tests**

| Tipo | Archivos | Tests | Estado |
|------|----------|-------|--------|
| Unit | 450 | 7,661 | Passing |
| E2E | 14 | 88+ | Passing |
| **Total** | **465** | **7,749** | **7,661 passing** |

### **Distribucion por Capa**

| Capa | Archivos de Test | Descripcion |
|------|-----------------|-------------|
| Application (Use Cases) | 140 | Tests de casos de uso, event handlers |
| Domain (Entities/VOs) | 163 | Tests de entidades, value objects, servicios de dominio |
| Infrastructure | 34 | Tests de repositorios Prisma, servicios externos, jobs |
| Interfaces (Controllers) | 24 | Tests de controladores HTTP |
| Integrations (VTEX) | 12 | Tests de integracion con plataformas externas |
| Shared (Cross-cutting) | 57 | Tests de utilidades, guards, interceptors, filtros |
| Inventory (Core Domain) | 71 | Tests de productos, bodegas, movimientos, transfers |

### **Reportes**

```bash
# Generar reporte HTML
bun run test:cov

# Ver en navegador
open coverage/lcov-report/index.html
```

### **Notas sobre Branch Coverage**

El branch coverage (88.43%) es menor que las demas metricas debido a:

1. **Branches de decoradores NestJS**: Istanbul cuenta los branches de metadata de decoradores (`@Controller`, `@Get`, `@ApiOperation`, etc.) que no son testeables en tests unitarios. Esto representa ~300+ branches no cubribles.
2. **Patron `error instanceof Error`**: Cada catch block tiene la verificacion `error instanceof Error ? error.message : 'Unknown error'`. Ambas ramas se testean (Error y non-Error throw).
3. **Optional chaining y nullish coalescing**: Expresiones como `data?.field ?? defaultValue` generan multiples branches implicitos.

## Mejores Practicas

### **1. Organizacion**

- **Un test por comportamiento**: Cada test debe verificar una cosa
- **Agrupacion logica**: Usar `describe` para agrupar tests relacionados
- **Orden de ejecucion**: Tests independientes entre si

### **2. Mocks y Stubs**

- **Mocks realistas**: Simular comportamiento real de dependencias
- **Cleanup**: Restaurar estado despues de cada test
- **Verificacion**: Verificar que mocks fueron llamados correctamente

### **3. Datos de Test**

- **Datos representativos**: Usar datos que reflejen casos reales
- **Casos edge**: Incluir casos limite y de error
- **Consistencia**: Mantener datos consistentes entre tests

### **4. Naming**

- **Descriptivo**: Nombres que expliquen que se esta probando
- **Consistente**: Seguir convenciones establecidas
- **Legible**: Facil de entender para otros desarrolladores

## Ejemplos Completos

### **Test Completo de Dominio**

```typescript
describe('Health Check Domain Service', () => {
  describe('determineOverallStatus', () => {
    it('Given: healthy basic status, healthy database and system, all healthy services When: determining overall status Then: should return healthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('healthy');
    });
  });
});
```

### **Test Completo de Aplicacion**

```typescript
describe('HealthCheckApplicationService', () => {
  describe('getFullHealthCheck', () => {
    it('Given: healthy database and system When: getting full health check Then: should return full health with domain orchestration', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });
  });
});
```

## Patrones de Testing Avanzados

### **Testing con Result Monad**

El proyecto usa `Result<T, DomainError>` en lugar de excepciones. Los tests verifican ambas ramas:

```typescript
// Camino de exito
const result = await useCase.execute(validRequest);
result.match(
  (value) => {
    expect(value.success).toBe(true);
    expect(value.data).toBeDefined();
  },
  () => fail('Expected success'),
);

// Camino de error
const result = await useCase.execute(invalidRequest);
result.match(
  () => fail('Expected error'),
  (error) => {
    expect(error.code).toBe('ENTITY_NOT_FOUND');
  },
);
```

### **Testing de Non-Error Throw**

Cada catch block tiene `error instanceof Error ? error.message : 'Unknown error'`. Ambas ramas se testean:

```typescript
// Instancia de Error
mockRepo.findById.mockRejectedValue(new Error('DB connection failed'));
// ... assert error.message contiene 'DB connection failed'

// Non-Error throw (string, number, object)
mockRepo.findById.mockRejectedValue('string-error');
// ... assert error.message contiene 'Unknown error'
```

### **Testing de Cache Service**

Los repositorios con cache tienen tests para cache-hit y cache-miss:

```typescript
// Cache miss - va a la BD
mockCacheService.get.mockResolvedValue(null);
mockPrisma.product.findUnique.mockResolvedValue(dbProduct);
const result = await repository.findById(id, orgId);
expect(mockPrisma.product.findUnique).toHaveBeenCalled();
expect(mockCacheService.set).toHaveBeenCalled();

// Cache hit - omite la BD
mockCacheService.get.mockResolvedValue(cachedProduct);
const result = await repository.findById(id, orgId);
expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
```

### **Patrones de Mock con `@jest/globals`**

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock tipado
const mockRepository = {
  findById: jest.fn<(id: string, orgId: string) => Promise<Entity | null>>(),
  save: jest.fn<(entity: Entity) => Promise<Entity>>(),
} as jest.Mocked<IRepository>;

// Reset en beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});
```

### **Testing de Controllers con Query Params**

```typescript
const result = await controller.findAll(
  { orgId: 'org-1' } as any,  // req con orgId
  'search-term',               // query param
  1,                           // page
  10,                          // limit
);
expect(mockUseCase.execute).toHaveBeenCalledWith(
  expect.objectContaining({ orgId: 'org-1', search: 'search-term' }),
);
```

## Conclusion

Esta estructura de tests proporciona:

1. **Claridad**: Tests faciles de entender y mantener
2. **Consistencia**: Estructura uniforme en todo el proyecto
3. **Mantenibilidad**: Facil de modificar y extender
4. **Colaboracion**: El equipo puede trabajar eficientemente
5. **Calidad**: Tests como documentacion viva del sistema

Siguiendo estos patrones, el sistema de tests se convierte en una herramienta poderosa para garantizar la calidad y estabilidad del codigo.
