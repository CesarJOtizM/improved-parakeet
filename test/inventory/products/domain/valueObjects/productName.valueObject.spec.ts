import { describe, expect, it } from '@jest/globals';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';

describe('ProductName Value Object', () => {
  describe('create', () => {
    it('Given: valid product name When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const productName = ProductName.create('Test Product');

      // Assert
      expect(productName).toBeInstanceOf(ProductName);
      expect(productName.getValue()).toBe('Test Product');
    });

    it('Given: product name with spaces When: creating product name Then: should trim spaces', () => {
      // Arrange & Act
      const productName = ProductName.create('  Test Product  ');

      // Assert
      expect(productName.getValue()).toBe('Test Product');
    });

    it('Given: empty product name When: creating product name Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => ProductName.create('')).toThrow('Product name cannot be empty');
      expect(() => ProductName.create('   ')).toThrow('Product name cannot be empty');
    });

    it('Given: product name shorter than 2 characters When: creating product name Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => ProductName.create('A')).toThrow(
        'Product name must be at least 2 characters long'
      );
    });

    it('Given: product name longer than 200 characters When: creating product name Then: should throw error', () => {
      // Arrange
      const longName = 'A'.repeat(201);

      // Act & Assert
      expect(() => ProductName.create(longName)).toThrow(
        'Product name must be at most 200 characters long'
      );
    });

    it('Given: product name with exactly 2 characters When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const productName = ProductName.create('AB');

      // Assert
      expect(productName.getValue()).toBe('AB');
    });

    it('Given: product name with exactly 200 characters When: creating product name Then: should create successfully', () => {
      // Arrange
      const name = 'A'.repeat(200);

      // Act
      const productName = ProductName.create(name);

      // Assert
      expect(productName.getValue()).toBe(name);
    });

    it('Given: product name with special characters When: creating product name Then: should create successfully', () => {
      // Arrange & Act
      const productName = ProductName.create('Product & Co. - Special Edition');

      // Assert
      expect(productName.getValue()).toBe('Product & Co. - Special Edition');
    });
  });

  describe('equals', () => {
    it('Given: two product names with same value When: comparing Then: should return true', () => {
      // Arrange
      const productName1 = ProductName.create('Test Product');
      const productName2 = ProductName.create('Test Product');

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(true);
    });

    it('Given: two product names with different values When: comparing Then: should return false', () => {
      // Arrange
      const productName1 = ProductName.create('Test Product 1');
      const productName2 = ProductName.create('Test Product 2');

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(false);
    });

    it('Given: product name and undefined When: comparing Then: should return false', () => {
      // Arrange
      const productName = ProductName.create('Test Product');

      // Act & Assert
      expect(productName.equals(undefined)).toBe(false);
    });

    it('Given: two product names with different case When: comparing Then: should return false (case sensitive)', () => {
      // Arrange
      const productName1 = ProductName.create('Test Product');
      const productName2 = ProductName.create('test product');

      // Act & Assert
      expect(productName1.equals(productName2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: product name When: converting to string Then: should return value', () => {
      // Arrange
      const productName = ProductName.create('Test Product');

      // Act & Assert
      expect(productName.toString()).toBe('Test Product');
    });
  });
});
