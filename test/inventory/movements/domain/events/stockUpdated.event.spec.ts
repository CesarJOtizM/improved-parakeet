import { describe, expect, it } from '@jest/globals';
import { StockUpdatedEvent } from '@movement/domain/events/stockUpdated.event';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('StockUpdatedEvent', () => {
  const mockOrgId = 'org-123';
  const mockProductId = 'product-123';
  const mockWarehouseId = 'warehouse-123';
  const mockLocationId = 'location-123';

  describe('constructor', () => {
    it('Given: stock update data When: creating event Then: should create event with correct properties', () => {
      // Arrange
      const quantityBefore = Quantity.create(10, 2);
      const quantityAfter = Quantity.create(15, 2);
      const occurredOn = new Date();

      // Act
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        quantityBefore,
        quantityAfter,
        mockOrgId,
        occurredOn
      );

      // Assert
      expect(event).toBeDefined();
      expect(event.eventName).toBe('StockUpdated');
    });
  });

  describe('eventName', () => {
    it('Given: a StockUpdatedEvent When: getting eventName Then: should return StockUpdated', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const name = event.eventName;

      // Assert
      expect(name).toBe('StockUpdated');
    });
  });

  describe('occurredOn', () => {
    it('Given: a StockUpdatedEvent When: getting occurredOn Then: should return the event date', () => {
      // Arrange
      const eventDate = new Date('2024-06-15T10:30:00Z');
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
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
    it('Given: a StockUpdatedEvent When: getting productId Then: should return product id', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        'specific-product-id',
        mockWarehouseId,
        mockLocationId,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
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
    it('Given: a StockUpdatedEvent When: getting warehouseId Then: should return warehouse id', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        mockProductId,
        'specific-warehouse-id',
        mockLocationId,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const warehouseId = event.warehouseId;

      // Assert
      expect(warehouseId).toBe('specific-warehouse-id');
    });
  });

  describe('locationId', () => {
    it('Given: a StockUpdatedEvent with locationId When: getting locationId Then: should return location id', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        'specific-location-id',
        Quantity.create(10, 2),
        Quantity.create(15, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const locationId = event.locationId;

      // Assert
      expect(locationId).toBe('specific-location-id');
    });

    it('Given: a StockUpdatedEvent without locationId When: getting locationId Then: should return undefined', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        undefined,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const locationId = event.locationId;

      // Assert
      expect(locationId).toBeUndefined();
    });
  });

  describe('quantityBefore', () => {
    it('Given: a StockUpdatedEvent When: getting quantityBefore Then: should return quantity before', () => {
      // Arrange
      const quantityBefore = Quantity.create(10, 2);
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        quantityBefore,
        Quantity.create(15, 2),
        mockOrgId,
        new Date()
      );

      // Act
      const result = event.quantityBefore;

      // Assert
      expect(result.getNumericValue()).toBe(10);
    });
  });

  describe('quantityAfter', () => {
    it('Given: a StockUpdatedEvent When: getting quantityAfter Then: should return quantity after', () => {
      // Arrange
      const quantityAfter = Quantity.create(25, 2);
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        Quantity.create(10, 2),
        quantityAfter,
        mockOrgId,
        new Date()
      );

      // Act
      const result = event.quantityAfter;

      // Assert
      expect(result.getNumericValue()).toBe(25);
    });
  });

  describe('orgId', () => {
    it('Given: a StockUpdatedEvent When: getting orgId Then: should return organization id', () => {
      // Arrange
      const event = new StockUpdatedEvent(
        mockProductId,
        mockWarehouseId,
        mockLocationId,
        Quantity.create(10, 2),
        Quantity.create(15, 2),
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
