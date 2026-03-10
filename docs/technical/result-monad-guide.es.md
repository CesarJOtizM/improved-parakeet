> [English](./result-monad-guide.md) | **[Español](./result-monad-guide.es.md)**

# Result<T, E> Monad - Guia de Uso

## Introduccion

El monad `Result<T, E>` es un patron de programacion funcional para el manejo explicito de errores. En lugar de lanzar excepciones, las funciones retornan un tipo `Result` que puede ser un exito (`Ok`) o un error (`Err`).

## Tipos Base

### Tipo Result

```typescript
import { Result, ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError, ConflictError, BusinessRuleError } from '@shared/domain/result/domainError';
```

### Tipos de Error de Dominio

| Tipo de Error | Estado HTTP | Caso de Uso |
|---------------|-------------|-------------|
| `ValidationError` | 400 Bad Request | Fallas de validacion de entrada |
| `NotFoundError` | 404 Not Found | Entidad no encontrada |
| `ConflictError` | 409 Conflict | Entidades duplicadas, violaciones de unicidad |
| `BusinessRuleError` | 400 Bad Request | Violaciones de reglas de negocio |

## Uso Basico

### Crear Results

```typescript
// Resultado exitoso
const success = ok({ id: '123', name: 'Product' });

// Resultado de error
const error = err(new NotFoundError('Product not found'));
```

### Verificar el Tipo de Result

```typescript
if (result.isOk()) {
  const value = result.unwrap();
  // Usar el valor de forma segura
}

if (result.isErr()) {
  const error = result.unwrap(); // Retorna el error
  // Manejar el error
}
```

### Usar match()

El metodo `match()` proporciona pattern matching exhaustivo:

```typescript
const message = result.match(
  (value) => `Exito: ${value.name}`,
  (error) => `Error: ${error.message}`
);
```

## Implementacion en Use Cases

### Antes (Basado en excepciones)

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

### Despues (Basado en Result)

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

## Integracion con Controllers

### Usar resultToHttpResponse

```typescript
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@Post()
async createProduct(@Body() dto: CreateProductDto, @OrgId() orgId: string) {
  const result = await this.createProductUseCase.execute({ ...dto, orgId });
  return resultToHttpResponse(result);
}
```

La funcion `resultToHttpResponse`:
- Retorna el valor si el `Result` es `Ok`
- Lanza la `HttpException` apropiada si el `Result` es `Err`

### Mapeo de Errores

| Error de Dominio | Excepcion HTTP |
|------------------|----------------|
| `ValidationError` | `BadRequestException` |
| `NotFoundError` | `NotFoundException` |
| `ConflictError` | `ConflictException` |
| `BusinessRuleError` | `BadRequestException` |

## Funciones de Utilidad

### fromPromise

Envuelve una Promise en un Result:

```typescript
import { fromPromise } from '@shared/domain/result/resultUtils';

const result = await fromPromise(this.repository.findById(id, orgId));
if (result.isErr()) {
  return err(new NotFoundError('Entity not found'));
}
const entity = result.unwrap();
```

### fromThrowable

Envuelve una funcion que puede lanzar excepciones en un Result:

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

Combina multiples Results en uno:

```typescript
import { combine } from '@shared/domain/result/resultUtils';

const results = combine([result1, result2, result3]);
if (results.isErr()) {
  return err(results.unwrap());
}
const [value1, value2, value3] = results.unwrap();
```

## Composicion Funcional

### map

Transforma el valor de exito:

```typescript
const result = ok(5);
const doubled = result.map(x => x * 2); // Ok(10)
```

### flatMap

Encadena operaciones que retornan Results:

```typescript
const result = ok(5)
  .flatMap(x => ok(x * 2))
  .flatMap(x => ok(x + 1)); // Ok(11)
```

### mapErr

Transforma el valor de error:

```typescript
const result = err(new ValidationError('Invalid'))
  .mapErr(e => new BusinessRuleError(e.message));
```

## Extraccion Segura de Valores

### unwrap

Retorna el valor o lanza excepcion si es error:

```typescript
const value = result.unwrap(); // Lanza si es Err
```

### unwrapOr

Retorna el valor o un valor por defecto:

```typescript
const value = result.unwrapOr(defaultValue);
```

### unwrapOrElse

Retorna el valor o computa un valor por defecto a partir del error:

```typescript
const value = result.unwrapOrElse(error => computeDefault(error));
```

## Testing con Results

### Casos de Exito

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

### Casos de Error

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

## Mejores Practicas

### 1. Usar Tipos de Error Especificos

```typescript
// Correcto
return err(new NotFoundError('Product not found'));

// Incorrecto
return err(new Error('Product not found'));
```

### 2. Retornos Tempranos para Errores

```typescript
// Correcto
const productResult = await fromPromise(this.repo.findById(id, orgId));
if (productResult.isErr() || !productResult.unwrap()) {
  return err(new NotFoundError('Product not found'));
}
const product = productResult.unwrap();

// Continuar con el producto...
```

### 3. Usar match() para Manejo Exhaustivo

```typescript
// Correcto - Fuerza el manejo de ambos casos
return result.match(
  (value) => ({ status: 'success', data: value }),
  (error) => ({ status: 'error', message: error.message })
);
```

### 4. Mantener Controllers Delgados

```typescript
// Correcto - El controller solo delega y convierte
@Post()
async create(@Body() dto: CreateDto, @OrgId() orgId: string) {
  const result = await this.useCase.execute({ ...dto, orgId });
  return resultToHttpResponse(result);
}
```

### 5. No Mezclar Excepciones y Results

```typescript
// Correcto - Uso consistente de Result
if (!validation.isValid) {
  return err(new ValidationError(validation.errors.join(', ')));
}

// Incorrecto - Mezcla de patrones
if (!validation.isValid) {
  throw new BadRequestException(validation.errors.join(', '));
}
```

## Guia de Migracion

Al refactorizar use cases existentes:

1. Cambiar el tipo de retorno a `Promise<Result<T, DomainError>>`
2. Reemplazar `throw new XxxException()` por `return err(new XxxError())`
3. Reemplazar `return response` por `return ok(response)`
4. Actualizar el controller para usar `resultToHttpResponse()`
5. Actualizar los tests para usar `isOk()`, `isErr()` y `match()`

## Ubicacion de Archivos

- **Tipos de Result**: `src/shared/domain/result/`
- **Errores de dominio**: `src/shared/domain/result/domainError.ts`
- **Utilidades**: `src/shared/domain/result/resultUtils.ts`
- **Conversion HTTP**: `src/shared/utils/resultToHttp.ts`
