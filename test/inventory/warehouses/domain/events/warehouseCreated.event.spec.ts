import { describe, expect, it } from '@jest/globals';
import { WarehouseCreatedEvent } from '@warehouse/domain/events/warehouseCreated.event';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';

describe('WarehouseCreatedEvent', () => {
  const createdAt = new Date('2026-02-28T07:00:00Z');

  const mockWarehouse = {
    id: 'warehouse-001',
    orgId: 'org-100',
    createdAt,
    code: { getValue: () => 'WH-MAIN' },
    name: 'Main Warehouse',
  } as unknown as Warehouse;

  it('Given: a created warehouse When: creating event Then: should set eventName to WarehouseCreated', () => {
    // Act
    const event = new WarehouseCreatedEvent(mockWarehouse);

    // Assert
    expect(event.eventName).toBe('WarehouseCreated');
  });

  it('Given: a created warehouse When: creating event Then: should expose all warehouse properties', () => {
    // Act
    const event = new WarehouseCreatedEvent(mockWarehouse);

    // Assert
    expect(event.warehouseId).toBe('warehouse-001');
    expect(event.orgId).toBe('org-100');
    expect(event.code).toBe('WH-MAIN');
    expect(event.name).toBe('Main Warehouse');
  });

  it('Given: a created warehouse When: creating event Then: should use warehouse createdAt as occurredOn', () => {
    // Act
    const event = new WarehouseCreatedEvent(mockWarehouse);

    // Assert
    expect(event.occurredOn).toEqual(createdAt);
  });
});
