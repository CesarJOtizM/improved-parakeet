import { describe, expect, it } from '@jest/globals';
import { InventoryOutGeneratedEvent } from '@sale/domain/events/inventoryOutGenerated.event';

describe('InventoryOutGeneratedEvent', () => {
  const occurredOn = new Date('2026-02-28T16:45:00Z');

  it('Given: inventory out data When: creating event Then: should set eventName to InventoryOutGenerated', () => {
    // Act
    const event = new InventoryOutGeneratedEvent('sale-001', 'movement-001', 'org-001', occurredOn);

    // Assert
    expect(event.eventName).toBe('InventoryOutGenerated');
  });

  it('Given: inventory out data When: creating event Then: should expose all properties correctly', () => {
    // Act
    const event = new InventoryOutGeneratedEvent('sale-abc', 'movement-xyz', 'org-123', occurredOn);

    // Assert
    expect(event.saleId).toBe('sale-abc');
    expect(event.movementId).toBe('movement-xyz');
    expect(event.orgId).toBe('org-123');
    expect(event.occurredOn).toEqual(occurredOn);
  });

  it('Given: no explicit occurredOn When: creating event Then: should default to current date', () => {
    // Act
    const before = new Date();
    const event = new InventoryOutGeneratedEvent('sale-def', 'movement-ghi', 'org-456');
    const after = new Date();

    // Assert
    expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredOn.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
