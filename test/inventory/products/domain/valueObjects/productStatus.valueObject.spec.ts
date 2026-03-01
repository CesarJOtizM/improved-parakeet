import { describe, expect, it } from '@jest/globals';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';

describe('ProductStatus', () => {
  describe('create', () => {
    it('Given: ACTIVE value When: creating Then: should create successfully', () => {
      // Act
      const status = ProductStatus.create('ACTIVE');

      // Assert
      expect(status.getValue()).toBe('ACTIVE');
      expect(status.isActive()).toBe(true);
      expect(status.isInactive()).toBe(false);
      expect(status.isDiscontinued()).toBe(false);
    });

    it('Given: INACTIVE value When: creating Then: should create successfully', () => {
      // Act
      const status = ProductStatus.create('INACTIVE');

      // Assert
      expect(status.getValue()).toBe('INACTIVE');
      expect(status.isInactive()).toBe(true);
      expect(status.isActive()).toBe(false);
      expect(status.isDiscontinued()).toBe(false);
    });

    it('Given: DISCONTINUED value When: creating Then: should create successfully', () => {
      // Act
      const status = ProductStatus.create('DISCONTINUED');

      // Assert
      expect(status.getValue()).toBe('DISCONTINUED');
      expect(status.isDiscontinued()).toBe(true);
      expect(status.isActive()).toBe(false);
      expect(status.isInactive()).toBe(false);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => ProductStatus.create('ARCHIVED' as any)).toThrow(
        'Invalid product status: ARCHIVED'
      );
    });

    it('Given: empty string When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => ProductStatus.create('' as any)).toThrow('Invalid product status: ');
    });
  });

  describe('isActive', () => {
    it('Given: ACTIVE status When: checking isActive Then: should return true', () => {
      // Arrange
      const status = ProductStatus.create('ACTIVE');

      // Act & Assert
      expect(status.isActive()).toBe(true);
    });

    it('Given: INACTIVE status When: checking isActive Then: should return false', () => {
      // Arrange
      const status = ProductStatus.create('INACTIVE');

      // Act & Assert
      expect(status.isActive()).toBe(false);
    });
  });

  describe('isInactive', () => {
    it('Given: INACTIVE status When: checking isInactive Then: should return true', () => {
      // Arrange
      const status = ProductStatus.create('INACTIVE');

      // Act & Assert
      expect(status.isInactive()).toBe(true);
    });

    it('Given: ACTIVE status When: checking isInactive Then: should return false', () => {
      // Arrange
      const status = ProductStatus.create('ACTIVE');

      // Act & Assert
      expect(status.isInactive()).toBe(false);
    });
  });

  describe('isDiscontinued', () => {
    it('Given: DISCONTINUED status When: checking isDiscontinued Then: should return true', () => {
      // Arrange
      const status = ProductStatus.create('DISCONTINUED');

      // Act & Assert
      expect(status.isDiscontinued()).toBe(true);
    });

    it('Given: ACTIVE status When: checking isDiscontinued Then: should return false', () => {
      // Arrange
      const status = ProductStatus.create('ACTIVE');

      // Act & Assert
      expect(status.isDiscontinued()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any product status When: getting value Then: should return correct value', () => {
      // Act
      const active = ProductStatus.create('ACTIVE');
      const inactive = ProductStatus.create('INACTIVE');
      const discontinued = ProductStatus.create('DISCONTINUED');

      // Assert
      expect(active.getValue()).toBe('ACTIVE');
      expect(inactive.getValue()).toBe('INACTIVE');
      expect(discontinued.getValue()).toBe('DISCONTINUED');
    });
  });
});
