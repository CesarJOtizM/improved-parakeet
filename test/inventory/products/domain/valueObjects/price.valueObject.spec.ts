import { describe, expect, it } from '@jest/globals';
import { Price } from '@product/domain/valueObjects/price.valueObject';

describe('Price Value Object', () => {
  describe('create', () => {
    it('Given: valid price When: creating price Then: should create successfully', () => {
      // Arrange & Act
      const price = Price.create(100.5, 'COP', 2);

      // Assert
      expect(price).toBeInstanceOf(Price);
      expect(price.getAmount()).toBe(100.5);
      expect(price.getCurrency()).toBe('COP');
      expect(price.getPrecision()).toBe(2);
    });

    it('Given: price with default currency When: creating price Then: should use COP', () => {
      // Arrange & Act
      const price = Price.create(100.5);

      // Assert
      expect(price.getCurrency()).toBe('COP');
    });

    it('Given: price with default precision When: creating price Then: should use 2', () => {
      // Arrange & Act
      const price = Price.create(100.5, 'COP');

      // Assert
      expect(price.getPrecision()).toBe(2);
    });

    it('Given: negative amount When: creating price Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Price.create(-100, 'COP', 2)).toThrow('Amount cannot be negative');
    });

    it('Given: empty currency When: creating price Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Price.create(100, '', 2)).toThrow('Currency is required');
      expect(() => Price.create(100, '   ', 2)).toThrow('Currency is required');
    });

    it('Given: precision less than 0 When: creating price Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Price.create(100, 'COP', -1)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: precision greater than 6 When: creating price Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Price.create(100, 'COP', 7)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: zero amount When: creating price Then: should create successfully', () => {
      // Arrange & Act
      const price = Price.create(0, 'COP', 2);

      // Assert
      expect(price.getAmount()).toBe(0);
      expect(price.isZero()).toBe(true);
    });
  });

  describe('add', () => {
    it('Given: two prices with same currency When: adding Then: should return sum', () => {
      // Arrange
      const price1 = Price.create(100, 'COP', 2);
      const price2 = Price.create(50, 'COP', 2);

      // Act
      const result = price1.add(price2);

      // Assert
      expect(result.getAmount()).toBe(150);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: two prices with different currencies When: adding Then: should throw error', () => {
      // Arrange
      const price1 = Price.create(100, 'COP', 2);
      const price2 = Price.create(50, 'USD', 2);

      // Act & Assert
      expect(() => price1.add(price2)).toThrow('Cannot add money with different currencies');
    });
  });

  describe('multiply', () => {
    it('Given: price and factor When: multiplying Then: should return multiplied amount', () => {
      // Arrange
      const price = Price.create(100, 'COP', 2);

      // Act
      const result = price.multiply(1.5);

      // Assert
      expect(result.getAmount()).toBe(150);
    });
  });

  describe('format', () => {
    it('Given: price When: formatting Then: should return formatted string', () => {
      // Arrange
      const price = Price.create(100.5, 'COP', 2);

      // Act
      const formatted = price.format();

      // Assert
      expect(formatted).toBe('COP 100.50');
    });
  });
});
