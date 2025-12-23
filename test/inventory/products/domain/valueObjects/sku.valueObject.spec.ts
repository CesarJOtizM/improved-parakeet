import { describe, expect, it } from '@jest/globals';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';

describe('SKU Value Object', () => {
  describe('create', () => {
    it('Given: valid SKU When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const sku = SKU.create('PROD-001');

      // Assert
      expect(sku).toBeInstanceOf(SKU);
      expect(sku.getValue()).toBe('PROD-001');
    });

    it('Given: SKU with spaces When: creating SKU Then: should trim spaces', () => {
      // Arrange & Act
      const sku = SKU.create('  PROD-001  ');

      // Assert
      expect(sku.getValue()).toBe('PROD-001');
    });

    it('Given: empty SKU When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('')).toThrow('SKU cannot be empty');
      expect(() => SKU.create('   ')).toThrow('SKU cannot be empty');
    });

    it('Given: SKU shorter than 3 characters When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('AB')).toThrow('SKU must be at least 3 characters long');
      expect(() => SKU.create('A')).toThrow('SKU must be at least 3 characters long');
    });

    it('Given: SKU longer than 50 characters When: creating SKU Then: should throw error', () => {
      // Arrange
      const longSku = 'A'.repeat(51);

      // Act & Assert
      expect(() => SKU.create(longSku)).toThrow('SKU must be at most 50 characters long');
    });

    it('Given: SKU with invalid characters When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('PROD@001')).toThrow(
        'SKU can only contain letters, numbers, underscores, and hyphens'
      );
      expect(() => SKU.create('PROD.001')).toThrow(
        'SKU can only contain letters, numbers, underscores, and hyphens'
      );
      expect(() => SKU.create('PROD 001')).toThrow(
        'SKU can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: SKU starting with underscore When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('_PROD001')).toThrow('SKU cannot start with underscore or hyphen');
    });

    it('Given: SKU starting with hyphen When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('-PROD001')).toThrow('SKU cannot start with underscore or hyphen');
    });

    it('Given: SKU ending with underscore When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('PROD001_')).toThrow('SKU cannot end with underscore or hyphen');
    });

    it('Given: SKU ending with hyphen When: creating SKU Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => SKU.create('PROD001-')).toThrow('SKU cannot end with underscore or hyphen');
    });

    it('Given: valid SKU with underscore When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const sku = SKU.create('PROD_001');

      // Assert
      expect(sku.getValue()).toBe('PROD_001');
    });

    it('Given: valid SKU with hyphen When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const sku = SKU.create('PROD-001');

      // Assert
      expect(sku.getValue()).toBe('PROD-001');
    });

    it('Given: valid SKU with numbers When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const sku = SKU.create('PROD123');

      // Assert
      expect(sku.getValue()).toBe('PROD123');
    });
  });

  describe('equals', () => {
    it('Given: two SKUs with same value When: comparing Then: should return true', () => {
      // Arrange
      const sku1 = SKU.create('PROD-001');
      const sku2 = SKU.create('PROD-001');

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(true);
    });

    it('Given: two SKUs with different case When: comparing Then: should return true (case insensitive)', () => {
      // Arrange
      const sku1 = SKU.create('PROD-001');
      const sku2 = SKU.create('prod-001');

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(true);
    });

    it('Given: two SKUs with different values When: comparing Then: should return false', () => {
      // Arrange
      const sku1 = SKU.create('PROD-001');
      const sku2 = SKU.create('PROD-002');

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(false);
    });

    it('Given: SKU and undefined When: comparing Then: should return false', () => {
      // Arrange
      const sku = SKU.create('PROD-001');

      // Act & Assert
      expect(sku.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: SKU When: converting to string Then: should return value', () => {
      // Arrange
      const sku = SKU.create('PROD-001');

      // Act & Assert
      expect(sku.toString()).toBe('PROD-001');
    });
  });
});
