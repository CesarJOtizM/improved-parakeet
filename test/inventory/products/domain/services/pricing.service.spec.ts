import { describe, expect, it } from '@jest/globals';
import { PricingService } from '@product/domain/services/pricing.service';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

describe('PricingService', () => {
  describe('calculatePriceWithTax', () => {
    it('Given: base price and tax rate When: calculating price with tax Then: should return correct amount', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19; // 19%

      // Act
      const result = PricingService.calculatePriceWithTax(basePrice, taxRate);

      // Assert
      expect(result.getAmount()).toBe(119);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: base price and zero tax rate When: calculating price with tax Then: should return base price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 0;

      // Act
      const result = PricingService.calculatePriceWithTax(basePrice, taxRate);

      // Assert
      expect(result.getAmount()).toBe(100);
    });

    it('Given: base price and 100% tax rate When: calculating price with tax Then: should return double amount', () => {
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
      const taxRate = -1;

      // Act & Assert
      expect(() => PricingService.calculatePriceWithTax(basePrice, taxRate)).toThrow(
        'Tax rate must be between 0 and 100'
      );
    });

    it('Given: tax rate greater than 100 When: calculating price with tax Then: should throw error', () => {
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
    });

    it('Given: price and zero discount When: calculating discount Then: should return zero', () => {
      // Arrange
      const price = Money.create(100, 'COP', 2);
      const discountPercent = 0;

      // Act
      const result = PricingService.calculateDiscount(price, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(0);
    });

    it('Given: price and 100% discount When: calculating discount Then: should return full price', () => {
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
      const discountPercent = -1;

      // Act & Assert
      expect(() => PricingService.calculateDiscount(price, discountPercent)).toThrow(
        'Discount percent must be between 0 and 100'
      );
    });

    it('Given: discount percent greater than 100 When: calculating discount Then: should throw error', () => {
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
    it('Given: base price, tax rate, and discount When: calculating final price Then: should return correct amount', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19; // 19%
      const discountPercent = 10; // 10%

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      // Base: 100, Discount: 10, After discount: 90, Tax: 19% of 90 = 17.1, Final: 107.1
      expect(result.getAmount()).toBeCloseTo(107.1, 1);
    });

    it('Given: base price with zero tax and discount When: calculating final price Then: should return base price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 0;
      const discountPercent = 0;

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(100);
    });

    it('Given: base price with tax but no discount When: calculating final price Then: should return price with tax', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 19;
      const discountPercent = 0;

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(119);
    });

    it('Given: base price with discount but no tax When: calculating final price Then: should return discounted price', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 0;
      const discountPercent = 10;

      // Act
      const result = PricingService.calculateFinalPrice(basePrice, taxRate, discountPercent);

      // Assert
      expect(result.getAmount()).toBe(90);
    });

    it('Given: invalid tax rate When: calculating final price Then: should throw error', () => {
      // Arrange
      const basePrice = Money.create(100, 'COP', 2);
      const taxRate = 101;
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
    it('Given: price1 less than price2 When: comparing Then: should return -1', () => {
      // Arrange
      const price1 = Money.create(100, 'COP', 2);
      const price2 = Money.create(200, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(-1);
    });

    it('Given: price1 greater than price2 When: comparing Then: should return 1', () => {
      // Arrange
      const price1 = Money.create(200, 'COP', 2);
      const price2 = Money.create(100, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(1);
    });

    it('Given: price1 equal to price2 When: comparing Then: should return 0', () => {
      // Arrange
      const price1 = Money.create(100, 'COP', 2);
      const price2 = Money.create(100, 'COP', 2);

      // Act
      const result = PricingService.comparePrices(price1, price2);

      // Assert
      expect(result).toBe(0);
    });

    it('Given: prices with different currencies When: comparing Then: should throw error', () => {
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
