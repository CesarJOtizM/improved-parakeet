import { describe, expect, it } from '@jest/globals';
import { SaleLineSwappedEvent } from '@sale/domain/events/saleLineSwapped.event';

describe('SaleLineSwappedEvent', () => {
  const eventProps = {
    saleId: 'sale-123',
    saleNumber: 'SALE-2024-001',
    orgId: 'org-123',
    warehouseId: 'warehouse-1',
    originalLineId: 'line-123',
    originalProductId: 'product-original',
    replacementProductId: 'product-replacement',
    swapQuantity: 3,
    sourceWarehouseId: 'warehouse-2',
    swapId: 'swap-123',
    performedBy: 'user-123',
  };

  it('Given: valid props When: creating event Then: should have correct eventName and properties', () => {
    // Act
    const event = new SaleLineSwappedEvent(eventProps);

    // Assert
    expect(event.eventName).toBe('SaleLineSwapped');
    expect(event.saleId).toBe('sale-123');
    expect(event.saleNumber).toBe('SALE-2024-001');
    expect(event.orgId).toBe('org-123');
    expect(event.warehouseId).toBe('warehouse-1');
    expect(event.originalProductId).toBe('product-original');
    expect(event.replacementProductId).toBe('product-replacement');
    expect(event.swapQuantity).toBe(3);
    expect(event.sourceWarehouseId).toBe('warehouse-2');
    expect(event.swapId).toBe('swap-123');
    expect(event.performedBy).toBe('user-123');
  });

  it('Given: event When: checking occurredOn Then: should return a Date', () => {
    // Act
    const event = new SaleLineSwappedEvent(eventProps);

    // Assert
    expect(event.occurredOn).toBeInstanceOf(Date);
  });
});
