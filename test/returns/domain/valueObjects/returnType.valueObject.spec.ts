import { describe, expect, it } from '@jest/globals';
import { ReturnType } from '@return/domain/valueObjects/returnType.valueObject';

describe('ReturnType', () => {
  describe('create', () => {
    it('Given: RETURN_CUSTOMER value When: creating Then: should create successfully', () => {
      // Act
      const type = ReturnType.create('RETURN_CUSTOMER');

      // Assert
      expect(type.getValue()).toBe('RETURN_CUSTOMER');
    });

    it('Given: RETURN_SUPPLIER value When: creating Then: should create successfully', () => {
      // Act
      const type = ReturnType.create('RETURN_SUPPLIER');

      // Assert
      expect(type.getValue()).toBe('RETURN_SUPPLIER');
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => ReturnType.create('INVALID' as any)).toThrow('Invalid return type: INVALID');
    });
  });

  describe('isCustomerReturn', () => {
    it('Given: RETURN_CUSTOMER type When: checking isCustomerReturn Then: should return true', () => {
      // Arrange
      const type = ReturnType.create('RETURN_CUSTOMER');

      // Act & Assert
      expect(type.isCustomerReturn()).toBe(true);
    });

    it('Given: RETURN_SUPPLIER type When: checking isCustomerReturn Then: should return false', () => {
      // Arrange
      const type = ReturnType.create('RETURN_SUPPLIER');

      // Act & Assert
      expect(type.isCustomerReturn()).toBe(false);
    });
  });

  describe('isSupplierReturn', () => {
    it('Given: RETURN_SUPPLIER type When: checking isSupplierReturn Then: should return true', () => {
      // Arrange
      const type = ReturnType.create('RETURN_SUPPLIER');

      // Act & Assert
      expect(type.isSupplierReturn()).toBe(true);
    });

    it('Given: RETURN_CUSTOMER type When: checking isSupplierReturn Then: should return false', () => {
      // Arrange
      const type = ReturnType.create('RETURN_CUSTOMER');

      // Act & Assert
      expect(type.isSupplierReturn()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any type When: getting value Then: should return correct value', () => {
      // Act
      const customer = ReturnType.create('RETURN_CUSTOMER');
      const supplier = ReturnType.create('RETURN_SUPPLIER');

      // Assert
      expect(customer.getValue()).toBe('RETURN_CUSTOMER');
      expect(supplier.getValue()).toBe('RETURN_SUPPLIER');
    });
  });
});
