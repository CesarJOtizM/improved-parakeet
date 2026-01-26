# Work Plan: Corrección de Race Conditions

## Resumen Ejecutivo

Este documento describe el plan de trabajo para corregir las race conditions identificadas en el sistema. Las correcciones se priorizan por severidad e impacto en la integridad de datos.

---

## Problemas Identificados

### 🔴 Severidad Crítica

#### 1. Stock Read-Modify-Write sin Transacción Atómica

**Ubicación:** `src/infrastructure/database/repositories/stock.repository.ts:159-237`

**Problema:**
```typescript
// ACTUAL - Vulnerable a race conditions
async incrementStock(productId, warehouseId, quantity, ...) {
  const currentStock = await this.getStockWithCost(...);  // LECTURA
  const newQuantity = currentStock.quantity.add(quantity); // MODIFICACIÓN
  await this.updateStock(..., newQuantity, ...);           // ESCRITURA
}
```

**Escenario de fallo:**
```
Thread A: Lee stock = 100
Thread B: Lee stock = 100
Thread A: Suma 50, guarda 150
Thread B: Suma 30, guarda 130 ❌ (perdió las 50 unidades de A)
Resultado: Stock = 130 en lugar de 180
```

**Solución propuesta:**
```typescript
// SOLUCIÓN - Operación atómica en SQL
async incrementStock(productId, warehouseId, locationId, quantity, orgId) {
  await this.prisma.$executeRaw`
    UPDATE stock 
    SET quantity = quantity + ${quantity},
        "updatedAt" = NOW()
    WHERE "productId" = ${productId} 
      AND "warehouseId" = ${warehouseId}
      AND "locationId" = ${locationId}
      AND "orgId" = ${orgId}
  `;
}

async decrementStock(productId, warehouseId, locationId, quantity, orgId) {
  // Incluir validación de stock negativo
  const result = await this.prisma.$executeRaw`
    UPDATE stock 
    SET quantity = quantity - ${quantity},
        "updatedAt" = NOW()
    WHERE "productId" = ${productId} 
      AND "warehouseId" = ${warehouseId}
      AND "locationId" = ${locationId}
      AND "orgId" = ${orgId}
      AND quantity >= ${quantity}
  `;
  
  if (result === 0) {
    throw new InsufficientStockError(productId, warehouseId, quantity);
  }
}
```

**Archivos a modificar:**
- `src/infrastructure/database/repositories/stock.repository.ts`
- `src/stock/domain/ports/repositories/iStockRepository.port.ts`

---

#### 2. Validación de Stock Obsoleta (TOCTOU)

**Ubicación:** `src/application/movementUseCases/postMovementUseCase.ts:56-95`

**Problema:**
Time-Of-Check to Time-Of-Use (TOCTOU) - La validación ocurre en un momento diferente a la ejecución.

```typescript
// ACTUAL - Validación y ejecución no son atómicas
const currentStock = await this.stockRepository.getStockQuantity(...);
const validation = StockValidationService.validateStockForOutput(..., currentStock);
// ... tiempo pasa, otro thread modifica stock ...
await this.movementRepository.save(movement); // Stock ya cambió
```

**Solución propuesta:**
Usar `SELECT FOR UPDATE` para bloquear las filas de stock durante la validación y actualización:

```typescript
async postMovement(movementId: string, orgId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Obtener movimiento
    const movement = await tx.movement.findUnique({ where: { id: movementId } });
    
    // 2. Bloquear filas de stock relevantes con FOR UPDATE
    const stockRows = await tx.$queryRaw`
      SELECT * FROM stock 
      WHERE "productId" IN (${productIds}) 
        AND "warehouseId" = ${movement.warehouseId}
        AND "orgId" = ${orgId}
      FOR UPDATE
    `;
    
    // 3. Validar con datos bloqueados
    for (const line of movement.lines) {
      const stock = stockRows.find(s => s.productId === line.productId);
      if (movement.type === 'OUT' && stock.quantity < line.quantity) {
        throw new InsufficientStockError(...);
      }
    }
    
    // 4. Actualizar stock (nadie más puede modificar estas filas)
    for (const line of movement.lines) {
      await tx.$executeRaw`
        UPDATE stock SET quantity = quantity - ${line.quantity}
        WHERE "productId" = ${line.productId} AND ...
      `;
    }
    
    // 5. Marcar movimiento como publicado
    await tx.movement.update({ where: { id: movementId }, data: { status: 'POSTED' } });
  }, {
    isolationLevel: 'Serializable' // O 'RepeatableRead'
  });
}
```

**Archivos a modificar:**
- `src/application/movementUseCases/postMovementUseCase.ts`
- `src/infrastructure/database/repositories/movement.repository.ts`
- `src/infrastructure/database/repositories/stock.repository.ts`

---

### 🟠 Severidad Alta

#### 3. Validación de Cantidades de Retorno sin Lock

**Ubicación:** `src/returns/domain/services/returnValidation.service.ts:96-154`

**Problema:**
```typescript
// Dos retornos concurrentes pueden exceder la cantidad vendida
// Venta: 100 unidades
// Return A valida: 60 < 100 ✓
// Return B valida: 60 < 100 ✓
// Ambos se crean: Total retornado = 120 > 100 ❌
```

**Solución propuesta:**
Validar y crear el retorno en una transacción con lock en la venta:

```typescript
async createReturn(request: CreateReturnRequest) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Bloquear la venta
    const sale = await tx.$queryRaw`
      SELECT * FROM sales WHERE id = ${request.saleId} FOR UPDATE
    `;
    
    // 2. Obtener retornos existentes para esta venta
    const existingReturns = await tx.return.findMany({
      where: { saleId: request.saleId, status: { not: 'CANCELLED' } },
      include: { lines: true }
    });
    
    // 3. Calcular cantidades ya retornadas
    const returnedQuantities = calculateReturnedQuantities(existingReturns);
    
    // 4. Validar que el nuevo retorno no exceda
    for (const line of request.lines) {
      const alreadyReturned = returnedQuantities.get(line.productId) || 0;
      const soldQuantity = getSoldQuantity(sale, line.productId);
      if (alreadyReturned + line.quantity > soldQuantity) {
        throw new ExceedsReturnableQuantityError(...);
      }
    }
    
    // 5. Crear el retorno
    return await tx.return.create({ data: ... });
  });
}
```

**Archivos a modificar:**
- `src/application/returnUseCases/createReturnUseCase.ts`
- `src/returns/domain/services/returnValidation.service.ts`

---

#### 4. Eventos sin Idempotencia

**Ubicación:** `src/application/eventHandlers/movementPostedEventHandler.ts:42-104`

**Problema:**
Si un evento se procesa dos veces (por reintentos), el stock se actualiza duplicadamente.

**Solución propuesta:**
Implementar tabla de eventos procesados:

```sql
-- Migración
CREATE TABLE "processed_events" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orgId" TEXT NOT NULL,
  
  CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_events_eventType_eventId_key" 
  ON "processed_events"("eventType", "eventId");
```

```typescript
// Handler idempotente
async handle(event: MovementPostedEvent) {
  const eventKey = `${event.constructor.name}:${event.movementId}`;
  
  try {
    // Intentar registrar el evento como procesado
    await this.prisma.processedEvent.create({
      data: {
        eventType: event.constructor.name,
        eventId: event.movementId,
        orgId: event.orgId
      }
    });
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      this.logger.warn(`Event already processed: ${eventKey}`);
      return; // Ya fue procesado, salir
    }
    throw error;
  }
  
  // Procesar el evento normalmente
  await this.processMovementPosted(event);
}
```

**Archivos a modificar:**
- Crear migración para `processed_events`
- `src/infrastructure/database/prisma/schema.prisma`
- `src/application/eventHandlers/movementPostedEventHandler.ts`
- `src/application/eventHandlers/saleConfirmedEventHandler.ts`
- `src/application/eventHandlers/returnConfirmedEventHandler.ts`

---

#### 5. Confirmación de Venta/Retorno Multi-Transacción

**Ubicación:** 
- `src/application/saleUseCases/confirmSaleUseCase.ts:35-71`
- `src/application/returnUseCases/confirmReturnUseCase.ts:39-85`

**Problema:**
```typescript
// ACTUAL - Múltiples transacciones independientes
const savedMovement = await this.movementRepository.save(movement);     // TX 1
const postedMovement = await this.movementRepository.save(posted);      // TX 2
await this.eventDispatcher.markAndDispatch(events);                     // TX 3+
const confirmedSale = await this.saleRepository.save(sale);             // TX 4
// Si falla entre TX2 y TX4: movimiento publicado pero venta no confirmada
```

**Solución propuesta:**
Envolver todas las operaciones en una sola transacción:

```typescript
async confirmSale(saleId: string, orgId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Obtener y validar venta
    const sale = await tx.sale.findUnique({ 
      where: { id: saleId }, 
      include: { lines: true } 
    });
    
    if (sale.status !== 'DRAFT') {
      throw new InvalidSaleStatusError(...);
    }
    
    // 2. Crear movimiento
    const movement = await tx.movement.create({
      data: {
        type: 'OUT',
        status: 'POSTED',
        warehouseId: sale.warehouseId,
        // ...
      }
    });
    
    // 3. Actualizar stock atómicamente
    for (const line of sale.lines) {
      const updated = await tx.$executeRaw`
        UPDATE stock 
        SET quantity = quantity - ${line.quantity}
        WHERE "productId" = ${line.productId}
          AND "warehouseId" = ${sale.warehouseId}
          AND quantity >= ${line.quantity}
      `;
      
      if (updated === 0) {
        throw new InsufficientStockError(line.productId);
      }
    }
    
    // 4. Confirmar venta
    const confirmedSale = await tx.sale.update({
      where: { id: saleId },
      data: { 
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        movementId: movement.id
      }
    });
    
    return confirmedSale;
  });
  
  // 5. Eventos se disparan DESPUÉS de la transacción exitosa
  await this.eventDispatcher.dispatch(new SaleConfirmedEvent(...));
}
```

**Archivos a modificar:**
- `src/application/saleUseCases/confirmSaleUseCase.ts`
- `src/application/returnUseCases/confirmReturnUseCase.ts`

---

#### 6. Pérdida de Líneas en Adición Concurrente

**Ubicación:**
- `src/application/saleUseCases/addSaleLineUseCase.ts:44-70`
- `src/application/returnUseCases/addReturnLineUseCase.ts:50-85`

**Problema:**
```typescript
// Thread A y B leen venta con 2 líneas
const sale = await this.saleRepository.findById(saleId);
sale.addLine(newLine);
await this.saleRepository.save(sale); // El último en guardar sobrescribe
```

**Solución propuesta:**
Usar versionado optimista o agregar líneas directamente sin leer todas:

**Opción A: Versionado Optimista**
```typescript
// Agregar campo version al modelo Sale
model Sale {
  // ...
  version Int @default(1)
}

// En el repositorio
async save(sale: Sale) {
  const result = await this.prisma.sale.updateMany({
    where: { 
      id: sale.id, 
      version: sale.version // Solo actualiza si la versión coincide
    },
    data: {
      ...saleData,
      version: { increment: 1 }
    }
  });
  
  if (result.count === 0) {
    throw new OptimisticLockError('Sale was modified by another transaction');
  }
}
```

**Opción B: Agregar Línea Directamente (Recomendada)**
```typescript
async addSaleLine(saleId: string, line: SaleLineData, orgId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Verificar que la venta existe y está en DRAFT
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale || sale.status !== 'DRAFT') {
      throw new InvalidSaleStatusError();
    }
    
    // 2. Agregar línea directamente (sin leer todas las líneas existentes)
    await tx.saleLine.create({
      data: {
        saleId,
        productId: line.productId,
        quantity: line.quantity,
        salePrice: line.salePrice,
        currency: line.currency,
        orgId
      }
    });
    
    // 3. Retornar venta actualizada
    return await tx.sale.findUnique({
      where: { id: saleId },
      include: { lines: true }
    });
  });
}
```

**Archivos a modificar:**
- `src/application/saleUseCases/addSaleLineUseCase.ts`
- `src/application/returnUseCases/addReturnLineUseCase.ts`
- `src/infrastructure/database/repositories/sale.repository.ts`
- `src/infrastructure/database/repositories/return.repository.ts`

---

### 🟡 Severidad Media

#### 7. Job de Alertas con Datos Obsoletos

**Ubicación:** `src/infrastructure/jobs/stockValidationJob.ts:87-150`

**Problema:**
El job lee stock y emite alertas, pero el stock puede cambiar entre lectura y emisión.

**Solución propuesta:**
Este es un caso donde la consistencia eventual es aceptable. Mejoras sugeridas:
- Agregar timestamp al evento de alerta
- El consumidor del evento debe re-verificar el stock antes de actuar
- Considerar agregar debounce/throttle a las alertas

**Impacto:** Bajo - Las alertas falsas son molestas pero no corrompen datos.

---

## Plan de Implementación

### Fase 1: Stock Atómico (Crítico)
**Duración estimada:** 1-2 días

1. [ ] Modificar `incrementStock` y `decrementStock` para usar SQL atómico
2. [ ] Agregar manejo de error `InsufficientStockError`
3. [ ] Actualizar tests unitarios
4. [ ] Pruebas de concurrencia

### Fase 2: Transacciones de Confirmación (Crítico)
**Duración estimada:** 2-3 días

1. [ ] Refactorizar `confirmSaleUseCase` con transacción única
2. [ ] Refactorizar `confirmReturnUseCase` con transacción única
3. [ ] Mover dispatch de eventos fuera de la transacción
4. [ ] Actualizar tests

### Fase 3: Validación con Lock (Alto)
**Duración estimada:** 1-2 días

1. [ ] Implementar `SELECT FOR UPDATE` en `postMovementUseCase`
2. [ ] Implementar lock en validación de retornos
3. [ ] Actualizar tests

### Fase 4: Idempotencia de Eventos (Alto)
**Duración estimada:** 1-2 días

1. [ ] Crear migración para tabla `processed_events`
2. [ ] Implementar wrapper idempotente para handlers
3. [ ] Aplicar a todos los event handlers críticos
4. [ ] Actualizar tests

### Fase 5: Líneas Concurrentes (Alto)
**Duración estimada:** 1 día

1. [ ] Refactorizar `addSaleLineUseCase` para agregar directamente
2. [ ] Refactorizar `addReturnLineUseCase`
3. [ ] Actualizar tests

---

## Matriz de Riesgos

| Problema | Probabilidad | Impacto | Prioridad |
|----------|--------------|---------|-----------|
| Stock RMW | Alta | Crítico (pérdida de inventario) | P0 |
| Validación TOCTOU | Media | Crítico (stock negativo) | P0 |
| Retorno excede venta | Media | Alto (inconsistencia) | P1 |
| Eventos duplicados | Baja | Alto (stock duplicado) | P1 |
| Multi-TX inconsistente | Baja | Alto (estado corrupto) | P1 |
| Líneas perdidas | Baja | Medio (datos perdidos) | P2 |
| Alertas obsoletas | Alta | Bajo (UX) | P3 |

---

## Tests de Concurrencia Recomendados

```typescript
describe('Stock Concurrency Tests', () => {
  it('should handle concurrent increments correctly', async () => {
    // Crear stock inicial: 100 unidades
    await stockRepository.createStock(productId, warehouseId, 100);
    
    // Ejecutar 10 incrementos de 10 unidades en paralelo
    const promises = Array(10).fill(null).map(() => 
      stockRepository.incrementStock(productId, warehouseId, 10)
    );
    
    await Promise.all(promises);
    
    // Stock final debe ser exactamente 200
    const finalStock = await stockRepository.getStockQuantity(productId, warehouseId);
    expect(finalStock).toBe(200);
  });
  
  it('should prevent stock from going negative', async () => {
    // Crear stock inicial: 50 unidades
    await stockRepository.createStock(productId, warehouseId, 50);
    
    // Intentar decrementar 30 unidades 3 veces en paralelo
    const promises = Array(3).fill(null).map(() => 
      stockRepository.decrementStock(productId, warehouseId, 30).catch(e => e)
    );
    
    const results = await Promise.all(promises);
    
    // Solo 1 debe tener éxito, 2 deben fallar
    const successes = results.filter(r => !(r instanceof Error));
    const failures = results.filter(r => r instanceof Error);
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);
    
    // Stock final debe ser 20 (50 - 30)
    const finalStock = await stockRepository.getStockQuantity(productId, warehouseId);
    expect(finalStock).toBe(20);
  });
});
```

---

## Referencias

- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Prisma: Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [TOCTOU Race Condition](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use)
- [Optimistic vs Pessimistic Locking](https://www.baeldung.com/jpa-optimistic-locking)
