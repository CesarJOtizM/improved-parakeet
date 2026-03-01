import { describe, expect, it } from '@jest/globals';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';
import { Movement } from '@movement/domain/entities/movement.entity';

describe('MovementPostedEvent', () => {
  const mockMovement = {
    id: 'movement-123',
    orgId: 'org-456',
    createdAt: new Date('2026-02-28T10:00:00Z'),
    warehouseId: 'warehouse-789',
    type: { getValue: () => 'STOCK_IN' },
    getTotalQuantity: () => 100,
    getLines: () => [{ id: 'line-1' }, { id: 'line-2' }],
  } as unknown as Movement;

  it('Given: a posted movement When: creating event Then: should set eventName to MovementPosted', () => {
    // Act
    const event = new MovementPostedEvent(mockMovement);

    // Assert
    expect(event.eventName).toBe('MovementPosted');
  });

  it('Given: a posted movement When: creating event Then: should expose all movement properties', () => {
    // Act
    const event = new MovementPostedEvent(mockMovement);

    // Assert
    expect(event.movementId).toBe('movement-123');
    expect(event.orgId).toBe('org-456');
    expect(event.warehouseId).toBe('warehouse-789');
    expect(event.type).toBe('STOCK_IN');
    expect(event.totalQuantity).toBe(100);
    expect(event.lines).toBe(2);
  });

  it('Given: a posted movement When: creating event Then: should use movement createdAt as occurredOn', () => {
    // Act
    const event = new MovementPostedEvent(mockMovement);

    // Assert
    expect(event.occurredOn).toEqual(new Date('2026-02-28T10:00:00Z'));
  });
});
