import { describe, expect, it } from '@jest/globals';
import { ReturnNumber } from '@return/domain/valueObjects/returnNumber.valueObject';

describe('ReturnNumber', () => {
  describe('create', () => {
    it('Given: valid year and sequence When: creating Then: should create formatted number', () => {
      // Act
      const returnNumber = ReturnNumber.create(2026, 1);

      // Assert
      expect(returnNumber.getValue()).toBe('RETURN-2026-001');
    });

    it('Given: large sequence When: creating Then: should pad correctly', () => {
      // Act
      const returnNumber = ReturnNumber.create(2026, 123);

      // Assert
      expect(returnNumber.getValue()).toBe('RETURN-2026-123');
    });

    it('Given: sequence exceeding 3 digits When: creating Then: should not pad', () => {
      // Act
      const returnNumber = ReturnNumber.create(2026, 1234);

      // Assert
      expect(returnNumber.getValue()).toBe('RETURN-2026-1234');
    });

    it('Given: year below 2000 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.create(1999, 1)).toThrow('Year must be between 2000 and 9999');
    });

    it('Given: year above 9999 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.create(10000, 1)).toThrow('Year must be between 2000 and 9999');
    });

    it('Given: sequence below 1 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.create(2026, 0)).toThrow('Sequence must be between 1 and 999999');
    });

    it('Given: sequence above 999999 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.create(2026, 1000000)).toThrow(
        'Sequence must be between 1 and 999999'
      );
    });
  });

  describe('fromString', () => {
    it('Given: valid string When: creating from string Then: should create successfully', () => {
      // Act
      const returnNumber = ReturnNumber.fromString('RETURN-2026-042');

      // Assert
      expect(returnNumber.getValue()).toBe('RETURN-2026-042');
    });

    it('Given: empty string When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.fromString('')).toThrow('Return number cannot be empty');
    });

    it('Given: invalid format When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.fromString('INVALID-FORMAT')).toThrow(
        'Return number must match format RETURN-YYYY-NNN'
      );
    });

    it('Given: wrong prefix When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => ReturnNumber.fromString('SALE-2026-001')).toThrow(
        'Return number must match format RETURN-YYYY-NNN'
      );
    });
  });

  describe('getYear', () => {
    it('Given: return number When: getting year Then: should return correct year', () => {
      // Arrange
      const returnNumber = ReturnNumber.create(2026, 5);

      // Act & Assert
      expect(returnNumber.getYear()).toBe(2026);
    });
  });

  describe('getSequence', () => {
    it('Given: return number When: getting sequence Then: should return correct sequence', () => {
      // Arrange
      const returnNumber = ReturnNumber.create(2026, 42);

      // Act & Assert
      expect(returnNumber.getSequence()).toBe(42);
    });
  });

  describe('toString', () => {
    it('Given: return number When: converting to string Then: should return formatted value', () => {
      // Arrange
      const returnNumber = ReturnNumber.create(2026, 7);

      // Act & Assert
      expect(returnNumber.toString()).toBe('RETURN-2026-007');
    });
  });

  describe('equals', () => {
    it('Given: two return numbers with same value When: comparing Then: should be equal', () => {
      // Arrange
      const rn1 = ReturnNumber.create(2026, 1);
      const rn2 = ReturnNumber.create(2026, 1);

      // Act & Assert
      expect(rn1.equals(rn2)).toBe(true);
    });

    it('Given: two return numbers with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const rn1 = ReturnNumber.create(2026, 1);
      const rn2 = ReturnNumber.create(2026, 2);

      // Act & Assert
      expect(rn1.equals(rn2)).toBe(false);
    });

    it('Given: return number compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const rn1 = ReturnNumber.create(2026, 1);

      // Act & Assert
      expect(rn1.equals(undefined)).toBe(false);
    });
  });
});
