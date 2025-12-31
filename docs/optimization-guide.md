# Optimization and Refactoring Guide

This guide documents the optimization and refactoring work implemented in the project, including caching strategies, functional programming patterns, lazy loading, and performance optimizations.

## Table of Contents

1. [Caching Strategy](#caching-strategy)
2. [Functional Programming Patterns](#functional-programming-patterns)
3. [Lazy Loading](#lazy-loading)
4. [Database Query Optimization](#database-query-optimization)
5. [Performance Best Practices](#performance-best-practices)

## Caching Strategy

### Overview

The project implements a functional caching layer using Redis through NestJS CacheManager. All cache operations use the `Result<T, E>` monad for explicit error handling.

### Cache Service Interface

The `ICacheService` interface provides a type-safe, functional approach to caching:

```typescript
import { ICacheService } from '@shared/ports/cache';

interface ICacheService {
  get<T>(key: string): Promise<Result<T | null, DomainError>>;
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void, DomainError>>;
  delete(key: string): Promise<Result<void, DomainError>>;
  exists(key: string): Promise<Result<boolean, DomainError>>;
  clear(): Promise<Result<void, DomainError>>;
  getMany<T>(keys: string[]): Promise<Result<Map<string, T | null>, DomainError>>;
  setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<Result<void, DomainError>>;
  deleteMany(keys: string[]): Promise<Result<void, DomainError>>;
}
```

### Cache Helpers

Helper functions simplify common cache operations:

```typescript
import { cacheEntity, getCachedEntity, invalidateEntityCache } from '@shared/infrastructure/cache';

// Cache an entity
await cacheEntity(cacheService, 'product', productId, product, orgId);

// Get cached entity
const cached = await getCachedEntity<Product>(cacheService, 'product', productId, orgId);

// Invalidate cache
await invalidateEntityCache(cacheService, 'product', productId, orgId);
```

### Repository Integration

Repositories integrate caching transparently:

```typescript
async findById(id: string, orgId: string): Promise<Product | null> {
  // Try cache first
  if (this.cacheService) {
    const cached = await getCachedEntity<Product>(this.cacheService, 'product', id, orgId);
    if (cached) {
      return cached;
    }
  }

  // Fetch from database
  const product = await this.prisma.product.findUnique({ where: { id } });
  
  // Cache the result
  if (this.cacheService) {
    await cacheEntity(this.cacheService, 'product', product.id, product, orgId);
  }

  return product;
}
```

### Cache Invalidation

Cache is automatically invalidated on entity updates:

```typescript
async save(product: Product): Promise<Product> {
  const savedProduct = await this.prisma.product.update({ ... });
  
  // Invalidate and update cache
  if (this.cacheService) {
    await invalidateEntityCache(this.cacheService, 'product', savedProduct.id, savedProduct.orgId);
    await cacheEntity(this.cacheService, 'product', savedProduct.id, savedProduct, savedProduct.orgId);
  }
  
  return savedProduct;
}
```

### TTL Configuration

Time-to-live (TTL) values are configurable per entity type:

```typescript
// Default TTL: 1 hour (3600 seconds)
// Product TTL: 5 minutes (300 seconds)
// User TTL: 15 minutes (900 seconds) - shorter for security
```

## Functional Programming Patterns

### Pure Functions

Domain services have been refactored to use pure functions instead of static class methods:

**Before:**
```typescript
export class SaleCalculationService {
  public static calculateSubtotal(lines: SaleLine[]): Money { ... }
}
```

**After:**
```typescript
export function calculateSaleSubtotal(lines: SaleLine[]): Money { ... }
export function calculateSaleTotal(subtotal: Money, discounts?: Money, taxes?: Money): Money { ... }
```

### Function Composition

The `pipe` function enables left-to-right function composition:

```typescript
import { pipe } from '@shared/utils/functional';

const processData = pipe(
  normalizeData,
  createValueObjects,
  reconstituteEntity
);

const result = processData(rawData);
```

### Repository Mapping with Pipe

Repository mappers use pipe composition for cleaner code:

```typescript
private mapToEntity(movementData: MovementData): Movement {
  const valueObjects = this.createMovementValueObjects(movementData);
  const movement = Movement.reconstitute({ ... }, movementData.id, movementData.orgId);
  const lines = movementData.lines.map(lineData => this.createMovementLine(lineData));

  return pipe(
    (m: Movement) => this.addLinesToMovement(m, lines),
    (m: Movement) => this.restoreMovementStatus(m, valueObjects.actualStatus)
  )(movement);
}
```

### Functional Helpers

Utility functions for common operations:

```typescript
import { map, filter, reduce, tap, identity, prop, pick, omit } from '@shared/utils/functional';

// Map over array
const doubled = map((x: number) => x * 2)([1, 2, 3]); // [2, 4, 6]

// Filter array
const evens = filter((x: number) => x % 2 === 0)([1, 2, 3, 4]); // [2, 4]

// Reduce array
const sum = reduce((acc: number, x: number) => acc + x, 0)([1, 2, 3]); // 6

// Tap for side effects
const logged = tap(console.log)(value); // Logs value, returns value

// Property access
const getName = prop('name');
const name = getName({ name: 'John', age: 30 }); // 'John'

// Pick/omit properties
const picked = pick(['name', 'age'])({ name: 'John', age: 30, city: 'NYC' });
const omitted = omit(['city'])({ name: 'John', age: 30, city: 'NYC' });
```

## Lazy Loading

### Overview

Lazy loading defers loading of related data (like movement lines) until explicitly requested, improving performance for list operations.

### Repository Methods

Repositories provide lazy loading methods:

```typescript
interface IMovementRepository {
  // Regular method (includes lines)
  findById(id: string, orgId: string): Promise<Movement | null>;
  
  // Lazy loading methods
  findByIdWithoutLines?(id: string, orgId: string): Promise<Movement | null>;
  loadLines?(movementId: string, orgId: string): Promise<MovementLine[]>;
  findAllWithoutLines?(orgId: string, pagination?: IPaginationOptions): Promise<IPaginatedResult<Movement>>;
}
```

### Use Case Integration

Use cases support optional lazy loading:

```typescript
export interface IGetMovementsRequest {
  orgId: string;
  includeLines?: boolean; // Optional: include lines (default: true)
  // ... other filters
}

async execute(request: IGetMovementsRequest): Promise<Result<IGetMovementsResponse, DomainError>> {
  const includeLines = request.includeLines !== false;
  
  let movements;
  if (!includeLines && this.movementRepository.findAllWithoutLines) {
    // Use lazy loading for better performance
    const paginationResult = await this.movementRepository.findAllWithoutLines(request.orgId, {
      skip,
      take: limit,
    });
    movements = paginationResult.data;
  } else {
    // Use regular methods that include lines
    movements = await this.movementRepository.findAll(request.orgId);
  }
  
  // ...
}
```

### Benefits

- **Reduced Memory Usage**: Only load data when needed
- **Faster List Queries**: Avoid loading large line arrays for list views
- **Flexible API**: Clients can choose to include or exclude lines

## Database Query Optimization

### Indexes

Strategic indexes have been added to improve query performance:

```prisma
model Product {
  // ...
  @@index([orgId])
  @@index([orgId, isActive])
  @@index([orgId, category])
}

model Movement {
  // ...
  @@index([orgId, warehouseId])
  @@index([orgId, status, createdAt])
}

model Sale {
  // ...
  @@index([orgId, warehouseId])
  @@index([orgId, status, createdAt])
}
```

### Query Optimization Utilities

Utilities for pagination and field selection:

```typescript
import { QueryPagination, FieldSelector, BatchOperations } from '@infrastructure/database/utils';

// Pagination
const pagination = QueryPagination.create({ page: 1, pageSize: 20 });
const result = QueryPagination.createResult(data, total, pagination);

// Field selection
const select = FieldSelector.create(['id', 'name', 'sku']);

// Batch operations
const chunks = BatchOperations.chunk(items, 1000);
await BatchOperations.executeInBatches(items, 1000, async (batch) => {
  return await repository.saveMany(batch);
});
```

### Connection Pooling

Prisma connection pooling is configured for optimal performance:

```typescript
// PrismaService automatically manages connection pooling
// Configured in prisma.service.ts
```

## Performance Best Practices

### 1. Use Caching Strategically

- Cache frequently accessed entities (products, warehouses, users)
- Use appropriate TTL values based on update frequency
- Invalidate cache on updates to maintain consistency

### 2. Leverage Lazy Loading

- Use `includeLines: false` for list operations
- Load lines only when displaying detail views
- Reduces memory usage and improves query performance

### 3. Apply Functional Patterns

- Use pure functions for calculations and validations
- Compose functions with `pipe` for readability
- Prefer immutable operations

### 4. Optimize Database Queries

- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Use field selection to reduce data transfer

### 5. Monitor Performance

- Track cache hit/miss ratios
- Monitor query execution times
- Profile memory usage with lazy loading

## Migration Guide

### Updating Calculation Services

**Before:**
```typescript
import { SaleCalculationService } from '@sales/domain/services/saleCalculation.service';

const subtotal = SaleCalculationService.calculateSubtotal(lines);
```

**After:**
```typescript
import { calculateSaleSubtotal } from '@sales/domain/services/saleCalculation.service';

const subtotal = calculateSaleSubtotal(lines);
```

### Updating Repository Mappers

Repository mappers now use pipe composition internally. No changes needed in calling code.

### Enabling Lazy Loading

Add `includeLines` parameter to use case requests:

```typescript
const result = await getMovementsUseCase.execute({
  orgId: 'org-123',
  includeLines: false, // Enable lazy loading
  page: 1,
  limit: 20,
});
```

## Conclusion

These optimizations provide:

- **Improved Performance**: Caching and lazy loading reduce database load
- **Better Code Quality**: Functional patterns improve testability and maintainability
- **Scalability**: Optimized queries and connection pooling support growth
- **Developer Experience**: Clear patterns and utilities simplify development

For questions or issues, refer to the specific service documentation or contact the development team.

