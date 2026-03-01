import { describe, expect, it } from '@jest/globals';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('Quantity', () => {
  describe('create', () => {
    it('Given: valid positive value When: creating Then: should create successfully', () => {
      // Act
      const quantity = Quantity.create(10);

      // Assert
      expect(quantity.getNumericValue()).toBe(10);
      expect(quantity.getPrecision()).toBe(6);
    });

    it('Given: valid value with custom precision When: creating Then: should create successfully', () => {
      // Act
      const quantity = Quantity.create(10, 2);

      // Assert
      expect(quantity.getNumericValue()).toBe(10);
      expect(quantity.getPrecision()).toBe(2);
    });

    it('Given: zero value When: creating Then: should create successfully', () => {
      // Act
      const quantity = Quantity.create(0);

      // Assert
      expect(quantity.getNumericValue()).toBe(0);
      expect(quantity.isZero()).toBe(true);
    });

    it('Given: negative value When: creating Then: should create successfully', () => {
      // Act — Quantity allows negative values (unlike Money)
      const quantity = Quantity.create(-5);

      // Assert
      expect(quantity.getNumericValue()).toBe(-5);
    });

    it('Given: NaN value When: creating Then: should throw error due to frozen props', () => {
      // The base ValueObject freezes props before validate() can mutate them
      expect(() => Quantity.create(NaN)).toThrow();
    });

    it('Given: Infinity value When: creating Then: should throw error due to frozen props', () => {
      // The base ValueObject freezes props before validate() can mutate them
      expect(() => Quantity.create(Infinity)).toThrow();
    });

    it('Given: precision greater than 6 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Quantity.create(10, 7)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: negative precision When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Quantity.create(10, -1)).toThrow('Precision must be between 0 and 6');
    });
  });

  describe('add', () => {
    it('Given: two quantities When: adding Then: should return correct sum', () => {
      // Arrange
      const q1 = Quantity.create(10);
      const q2 = Quantity.create(5);

      // Act
      const result = q1.add(q2);

      // Assert
      expect(result.getNumericValue()).toBe(15);
    });
  });

  describe('subtract', () => {
    it('Given: larger quantity When: subtracting smaller Then: should return correct result', () => {
      // Arrange
      const q1 = Quantity.create(10);
      const q2 = Quantity.create(3);

      // Act
      const result = q1.subtract(q2);

      // Assert
      expect(result.getNumericValue()).toBe(7);
    });

    it('Given: smaller quantity When: subtracting larger Then: should throw error', () => {
      // Arrange
      const q1 = Quantity.create(3);
      const q2 = Quantity.create(10);

      // Act & Assert
      expect(() => q1.subtract(q2)).toThrow('Result cannot be negative');
    });

    it('Given: equal quantities When: subtracting Then: should return zero', () => {
      // Arrange
      const q1 = Quantity.create(10);
      const q2 = Quantity.create(10);

      // Act
      const result = q1.subtract(q2);

      // Assert
      expect(result.getNumericValue()).toBe(0);
      expect(result.isZero()).toBe(true);
    });
  });

  describe('multiply', () => {
    it('Given: quantity and factor When: multiplying Then: should return correct result', () => {
      // Arrange
      const quantity = Quantity.create(10);

      // Act
      const result = quantity.multiply(3);

      // Assert
      expect(result.getNumericValue()).toBe(30);
    });

    it('Given: quantity and zero factor When: multiplying Then: should return zero', () => {
      // Arrange
      const quantity = Quantity.create(10);

      // Act
      const result = quantity.multiply(0);

      // Assert
      expect(result.getNumericValue()).toBe(0);
      expect(result.isZero()).toBe(true);
    });
  });

  describe('divide', () => {
    it('Given: quantity and divisor When: dividing Then: should return correct result', () => {
      // Arrange
      const quantity = Quantity.create(100);

      // Act
      const result = quantity.divide(4);

      // Assert
      expect(result.getNumericValue()).toBe(25);
    });

    it('Given: quantity and zero divisor When: dividing Then: should throw error', () => {
      // Arrange
      const quantity = Quantity.create(100);

      // Act & Assert
      expect(() => quantity.divide(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('isZero', () => {
    it('Given: zero quantity When: checking isZero Then: should return true', () => {
      // Arrange
      const quantity = Quantity.create(0);

      // Act & Assert
      expect(quantity.isZero()).toBe(true);
    });

    it('Given: positive quantity When: checking isZero Then: should return false', () => {
      // Arrange
      const quantity = Quantity.create(10);

      // Act & Assert
      expect(quantity.isZero()).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('Given: positive quantity When: checking isPositive Then: should return true', () => {
      // Arrange
      const quantity = Quantity.create(10);

      // Act & Assert
      expect(quantity.isPositive()).toBe(true);
    });

    it('Given: zero quantity When: checking isPositive Then: should return false', () => {
      // Arrange
      const quantity = Quantity.create(0);

      // Act & Assert
      expect(quantity.isPositive()).toBe(false);
    });
  });

  describe('toFixed', () => {
    it('Given: quantity with default precision When: calling toFixed Then: should return formatted string', () => {
      // Arrange
      const quantity = Quantity.create(10.5);

      // Act & Assert
      expect(quantity.toFixed()).toBe('10.500000');
    });

    it('Given: quantity with precision 2 When: calling toFixed Then: should return formatted string', () => {
      // Arrange
      const quantity = Quantity.create(10.5, 2);

      // Act & Assert
      expect(quantity.toFixed()).toBe('10.50');
    });
  });
});
