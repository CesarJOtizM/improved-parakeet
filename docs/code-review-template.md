# Code Review Template - Multi-Tenant Inventory System

## 📋 Review Information

**PR Title**: [PR Title]  
**Author**: [Author Name]  
**Reviewer**: [Reviewer Name]  
**Date**: [Date]  
**Files Changed**: [Number of files]  
**Lines Changed**: [+X / -Y]

---

## 🎯 Overall Score

**Total Score**: `X / 100`

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| Architecture & Structure | `X / 20` | 20% | `X.X` |
| Domain Patterns | `X / 20` | 20% | `X.X` |
| Code Conventions | `X / 15` | 15% | `X.X` |
| Use Cases & Result Monad | `X / 15` | 15% | `X.X` |
| Mappers | `X / 10` | 10% | `X.X` |
| Controllers & DTOs | `X / 10` | 10% | `X.X` |
| Testing | `X / 5` | 5% | `X.X` |
| Multi-Tenancy | `X / 5` | 5% | `X.X` |

---

## 1. 🏗️ Architecture & Structure (Score: X / 20)

### Screaming Architecture
- [ ] ✅ Structure follows domain-first organization
- [ ] ✅ Folders "scream" the business domain (inventory, sales, returns, etc.)
- [ ] ✅ No technical folders at root level (except infrastructure, interfaces, application, shared)

**Issues Found**:
- [ ] ❌ Technical structure instead of domain structure
- [ ] ❌ Mixed concerns in folders

**Recommendations**:
```
[Specific recommendations with file paths and line numbers]
```

### Hexagonal Architecture Layers
- [ ] ✅ Domain layer has no external dependencies
- [ ] ✅ Application layer (use cases) orchestrates domain
- [ ] ✅ Infrastructure layer implements ports (repositories, external services)
- [ ] ✅ Interfaces layer (HTTP controllers) uses use cases

**Issues Found**:
- [ ] ❌ Domain imports from infrastructure
- [ ] ❌ Controllers contain business logic
- [ ] ❌ Use cases access Prisma directly

**Recommendations**:
```
[Specific recommendations]
```

### Folder Structure Compliance
- [ ] ✅ Files in correct locations according to Screaming Architecture
- [ ] ✅ Domain entities in `{domain}/domain/entities/`
- [ ] ✅ Value Objects in `{domain}/domain/valueObjects/`
- [ ] ✅ Ports in `{domain}/domain/ports/repositories/`
- [ ] ✅ Use cases in `application/{domain}UseCases/`
- [ ] ✅ DTOs in `{domain}/dto/`
- [ ] ✅ Mappers in `{domain}/mappers/`
- [ ] ✅ Controllers in `interfaces/http/{domain}/` or `{domain}/`

**Issues Found**:
- [ ] ❌ Files in wrong locations
- [ ] ❌ Missing folder structure

**Recommendations**:
```
[Specific recommendations with file paths]
```

---

## 2. 🏛️ Domain Patterns (Score: X / 20)

### Entities (Aggregate Roots)
- [ ] ✅ Entity extends `AggregateRoot<TProps>`
- [ ] ✅ Private constructor
- [ ] ✅ Static `create()` method for new entities
- [ ] ✅ Static `reconstitute()` method for existing entities
- [ ] ✅ Private props, accessed through getters
- [ ] ✅ Business methods validate domain rules
- [ ] ✅ No direct property setters

**Issues Found**:
- [ ] ❌ Entity doesn't extend `AggregateRoot`
- [ ] ❌ Public constructor
- [ ] ❌ Missing `create()` or `reconstitute()` methods
- [ ] ❌ Public props or setters

**Recommendations**:
```typescript
// ❌ INCORRECT
export class Product {
  public name: string;
  constructor(name: string) { this.name = name; }
}

// ✅ CORRECT
export class Product extends AggregateRoot<IProductProps> {
  private constructor(props: IProductProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }
  
  public static create(props: IProductProps, orgId: string): Product {
    return new Product(props, undefined, orgId);
  }
  
  get name(): ProductName { return this.props.name; }
}
```

### Value Objects
- [ ] ✅ Immutable (no setters)
- [ ] ✅ Validation in constructor
- [ ] ✅ Value comparison (not reference)
- [ ] ✅ Located in `{domain}/domain/valueObjects/`

**Issues Found**:
- [ ] ❌ Mutable value objects
- [ ] ❌ Missing validation
- [ ] ❌ Reference comparison

**Recommendations**:
```
[Specific recommendations]
```

### Ports (Repository Interfaces)
- [ ] ✅ Interface in `{domain}/domain/ports/repositories/i{Entity}Repository.port.ts`
- [ ] ✅ Interface name: `I{Entity}Repository`
- [ ] ✅ Extends base interfaces (`IReadRepository`, `IWriteRepository`) when applicable
- [ ] ✅ Exported from `ports/repositories/index.ts`
- [ ] ✅ Implementation in `infrastructure/database/repositories/`
- [ ] ✅ Uses dependency injection with tokens (`@Inject('EntityRepository')`)

**Issues Found**:
- [ ] ❌ Interface in wrong location
- [ ] ❌ Wrong naming convention
- [ ] ❌ Missing base interface extension
- [ ] ❌ Direct class injection instead of token

**Recommendations**:
```typescript
// ✅ CORRECT
// Interface: @product/domain/ports/repositories/iProductRepository.port.ts
export interface IProductRepository 
  extends IReadRepository<Product>, 
          IWriteRepository<Product> {
  findBySku(sku: string, orgId: string): Promise<Product | null>;
}

// Use case injection
constructor(
  @Inject('ProductRepository')
  private readonly productRepository: IProductRepository
) {}
```

### Domain Events
- [ ] ✅ Events dispatched after entity save
- [ ] ✅ Uses `IDomainEventDispatcher` interface
- [ ] ✅ Injected with token: `@Inject('DomainEventDispatcher')`
- [ ] ✅ Calls `markEventsForDispatch()` before dispatch
- [ ] ✅ Calls `clearEvents()` after dispatch

**Issues Found**:
- [ ] ❌ Direct class injection instead of interface
- [ ] ❌ Missing event dispatch
- [ ] ❌ Events not cleared after dispatch

**Recommendations**:
```typescript
// ✅ CORRECT
constructor(
  @Inject('DomainEventDispatcher')
  private readonly eventDispatcher: IDomainEventDispatcher
) {}

async execute(request: IRequest): Promise<Result<IResponse, DomainError>> {
  const entity = Entity.create(props, request.orgId);
  const savedEntity = await this.repository.save(entity);
  
  savedEntity.markEventsForDispatch();
  await this.eventDispatcher.dispatchEvents(savedEntity.domainEvents);
  savedEntity.clearEvents();
  
  return ok({ ... });
}
```

---

## 3. 📝 Code Conventions (Score: X / 15)

### Code Language
- [ ] ✅ All code texts in English (variables, functions, logs, errors, comments)
- [ ] ✅ No Spanish in code (only in .md documentation files)

**Issues Found**:
- [ ] ❌ Spanish text in code
- [ ] ❌ Spanish in log messages
- [ ] ❌ Spanish in error messages

**Recommendations**:
```typescript
// ❌ INCORRECT
this.logger.log('Creando organización');
throw new BadRequestException('Organización no encontrada');

// ✅ CORRECT
this.logger.log('Creating organization');
throw new BadRequestException('Organization not found');
```

### Naming Conventions
- [ ] ✅ Folders: `CAMEL_CASE` (e.g., `organizationUseCases`)
- [ ] ✅ Files: `camelCase.ts` (regular), `*.spec.ts` (tests), `*.e2e-spec.ts` (E2E)
- [ ] ✅ Variables: `camelCase` or `UPPER_CASE` (constants)
- [ ] ✅ Functions: `camelCase`
- [ ] ✅ Classes: `PascalCase`
- [ ] ✅ Interfaces: `I` + `PascalCase` (e.g., `IProductRepository`)
- [ ] ✅ Types: `PascalCase` or `I` + `PascalCase`
- [ ] ✅ Enums: `PascalCase` with `UPPER_SNAKE_CASE` values

**Issues Found**:
- [ ] ❌ Wrong naming convention for [specific case]

**Recommendations**:
```
[Specific recommendations with examples]
```

### Path Aliases
- [ ] ✅ All imports use path aliases (`@domain/*`, `@application/*`, etc.)
- [ ] ✅ No relative imports (`../../../`)
- [ ] ✅ Correct alias used for each domain

**Issues Found**:
- [ ] ❌ Relative imports found
- [ ] ❌ Wrong alias used
- [ ] ❌ Missing alias usage

**Recommendations**:
```typescript
// ❌ INCORRECT
import { Product } from '../../../inventory/products/domain/entities/product.entity';

// ✅ CORRECT
import { Product } from '@product/domain/entities/product.entity';
```

### Import Order
- [ ] ✅ Built-in modules (Node.js) first
- [ ] ✅ External packages (npm) second
- [ ] ✅ Internal (@ aliases) third
- [ ] ✅ Groups separated by blank lines

**Issues Found**:
- [ ] ❌ Wrong import order
- [ ] ❌ Missing blank lines between groups

**Recommendations**:
```typescript
// ✅ CORRECT
import { Injectable, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { ProductMapper } from '@product/mappers';
```

### TypeScript
- [ ] ✅ No `any` type (uses specific types or `unknown`)
- [ ] ✅ Strict null checks (explicit null/undefined validation)
- [ ] ✅ Explicit return types when necessary
- [ ] ✅ Uses `interface` for extensible objects, `type` for unions/intersections

**Issues Found**:
- [ ] ❌ `any` type used
- [ ] ❌ Missing null checks
- [ ] ❌ Missing return types

**Recommendations**:
```
[Specific recommendations with code examples]
```

---

## 4. 🚀 Use Cases & Result Monad (Score: X / 15)

### Use Case Structure
- [ ] ✅ Location: `application/{domain}UseCases/{action}{Entity}UseCase.ts`
- [ ] ✅ Class name: `{Action}{Entity}UseCase`
- [ ] ✅ Injectable with `@Injectable()`
- [ ] ✅ NestJS Logger initialized
- [ ] ✅ Repositories injected with tokens

**Issues Found**:
- [ ] ❌ Wrong location
- [ ] ❌ Wrong naming
- [ ] ❌ Missing logger
- [ ] ❌ Direct class injection

**Recommendations**:
```
[Specific recommendations]
```

### Result Monad Pattern
- [ ] ✅ Returns `Result<T, DomainError>` (never throws exceptions)
- [ ] ✅ Uses `ok()` for success cases
- [ ] ✅ Uses `err(new DomainError(...))` for error cases
- [ ] ✅ No `try-catch` for returning errors (only for unexpected errors)
- [ ] ✅ Appropriate domain error types used:
  - [ ] `ValidationError` for validation failures (400)
  - [ ] `NotFoundError` for not found (404)
  - [ ] `ConflictError` for conflicts (409)
  - [ ] `BusinessRuleError` for business rule violations (400)
  - [ ] `AuthenticationError` for auth failures (401) - generic message
  - [ ] `TokenError` for token issues (401) - generic message
  - [ ] `RateLimitError` for rate limiting (429)

**Issues Found**:
- [ ] ❌ Throws exceptions instead of returning `Result`
- [ ] ❌ Uses `try-catch` to return errors
- [ ] ❌ Wrong error type used
- [ ] ❌ Generic error messages for auth/token errors not used

**Recommendations**:
```typescript
// ❌ INCORRECT
async execute(request: IRequest): Promise<IResponse> {
  if (!request.field) {
    throw new BadRequestException('Field is required');
  }
  return { success: true, data: result };
}

// ✅ CORRECT
async execute(request: IRequest): Promise<Result<IResponse, DomainError>> {
  if (!request.field) {
    return err(new ValidationError('Field is required'));
  }
  return ok({
    success: true,
    message: 'Operation successful',
    data: result,
    timestamp: new Date().toISOString(),
  });
}
```

### Result Usage in Tests
- [ ] ✅ Tests use `result.isOk()` and `result.isErr()`
- [ ] ✅ Tests use `result.match()` for assertions
- [ ] ✅ Tests don't access `.success` or `.data` directly
- [ ] ✅ Both success and error cases tested

**Issues Found**:
- [ ] ❌ Direct access to `.success` or `.data`
- [ ] ❌ Missing error case tests
- [ ] ❌ Wrong assertion pattern

**Recommendations**:
```typescript
// ❌ INCORRECT
expect(result.success).toBe(true);
expect(result.data).toBeDefined();

// ✅ CORRECT
expect(result.isOk()).toBe(true);
result.match(
  value => {
    expect(value.success).toBe(true);
    expect(value.data).toBeDefined();
  },
  () => {
    throw new Error('Expected Ok result');
  }
);
```

---

## 5. 🔄 Mappers (Score: X / 10)

### Mapper Structure
- [ ] ✅ Location: `{domain}/mappers/{entity}.mapper.ts`
- [ ] ✅ Class name: `{Entity}Mapper`
- [ ] ✅ Static methods
- [ ] ✅ Exported from `mappers/index.ts`

**Issues Found**:
- [ ] ❌ Wrong location
- [ ] ❌ Wrong naming
- [ ] ❌ Not exported from index

**Recommendations**:
```
[Specific recommendations]
```

### Mapper Methods
- [ ] ✅ `toDomainProps(input)`: Converts DTO to domain props (creates Value Objects)
- [ ] ✅ `toResponseData(entity)`: Converts entity to response data (extracts primitives)
- [ ] ✅ `toResponseDataList(entities)`: Converts array of entities
- [ ] ✅ For aggregates with lines: `toLineDomainProps()` and `createLineEntity()`

**Issues Found**:
- [ ] ❌ Missing `toDomainProps()` method
- [ ] ❌ Missing `toResponseData()` method
- [ ] ❌ Value Objects created in controller instead of mapper
- [ ] ❌ Value Object values extracted in controller instead of mapper

**Recommendations**:
```typescript
// ❌ INCORRECT - Value Objects in controller
@Post()
async create(@Body() dto: CreateProductDto) {
  const sku = SKU.create(dto.sku); // ❌ Should be in mapper
  const product = Product.create({ sku, ... }, orgId);
}

// ✅ CORRECT - Mapper used
@Post()
async create(@Body() dto: CreateProductDto, @OrgId() orgId: string) {
  const props = ProductMapper.toDomainProps(dto);
  const product = Product.create(props, orgId);
}
```

### Mapper Usage in Use Cases
- [ ] ✅ Use case uses `Mapper.toDomainProps()` for DTO → Domain
- [ ] ✅ Use case uses `Mapper.toResponseData()` for Domain → Response
- [ ] ✅ Controller doesn't create Value Objects
- [ ] ✅ Controller doesn't extract Value Object values

**Issues Found**:
- [ ] ❌ Mapper not used in use case
- [ ] ❌ Value Object creation in controller
- [ ] ❌ Value Object extraction in controller

**Recommendations**:
```
[Specific recommendations with file paths]
```

---

## 6. 🌐 Controllers & DTOs (Score: X / 10)

### Controllers
- [ ] ✅ Location: `interfaces/http/{domain}/` or `{domain}/`
- [ ] ✅ NestJS decorators: `@Controller()`, `@Get()`, `@Post()`, etc.
- [ ] ✅ Swagger: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`
- [ ] ✅ NestJS Logger initialized
- [ ] ✅ Guards: `@UseGuards(JwtAuthGuard)`, `@UseGuards(PermissionsGuard)`
- [ ] ✅ Multi-tenancy: Extracts `orgId` from headers
- [ ] ✅ Uses `resultToHttpResponse()` to convert Result to HTTP

**Issues Found**:
- [ ] ❌ Missing Swagger documentation
- [ ] ❌ Missing logger
- [ ] ❌ Missing guards
- [ ] ❌ Missing `orgId` extraction
- [ ] ❌ Direct Result handling instead of `resultToHttpResponse()`

**Recommendations**:
```typescript
// ✅ CORRECT
@ApiTags('Product')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly createProductUseCase: CreateProductUseCase
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: HttpStatus.CREATED, type: CreateProductResponseDto })
  async create(
    @Body() dto: CreateProductDto,
    @OrgId() orgId: string
  ): Promise<CreateProductResponseDto> {
    this.logger.log('Creating product request', { sku: dto.sku });
    const result = await this.createProductUseCase.execute({ ...dto, orgId });
    return resultToHttpResponse(result);
  }
}
```

### DTOs
- [ ] ✅ Location: `{domain}/dto/`
- [ ] ✅ Naming: `{Action}{Entity}Dto.ts`
- [ ] ✅ Uses `class-validator` decorators
- [ ] ✅ Swagger: `@ApiProperty()` for documentation
- [ ] ✅ Exported from `dto/index.ts`

**Issues Found**:
- [ ] ❌ Missing validation decorators
- [ ] ❌ Missing Swagger documentation
- [ ] ❌ Wrong location
- [ ] ❌ Not exported from index

**Recommendations**:
```typescript
// ✅ CORRECT
export class CreateProductDto {
  @ApiProperty({ description: 'Product SKU', example: 'PROD-001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  sku: string;

  @ApiProperty({ description: 'Product name', example: 'Test Product' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;
}
```

---

## 7. 🧪 Testing (Score: X / 5)

### Test Structure
- [ ] ✅ Unit tests: `*.spec.ts` in `test/` folder (same structure as `src/`)
- [ ] ✅ E2E tests: `*.e2e-spec.ts` in `test/`
- [ ] ✅ Tests NOT in `src/` folder

**Issues Found**:
- [ ] ❌ Tests in `src/` folder
- [ ] ❌ Wrong naming convention

**Recommendations**:
```
[Specific recommendations]
```

### Test Naming
- [ ] ✅ Pattern: `'Given: precondition When: action Then: expected result'`
- [ ] ✅ Descriptive test names

**Issues Found**:
- [ ] ❌ Wrong naming pattern
- [ ] ❌ Non-descriptive names

**Recommendations**:
```typescript
// ✅ CORRECT
it('Given: valid product data When: creating product Then: should return Ok result', async () => {
  // ...
});
```

### Test Structure (AAA Pattern)
- [ ] ✅ Arrange: Prepare data and mocks
- [ ] ✅ Act: Execute the function
- [ ] ✅ Assert: Verify the result

**Issues Found**:
- [ ] ❌ Missing Arrange section
- [ ] ❌ Missing Assert section
- [ ] ❌ Mixed concerns

**Recommendations**:
```
[Specific recommendations]
```

### Result Monad Testing
- [ ] ✅ Tests use `result.isOk()` and `result.isErr()`
- [ ] ✅ Tests use `result.match()` for assertions
- [ ] ✅ Both success and error cases tested
- [ ] ✅ Correct error types asserted

**Issues Found**:
- [ ] ❌ Direct access to `.success` or `.data`
- [ ] ❌ Missing error case tests
- [ ] ❌ Wrong error type assertions

**Recommendations**:
```
[Specific recommendations with examples]
```

---

## 8. 🔐 Multi-Tenancy (Score: X / 5)

### Entity Multi-Tenancy
- [ ] ✅ All entities (except `Organization`) have `orgId`
- [ ] ✅ `orgId` passed in `create()` method
- [ ] ✅ `orgId` included in `reconstitute()` method

**Issues Found**:
- [ ] ❌ Missing `orgId` in entity
- [ ] ❌ `orgId` not passed in create
- [ ] ❌ `orgId` not included in reconstitute

**Recommendations**:
```
[Specific recommendations]
```

### Query Multi-Tenancy
- [ ] ✅ All repository queries filter by `orgId`
- [ ] ✅ `orgId` extracted from headers in controllers
- [ ] ✅ `orgId` passed to use cases
- [ ] ✅ User belongs to organization validated

**Issues Found**:
- [ ] ❌ Queries don't filter by `orgId`
- [ ] ❌ `orgId` not extracted in controller
- [ ] ❌ Missing organization validation

**Recommendations**:
```typescript
// ✅ CORRECT
@Get()
async findAll(@OrgId() orgId: string) {
  const result = await this.findAllUseCase.execute({ orgId });
  return resultToHttpResponse(result);
}

// Use case
async execute(request: { orgId: string }): Promise<Result<...>> {
  const entities = await this.repository.findAll(request.orgId); // ✅ Filters by orgId
  return ok({ ... });
}
```

---

## 9. 🚫 Anti-Patterns Check

### Critical Anti-Patterns
- [ ] ❌ Uses `any` type
- [ ] ❌ Uses relative imports (`../../../`)
- [ ] ❌ Business logic in controllers
- [ ] ❌ Prisma accessed directly from use cases
- [ ] ❌ Entity doesn't extend `AggregateRoot`
- [ ] ❌ Missing `orgId` in multi-tenant queries
- [ ] ❌ Uses `console.log` instead of NestJS Logger
- [ ] ❌ DTOs without validation
- [ ] ❌ Endpoints without Swagger
- [ ] ❌ Spanish text in code
- [ ] ❌ Throws exceptions in use cases
- [ ] ❌ Uses `try-catch` to return errors
- [ ] ❌ Accesses `.success` or `.data` directly on Result
- [ ] ❌ Creates Value Objects in controllers
- [ ] ❌ Extracts Value Object values in controllers
- [ ] ❌ Injects `DomainEventDispatcher` class directly
- [ ] ❌ Tests in `src/` folder

**Issues Found**:
```
[List all anti-patterns found with file paths and line numbers]
```

---

## 10. 🔍 Code Quality Verification

### Pre-Commit Checks
- [ ] ✅ `bun run format` passes (or `npm run format`)
- [ ] ✅ `bun run lint` passes with zero errors (or `npm run lint`)
- [ ] ✅ `bun run build` passes successfully (or `npm run build`)

**Issues Found**:
- [ ] ❌ Formatting issues
- [ ] ❌ Linter errors
- [ ] ❌ Build errors

**Recommendations**:
```bash
# Run these commands before committing
bun run format && bun run lint && bun run build
```

---

## 11. ✅ Feature Checklist

### Domain
- [ ] Entity extends `AggregateRoot`
- [ ] Value Objects created if necessary
- [ ] Repository port interface in `domain/ports/repositories/`
- [ ] Domain Services created if necessary

### Mappers
- [ ] Mapper created in `{domain}/mappers/{entity}.mapper.ts`
- [ ] `toDomainProps()` implemented
- [ ] `toResponseData()` implemented
- [ ] `toResponseDataList()` implemented (if needed)
- [ ] Exported from `mappers/index.ts`

### Infrastructure
- [ ] Prisma repository implemented
- [ ] Prisma schema updated (if needed)
- [ ] Migration created (if needed)

### Application
- [ ] Use case created
- [ ] Repository and DomainEventDispatcher injected
- [ ] Mapper used for DTO → Domain conversion
- [ ] Mapper used for Domain → Response conversion
- [ ] Returns `Result<T, DomainError>`
- [ ] Appropriate domain error types used

### Interfaces
- [ ] DTOs created with validation
- [ ] Controller created with Swagger
- [ ] Use case injected
- [ ] `resultToHttpResponse()` used

### Module
- [ ] Providers registered (repository, use case)
- [ ] Controller exported

### Testing
- [ ] Unit tests for mapper
- [ ] Unit tests for use case (Ok and Err cases)
- [ ] E2E tests for endpoint

### Code Quality
- [ ] Format passes
- [ ] Lint passes
- [ ] Build passes

---

## 📊 Summary

### Strengths
```
[List what was done well]
```

### Critical Issues (Must Fix)
```
[List critical issues that must be fixed before merge]
```

### Important Issues (Should Fix)
```
[List important issues that should be fixed]
```

### Minor Issues (Nice to Have)
```
[List minor issues that can be fixed later]
```

### Recommendations
```
[General recommendations for improvement]
```

---

## ✅ Approval Status

- [ ] ✅ **Approved** - Ready to merge
- [ ] ⚠️ **Approved with Suggestions** - Can merge, but consider suggestions
- [ ] ❌ **Changes Requested** - Must fix issues before merge

**Reviewer Comments**:
```
[Additional comments or notes]
```

---

## 📝 Notes

```
[Any additional notes or context]
```



