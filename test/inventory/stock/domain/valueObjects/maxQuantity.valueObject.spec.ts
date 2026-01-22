import { MaxQuantity } from '@inventory/stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@inventory/stock/domain/valueObjects/minQuantity.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('MaxQuantity Value Object', () => {
  describe('create', () => {
    it('Given: valid value When: creating Then: should set defaults', () => {
      // Arrange
      const value = 10;

      // Act
      const maxQuantity = MaxQuantity.create(value);

      // Assert
      expect(maxQuantity.getNumericValue()).toBe(value);
      expect(maxQuantity.getPrecision()).toBe(6);
    });

    it('Given: negative value When: creating Then: should throw error', () => {
      // Arrange
      const value = -1;

      // Act & Assert
      expect(() => MaxQuantity.create(value)).toThrow('MaxQuantity cannot be negative');
    });

    it('Given: invalid precision When: creating Then: should throw error', () => {
      // Arrange
      const precision = 7;

      // Act & Assert
      expect(() => MaxQuantity.create(10, precision)).toThrow('Precision must be between 0 and 6');
    });
  });

  describe('createWithMin', () => {
    it('Given: value greater than min When: creating Then: should return max quantity', () => {
      // Arrange
      const minQuantity = MinQuantity.create(5, 2);

      // Act
      const maxQuantity = MaxQuantity.createWithMin(10, minQuantity, 2);

      // Assert
      expect(maxQuantity.getNumericValue()).toBe(10);
      expect(maxQuantity.getPrecision()).toBe(2);
    });

    it('Given: value less than min When: creating Then: should throw error', () => {
      // Arrange
      const minQuantity = MinQuantity.create(5, 2);

      // Act & Assert
      expect(() => MaxQuantity.createWithMin(5, minQuantity, 2)).toThrow(
        'MaxQuantity must be greater than MinQuantity'
      );
    });
  });

  describe('comparisons', () => {
    it('Given: values When: comparing Then: should return expected flags', () => {
      // Arrange
      const maxQuantity = MaxQuantity.create(10, 2);

      // Act & Assert
      expect(maxQuantity.isGreaterThan(9)).toBe(true);
      expect(maxQuantity.isLessThan(11)).toBe(true);
    });

    it('Given: min quantity When: comparing Then: should return true when greater', () => {
      // Arrange
      const minQuantity = MinQuantity.create(5, 2);
      const maxQuantity = MaxQuantity.create(10, 2);

      // Act
      const result = maxQuantity.isGreaterThanMin(minQuantity);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: same values When: checking equality Then: should return true', () => {
      // Arrange
      const first = MaxQuantity.create(10, 2);
      const second = MaxQuantity.create(10, 2);

      // Act
      const result = first.equals(second);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('formatting', () => {
    it('Given: precision When: formatting Then: should return fixed string', () => {
      // Arrange
      const maxQuantity = MaxQuantity.create(12.3456, 3);

      // Act
      const fixed = maxQuantity.toFixed();

      // Assert
      expect(fixed).toBe('12.346');
    });
  });
});
