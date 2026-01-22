import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { describe, expect, it } from '@jest/globals';
import { calculatePPM, recalculatePPM, PPMService } from '@movement/domain/services/ppmService';

describe('PPMService', () => {
  describe('calculatePPM', () => {
    it('Given: zero new quantity When: calculating PPM Then: should keep current average cost', () => {
      // Arrange
      const currentQuantity = Quantity.create(10);
      const currentPPM = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(0);
      const newUnitCost = Money.create(10, 'USD', 2);

      // Act
      const result = calculatePPM(currentQuantity, currentPPM, newQuantity, newUnitCost);

      // Assert
      expect(result.newAverageCost.getAmount()).toBe(5);
      expect(result.totalQuantity.getNumericValue()).toBe(10);
      expect(result.totalValue.getAmount()).toBe(50);
    });

    it('Given: positive quantities When: calculating PPM Then: should return new average cost', () => {
      // Arrange
      const currentQuantity = Quantity.create(10);
      const currentPPM = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(5);
      const newUnitCost = Money.create(9, 'USD', 2);

      // Act
      const result = calculatePPM(currentQuantity, currentPPM, newQuantity, newUnitCost);

      // Assert
      expect(result.totalQuantity.getNumericValue()).toBe(15);
      expect(result.newAverageCost.getAmount()).toBeGreaterThan(5);
      expect(result.totalValue.getAmount()).toBeGreaterThan(0);
    });
  });

  describe('recalculatePPM', () => {
    it('Given: mixed movements When: recalculating Then: should handle movements with and without cost', () => {
      // Arrange
      const movements = [
        { quantity: Quantity.create(5), unitCost: Money.create(10, 'USD', 2) },
        { quantity: Quantity.create(3) },
        { quantity: Quantity.create(2), unitCost: Money.create(12, 'USD', 2) },
      ];
      const initialQuantity = Quantity.create(2);
      const initialPPM = Money.create(8, 'USD', 2);

      // Act
      const result = recalculatePPM(movements, initialQuantity, initialPPM);

      // Assert
      expect(result.totalQuantity.getNumericValue()).toBe(12);
      expect(result.newAverageCost.getAmount()).toBeGreaterThan(0);
      expect(result.totalValue.getAmount()).toBeGreaterThan(0);
    });
  });

  describe('legacy class wrapper', () => {
    it('Given: inputs When: using legacy calculatePPM Then: should call pure function', () => {
      // Arrange
      const currentQuantity = Quantity.create(1);
      const currentPPM = Money.create(5, 'USD', 2);
      const newQuantity = Quantity.create(1);
      const newUnitCost = Money.create(7, 'USD', 2);

      // Act
      const result = PPMService.calculatePPM(currentQuantity, currentPPM, newQuantity, newUnitCost);

      // Assert
      expect(result.totalQuantity.getNumericValue()).toBe(2);
      expect(result.newAverageCost.getAmount()).toBeGreaterThan(0);
    });

    it('Given: calling getCurrentPPM When: invoked Then: should throw', async () => {
      await expect(PPMService.getCurrentPPM('p1', 'w1', 'org1')).rejects.toThrow(
        'getCurrentPPM must be implemented by the application layer using stock repository'
      );
    });
  });
});
