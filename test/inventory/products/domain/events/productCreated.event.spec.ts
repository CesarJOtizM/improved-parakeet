import { describe, expect, it } from '@jest/globals';
import { ProductCreatedEvent } from '@product/domain/events/productCreated.event';
import { Product } from '@product/domain/entities/product.entity';

describe('ProductCreatedEvent', () => {
  const createdAt = new Date('2026-02-28T08:00:00Z');

  const mockProduct = {
    id: 'product-001',
    orgId: 'org-100',
    createdAt,
    sku: { getValue: () => 'SKU-001' },
    name: { getValue: () => 'Test Product' },
  } as unknown as Product;

  it('Given: a created product When: creating event Then: should set eventName to ProductCreated', () => {
    // Act
    const event = new ProductCreatedEvent(mockProduct);

    // Assert
    expect(event.eventName).toBe('ProductCreated');
  });

  it('Given: a created product When: creating event Then: should expose all product properties', () => {
    // Act
    const event = new ProductCreatedEvent(mockProduct);

    // Assert
    expect(event.productId).toBe('product-001');
    expect(event.orgId).toBe('org-100');
    expect(event.sku).toBe('SKU-001');
    expect(event.name).toBe('Test Product');
  });

  it('Given: a created product When: creating event Then: should use product createdAt as occurredOn', () => {
    // Act
    const event = new ProductCreatedEvent(mockProduct);

    // Assert
    expect(event.occurredOn).toEqual(createdAt);
  });
});
