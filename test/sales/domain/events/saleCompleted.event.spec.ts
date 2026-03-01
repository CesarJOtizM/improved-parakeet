import { describe, expect, it } from '@jest/globals';
import { SaleCompletedEvent } from '@sale/domain/events/saleCompleted.event';
import { Sale } from '@sale/domain/entities/sale.entity';

describe('SaleCompletedEvent', () => {
  const completedAt = new Date('2026-02-28T17:00:00Z');

  const mockSale = {
    id: 'sale-001',
    orgId: 'org-100',
    completedAt,
    warehouseId: 'warehouse-001',
    saleNumber: { getValue: () => 'SALE-2026-001' },
  } as unknown as Sale;

  it('Given: a completed sale When: creating event Then: should set eventName to SaleCompleted', () => {
    // Act
    const event = new SaleCompletedEvent(mockSale);

    // Assert
    expect(event.eventName).toBe('SaleCompleted');
  });

  it('Given: a completed sale When: creating event Then: should expose all sale properties', () => {
    // Act
    const event = new SaleCompletedEvent(mockSale);

    // Assert
    expect(event.saleId).toBe('sale-001');
    expect(event.orgId).toBe('org-100');
    expect(event.warehouseId).toBe('warehouse-001');
    expect(event.saleNumber).toBe('SALE-2026-001');
  });

  it('Given: a completed sale with completedAt When: creating event Then: should use completedAt as occurredOn', () => {
    // Act
    const event = new SaleCompletedEvent(mockSale);

    // Assert
    expect(event.occurredOn).toEqual(completedAt);
  });
});
