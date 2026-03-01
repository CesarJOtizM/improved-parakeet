import { describe, expect, it } from '@jest/globals';
import { LocationAddedEvent } from '@warehouse/domain/events/locationAdded.event';
import { Location } from '@warehouse/domain/entities/location.entity';

describe('LocationAddedEvent', () => {
  const createdAt = new Date('2026-02-28T09:00:00Z');

  const mockLocation = {
    id: 'location-001',
    orgId: 'org-100',
    createdAt,
    warehouseId: 'warehouse-001',
    code: { getValue: () => 'LOC-A1' },
    name: 'Aisle A, Shelf 1',
  } as unknown as Location;

  it('Given: a new location When: creating event Then: should set eventName to LocationAdded', () => {
    // Act
    const event = new LocationAddedEvent(mockLocation);

    // Assert
    expect(event.eventName).toBe('LocationAdded');
  });

  it('Given: a new location When: creating event Then: should expose all location properties', () => {
    // Act
    const event = new LocationAddedEvent(mockLocation);

    // Assert
    expect(event.locationId).toBe('location-001');
    expect(event.orgId).toBe('org-100');
    expect(event.warehouseId).toBe('warehouse-001');
    expect(event.code).toBe('LOC-A1');
    expect(event.name).toBe('Aisle A, Shelf 1');
  });

  it('Given: a new location When: creating event Then: should use location createdAt as occurredOn', () => {
    // Act
    const event = new LocationAddedEvent(mockLocation);

    // Assert
    expect(event.occurredOn).toEqual(createdAt);
  });
});
