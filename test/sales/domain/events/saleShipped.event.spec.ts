import { describe, expect, it } from '@jest/globals';
import { SaleShippedEvent } from '@sale/domain/events/saleShipped.event';
import { Sale } from '@sale/domain/entities/sale.entity';

describe('SaleShippedEvent', () => {
  const shippedAt = new Date('2026-02-28T14:30:00Z');

  const mockSale = {
    id: 'sale-ship-001',
    orgId: 'org-400',
    shippedAt,
    warehouseId: 'warehouse-004',
    saleNumber: { getValue: () => 'SALE-2026-030' },
    trackingNumber: 'TRACK-123456',
    shippingCarrier: 'FedEx',
  } as unknown as Sale;

  it('Given: a shipped sale When: creating event Then: should set eventName to SaleShipped', () => {
    // Act
    const event = new SaleShippedEvent(mockSale);

    // Assert
    expect(event.eventName).toBe('SaleShipped');
  });

  it('Given: a shipped sale When: creating event Then: should expose all sale properties including shipping details', () => {
    // Act
    const event = new SaleShippedEvent(mockSale);

    // Assert
    expect(event.saleId).toBe('sale-ship-001');
    expect(event.orgId).toBe('org-400');
    expect(event.warehouseId).toBe('warehouse-004');
    expect(event.saleNumber).toBe('SALE-2026-030');
    expect(event.trackingNumber).toBe('TRACK-123456');
    expect(event.shippingCarrier).toBe('FedEx');
  });

  it('Given: a shipped sale with shippedAt When: creating event Then: should use shippedAt as occurredOn', () => {
    // Act
    const event = new SaleShippedEvent(mockSale);

    // Assert
    expect(event.occurredOn).toEqual(shippedAt);
  });
});
