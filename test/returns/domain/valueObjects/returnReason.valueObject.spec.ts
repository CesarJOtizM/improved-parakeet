import { describe, expect, it } from '@jest/globals';
import { ReturnReason } from '@return/domain/valueObjects/returnReason.valueObject';

describe('ReturnReason', () => {
  describe('create', () => {
    it('Given: valid reason string When: creating Then: should create successfully', () => {
      // Act
      const reason = ReturnReason.create('Defective product');

      // Assert
      expect(reason.getValue()).toBe('Defective product');
    });

    it('Given: null value When: creating Then: should create with null', () => {
      // Act
      const reason = ReturnReason.create(null);

      // Assert
      expect(reason.getValue()).toBeNull();
    });

    it('Given: undefined value When: creating Then: should create with null', () => {
      // Act
      const reason = ReturnReason.create(undefined);

      // Assert
      expect(reason.getValue()).toBeNull();
    });

    it('Given: empty string When: creating Then: should create with null', () => {
      // Act
      const reason = ReturnReason.create('');

      // Assert
      expect(reason.getValue()).toBeNull();
    });

    it('Given: reason exceeding 500 characters When: creating Then: should throw error', () => {
      // Arrange
      const longReason = 'A'.repeat(501);

      // Act & Assert
      expect(() => ReturnReason.create(longReason)).toThrow(
        'Return reason cannot exceed 500 characters'
      );
    });

    it('Given: reason exactly 500 characters When: creating Then: should create successfully', () => {
      // Arrange
      const exactReason = 'A'.repeat(500);

      // Act
      const reason = ReturnReason.create(exactReason);

      // Assert
      expect(reason.getValue()).toBe(exactReason);
    });
  });

  describe('hasValue', () => {
    it('Given: reason with value When: checking hasValue Then: should return true', () => {
      // Arrange
      const reason = ReturnReason.create('Wrong item shipped');

      // Act & Assert
      expect(reason.hasValue()).toBe(true);
    });

    it('Given: reason with null When: checking hasValue Then: should return false', () => {
      // Arrange
      const reason = ReturnReason.create(null);

      // Act & Assert
      expect(reason.hasValue()).toBe(false);
    });

    it('Given: reason from undefined When: checking hasValue Then: should return false', () => {
      // Arrange
      const reason = ReturnReason.create(undefined);

      // Act & Assert
      expect(reason.hasValue()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: reason with value When: getting value Then: should return the reason string', () => {
      // Act
      const reason = ReturnReason.create('Damaged in transit');

      // Assert
      expect(reason.getValue()).toBe('Damaged in transit');
    });

    it('Given: null reason When: getting value Then: should return null', () => {
      // Act
      const reason = ReturnReason.create(null);

      // Assert
      expect(reason.getValue()).toBeNull();
    });
  });

  describe('equals', () => {
    it('Given: two reasons with same value When: comparing Then: should be equal', () => {
      // Arrange
      const reason1 = ReturnReason.create('Defective');
      const reason2 = ReturnReason.create('Defective');

      // Act & Assert
      expect(reason1.equals(reason2)).toBe(true);
    });

    it('Given: two reasons with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const reason1 = ReturnReason.create('Defective');
      const reason2 = ReturnReason.create('Wrong item');

      // Act & Assert
      expect(reason1.equals(reason2)).toBe(false);
    });

    it('Given: two null reasons When: comparing Then: should be equal', () => {
      // Arrange
      const reason1 = ReturnReason.create(null);
      const reason2 = ReturnReason.create(null);

      // Act & Assert
      expect(reason1.equals(reason2)).toBe(true);
    });

    it('Given: reason compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const reason = ReturnReason.create('Defective');

      // Act & Assert
      expect(reason.equals(undefined)).toBe(false);
    });
  });
});
