import { describe, expect, it } from '@jest/globals';
import { ProductUpdatedEvent } from '@product/domain/events/productUpdated.event';
import { Product } from '@product/domain/entities/product.entity';

describe('ProductUpdatedEvent', () => {
  const updatedAt = new Date('2026-02-28T12:30:00Z');

  const mockProduct = {
    id: 'product-002',
    orgId: 'org-200',
    updatedAt,
    sku: { getValue: () => 'SKU-002' },
    name: { getValue: () => 'Updated Product' },
  } as unknown as Product;

  it('Given: an updated product When: creating event Then: should set eventName to ProductUpdated', () => {
    // Act
    const event = new ProductUpdatedEvent(mockProduct);

    // Assert
    expect(event.eventName).toBe('ProductUpdated');
  });

  it('Given: an updated product When: creating event Then: should expose all product properties', () => {
    // Act
    const event = new ProductUpdatedEvent(mockProduct);

    // Assert
    expect(event.productId).toBe('product-002');
    expect(event.orgId).toBe('org-200');
    expect(event.sku).toBe('SKU-002');
    expect(event.name).toBe('Updated Product');
  });

  it('Given: an updated product When: creating event Then: should use product updatedAt as occurredOn', () => {
    // Act
    const event = new ProductUpdatedEvent(mockProduct);

    // Assert
    expect(event.occurredOn).toEqual(updatedAt);
  });
});
