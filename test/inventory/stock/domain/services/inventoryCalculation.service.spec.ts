import { describe, expect, it } from '@jest/globals';
import {
  calculateAverageCost,
  calculateInventoryBalance,
  calculateInventoryValue,
  validateStockAvailability,
  InventoryCalculationService,
} from '@stock/domain/services/inventoryCalculation.service';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('InventoryCalculationService', () => {
  describe('calculateAverageCost', () => {
    it('Given: zero new quantity When: calculating average cost Then: should return current cost', () => {
      // Arrange
      const currentQuantity = Quantity.create(10);
      const currentCost = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(0);
      const newUnitCost = Money.create(7, 'USD', 2);

      // Act
      const result = calculateAverageCost(currentQuantity, currentCost, newQuantity, newUnitCost);

      // Assert
      expect(result.getAmount()).toBe(5);
    });

    it('Given: positive quantities When: calculating average cost Then: should return weighted cost', () => {
      // Arrange
      const currentQuantity = Quantity.create(10);
      const currentCost = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(10);
      const newUnitCost = Money.create(15, 'USD', 2);

      // Act
      const result = calculateAverageCost(currentQuantity, currentCost, newQuantity, newUnitCost);

      // Assert
      expect(result.getAmount()).toBeGreaterThan(5);
    });
  });

  describe('calculateInventoryBalance', () => {
    it('Given: movements with quantities and costs When: calculating balance Then: should aggregate totals', () => {
      // Arrange
      const movements = [
        { quantity: Quantity.create(5), totalCost: Money.create(10, 'USD', 2) },
        { quantity: Quantity.create(3), totalCost: Money.create(6, 'USD', 2) },
        { quantity: Quantity.create(2) },
      ];

      // Act
      const result = calculateInventoryBalance(movements);

      // Assert
      expect(result.quantity.getNumericValue()).toBe(10);
      expect(result.totalCost.getAmount()).toBe(16);
    });
  });

  describe('validateStockAvailability', () => {
    it('Given: sufficient stock When: validating Then: should return true', () => {
      const available = Quantity.create(10);
      const requested = Quantity.create(5);

      expect(validateStockAvailability(available, requested)).toBe(true);
    });

    it('Given: insufficient stock When: validating Then: should return false', () => {
      const available = Quantity.create(3);
      const requested = Quantity.create(5);

      expect(validateStockAvailability(available, requested)).toBe(false);
    });
  });

  describe('calculateInventoryValue', () => {
    it('Given: quantity and unit cost When: calculating value Then: should return total value', () => {
      const quantity = Quantity.create(4);
      const unitCost = Money.create(2, 'USD', 2);

      const result = calculateInventoryValue(quantity, unitCost);

      expect(result.getAmount()).toBe(8);
    });
  });

  describe('legacy wrapper', () => {
    it('Given: legacy calls When: using wrapper Then: should delegate to pure functions', () => {
      const currentQuantity = Quantity.create(1);
      const currentCost = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(1);
      const newUnitCost = Money.create(7, 'USD', 2);

      const result = InventoryCalculationService.calculateAverageCost(
        currentQuantity,
        currentCost,
        newQuantity,
        newUnitCost
      );

      expect(result.getAmount()).toBeGreaterThan(0);
    });
  });
});
