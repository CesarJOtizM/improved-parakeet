import { describe, expect, it } from '@jest/globals';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';

describe('Address', () => {
  describe('create', () => {
    it('Given: valid address string When: creating Then: should create successfully', () => {
      // Act
      const address = Address.create('123 Main Street, City');

      // Assert
      expect(address.getValue()).toBe('123 Main Street, City');
    });

    it('Given: address with leading/trailing whitespace When: creating Then: should trim', () => {
      // Act
      const address = Address.create('  123 Main Street  ');

      // Assert
      expect(address.getValue()).toBe('123 Main Street');
    });

    it('Given: empty string When: creating Then: should create successfully', () => {
      // Act — Address allows empty strings (optional field)
      const address = Address.create('');

      // Assert
      expect(address.getValue()).toBe('');
    });

    it('Given: address at 500 characters When: creating Then: should create successfully', () => {
      // Arrange
      const longAddress = 'A'.repeat(500);

      // Act
      const address = Address.create(longAddress);

      // Assert
      expect(address.getValue()).toBe(longAddress);
    });

    it('Given: address exceeding 500 characters When: creating Then: should throw error', () => {
      // Arrange
      const tooLongAddress = 'A'.repeat(501);

      // Act & Assert
      expect(() => Address.create(tooLongAddress)).toThrow(
        'Address must be at most 500 characters long'
      );
    });
  });

  describe('getValue', () => {
    it('Given: address When: getting value Then: should return the address string', () => {
      // Arrange
      const address = Address.create('456 Oak Avenue');

      // Act & Assert
      expect(address.getValue()).toBe('456 Oak Avenue');
    });
  });

  describe('toString', () => {
    it('Given: address When: calling toString Then: should return the address string', () => {
      // Arrange
      const address = Address.create('789 Pine Road');

      // Act & Assert
      expect(address.toString()).toBe('789 Pine Road');
    });
  });

  describe('equals', () => {
    it('Given: two addresses with same value When: comparing Then: should return true', () => {
      // Arrange
      const address1 = Address.create('123 Main Street');
      const address2 = Address.create('123 Main Street');

      // Act & Assert
      expect(address1.equals(address2)).toBe(true);
    });

    it('Given: two addresses with different values When: comparing Then: should return false', () => {
      // Arrange
      const address1 = Address.create('123 Main Street');
      const address2 = Address.create('456 Oak Avenue');

      // Act & Assert
      expect(address1.equals(address2)).toBe(false);
    });

    it('Given: address compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const address = Address.create('123 Main Street');

      // Act & Assert
      expect(address.equals(undefined)).toBe(false);
    });
  });
});
