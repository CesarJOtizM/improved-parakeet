import { describe, expect, it } from '@jest/globals';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';

describe('SaleNumber', () => {
  describe('create', () => {
    it('Given: valid year and sequence When: creating Then: should create formatted number', () => {
      // Act
      const saleNumber = SaleNumber.create(2026, 1);

      // Assert
      expect(saleNumber.getValue()).toBe('SALE-2026-001');
    });

    it('Given: large sequence When: creating Then: should pad correctly', () => {
      // Act
      const saleNumber = SaleNumber.create(2026, 123);

      // Assert
      expect(saleNumber.getValue()).toBe('SALE-2026-123');
    });

    it('Given: sequence exceeding 3 digits When: creating Then: should not pad', () => {
      // Act
      const saleNumber = SaleNumber.create(2026, 1234);

      // Assert
      expect(saleNumber.getValue()).toBe('SALE-2026-1234');
    });

    it('Given: year below 2000 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.create(1999, 1)).toThrow('Year must be between 2000 and 9999');
    });

    it('Given: year above 9999 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.create(10000, 1)).toThrow('Year must be between 2000 and 9999');
    });

    it('Given: sequence below 1 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.create(2026, 0)).toThrow('Sequence must be between 1 and 999999');
    });

    it('Given: sequence above 999999 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.create(2026, 1000000)).toThrow(
        'Sequence must be between 1 and 999999'
      );
    });
  });

  describe('fromString', () => {
    it('Given: valid string When: creating from string Then: should create successfully', () => {
      // Act
      const saleNumber = SaleNumber.fromString('SALE-2026-042');

      // Assert
      expect(saleNumber.getValue()).toBe('SALE-2026-042');
    });

    it('Given: empty string When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.fromString('')).toThrow('Sale number cannot be empty');
    });

    it('Given: invalid format When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.fromString('INVALID-FORMAT')).toThrow(
        'Sale number must match format SALE-YYYY-NNN'
      );
    });

    it('Given: wrong prefix When: creating from string Then: should throw error', () => {
      // Act & Assert
      expect(() => SaleNumber.fromString('RETURN-2026-001')).toThrow(
        'Sale number must match format SALE-YYYY-NNN'
      );
    });
  });

  describe('getYear', () => {
    it('Given: sale number When: getting year Then: should return correct year', () => {
      // Arrange
      const saleNumber = SaleNumber.create(2026, 5);

      // Act & Assert
      expect(saleNumber.getYear()).toBe(2026);
    });
  });

  describe('getSequence', () => {
    it('Given: sale number When: getting sequence Then: should return correct sequence', () => {
      // Arrange
      const saleNumber = SaleNumber.create(2026, 42);

      // Act & Assert
      expect(saleNumber.getSequence()).toBe(42);
    });
  });

  describe('toString', () => {
    it('Given: sale number When: converting to string Then: should return formatted value', () => {
      // Arrange
      const saleNumber = SaleNumber.create(2026, 7);

      // Act & Assert
      expect(saleNumber.toString()).toBe('SALE-2026-007');
    });
  });

  describe('equals', () => {
    it('Given: two sale numbers with same value When: comparing Then: should be equal', () => {
      // Arrange
      const sn1 = SaleNumber.create(2026, 1);
      const sn2 = SaleNumber.create(2026, 1);

      // Act & Assert
      expect(sn1.equals(sn2)).toBe(true);
    });

    it('Given: two sale numbers with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const sn1 = SaleNumber.create(2026, 1);
      const sn2 = SaleNumber.create(2026, 2);

      // Act & Assert
      expect(sn1.equals(sn2)).toBe(false);
    });

    it('Given: sale number compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const sn1 = SaleNumber.create(2026, 1);

      // Act & Assert
      expect(sn1.equals(undefined)).toBe(false);
    });
  });
});
