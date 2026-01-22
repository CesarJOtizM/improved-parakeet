import { describe, expect, it } from '@jest/globals';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('SafetyStock', () => {
  describe('create', () => {
    it('Given: valid value and precision When: creating SafetyStock Then: should create successfully', () => {
      // Act
      const safetyStock = SafetyStock.create(5, 2);

      // Assert
      expect(safetyStock.getNumericValue()).toBe(5);
      expect(safetyStock.getPrecision()).toBe(2);
    });

    it('Given: value only When: creating SafetyStock Then: should use default precision of 6', () => {
      // Act
      const safetyStock = SafetyStock.create(5);

      // Assert
      expect(safetyStock.getNumericValue()).toBe(5);
      expect(safetyStock.getPrecision()).toBe(6);
    });

    it('Given: zero value When: creating SafetyStock Then: should create successfully', () => {
      // Act
      const safetyStock = SafetyStock.create(0, 2);

      // Assert
      expect(safetyStock.getNumericValue()).toBe(0);
    });

    it('Given: negative value When: creating SafetyStock Then: should throw error', () => {
      // Act & Assert
      expect(() => SafetyStock.create(-5, 2)).toThrow('SafetyStock cannot be negative');
    });

    it('Given: negative precision When: creating SafetyStock Then: should throw error', () => {
      // Act & Assert
      expect(() => SafetyStock.create(5, -1)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: precision greater than 6 When: creating SafetyStock Then: should throw error', () => {
      // Act & Assert
      expect(() => SafetyStock.create(5, 7)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: precision of 0 When: creating SafetyStock Then: should create successfully', () => {
      // Act
      const safetyStock = SafetyStock.create(5, 0);

      // Assert
      expect(safetyStock.getPrecision()).toBe(0);
    });

    it('Given: precision of 6 When: creating SafetyStock Then: should create successfully', () => {
      // Act
      const safetyStock = SafetyStock.create(5, 6);

      // Assert
      expect(safetyStock.getPrecision()).toBe(6);
    });
  });

  describe('createWithMin', () => {
    it('Given: safetyStock less than minQuantity When: creating with min Then: should create successfully', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const safetyStock = SafetyStock.createWithMin(5, minQuantity, 2);

      // Assert
      expect(safetyStock.getNumericValue()).toBe(5);
    });

    it('Given: safetyStock equal to minQuantity When: creating with min Then: should create successfully', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act
      const safetyStock = SafetyStock.createWithMin(10, minQuantity, 2);

      // Assert
      expect(safetyStock.getNumericValue()).toBe(10);
    });

    it('Given: safetyStock greater than minQuantity When: creating with min Then: should throw error', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 2);

      // Act & Assert
      expect(() => SafetyStock.createWithMin(15, minQuantity, 2)).toThrow(
        'SafetyStock should typically be less than or equal to MinQuantity'
      );
    });

    it('Given: value only with minQuantity When: creating with min Then: should use default precision of 6', () => {
      // Arrange
      const minQuantity = MinQuantity.create(10, 6);

      // Act
      const safetyStock = SafetyStock.createWithMin(5, minQuantity);

      // Assert
      expect(safetyStock.getPrecision()).toBe(6);
    });
  });

  describe('getNumericValue', () => {
    it('Given: SafetyStock with specific value When: getting numeric value Then: should return value', () => {
      // Arrange
      const safetyStock = SafetyStock.create(7.5, 2);

      // Act
      const value = safetyStock.getNumericValue();

      // Assert
      expect(value).toBe(7.5);
    });
  });

  describe('getPrecision', () => {
    it('Given: SafetyStock with specific precision When: getting precision Then: should return precision', () => {
      // Arrange
      const safetyStock = SafetyStock.create(5, 4);

      // Act
      const precision = safetyStock.getPrecision();

      // Assert
      expect(precision).toBe(4);
    });
  });

  describe('toFixed', () => {
    it('Given: SafetyStock with precision 2 When: converting to fixed Then: should return formatted string', () => {
      // Arrange
      const safetyStock = SafetyStock.create(5.5, 2);

      // Act
      const result = safetyStock.toFixed();

      // Assert
      expect(result).toBe('5.50');
    });

    it('Given: SafetyStock with precision 0 When: converting to fixed Then: should return integer string', () => {
      // Arrange
      const safetyStock = SafetyStock.create(5, 0);

      // Act
      const result = safetyStock.toFixed();

      // Assert
      expect(result).toBe('5');
    });

    it('Given: SafetyStock with precision 4 When: converting to fixed Then: should return 4 decimal places', () => {
      // Arrange
      const safetyStock = SafetyStock.create(5.12, 4);

      // Act
      const result = safetyStock.toFixed();

      // Assert
      expect(result).toBe('5.1200');
    });
  });

  describe('isGreaterThan', () => {
    it('Given: SafetyStock of 10 When: comparing with 5 Then: should return true', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isGreaterThan(5);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: SafetyStock of 10 When: comparing with 15 Then: should return false', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isGreaterThan(15);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: SafetyStock of 10 When: comparing with 10 Then: should return false', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isGreaterThan(10);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isLessThan', () => {
    it('Given: SafetyStock of 10 When: comparing with 15 Then: should return true', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isLessThan(15);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: SafetyStock of 10 When: comparing with 5 Then: should return false', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isLessThan(5);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: SafetyStock of 10 When: comparing with 10 Then: should return false', () => {
      // Arrange
      const safetyStock = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock.isLessThan(10);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('Given: two SafetyStocks with same value and precision When: comparing Then: should return true', () => {
      // Arrange
      const safetyStock1 = SafetyStock.create(5, 2);
      const safetyStock2 = SafetyStock.create(5, 2);

      // Act
      const result = safetyStock1.equals(safetyStock2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two SafetyStocks with different values When: comparing Then: should return false', () => {
      // Arrange
      const safetyStock1 = SafetyStock.create(5, 2);
      const safetyStock2 = SafetyStock.create(10, 2);

      // Act
      const result = safetyStock1.equals(safetyStock2);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: two SafetyStocks with different precisions When: comparing Then: should return false', () => {
      // Arrange
      const safetyStock1 = SafetyStock.create(5, 2);
      const safetyStock2 = SafetyStock.create(5, 4);

      // Act
      const result = safetyStock1.equals(safetyStock2);

      // Assert
      expect(result).toBe(false);
    });
  });
});
