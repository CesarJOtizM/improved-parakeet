import { describe, expect, it } from '@jest/globals';
import { LowStockAlertEvent } from '@stock/domain/events/lowStockAlert.event';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('LowStockAlertEvent', () => {
  const occurredOn = new Date('2026-02-28T15:00:00Z');
  const currentStock = Quantity.create(5);
  const minQuantity = MinQuantity.create(20);
  const safetyStock = SafetyStock.create(10);

  it('Given: low stock data When: creating event Then: should set eventName to LowStockAlert', () => {
    // Act
    const event = new LowStockAlertEvent(
      'product-001',
      'warehouse-001',
      currentStock,
      minQuantity,
      safetyStock,
      'LOW',
      'org-001',
      occurredOn
    );

    // Assert
    expect(event.eventName).toBe('LowStockAlert');
  });

  it('Given: low stock data When: creating event Then: should expose all properties correctly', () => {
    // Act
    const event = new LowStockAlertEvent(
      'product-002',
      'warehouse-002',
      currentStock,
      minQuantity,
      safetyStock,
      'CRITICAL',
      'org-002',
      occurredOn
    );

    // Assert
    expect(event.productId).toBe('product-002');
    expect(event.warehouseId).toBe('warehouse-002');
    expect(event.currentStock.getNumericValue()).toBe(5);
    expect(event.minQuantity?.getNumericValue()).toBe(20);
    expect(event.safetyStock?.getNumericValue()).toBe(10);
    expect(event.severity).toBe('CRITICAL');
    expect(event.orgId).toBe('org-002');
    expect(event.occurredOn).toEqual(occurredOn);
  });

  it('Given: out of stock condition When: creating event Then: should support OUT_OF_STOCK severity', () => {
    // Arrange
    const zeroStock = Quantity.create(0);

    // Act
    const event = new LowStockAlertEvent(
      'product-003',
      'warehouse-003',
      zeroStock,
      minQuantity,
      undefined,
      'OUT_OF_STOCK',
      'org-003',
      occurredOn
    );

    // Assert
    expect(event.severity).toBe('OUT_OF_STOCK');
    expect(event.currentStock.getNumericValue()).toBe(0);
    expect(event.safetyStock).toBeUndefined();
  });
});
