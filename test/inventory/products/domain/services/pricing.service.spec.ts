import { describe, expect, it } from '@jest/globals';
import { PricingService } from '@product/domain/services/pricing.service';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

describe('PricingService', () => {
  describe('calculatePriceWithTax', () => {
    it('Given: base price and tax rate When: calculating price with tax Then: should return correct price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19; // 19%

      // Act
      const result = PricingService.calculatePriceWithTax(basePrice, taxRate);

      // Assert
      expect(result.getAmount()).toBe(119);
      expect(result.getCurrency()).toBe('COP');
      expect(result.getPrecision()).toBe(2);
    });

    it('Given: zero tax rate When: calculating price with tax Then: should return same price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 0;

      // Act
      const result = PricingService.calculatePriceWithTax(basePrice, taxRate);

      // Assert
      expect(result.getAmount()).toBe(100);
    });

    it('Given: 100% tax rate When: calculating price with tax Then: should return double price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 100;

      // Act
      const result = PricingService.calculatePriceWithTax(basePrice, taxRate);

      // Assert
      expect(result.getAmount()).toBe(200);
    });

    it('Given: negative tax rate When: calculating price with tax Then: should throw error', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = -5;

      // Act & Assert
      expect(() => PricingService.calculatePriceWithTax(basePrice, taxRate)).toThrow(
        'Tax rate must be between 0 and 100'
      );
    });

    it('Given: tax rate over 100 When: calculating price with tax Then: should throw error', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 101;

      // Act & Assert
      expect(() => PricingService.calculatePriceWithTax(basePrice, taxRate)).toThrow(
        'Tax rate must be between 0 and 100'
      );
    });
  });

  describe('calculateDiscount', () => {
    it('Given: price and discount percent When: calculating discount Then: should return correct discount amount', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = 10; // 10%

      // Act
      const result = PricingService.calculateDiscount(price, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(10);
      expect(result.getCurrency()).toBe('COP');
      expect(result.getPrecision()).toBe(2);
    });

    it('Given: zero discount When: calculating discount Then: should return zero', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = 0;

      // Act
      const result = PricingService.calculateDiscount(price, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(0);
    });

    it('Given: 100% discount When: calculating discount Then: should return full price', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = 100;

      // Act
      const result = PricingService.calculateDiscount(price, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(100);
    });

    it('Given: negative discount percent When: calculating discount Then: should throw error', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = -5;

      // Act & Assert
      expect(() => PricingService.calculateDiscount(price, discountPercent)).toThrow(
        'Discount percent must be between 0 and 100'
      );
    });

    it('Given: discount percent over 100 When: calculating discount Then: should throw error', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = 101;

      // Act & Assert
      expect(() => PricingService.calculateDiscount(price, discountPercent)).toThrow(
        'Discount percent must be between 0 and 100'
      );
    });
  });

  describe('calculateFinalPrice', () => {
    it('Given: base price, tax rate, and discount When: calculating final price Then: should return correct price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19; // 19%
      const discountPercent = 10; // 10%

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      // Discount: 100 * 0.10 = 10
      // Price after discount: 100 - 10 = 90
      // Tax: 90 * 0.19 = 17.1
      // Final: 90 + 17.1 = 107.1
      expect(result.getAmount()).toBeCloseTo(107.1, 1);
      expect(result.getCurrency()).toBe('COP');
      expect(result.getPrecision()).toBe(2);
    });

    it('Given: base price with no tax and no discount When: calculating final price Then: should return base price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 0;
      const discountPercent = 0;

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(100);
    });

    it('Given: invalid tax rate When: calculating final price Then: should throw error', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = -5;
      const discountPercent = 10;

      // Act & Assert
      expect(() => PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent)).toThrow(
        'Tax rate must be between 0 and 100'
      );
    });

    it('Given: invalid discount percent When: calculating final price Then: should throw error', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19;
      const discountPercent = 101;

      // Act & Assert
      expect(() => PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent)).toThrow(
        'Discount percent must be between 0 and 100'
      );
    });
  });

  describe('comparePrices', () => {
    it('Given: price1 less than price2 When: comparing prices Then: should return -1', () => {
      // Arrange
      const price1 = Money.create(100, 'COP', 2);
      const price2 = Money.create(200, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(-1);
    });

    it('Given: price1 greater than price2 When: comparing prices Then: should return 1', () => {
      // Arrange
      const price1 = Money.create(200, 'COP', 2);
      const price2 = Money.create(100, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(1);
    });

    it('Given: equal prices When: comparing prices Then: should return 0', () => {
      // Arrange
      const price1 = Money.create(100, 'COP', 2);
      const price2 = Money.create(100, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(0);
    });

    it('Given: different currencies When: comparing prices Then: should throw error', () => {
      // Arrange
      const price1 = Money.create(100, 'COP', 2);
      const price2 = Money.create(100, 'USD', 2);

      // Act & Assert
      expect(() => PricingService.comparePrices(price1, price2)).toThrow(
        'Cannot compare prices with different currencies'
      );
    });
  });
});
