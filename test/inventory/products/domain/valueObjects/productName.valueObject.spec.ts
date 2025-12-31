import { describe, expect, it } from '@jest/globals';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';

describe('ProductName Value Object', () => {
  describe('create', () => {
    it('Given: valid product name When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const result = ProductName.create('Test Product');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const productName = result.unwrap();
        expect(productName).toBeInstanceOf(ProductName);
        expect(productName.getValue()).toBe('Test Product');
      }
    });

    it('Given: product name with spaces When: creating product name Then: should trim spaces', () => {
      // Arrange & Act
      const result = ProductName.create('  Test Product  ');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('Test Product');
      }
    });

    it('Given: empty product name When: creating product name Then: should return error', () => {
      // Arrange & Act
      const result1 = ProductName.create('');
      const result2 = ProductName.create('   ');

      // Assert
      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.unwrapErr().message).toContain('Product name cannot be empty');
      }
    });

    it('Given: product name shorter than 2 characters When: creating product name Then: should return error', () => {
      // Arrange & Act
      const result = ProductName.create('A');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain(
          'Product name must be at least 2 characters long'
        );
      }
    });

    it('Given: product name longer than 200 characters When: creating product name Then: should return error', () => {
      // Arrange
      const longName = 'A'.repeat(201);

      // Act
      const result = ProductName.create(longName);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain(
          'Product name must be at most 200 characters long'
        );
      }
    });

    it('Given: product name with exactly 2 characters When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const result = ProductName.create('AB');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('AB');
      }
    });

    it('Given: product name with exactly 200 characters When: creating product name Then: should create successfully', () => {
      // Arrange
      const name = 'A'.repeat(200);

      // Act
      const result = ProductName.create(name);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe(name);
      }
    });

    it('Given: product name with special characters When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const result = ProductName.create('Product & Co. - Special Edition');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('Product & Co. - Special Edition');
      }
    });
  });

  describe('equals', () => {
    it('Given: two product names with same value When: comparing Then: should return true', () => {
      // Arrange
      const result1 = ProductName.create('Test Product');
      const result2 = ProductName.create('Test Product');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create ProductName in test');
      }
      const productName1 = result1.unwrap();
      const productName2 = result2.unwrap();

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(true);
    });

    it('Given: two product names with different values When: comparing Then: should return false', () => {
      // Arrange
      const result1 = ProductName.create('Test Product 1');
      const result2 = ProductName.create('Test Product 2');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create ProductName in test');
      }
      const productName1 = result1.unwrap();
      const productName2 = result2.unwrap();

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(false);
    });

    it('Given: product name and undefined When: comparing Then: should return false', () => {
      // Arrange
      const result = ProductName.create('Test Product');
      if (result.isErr()) {
        throw new Error('Failed to create ProductName in test');
      }
      const productName = result.unwrap();

      // Act & Assert
      expect(productName.equals(undefined)).toBe(false);
    });

    it('Given: two product names with different case When: comparing Then: should return false (case sensitive)', () => {
      // Arrange
      const result1 = ProductName.create('Test Product');
      const result2 = ProductName.create('test product');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create ProductName in test');
      }
      const productName1 = result1.unwrap();
      const productName2 = result2.unwrap();

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: product name When: converting to string Then: should return value', () => {
      // Arrange
      const result = ProductName.create('Test Product');
      if (result.isErr()) {
        throw new Error('Failed to create ProductName in test');
      }
      const productName = result.unwrap();

      // Act & Assert
      expect(productName.toString()).toBe('Test Product');
    });
  });
});
