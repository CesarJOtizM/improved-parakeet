import { describe, expect, it } from '@jest/globals';
import { SalePickingStartedEvent } from '@sale/domain/events/salePickingStarted.event';
import { Sale } from '@sale/domain/entities/sale.entity';

describe('SalePickingStartedEvent', () => {
  const pickedAt = new Date('2026-02-28T11:00:00Z');

  const mockSale = {
    id: 'sale-pick-001',
    orgId: 'org-200',
    pickedAt,
    warehouseId: 'warehouse-002',
    saleNumber: { getValue: () => 'SALE-2026-010' },
  } as unknown as Sale;

  it('Given: a sale entering picking When: creating event Then: should set eventName to SalePickingStarted', () => {
    // Act
    const event = new SalePickingStartedEvent(mockSale);

    // Assert
    expect(event.eventName).toBe('SalePickingStarted');
  });

  it('Given: a sale entering picking When: creating event Then: should expose all sale properties', () => {
    // Act
    const event = new SalePickingStartedEvent(mockSale);

    // Assert
    expect(event.saleId).toBe('sale-pick-001');
    expect(event.orgId).toBe('org-200');
    expect(event.warehouseId).toBe('warehouse-002');
    expect(event.saleNumber).toBe('SALE-2026-010');
  });

  it('Given: a sale with pickedAt When: creating event Then: should use pickedAt as occurredOn', () => {
    // Act
    const event = new SalePickingStartedEvent(mockSale);

    // Assert
    expect(event.occurredOn).toEqual(pickedAt);
  });
});
