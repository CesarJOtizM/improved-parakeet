import { describe, expect, it } from '@jest/globals';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';

describe('SalePrice', () => {
  describe('create', () => {
    it('Given: positive amount When: creating Then: should create successfully', () => {
      // Act
      const price = SalePrice.create(100);

      // Assert
      expect(price.getAmount()).toBe(100);
      expect(price.getCurrency()).toBe('COP');
      expect(price.getPrecision()).toBe(2);
    });

    it('Given: positive amount with custom currency When: creating Then: should use that currency', () => {
      // Act
      const price = SalePrice.create(50, 'USD');

      // Assert
      expect(price.getAmount()).toBe(50);
      expect(price.getCurrency()).toBe('USD');
    });

    it('Given: positive amount with custom precision When: creating Then: should use that precision', () => {
      // Act
      const price = SalePrice.create(100, 'COP', 4);

      // Assert
      expect(price.getPrecision()).toBe(4);
    });

    it('Given: zero amount When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SalePrice.create(0)).toThrow('Sale price must be positive');
    });

    it('Given: negative amount When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SalePrice.create(-10)).toThrow();
    });
  });

  describe('getValue', () => {
    it('Given: valid price When: getting value Then: should return Money object', () => {
      // Arrange
      const price = SalePrice.create(250);

      // Act
      const money = price.getValue();

      // Assert
      expect(money.getAmount()).toBe(250);
      expect(money.getCurrency()).toBe('COP');
    });
  });

  describe('getAmount', () => {
    it('Given: valid price When: getting amount Then: should return the numeric amount', () => {
      // Act
      const price = SalePrice.create(99.99, 'USD');

      // Assert
      expect(price.getAmount()).toBe(99.99);
    });
  });

  describe('getCurrency', () => {
    it('Given: valid price When: getting currency Then: should return the currency code', () => {
      // Act
      const price = SalePrice.create(100, 'EUR');

      // Assert
      expect(price.getCurrency()).toBe('EUR');
    });

    it('Given: price with default currency When: getting currency Then: should return COP', () => {
      // Act
      const price = SalePrice.create(100);

      // Assert
      expect(price.getCurrency()).toBe('COP');
    });
  });

  describe('getPrecision', () => {
    it('Given: price with default precision When: getting precision Then: should return 2', () => {
      // Act
      const price = SalePrice.create(100);

      // Assert
      expect(price.getPrecision()).toBe(2);
    });

    it('Given: price with custom precision When: getting precision Then: should return custom value', () => {
      // Act
      const price = SalePrice.create(100, 'COP', 4);

      // Assert
      expect(price.getPrecision()).toBe(4);
    });
  });

  describe('multiply', () => {
    it('Given: valid price When: multiplying by factor Then: should return new price with multiplied amount', () => {
      // Arrange
      const price = SalePrice.create(100);

      // Act
      const result = price.multiply(3);

      // Assert
      expect(result.getAmount()).toBe(300);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: valid price When: multiplying by fractional factor Then: should return correct amount', () => {
      // Arrange
      const price = SalePrice.create(200);

      // Act
      const result = price.multiply(0.5);

      // Assert
      expect(result.getAmount()).toBe(100);
    });
  });

  describe('equals', () => {
    it('Given: two prices with same amount and currency When: comparing Then: should be equal', () => {
      // Arrange
      const price1 = SalePrice.create(100, 'COP');
      const price2 = SalePrice.create(100, 'COP');

      // Act & Assert
      expect(price1.equals(price2)).toBe(true);
    });

    it('Given: two prices with different amounts When: comparing Then: should not be equal', () => {
      // Arrange
      const price1 = SalePrice.create(100, 'COP');
      const price2 = SalePrice.create(200, 'COP');

      // Act & Assert
      expect(price1.equals(price2)).toBe(false);
    });

    it('Given: two prices with different currencies When: comparing Then: should not be equal', () => {
      // Arrange
      const price1 = SalePrice.create(100, 'COP');
      const price2 = SalePrice.create(100, 'USD');

      // Act & Assert
      expect(price1.equals(price2)).toBe(false);
    });

    it('Given: price compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const price = SalePrice.create(100);

      // Act & Assert
      expect(price.equals(undefined)).toBe(false);
    });
  });
});
