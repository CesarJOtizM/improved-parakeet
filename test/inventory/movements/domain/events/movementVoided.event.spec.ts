import { describe, expect, it } from '@jest/globals';
import { MovementVoidedEvent } from '@movement/domain/events/movementVoided.event';
import { Movement } from '@movement/domain/entities/movement.entity';

describe('MovementVoidedEvent', () => {
  const mockMovement = {
    id: 'movement-void-001',
    orgId: 'org-300',
    warehouseId: 'warehouse-400',
    type: { getValue: () => 'STOCK_IN' },
    getTotalQuantity: () => 75,
    getLines: () => [{ id: 'line-1' }, { id: 'line-2' }, { id: 'line-3' }],
  } as unknown as Movement;

  it('Given: a voided movement When: creating event Then: should set eventName to MovementVoided', () => {
    // Act
    const event = new MovementVoidedEvent(mockMovement);

    // Assert
    expect(event.eventName).toBe('MovementVoided');
  });

  it('Given: a voided movement When: creating event Then: should expose all movement properties', () => {
    // Act
    const event = new MovementVoidedEvent(mockMovement);

    // Assert
    expect(event.movementId).toBe('movement-void-001');
    expect(event.orgId).toBe('org-300');
    expect(event.warehouseId).toBe('warehouse-400');
    expect(event.type).toBe('STOCK_IN');
    expect(event.totalQuantity).toBe(75);
    expect(event.lines).toBe(3);
  });

  it('Given: a voided movement When: creating event Then: should use current date as occurredOn', () => {
    // Act
    const before = new Date();
    const event = new MovementVoidedEvent(mockMovement);
    const after = new Date();

    // Assert - allow 50ms tolerance for timing flakiness
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime() + 50);
  });
});
