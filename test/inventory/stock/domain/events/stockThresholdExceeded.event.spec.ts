import { describe, expect, it } from '@jest/globals';
import { StockThresholdExceededEvent } from '@stock/domain/events/stockThresholdExceeded.event';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';

describe('StockThresholdExceededEvent', () => {
  const occurredOn = new Date('2026-02-28T16:00:00Z');
  const currentStock = Quantity.create(500);
  const maxQuantity = MaxQuantity.create(200);

  it('Given: stock exceeding threshold When: creating event Then: should set eventName to StockThresholdExceeded', () => {
    // Act
    const event = new StockThresholdExceededEvent(
      'product-001',
      'warehouse-001',
      currentStock,
      maxQuantity,
      'org-001',
      occurredOn
    );

    // Assert
    expect(event.eventName).toBe('StockThresholdExceeded');
  });

  it('Given: stock exceeding threshold When: creating event Then: should expose all properties correctly', () => {
    // Act
    const event = new StockThresholdExceededEvent(
      'product-010',
      'warehouse-020',
      currentStock,
      maxQuantity,
      'org-030',
      occurredOn
    );

    // Assert
    expect(event.productId).toBe('product-010');
    expect(event.warehouseId).toBe('warehouse-020');
    expect(event.currentStock.getNumericValue()).toBe(500);
    expect(event.maxQuantity.getNumericValue()).toBe(200);
    expect(event.orgId).toBe('org-030');
    expect(event.occurredOn).toEqual(occurredOn);
  });

  it('Given: stock threshold data When: creating event Then: should use provided occurredOn date', () => {
    // Arrange
    const specificDate = new Date('2026-01-15T09:30:00Z');

    // Act
    const event = new StockThresholdExceededEvent(
      'product-abc',
      'warehouse-xyz',
      Quantity.create(1000),
      MaxQuantity.create(500),
      'org-def',
      specificDate
    );

    // Assert
    expect(event.occurredOn).toEqual(specificDate);
  });
});
