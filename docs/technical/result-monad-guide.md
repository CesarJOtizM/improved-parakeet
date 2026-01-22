# Result<T, E> Monad - Usage Guide

## Introduction

The `Result<T, E>` monad is a functional programming pattern for explicit error handling. Instead of throwing exceptions, functions return a `Result` type that can be either a success (`Ok`) or an error (`Err`).

## Core Types

### Result Type

```typescript
import { Result, ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from '@shared/domain/result/domainError';
```

### Domain Error Types

| Error Type | HTTP Status | Use Case |
|------------|-------------|----------|
| `ValidationError` | 400 Bad Request | Input validation failures |
| `NotFoundError` | 404 Not Found | Entity not found |
| `ConflictError` | 409 Conflict | Duplicate entities, uniqueness violations |
| `BusinessRuleError` | 400 Bad Request | Business rule violations |

## Basic Usage

### Creating Results

```typescript
// Success result
const success = ok({ id: '123', name: 'Product' });

// Error result
const error = err(new NotFoundError('Product not found'));
```

### Checking Result Type

```typescript
if (result.isOk()) {
  const value = result.unwrap();
  // Use value safely
}

if (result.isErr()) {
  const error = result.unwrap(); // Returns the error
  // Handle error
}
```

### Using match()

The `match()` method provides exhaustive pattern matching:

```typescript
const message = result.match(
  (value) => `Success: ${value.name}`,
  (error) => `Error: ${error.message}`
);
```

## Use Case Implementation

### Before (Exception-based)

```typescript
async execute(request: ICreateProductRequest): Promise<ICreateProductResponse> {
  const existingProduct = await this.productRepository.findBySku(request.sku);
  if (existingProduct) {
    throw new ConflictException('SKU already exists');
  }
  
  const product = Product.create({ ... });
  await this.productRepository.save(product);
  
  return {
    success: true,
    message: 'Product created successfully',
    data: { ... }
  };
}
```

### After (Result-based)

```typescript
import { Result, ok, err } from '@shared/domain/result';
import { ConflictError, DomainError } from '@shared/domain/result/domainError';

async execute(request: ICreateProductRequest): Promise<Result<ICreateProductResponse, DomainError>> {
  const existingProduct = await this.productRepository.findBySku(request.sku);
  if (existingProduct) {
    return err(new ConflictError('SKU already exists'));
  }
  
  const product = Product.create({ ... });
  await this.productRepository.save(product);
  
  return ok({
    success: true,
    message: 'Product created successfully',
    data: { ... }
  });
}
```

## Controller Integration

### Using resultToHttpResponse

```typescript
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@Post()
async createProduct(@Body() dto: CreateProductDto, @OrgId() orgId: string) {
  const result = await this.createProductUseCase.execute({ ...dto, orgId });
  return resultToHttpResponse(result);
}
```

The `resultToHttpResponse` function:
- Returns the value if `Result` is `Ok`
- Throws the appropriate `HttpException` if `Result` is `Err`

### Error Mapping

| Domain Error | HTTP Exception |
|--------------|----------------|
| `ValidationError` | `BadRequestException` |
| `NotFoundError` | `NotFoundException` |
| `ConflictError` | `ConflictException` |
| `BusinessRuleError` | `BadRequestException` |

## Utility Functions

### fromPromise

Wraps a Promise in a Result:

```typescript
import { fromPromise } from '@shared/domain/result/resultUtils';

const result = await fromPromise(this.repository.findById(id, orgId));
if (result.isErr()) {
  return err(new NotFoundError('Entity not found'));
}
const entity = result.unwrap();
```

### fromThrowable

Wraps a throwing function in a Result:

```typescript
import { fromThrowable } from '@shared/domain/result/resultUtils';

const skuResult = fromThrowable(
  () => SKU.create(request.sku),
  (e) => new ValidationError(e.message)
);

if (skuResult.isErr()) {
  return err(skuResult.unwrap());
}
const sku = skuResult.unwrap();
```

### combine

Combines multiple Results into one:

```typescript
import { combine } from '@shared/domain/result/resultUtils';

const results = combine([result1, result2, result3]);
if (results.isErr()) {
  return err(results.unwrap());
}
const [value1, value2, value3] = results.unwrap();
```

## Functional Composition

### map

Transform the success value:

```typescript
const result = ok(5);
const doubled = result.map(x => x * 2); // Ok(10)
```

### flatMap

Chain operations that return Results:

```typescript
const result = ok(5)
  .flatMap(x => ok(x * 2))
  .flatMap(x => ok(x + 1)); // Ok(11)
```

### mapErr

Transform the error value:

```typescript
const result = err(new ValidationError('Invalid'))
  .mapErr(e => new BusinessRuleError(e.message));
```

## Safe Value Extraction

### unwrap

Returns the value or throws if error:

```typescript
const value = result.unwrap(); // Throws if Err
```

### unwrapOr

Returns the value or a default:

```typescript
const value = result.unwrapOr(defaultValue);
```

### unwrapOrElse

Returns the value or computes a default from the error:

```typescript
const value = result.unwrapOrElse(error => computeDefault(error));
```

## Testing with Results

### Success Cases

```typescript
it('Given: valid data When: creating Then: should return success result', async () => {
  // Arrange
  // ...
  
  // Act
  const result = await useCase.execute(request);
  
  // Assert
  expect(result.isOk()).toBe(true);
  result.match(
    (value) => {
      expect(value.success).toBe(true);
      expect(value.data.id).toBeDefined();
    },
    () => fail('Should not return error')
  );
});
```

### Error Cases

```typescript
it('Given: duplicate email When: creating Then: should return ConflictError', async () => {
  // Arrange
  mockRepository.existsByEmail.mockResolvedValue(true);
  
  // Act
  const result = await useCase.execute(request);
  
  // Assert
  expect(result.isErr()).toBe(true);
  result.match(
    () => fail('Should not return success'),
    (error) => {
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toContain('already exists');
    }
  );
});
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good
return err(new NotFoundError('Product not found'));

// ❌ Bad
return err(new Error('Product not found'));
```

### 2. Early Returns for Errors

```typescript
// ✅ Good
const productResult = await fromPromise(this.repo.findById(id, orgId));
if (productResult.isErr() || !productResult.unwrap()) {
  return err(new NotFoundError('Product not found'));
}
const product = productResult.unwrap();

// Continue with product...
```

### 3. Use match() for Exhaustive Handling

```typescript
// ✅ Good - Forces handling both cases
return result.match(
  (value) => ({ status: 'success', data: value }),
  (error) => ({ status: 'error', message: error.message })
);
```

### 4. Keep Controllers Thin

```typescript
// ✅ Good - Controller just delegates and converts
@Post()
async create(@Body() dto: CreateDto, @OrgId() orgId: string) {
  const result = await this.useCase.execute({ ...dto, orgId });
  return resultToHttpResponse(result);
}
```

### 5. Don't Mix Exceptions and Results

```typescript
// ✅ Good - Consistent Result usage
if (!validation.isValid) {
  return err(new ValidationError(validation.errors.join(', ')));
}

// ❌ Bad - Mixing patterns
if (!validation.isValid) {
  throw new BadRequestException(validation.errors.join(', '));
}
```

## Migration Guide

When refactoring existing use cases:

1. Change return type to `Promise<Result<T, DomainError>>`
2. Replace `throw new XxxException()` with `return err(new XxxError())`
3. Replace `return response` with `return ok(response)`
4. Update controller to use `resultToHttpResponse()`
5. Update tests to use `isOk()`, `isErr()`, and `match()`

## File Locations

- **Result types**: `src/shared/domain/result/`
- **Domain errors**: `src/shared/domain/result/domainError.ts`
- **Utilities**: `src/shared/domain/result/resultUtils.ts`
- **HTTP conversion**: `src/shared/utils/resultToHttp.ts`

