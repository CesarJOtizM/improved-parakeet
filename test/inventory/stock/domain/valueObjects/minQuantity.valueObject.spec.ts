import { describe, expect, it } from '@jest/globals';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';

describe('MinQuantity', () => {
  describe('create', () => {
    it('Given: valid value and precision When: creating MinQuantity Then: should create successfully', () => {
      // Act
      const minQuantity = MinQuantity.create(10, 2);

      // Assert
      expect(minQuantity.getNumericValue()).toBe(10);
      expect(minQuantity.getPrecision()).toBe(2);
    });

    it('Given: value only When: creating MinQuantity Then: should use default precision of 6', () => {
      // Act
      const minQuantity = MinQuantity.create(10);

      // Assert
      expect(minQuantity.getNumericValue()).toBe(10);
      expect(minQuantity.getPrecision()).toBe(6);
    });

    it('Given: zero value When: creating MinQuantity Then: should create successfully', () => {
      // Act
      const minQuantity = MinQuantity.create(0, 2);

      // Assert
      expect(minQuantity.getNumericValue()).toBe(0);
    });

    it('Given: negative value When: creating MinQuantity Then: should throw error', () => {
      // Act & Assert
      expect(() => MinQuantity.create(-5, 2)).toThrow('MinQuantity cannot be negative');
    });

    it('Given: negative precision When: creating MinQuantity Then: should throw error', () => {
      // Act & Assert
      expect(() => MinQuantity.create(10, -1)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: precision greater than 6 When: creating MinQuantity Then: should throw error', () => {
      // Act & Assert
      expect(() => MinQuantity.create(10, 7)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: precision of 0 When: creating MinQuantity Then: should create successfully', () => {
      // Act
      const minQuantity = MinQuantity.create(10, 0);

      // Assert
      expect(minQuantity.getPrecision()).toBe(0);
    });

    it('Given: precision of 6 When: creating MinQuantity Then: should create successfully', () => {
      // Act
      const minQuantity = MinQuantity.create(10, 6);

      // Assert
      expect(minQuantity.getPrecision()).toBe(6);
    });
  });

  describe('getNumericValue', () => {
    it('Given: MinQuantity with specific value When: getting numeric value Then: should return value', () => {
      // Arrange
      const minQuantity = MinQuantity.create(25.5, 2);

      // Act
      const value = minQuantity.getNumericValue();

      // Assert
      expect(value).toBe(25.5);
    });
  });

  describe('getPrecision', () => {
    it('Given: MinQuantity with specific precision When: getting precision Then: should return precision', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 4);

      // Act
      const precision = minQuantity.getPrecision();

      // Assert
      expect(precision).toBe(4);
    });
  });

  describe('toFixed', () => {
    it('Given: MinQuantity with precision 2 When: converting to fixed Then: should return formatted string', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10.5, 2);

      // Act
      const result = minQuantity.toFixed();

      // Assert
      expect(result).toBe('10.50');
    });

    it('Given: MinQuantity with precision 0 When: converting to fixed Then: should return integer string', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 0);

      // Act
      const result = minQuantity.toFixed();

      // Assert
      expect(result).toBe('10');
    });

    it('Given: MinQuantity with precision 4 When: converting to fixed Then: should return 4 decimal places', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10.12, 4);

      // Act
      const result = minQuantity.toFixed();

      // Assert
      expect(result).toBe('10.1200');
    });
  });

  describe('isGreaterThan', () => {
    it('Given: MinQuantity of 10 When: comparing with 5 Then: should return true', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isGreaterThan(5);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: MinQuantity of 10 When: comparing with 15 Then: should return false', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isGreaterThan(15);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: MinQuantity of 10 When: comparing with 10 Then: should return false', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isGreaterThan(10);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isLessThan', () => {
    it('Given: MinQuantity of 10 When: comparing with 15 Then: should return true', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isLessThan(15);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: MinQuantity of 10 When: comparing with 5 Then: should return false', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isLessThan(5);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: MinQuantity of 10 When: comparing with 10 Then: should return false', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity.isLessThan(10);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('Given: two MinQuantities with same value and precision When: comparing Then: should return true', () => {
      // Arrange
      const minQuantity1 = MinQuantity.create(10, 2);
      const minQuantity2 = MinQuantity.create(10, 2);

      // Act
      const result = minQuantity1.equals(minQuantity2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two MinQuantities with different values When: comparing Then: should return false', () => {
      // Arrange
      const minQuantity1 = MinQuantity.create(10, 2);
      const minQuantity2 = MinQuantity.create(20, 2);

      // Act
      const result = minQuantity1.equals(minQuantity2);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: two MinQuantities with different precisions When: comparing Then: should return false', () => {
      // Arrange
      const minQuantity1 = MinQuantity.create(10, 2);
      const minQuantity2 = MinQuantity.create(10, 4);

      // Act
      const result = minQuantity1.equals(minQuantity2);

      // Assert
      expect(result).toBe(false);
    });
  });
});
