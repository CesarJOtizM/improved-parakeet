import { describe, expect, it } from '@jest/globals';
import { NoNegativeStockRule } from '@stock/domain/services/noNegativeStockRule.service';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('NoNegativeStockRule', () => {
  describe('validateNoNegativeStock', () => {
    it('Given: sufficient stock When: validating stock deduction Then: should return valid result', () => {
      // Arrange
      const currentStock = Quantity.create(100);
      const requestedQuantity = Quantity.create(50);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: exact stock matching request When: validating stock deduction Then: should return valid result', () => {
      // Arrange
      const currentStock = Quantity.create(50);
      const requestedQuantity = Quantity.create(50);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: insufficient stock When: validating stock deduction Then: should return invalid result with error', () => {
      // Arrange
      const currentStock = Quantity.create(10);
      const requestedQuantity = Quantity.create(50);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Stock cannot be negative');
      expect(result.errors[0]).toContain('Current: 10');
      expect(result.errors[0]).toContain('Requested: 50');
    });

    it('Given: zero stock When: requesting any quantity Then: should return invalid result', () => {
      // Arrange
      const currentStock = Quantity.create(0);
      const requestedQuantity = Quantity.create(1);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Stock cannot be negative');
    });

    it('Given: zero stock and zero request When: validating stock Then: should return valid result', () => {
      // Arrange
      const currentStock = Quantity.create(0);
      const requestedQuantity = Quantity.create(0);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: large stock and small request When: validating stock Then: should return valid result', () => {
      // Arrange
      const currentStock = Quantity.create(999999);
      const requestedQuantity = Quantity.create(1);

      // Act
      const result = NoNegativeStockRule.validateNoNegativeStock(currentStock, requestedQuantity);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateNoNegativeStockOrThrow', () => {
    it('Given: sufficient stock When: validating with throw Then: should not throw', () => {
      // Arrange
      const currentStock = Quantity.create(100);
      const requestedQuantity = Quantity.create(50);

      // Act & Assert
      expect(() =>
        NoNegativeStockRule.validateNoNegativeStockOrThrow(currentStock, requestedQuantity)
      ).not.toThrow();
    });

    it('Given: insufficient stock When: validating with throw Then: should throw error with details', () => {
      // Arrange
      const currentStock = Quantity.create(5);
      const requestedQuantity = Quantity.create(20);

      // Act & Assert
      expect(() =>
        NoNegativeStockRule.validateNoNegativeStockOrThrow(currentStock, requestedQuantity)
      ).toThrow('Stock cannot be negative');
    });
  });

  describe('wouldBeNegative', () => {
    it('Given: sufficient stock When: checking if would be negative Then: should return false', () => {
      // Arrange
      const currentStock = Quantity.create(100);
      const requestedQuantity = Quantity.create(50);

      // Act
      const result = NoNegativeStockRule.wouldBeNegative(currentStock, requestedQuantity);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: insufficient stock When: checking if would be negative Then: should return true', () => {
      // Arrange
      const currentStock = Quantity.create(10);
      const requestedQuantity = Quantity.create(50);

      // Act
      const result = NoNegativeStockRule.wouldBeNegative(currentStock, requestedQuantity);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: exact stock matching request When: checking if would be negative Then: should return false', () => {
      // Arrange
      const currentStock = Quantity.create(25);
      const requestedQuantity = Quantity.create(25);

      // Act
      const result = NoNegativeStockRule.wouldBeNegative(currentStock, requestedQuantity);

      // Assert
      expect(result).toBe(false);
    });
  });
});
