import { describe, expect, it } from '@jest/globals';
import { MovementReturnedEvent } from '@movement/domain/events/movementReturned.event';
import { Movement } from '@movement/domain/entities/movement.entity';

describe('MovementReturnedEvent', () => {
  const returnedAt = new Date('2026-02-28T14:00:00Z');

  const mockMovement = {
    id: 'movement-ret-001',
    orgId: 'org-100',
    returnedAt,
    warehouseId: 'warehouse-200',
    type: { getValue: () => 'STOCK_OUT' },
    getTotalQuantity: () => 50,
    getLines: () => [{ id: 'line-1' }],
  } as unknown as Movement;

  it('Given: a returned movement When: creating event Then: should set eventName to MovementReturned', () => {
    // Act
    const event = new MovementReturnedEvent(mockMovement);

    // Assert
    expect(event.eventName).toBe('MovementReturned');
  });

  it('Given: a returned movement When: creating event Then: should expose all movement properties', () => {
    // Act
    const event = new MovementReturnedEvent(mockMovement);

    // Assert
    expect(event.movementId).toBe('movement-ret-001');
    expect(event.orgId).toBe('org-100');
    expect(event.warehouseId).toBe('warehouse-200');
    expect(event.type).toBe('STOCK_OUT');
    expect(event.totalQuantity).toBe(50);
    expect(event.lines).toBe(1);
  });

  it('Given: a returned movement with returnedAt When: creating event Then: should use returnedAt as occurredOn', () => {
    // Act
    const event = new MovementReturnedEvent(mockMovement);

    // Assert
    expect(event.occurredOn).toEqual(returnedAt);
  });
});
