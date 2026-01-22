import { describe, expect, it } from '@jest/globals';
import { PPMRecalculatedEvent } from '@movement/domain/events/ppmRecalculated.event';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('PPMRecalculatedEvent', () => {
  const mockOrgId = 'org-123';
  const mockProductId = 'product-123';
  const mockWarehouseId = 'warehouse-123';

  describe('constructor', () => {
    it('Given: PPM recalculation data When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const oldCost = Money.create(100, 'USD');
      const newCost = Money.create(110, 'USD');
      const quantity = Quantity.create(50, 2);
      const occurredOn = new Date();

      // Act
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        oldCost,
        newCost,
        quantity,
        mockOrgId,
        occurredOn
      );

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('PPMRecalculated');
    });
  });

  describe('eventName', () => {
    it('Given: a PPMRecalculatedEvent When: getting eventName Then: should return PPMRecalculated', () => {
      // Arrange
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('PPMRecalculated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a PPMRecalculatedEvent When: getting occurredOn Then: should return the event date', () => {
      // Arrange
      const eventDate = new Date('2024-06-15T10:30:00Z');
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        mockOrgId,
        eventDate
      );

      // Act
      const occurredOn = event.occurredOn;

      // Assert
      expect(occurredOn).toEqual(eventDate);
    });
  });

  describe('productId', () => {
    it('Given: a PPMRecalculatedEvent When: getting productId Then: should return product id', () => {
      // Arrange
      const event = new PPMRecalculatedEvent(
        'specific-product-id',
        mockWarehouseId,
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const productId = event.productId;

      // Assert
      expect(productId).toBe('specific-product-id');
    });
  });

  describe('warehouseId', () => {
    it('Given: a PPMRecalculatedEvent When: getting warehouseId Then: should return warehouse id', () => {
      // Arrange
      const event = new PPMRecalculatedEvent(
        mockProductId,
        'specific-warehouse-id',
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const warehouseId = event.warehouseId;

      // Assert
      expect(warehouseId).toBe('specific-warehouse-id');
    });
  });

  describe('oldAverageCost', () => {
    it('Given: a PPMRecalculatedEvent When: getting oldAverageCost Then: should return old cost', () => {
      // Arrange
      const oldCost = Money.create(100, 'USD');
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        oldCost,
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const result = event.oldAverageCost;

      // Assert
      expect(result.getAmount()).toBe(100);
      expect(result.getCurrency()).toBe('USD');
    });
  });

  describe('newAverageCost', () => {
    it('Given: a PPMRecalculatedEvent When: getting newAverageCost Then: should return new cost', () => {
      // Arrange
      const newCost = Money.create(125.5, 'USD');
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        Money.create(100, 'USD'),
        newCost,
        Quantity.create(50, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const result = event.newAverageCost;

      // Assert
      expect(result.getAmount()).toBe(125.5);
    });
  });

  describe('quantity', () => {
    it('Given: a PPMRecalculatedEvent When: getting quantity Then: should return quantity', () => {
      // Arrange
      const quantity = Quantity.create(75, 2);
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        quantity,
        mockOrgId,
        new Date()
      );

      // Act
      const result = event.quantity;

      // Assert
      expect(result.getNumericValue()).toBe(75);
    });
  });

  describe('orgId', () => {
    it('Given: a PPMRecalculatedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const event = new PPMRecalculatedEvent(
        mockProductId,
        mockWarehouseId,
        Money.create(100, 'USD'),
        Money.create(110, 'USD'),
        Quantity.create(50, 2),
        'specific-org-id',
        new Date()
      );

      // Act
      const orgId = event.orgId;

      // Assert
      expect(orgId).toBe('specific-org-id');
    });
  });
});
