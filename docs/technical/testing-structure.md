> **[English](./testing-structure.md)** | [Español](./testing-structure.es.md)

# Testing Structure - Inventory System

## Description

This document describes the test structure of the inventory system, which follows the **AAA (Arrange, Act, Assert)** and **Given-When-Then** patterns for greater clarity and maintainability.

## Folder Structure

The test structure mirrors the `src/` structure exactly to maintain consistency:

```
test/
├── application/              # 140 files - Use cases and event handlers
│   ├── auditUseCases/        #   Audit log queries
│   ├── authUseCases/         #   Login, registration, refresh token
│   ├── categoryUseCases/     #   Category CRUD
│   ├── companyUseCases/      #   Company CRUD + listing
│   ├── contactUseCases/      #   Contact CRUD
│   ├── dashboardUseCases/    #   Dashboard metrics
│   ├── eventHandlers/        #   Domain event handlers (20+)
│   ├── importUseCases/       #   Import preview/execution
│   ├── integrationUseCases/  #   Connections, SKU mapping, synchronization
│   ├── movementUseCases/     #   Movement CRUD + confirmation
│   ├── productUseCases/      #   Product CRUD + search
│   ├── returnUseCases/       #   Return CRUD + confirmation
│   ├── saleUseCases/         #   Sale lifecycle + swap
│   ├── transferUseCases/     #   Transfer workflow
│   └── ...                   #   + organization, report, role, stock, user, warehouse
├── authentication/           # Authentication domain (guards, strategies, decorators)
├── infrastructure/           # 34 files - Repositories + services
│   ├── database/repositories/ #  20+ Prisma repository tests
│   ├── externalServices/     #   Email, notifications, templates, file parsing
│   └── jobs/                 #   Scheduled tasks
├── integrations/             # 12 files - VTEX
│   ├── shared/               #   Encryption, shared entities
│   └── vtex/                 #   API client, sync, polling, webhook
├── interfaces/http/          # 24 files - Controllers
│   ├── audit/                #   Audit endpoints
│   ├── contacts/             #   Contact endpoints
│   ├── integrations/         #   Integration endpoints + VTEX webhook
│   ├── inventory/            #   Products, categories, warehouses, stock
│   ├── report/               #   Report view/export/stream
│   └── ...                   #   + dashboard, import, returns, sales, users
├── inventory/                # 71 files - Core domain
│   ├── products/             #   Product entities, factories, mappers
│   ├── movements/            #   Movement entities, mappers
│   ├── transfers/            #   Transfer entities
│   ├── warehouses/           #   Warehouse entities, factories, mappers
│   └── ...                   #   + locations, stock
├── shared/                   # 57 files - Cross-cutting
│   ├── domain/               #   Result monad, base classes, events, specs
│   ├── infrastructure/       #   Cache, resilience patterns
│   └── ...                   #   + filters, guards, interceptors, services
├── report/                   # Report domain (196 tests in reportGeneration)
├── sales/                    # Sales domain
├── returns/                  # Returns domain
└── organization/             # Organization domain
```

## Testing Patterns

### **AAA (Arrange, Act, Assert)**

Each test is structured in three clear sections:

```typescript
it('Given: condition When: action Then: expected result', () => {
  // Arrange: Prepare data and mocks
  const mockData = { status: 'healthy' };
  mockService.getHealth.mockResolvedValue(mockData);

  // Act: Execute the function under test
  const result = await service.getHealth();

  // Assert: Verify the result
  expect(result).toEqual(mockData);
  expect(mockService.getHealth).toHaveBeenCalled();
});
```

### **Given-When-Then**

Test names follow the BDD (Behavior Driven Development) pattern:

```typescript
it('Given: healthy database When: checking health Then: should return healthy status', () => {
  // Test implementation
});

it('Given: database failure When: checking health Then: should return unhealthy status', () => {
  // Test implementation
});
```

## Naming Conventions

### **Test Files**

- **Unit**: `*.spec.ts`
- **End-to-End**: `*.e2e-spec.ts`
- **Integration**: `*.integration-spec.ts`

### **Test Names**

- **Format**: `Given: precondition When: action Then: expected result`
- **Example**: `Given: valid user credentials When: logging in Then: should return JWT token`

### **Variables and Mocks**

- **Mocks**: `mockServiceName`
- **Test variables**: `expectedResult`, `actualResult`
- **Test data**: `validUserData`, `invalidUserData`

## Test Types

### **1. Unit Tests (Domain Layer)**

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

### **2. Unit Tests (Application Layer)**

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

### **3. Unit Tests (Infrastructure Layer)**

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

### **4. Unit Tests (Interface Layer)**

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

## Benefits of This Structure

### **1. Clarity**

- **AAA**: Clear separation of responsibilities in each test
- **Given-When-Then**: Natural description of expected behavior

### **2. Maintainability**

- **Consistent structure**: Easy to navigate and understand
- **Descriptive names**: Self-documenting code

### **3. Debugging**

- **Easy identification**: Problems clearly identifiable
- **Clear context**: Each test has its own context

### **4. Collaboration**

- **Common language**: Team can understand tests easily
- **Living documentation**: Tests as behavior specification

## Running Tests

### **Unit Tests**

```bash
# Run all unit tests
bun run test

# Run specific tests
bun run test test/shared/domain/healthCheck.service.spec.ts

# Run tests with coverage
bun run test:cov

# Run tests in CI mode (no e2e)
npx jest --ci --coverage --watchAll=false --forceExit --testPathIgnorePatterns='e2e'

# Run a specific directory
npx jest --testPathPatterns='test/application/companyUseCases'
```

### **End-to-End Tests**

```bash
# Run e2e tests
bun run test:e2e

# Run specific e2e tests
bun run test:e2e healthCheck.e2e-spec.ts
```

### **Integration Tests**

```bash
# Run integration tests
bun run test:integration
```

## Test Coverage

### **Current Metrics**

| Metric | Percentage | Threshold |
|--------|-----------|-----------|
| **Statements** | 97.26% | 70% |
| **Branches** | 88.43% | 70% |
| **Functions** | 96.66% | 70% |
| **Lines** | 97.35% | 70% |

### **Test Statistics**

| Type | Files | Tests | Status |
|------|-------|-------|--------|
| Unit | 450 | 7,661 | Passing |
| E2E | 14 | 88+ | Passing |
| **Total** | **465** | **7,749** | **7,661 passing** |

### **Distribution by Layer**

| Layer | Test Files | Description |
|-------|-----------|-------------|
| Application (Use Cases) | 140 | Use case tests, event handlers |
| Domain (Entities/VOs) | 163 | Entity tests, value objects, domain services |
| Infrastructure | 34 | Prisma repository tests, external services, jobs |
| Interfaces (Controllers) | 24 | HTTP controller tests |
| Integrations (VTEX) | 12 | External platform integration tests |
| Shared (Cross-cutting) | 57 | Utility, guard, interceptor, filter tests |
| Inventory (Core Domain) | 71 | Product, warehouse, movement, transfer tests |

### **Reports**

```bash
# Generate HTML report
bun run test:cov

# View in browser
open coverage/lcov-report/index.html
```

### **Notes on Branch Coverage**

The branch coverage (88.43%) is lower than the other metrics due to:

1. **NestJS decorator branches**: Istanbul counts decorator metadata branches (`@Controller`, `@Get`, `@ApiOperation`, etc.) that are not testable in unit tests. This accounts for ~300+ uncoverable branches.
2. **`error instanceof Error` pattern**: Each catch block has the check `error instanceof Error ? error.message : 'Unknown error'`. Both branches are tested (Error and non-Error throw).
3. **Optional chaining and nullish coalescing**: Expressions like `data?.field ?? defaultValue` generate multiple implicit branches.

## Best Practices

### **1. Organization**

- **One test per behavior**: Each test should verify one thing
- **Logical grouping**: Use `describe` to group related tests
- **Execution order**: Tests independent of each other

### **2. Mocks and Stubs**

- **Realistic mocks**: Simulate real behavior of dependencies
- **Cleanup**: Restore state after each test
- **Verification**: Verify that mocks were called correctly

### **3. Test Data**

- **Representative data**: Use data that reflects real cases
- **Edge cases**: Include edge cases and error cases
- **Consistency**: Keep data consistent across tests

### **4. Naming**

- **Descriptive**: Names that explain what is being tested
- **Consistent**: Follow established conventions
- **Readable**: Easy to understand for other developers

## Complete Examples

### **Complete Domain Test**

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

### **Complete Application Test**

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

## Advanced Testing Patterns

### **Result Monad Testing**

The project uses `Result<T, DomainError>` instead of exceptions. Tests verify both branches:

```typescript
// Success path
const result = await useCase.execute(validRequest);
result.match(
  (value) => {
    expect(value.success).toBe(true);
    expect(value.data).toBeDefined();
  },
  () => fail('Expected success'),
);

// Error path
const result = await useCase.execute(invalidRequest);
result.match(
  () => fail('Expected error'),
  (error) => {
    expect(error.code).toBe('ENTITY_NOT_FOUND');
  },
);
```

### **Non-Error Throw Testing**

Each catch block has `error instanceof Error ? error.message : 'Unknown error'`. Both branches are tested:

```typescript
// Error instance
mockRepo.findById.mockRejectedValue(new Error('DB connection failed'));
// ... assert error.message contains 'DB connection failed'

// Non-Error throw (string, number, object)
mockRepo.findById.mockRejectedValue('string-error');
// ... assert error.message contains 'Unknown error'
```

### **Cache Service Testing**

Repositories with cache have tests for cache-hit and cache-miss:

```typescript
// Cache miss - goes to DB
mockCacheService.get.mockResolvedValue(null);
mockPrisma.product.findUnique.mockResolvedValue(dbProduct);
const result = await repository.findById(id, orgId);
expect(mockPrisma.product.findUnique).toHaveBeenCalled();
expect(mockCacheService.set).toHaveBeenCalled();

// Cache hit - skips DB
mockCacheService.get.mockResolvedValue(cachedProduct);
const result = await repository.findById(id, orgId);
expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
```

### **Mock Patterns with `@jest/globals`**

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Typed mock
const mockRepository = {
  findById: jest.fn<(id: string, orgId: string) => Promise<Entity | null>>(),
  save: jest.fn<(entity: Entity) => Promise<Entity>>(),
} as jest.Mocked<IRepository>;

// Reset in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
});
```

### **Controller Testing with Query Params**

```typescript
const result = await controller.findAll(
  { orgId: 'org-1' } as any,  // req with orgId
  'search-term',               // query param
  1,                           // page
  10,                          // limit
);
expect(mockUseCase.execute).toHaveBeenCalledWith(
  expect.objectContaining({ orgId: 'org-1', search: 'search-term' }),
);
```

## Conclusion

This test structure provides:

1. **Clarity**: Tests easy to understand and maintain
2. **Consistency**: Uniform structure throughout the project
3. **Maintainability**: Easy to modify and extend
4. **Collaboration**: Team can work efficiently
5. **Quality**: Tests as living documentation of the system

Following these patterns, the test system becomes a powerful tool for ensuring code quality and stability.
