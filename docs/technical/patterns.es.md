> [English](./patterns.md) | **[Español](./patterns.es.md)**

# Patrones de Diseno

Documentacion de los patrones de diseno implementados en el backend del Nevada Inventory System.

---

## Tabla de Contenidos

- [Result Monad](#result-monad)
- [Repository Pattern](#repository-pattern)
- [Aggregate Root](#aggregate-root)
- [Value Objects](#value-objects)
- [Domain Events](#domain-events)
- [Specification Pattern](#specification-pattern)
- [Unit of Work](#unit-of-work)
- [Mapper Pattern](#mapper-pattern)
- [Use Case / Interactor](#use-case--interactor)
- [Circuit Breaker](#circuit-breaker)
- [Retry con Exponential Backoff](#retry-con-exponential-backoff)
- [Cache Decorators](#cache-decorators)
- [Guard Chain](#guard-chain)
- [Event-Driven Architecture](#event-driven-architecture)

---

## Result Monad

### Problema

Las excepciones son "goto invisibles": rompen el flujo de control y no se ven en los tipos.

### Solucion

`Result<T, E>` hace el error **explicito en el tipo de retorno**:

```typescript
import { Result, ok, err } from '@shared/domain/result';
import { NotFoundError, ConflictError } from '@shared/domain/result/domainError';

async execute(dto: CreateProductDto): Promise<Result<Product, DomainError>> {
  // Caso de error: retorna err()
  const existing = await this.repo.findBySku(dto.sku);
  if (existing) {
    return err(new ConflictError('Product with this SKU already exists'));
  }

  // Caso exitoso: retorna ok()
  const product = Product.create(dto);
  await this.repo.save(product);
  return ok(product);
}
```

### Conversion a HTTP

```typescript
// src/shared/utils/resultToHttp.ts
function resultToHttp<T>(result: Result<T, DomainError>) {
  if (result.isOk()) {
    return { success: true, data: result.value };
  }

  // Mapea DomainError a HTTP status code
  const statusMap = {
    ValidationError: 400,
    NotFoundError: 404,
    ConflictError: 409,
    BusinessRuleError: 422,
    UnauthorizedError: 401,
    ForbiddenError: 403,
  };

  throw new HttpException(result.error.message, statusMap[result.error.constructor.name]);
}
```

### API del Result

```typescript
result.isOk()        // true si es Ok
result.isErr()       // true si es Err
result.value         // T (solo en Ok)
result.error         // E (solo en Err)
result.map(fn)       // Transforma el valor si es Ok
result.flatMap(fn)   // Encadena operaciones que retornan Result
result.getOrThrow()  // T o lanza excepcion
```

> Guia completa: [result-monad-guide.md](result-monad-guide.md)

---

## Repository Pattern

### Problema

El dominio no debe saber como se persisten los datos (SQL, NoSQL, API, etc.).

### Solucion

**Puerto** (interfaz en el dominio):

```typescript
// src/inventory/products/domain/ports/productRepository.port.ts
interface IProductRepository {
  findById(id: string, orgId: string): Promise<Product | null>;
  findBySku(sku: string, orgId: string): Promise<Product | null>;
  findAll(orgId: string, filters: ProductFilters): Promise<PaginatedResult<Product>>;
  save(product: Product): Promise<void>;
  delete(id: string, orgId: string): Promise<void>;
}
```

**Adaptador** (implementacion en infraestructura):

```typescript
// src/infrastructure/database/repositories/product.repository.ts
@Injectable()
class PrismaProductRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Product | null> {
    const raw = await this.prisma.product.findUnique({
      where: { id, orgId, deletedAt: null },
      include: { categories: true },
    });
    return raw ? ProductMapper.toDomain(raw) : null;
  }

  async save(product: Product): Promise<void> {
    const data = ProductMapper.toPersistence(product);
    await this.prisma.product.upsert({
      where: { id: product.id },
      create: data,
      update: data,
    });
  }
}
```

**Inyeccion** (NestJS DI):

```typescript
// En el modulo
{
  provide: 'IProductRepository',
  useClass: PrismaProductRepository,
}
```

---

## Aggregate Root

### Problema

Las entidades de dominio necesitan mantener invariantes y controlar su grafo de objetos.

### Solucion

```typescript
// Ejemplo: Sale como Aggregate Root
class Sale extends AggregateRoot<SaleProps> {
  // Solo el aggregate root controla sus lineas
  private _lines: SaleLine[] = [];

  addLine(product: Product, quantity: number, price: Money): void {
    // Invariante: no agregar lineas a una venta confirmada
    if (!this.status.isDraft()) {
      throw new BusinessRuleError('Cannot add lines to non-draft sale');
    }
    this._lines.push(SaleLine.create(product, quantity, price));
    this.addDomainEvent(new SaleLineAddedEvent(this.id, product.id));
  }

  confirm(confirmedBy: string): void {
    // Invariante: necesita al menos una linea
    if (this._lines.length === 0) {
      throw new BusinessRuleError('Sale must have at least one line');
    }
    this._status = SaleStatus.CONFIRMED;
    this._confirmedAt = new Date();
    this._confirmedBy = confirmedBy;
    this.addDomainEvent(new SaleConfirmedEvent(this.id, confirmedBy));
  }
}
```

### Reglas

1. Solo se accede al grafo a traves del aggregate root
2. El aggregate root mantiene las invariantes
3. Los cambios se persisten atomicamente (Unit of Work)
4. Los domain events se publican despues de persistir

---

## Value Objects

### Problema

Algunos conceptos de dominio no tienen identidad — su igualdad se define por sus atributos.

### Solucion

```typescript
// src/sales/domain/valueObjects/
class SaleNumber extends ValueObject<{ value: string }> {
  static create(year: number, sequence: number): SaleNumber {
    return new SaleNumber({
      value: `SALE-${year}-${String(sequence).padStart(3, '0')}`,
    });
  }

  get value(): string { return this.props.value; }
}

class Money extends ValueObject<{ amount: number; currency: string }> {
  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money({
      amount: this.props.amount + other.props.amount,
      currency: this.props.currency,
    });
  }
}

class SaleStatus extends ValueObject<{ value: string }> {
  isDraft(): boolean { return this.props.value === 'DRAFT'; }
  isConfirmed(): boolean { return this.props.value === 'CONFIRMED'; }
  canTransitionTo(target: string): boolean {
    const transitions = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PICKING', 'CANCELLED'],
      PICKING: ['SHIPPED'],
      SHIPPED: ['COMPLETED'],
    };
    return transitions[this.props.value]?.includes(target) ?? false;
  }
}
```

### Reglas

1. Inmutables: nunca se modifican despues de crear
2. Igualdad por valor: `new Money(100, 'USD').equals(new Money(100, 'USD'))` → true
3. Auto-validacion: validan sus invariantes en el constructor

---

## Domain Events

### Problema

Los side effects (enviar email, crear audit log, actualizar cache) acoplan el dominio a la infraestructura.

### Solucion

Los agregados **registran eventos**. Un despachador los **publica** despues de persistir.

```typescript
// 1. Definir el evento
class SaleConfirmedEvent extends DomainEvent {
  constructor(
    public readonly saleId: string,
    public readonly confirmedBy: string,
  ) {
    super({ aggregateId: saleId, occurredAt: new Date() });
  }
}

// 2. El aggregate lo registra
class Sale extends AggregateRoot {
  confirm(confirmedBy: string): void {
    this._status = SaleStatus.CONFIRMED;
    this.addDomainEvent(new SaleConfirmedEvent(this.id, confirmedBy));
  }
}

// 3. El use case lo despacha
class ConfirmSaleUseCase {
  async execute(saleId: string, userId: string) {
    const sale = await this.repo.findById(saleId);
    sale.confirm(userId);
    await this.repo.save(sale);

    // Publicar eventos DESPUES de persistir
    await this.dispatcher.dispatchAll(sale.getDomainEvents());
    sale.clearDomainEvents();
  }
}

// 4. Event handler reacciona
class SaleConfirmedHandler {
  async handle(event: SaleConfirmedEvent): void {
    // Side effects: audit log, email, notificacion, etc.
    await this.auditLog.log('SALE', event.saleId, 'CONFIRMED');
    await this.notificationService.notify(event.confirmedBy, 'Sale confirmed');
  }
}
```

### Event Bus

```typescript
// src/shared/domain/events/domainEventBus.service.ts
class DomainEventBus {
  private handlers: Map<string, EventHandler[]>;

  register(eventType: string, handler: EventHandler): void;
  async publish(event: DomainEvent): Promise<void>;
}
```

In-memory para simplicidad. Preparado para migrar a message queue (RabbitMQ, SQS) si es necesario.

---

## Specification Pattern

### Problema

Las reglas de negocio para filtrar queries se duplican entre use cases y repositorios.

### Solucion

Encapsular reglas de query en objetos reutilizables:

```typescript
// Specification base
interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean;
  toPrismaWhere(): Record<string, unknown>;
}

// Specification concreta
class ProductByStatusSpecification implements ISpecification<Product> {
  constructor(private status: string) {}

  isSatisfiedBy(product: Product): boolean {
    return product.status === this.status;
  }

  toPrismaWhere() {
    return { status: this.status };
  }
}

class AuditLogByHttpMethodSpecification implements ISpecification<AuditLog> {
  constructor(private httpMethod: string) {}

  toPrismaWhere() {
    return { httpMethod: this.httpMethod };
  }
}
```

### Composicion

```typescript
// Las specifications se pueden combinar
const spec = new AndSpecification(
  new ProductByStatusSpecification('ACTIVE'),
  new ProductByOrgSpecification(orgId),
);

const where = spec.toPrismaWhere();
const products = await this.prisma.product.findMany({ where });
```

---

## Unit of Work

### Problema

Operaciones que tocan multiples tablas necesitan ser atomicas.

### Solucion

```typescript
// src/infrastructure/database/unitOfWork.service.ts
class UnitOfWork {
  constructor(private prisma: PrismaService) {}

  async execute<T>(work: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(tx);
    });
  }
}

// Uso en un use case
class ConfirmSaleUseCase {
  async execute(saleId: string) {
    return this.unitOfWork.execute(async (tx) => {
      // 1. Actualizar estado de la venta
      await tx.sale.update({ where: { id: saleId }, data: { status: 'CONFIRMED' } });

      // 2. Crear movimiento de stock (OUT)
      await tx.movement.create({ data: { type: 'OUT', saleId, ... } });

      // 3. Reducir stock
      await tx.stock.update({ ... });

      // Todo en una sola transaccion: si algo falla, todo se revierte
    });
  }
}
```

---

## Mapper Pattern

### Problema

Las entidades de dominio no deben ser iguales a los modelos de base de datos ni a los DTOs HTTP.

### Solucion

Mappers que convierten entre capas:

```typescript
// src/inventory/products/mappers/product.mapper.ts
class ProductMapper {
  // Prisma model → Domain entity
  static toDomain(raw: PrismaProduct): Product {
    return new Product({
      id: raw.id,
      orgId: raw.orgId,
      sku: raw.sku,
      name: raw.name,
      price: new Money(raw.price, raw.currency),
      status: new ProductStatus(raw.status),
    });
  }

  // Domain entity → Prisma model
  static toPersistence(product: Product): PrismaProductCreateInput {
    return {
      id: product.id,
      orgId: product.orgId,
      sku: product.sku,
      name: product.name,
      price: product.price.amount,
      currency: product.price.currency,
      status: product.status.value,
    };
  }

  // Domain entity → HTTP response DTO
  static toResponse(product: Product): ProductResponseDto {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price.amount,
      status: product.status.value,
    };
  }
}
```

---

## Use Case / Interactor

### Problema

La logica de negocio no debe vivir en los controllers ni en los repositorios.

### Solucion

Un **use case por operacion de negocio**:

```typescript
// Un use case = una responsabilidad
@Injectable()
class CreateProductUseCase {
  constructor(
    @Inject('IProductRepository')
    private productRepo: IProductRepository,
    @Inject('IDomainEventDispatcher')
    private eventDispatcher: IDomainEventDispatcher,
  ) {}

  async execute(
    dto: CreateProductDto,
    orgId: string,
    userId: string,
  ): Promise<Result<Product, DomainError>> {
    // 1. Validar unicidad de SKU
    const existing = await this.productRepo.findBySku(dto.sku, orgId);
    if (existing) {
      return err(new ConflictError(`SKU ${dto.sku} already exists`));
    }

    // 2. Crear entidad
    const product = Product.create({
      orgId,
      sku: dto.sku,
      name: dto.name,
      createdBy: userId,
    });

    // 3. Persistir
    await this.productRepo.save(product);

    // 4. Publicar eventos
    await this.eventDispatcher.dispatchAll(product.getDomainEvents());

    return ok(product);
  }
}
```

### Composicion

Los use cases **no se llaman entre si**. Si una operacion necesita multiples pasos, el use case orquesta directamente los repositorios y servicios.

---

## Circuit Breaker

### Problema

Llamadas a servicios externos (email, APIs) pueden fallar y causar cascadas de fallas.

### Solucion

```typescript
// src/shared/infrastructure/resilience/circuitBreaker.ts
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextRetryAt) {
        throw new CircuitBreakerOpenError();
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Estados

```
CLOSED ──(N fallas)──→ OPEN ──(timeout)──→ HALF_OPEN
  ↑                                           │
  └────────────(exito)────────────────────────┘
  OPEN ←────────(falla)───────────────────────┘
```

| Estado | Comportamiento |
|--------|---------------|
| CLOSED | Deja pasar todas las llamadas. Cuenta fallas. |
| OPEN | Rechaza todas las llamadas inmediatamente. Espera timeout. |
| HALF_OPEN | Deja pasar una llamada de prueba. Si funciona → CLOSED. Si falla → OPEN. |

---

## Retry con Exponential Backoff

### Problema

Las fallas transitorias (timeout, 503) pueden resolverse si se reintenta despues de un tiempo.

### Solucion

```typescript
// src/shared/infrastructure/resilience/retry.ts
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;      // 3
    initialDelay: number;     // 1000ms
    maxDelay: number;         // 30000ms
    backoffMultiplier: number; // 2
  },
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxAttempts) {
        const delay = Math.min(
          options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
          options.maxDelay,
        );
        // Jitter: agrega aleatoriedad para evitar thundering herd
        const jitter = delay * (0.5 + Math.random() * 0.5);
        await sleep(jitter);
      }
    }
  }

  throw lastError;
}
```

### ResilientCall (Composicion)

```typescript
// src/shared/infrastructure/resilience/resilientCall.ts
// Compone CircuitBreaker + Retry + Timeout
async function resilientCall<T>(
  fn: () => Promise<T>,
  config: ResilientConfig,
): Promise<T> {
  return circuitBreaker.execute(() =>
    withRetry(() =>
      withTimeout(fn, config.timeout),
      config.retry,
    ),
  );
}
```

---

## Cache Decorators

### Problema

Cache manual es propenso a errores (olvidar invalidar, keys inconsistentes).

### Solucion

Decoradores que automatizan el caching:

```typescript
// Cachear resultado por 5 minutos
@Cacheable({ key: 'products:{orgId}:list', ttl: 300 })
async findAll(orgId: string): Promise<Product[]> {
  return this.prisma.product.findMany({ where: { orgId } });
}

// Invalidar cache al modificar
@CacheEvict({ key: 'products:{orgId}:list' })
async save(product: Product): Promise<void> {
  await this.prisma.product.upsert({ ... });
}
```

### Implementacion

```typescript
// src/shared/infrastructure/cache/cacheDecorators.ts
function Cacheable(options: { key: string; ttl: number }) {
  return function (target, propertyKey, descriptor) {
    const original = descriptor.value;
    descriptor.value = async function (...args) {
      const cacheKey = interpolateKey(options.key, args);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      const result = await original.apply(this, args);
      await this.cacheService.set(cacheKey, result, options.ttl);
      return result;
    };
  };
}
```

---

## Guard Chain

### Problema

La autorizacion tiene multiples capas (autenticacion, roles, permisos) que deben ejecutarse en orden.

### Solucion

NestJS guards ejecutados en secuencia:

```typescript
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@Controller('products')
class ProductsController {
  // Cada guard se ejecuta en orden:
  // 1. JwtAuthGuard: valida JWT, inyecta request.user
  // 2. RoleBasedAuthGuard: verifica roles
  // 3. PermissionGuard: verifica @RequirePermissions
}
```

### Composicion con Decoradores

```typescript
// Decorador compuesto para endpoints comunes
function Authenticated() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard),
  );
}

// Uso simplificado
@Authenticated()
@RequirePermissions('PRODUCTS:CREATE')
@Post()
async create() { ... }
```

---

## Event-Driven Architecture

### Componentes

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Aggregate Root │     │  DomainEventBus  │     │  Event Handler   │
│                 │     │                  │     │                  │
│  addDomainEvent │────→│  publish(event)  │────→│  handle(event)   │
│  getDomainEvents│     │  subscribe(type) │     │  (side effects)  │
│  clearEvents    │     │                  │     │                  │
└────────────────┘     └─────────────────┘     └──────────────────┘
```

### Implementacion Actual

- **In-memory**: `DomainEventBus` usa un Map de handlers
- **Sincrono**: Los handlers se ejecutan en la misma transaccion
- **Idempotente**: `EventIdempotencyService` previene duplicados

### Preparado para Escalar

La arquitectura esta diseñada para migrar a message queues:

```
Actual:          Aggregate → DomainEventBus (in-memory) → Handler
Futuro posible:  Aggregate → Outbox Table → Message Broker → Handler
```

Solo se cambiaria la implementacion del bus, no el dominio ni los handlers.
