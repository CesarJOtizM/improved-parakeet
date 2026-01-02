/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from '@jest/globals';
import {
  calculateSaleSubtotal,
  calculateSaleTotal,
  SaleCalculationService,
} from '@sale/domain/services/saleCalculation.service';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

describe('SaleCalculationService', () => {
  const createMockLine = (amount: number, currency = 'COP'): any => ({
    salePrice: {
      getCurrency: () => currency,
    },
    getTotalPrice: () => Money.create(amount, currency, 2),
  });

  describe('calculateSaleSubtotal', () => {
    it('Given: empty lines array When: calculating subtotal Then: should return zero', () => {
      // Arrange
      const lines: any[] = [];

      // Act
      const result = calculateSaleSubtotal(lines);

      // Assert
      expect(result.getAmount()).toBe(0);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: single line When: calculating subtotal Then: should return line total', () => {
      // Arrange
      const lines = [createMockLine(1000)];

      // Act
      const result = calculateSaleSubtotal(lines);

      // Assert
      expect(result.getAmount()).toBe(1000);
    });

    it('Given: multiple lines When: calculating subtotal Then: should sum all lines', () => {
      // Arrange
      const lines = [createMockLine(1000), createMockLine(500), createMockLine(250)];

      // Act
      const result = calculateSaleSubtotal(lines);

      // Assert
      expect(result.getAmount()).toBe(1750);
    });

    it('Given: lines with different currencies When: calculating subtotal Then: should throw error', () => {
      // Arrange
      const lines = [createMockLine(1000, 'COP'), createMockLine(500, 'USD')];

      // Act & Assert
      expect(() => calculateSaleSubtotal(lines)).toThrow('All lines must have the same currency');
    });
  });

  describe('calculateSaleTotal', () => {
    it('Given: subtotal only When: calculating total Then: should return subtotal', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);

      // Act
      const result = calculateSaleTotal(subtotal);

      // Assert
      expect(result.getAmount()).toBe(1000);
    });

    it('Given: subtotal with discounts When: calculating total Then: should subtract discounts', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const discounts = Money.create(100, 'COP', 2);

      // Act
      const result = calculateSaleTotal(subtotal, discounts);

      // Assert
      expect(result.getAmount()).toBe(900);
    });

    it('Given: subtotal with taxes When: calculating total Then: should add taxes', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const taxes = Money.create(190, 'COP', 2);

      // Act
      const result = calculateSaleTotal(subtotal, undefined, taxes);

      // Assert
      expect(result.getAmount()).toBe(1190);
    });

    it('Given: subtotal with discounts and taxes When: calculating total Then: should apply both', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const discounts = Money.create(100, 'COP', 2);
      const taxes = Money.create(171, 'COP', 2);

      // Act
      const result = calculateSaleTotal(subtotal, discounts, taxes);

      // Assert
      expect(result.getAmount()).toBe(1071);
    });

    it('Given: discount with different currency When: calculating total Then: should throw error', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const discounts = Money.create(100, 'USD', 2);

      // Act & Assert
      expect(() => calculateSaleTotal(subtotal, discounts)).toThrow(
        'Discount currency must match subtotal currency'
      );
    });

    it('Given: tax with different currency When: calculating total Then: should throw error', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);
      const taxes = Money.create(190, 'USD', 2);

      // Act & Assert
      expect(() => calculateSaleTotal(subtotal, undefined, taxes)).toThrow(
        'Tax currency must match subtotal currency'
      );
    });
  });

  describe('SaleCalculationService (legacy)', () => {
    it('Given: lines When: using static calculateSubtotal Then: should delegate to pure function', () => {
      // Arrange
      const lines = [createMockLine(500)];

      // Act
      const result = SaleCalculationService.calculateSubtotal(lines);

      // Assert
      expect(result.getAmount()).toBe(500);
    });

    it('Given: subtotal When: using static calculateTotal Then: should delegate to pure function', () => {
      // Arrange
      const subtotal = Money.create(1000, 'COP', 2);

      // Act
      const result = SaleCalculationService.calculateTotal(subtotal);

      // Assert
      expect(result.getAmount()).toBe(1000);
    });
  });
});
