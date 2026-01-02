/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from '@jest/globals';
import {
  calculateReturnSubtotal,
  calculateReturnTotal,
  ReturnCalculationService,
} from '@returns/domain/services/returnCalculation.service';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

describe('ReturnCalculationService', () => {
  const createMockLine = (amount: number | null, currency = 'COP'): any => ({
    getTotalPrice: () => (amount !== null ? Money.create(amount, currency, 2) : null),
  });

  describe('calculateReturnSubtotal', () => {
    it('Given: empty lines array When: calculating subtotal Then: should return null', () => {
      // Arrange
      const lines: any[] = [];

      // Act
      const result = calculateReturnSubtotal(lines);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: single line When: calculating subtotal Then: should return line total', () => {
      // Arrange
      const lines = [createMockLine(1000)];

      // Act
      const result = calculateReturnSubtotal(lines);

      // Assert
      expect(result?.getAmount()).toBe(1000);
    });

    it('Given: multiple lines When: calculating subtotal Then: should sum all lines', () => {
      // Arrange
      const lines = [createMockLine(1000), createMockLine(500), createMockLine(250)];

      // Act
      const result = calculateReturnSubtotal(lines);

      // Assert
      expect(result?.getAmount()).toBe(1750);
    });

    it('Given: lines with null prices When: calculating subtotal Then: should skip null lines', () => {
      // Arrange
      const lines = [createMockLine(1000), createMockLine(null), createMockLine(500)];

      // Act
      const result = calculateReturnSubtotal(lines);

      // Assert
      expect(result?.getAmount()).toBe(1500);
    });

    it('Given: all lines with null prices When: calculating subtotal Then: should return null', () => {
      // Arrange
      const lines = [createMockLine(null), createMockLine(null)];

      // Act
      const result = calculateReturnSubtotal(lines);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: lines with different currencies When: calculating subtotal Then: should throw error', () => {
      // Arrange
      const lines = [createMockLine(1000, 'COP'), createMockLine(500, 'USD')];

      // Act & Assert
      expect(() => calculateReturnSubtotal(lines)).toThrow('All lines must have the same currency');
    });
  });

  describe('calculateReturnTotal', () => {
    it('Given: null subtotal When: calculating total Then: should return null', () => {
      // Arrange
      const subtotal = null;

      // Act
      const result = calculateReturnTotal(subtotal);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: subtotal only When: calculating total Then: should return subtotal', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);

      // Act
      const result = calculateReturnTotal(subtotal);

      // Assert
      expect(result?.getAmount()).toBe(1000);
    });

    it('Given: subtotal with adjustments When: calculating total Then: should add adjustments', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const adjustments = Money.create(100, 'COP', 2);

      // Act
      const result = calculateReturnTotal(subtotal, adjustments);

      // Assert
      expect(result?.getAmount()).toBe(1100);
    });

    it('Given: adjustment with different currency When: calculating total Then: should throw error', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const adjustments = Money.create(100, 'USD', 2);

      // Act & Assert
      expect(() => calculateReturnTotal(subtotal, adjustments)).toThrow(
        'Adjustment currency must match subtotal currency'
      );
    });
  });

  describe('ReturnCalculationService (legacy)', () => {
    it('Given: lines When: using static calculateSubtotal Then: should delegate to pure function', () => {
      // Arrange
      const lines = [createMockLine(500)];

      // Act
      const result = ReturnCalculationService.calculateSubtotal(lines);

      // Assert
      expect(result?.getAmount()).toBe(500);
    });

    it('Given: subtotal When: using static calculateTotal Then: should delegate to pure function', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);

      // Act
      const result = ReturnCalculationService.calculateTotal(subtotal);

      // Assert
      expect(result?.getAmount()).toBe(1000);
    });
  });
});
