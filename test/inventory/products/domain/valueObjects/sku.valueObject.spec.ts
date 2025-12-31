import { describe, expect, it } from '@jest/globals';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';

describe('SKU Value Object', () => {
  describe('create', () => {
    it('Given: valid SKU When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const result = SKU.create('PROD-001');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const sku = result.unwrap();
        expect(sku).toBeInstanceOf(SKU);
        expect(sku.getValue()).toBe('PROD-001');
      }
    });

    it('Given: SKU with spaces When: creating SKU Then: should trim spaces', () => {
      // Arrange & Act
      const result = SKU.create('  PROD-001  ');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('PROD-001');
      }
    });

    it('Given: empty SKU When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result1 = SKU.create('');
      const result2 = SKU.create('   ');

      // Assert
      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.unwrapErr().message).toContain('SKU cannot be empty');
      }
    });

    it('Given: SKU shorter than 3 characters When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result1 = SKU.create('AB');
      const result2 = SKU.create('A');

      // Assert
      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.unwrapErr().message).toContain('SKU must be at least 3 characters long');
      }
    });

    it('Given: SKU longer than 50 characters When: creating SKU Then: should return error', () => {
      // Arrange
      const longSku = 'A'.repeat(51);

      // Act
      const result = SKU.create(longSku);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain('SKU must be at most 50 characters long');
      }
    });

    it('Given: SKU with invalid characters When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result1 = SKU.create('PROD@001');
      const result2 = SKU.create('PROD.001');

      // Assert
      expect(result1.isErr()).toBe(true);
      expect(result2.isErr()).toBe(true);
      if (result1.isErr()) {
        expect(result1.unwrapErr().message).toContain(
          'SKU can only contain letters, numbers, underscores, and hyphens'
        );
      }
      const result3 = SKU.create('PROD 001');
      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        expect(result3.unwrapErr().message).toContain(
          'SKU can only contain letters, numbers, underscores, and hyphens'
        );
      }
    });

    it('Given: SKU starting with underscore When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result = SKU.create('_PROD001');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain('SKU cannot start with underscore or hyphen');
      }
    });

    it('Given: SKU starting with hyphen When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result = SKU.create('-PROD001');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain('SKU cannot start with underscore or hyphen');
      }
    });

    it('Given: SKU ending with underscore When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result = SKU.create('PROD001_');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain('SKU cannot end with underscore or hyphen');
      }
    });

    it('Given: SKU ending with hyphen When: creating SKU Then: should return error', () => {
      // Arrange & Act
      const result = SKU.create('PROD001-');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().message).toContain('SKU cannot end with underscore or hyphen');
      }
    });

    it('Given: valid SKU with underscore When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const result = SKU.create('PROD_001');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('PROD_001');
      }
    });

    it('Given: valid SKU with hyphen When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const result = SKU.create('PROD-001');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('PROD-001');
      }
    });

    it('Given: valid SKU with numbers When: creating SKU Then: should create successfully', () => {
      // Arrange & Act
      const result = SKU.create('PROD123');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap().getValue()).toBe('PROD123');
      }
    });
  });

  describe('equals', () => {
    it('Given: two SKUs with same value When: comparing Then: should return true', () => {
      // Arrange
      const result1 = SKU.create('PROD-001');
      const result2 = SKU.create('PROD-001');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku1 = result1.unwrap();
      const sku2 = result2.unwrap();

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(true);
    });

    it('Given: two SKUs with different case When: comparing Then: should return true (case insensitive)', () => {
      // Arrange
      const result1 = SKU.create('PROD-001');
      const result2 = SKU.create('prod-001');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku1 = result1.unwrap();
      const sku2 = result2.unwrap();

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(true);
    });

    it('Given: two SKUs with different values When: comparing Then: should return false', () => {
      // Arrange
      const result1 = SKU.create('PROD-001');
      const result2 = SKU.create('PROD-002');
      if (result1.isErr() || result2.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku1 = result1.unwrap();
      const sku2 = result2.unwrap();

      // Act & Assert
      expect(sku1.equals(sku2)).toBe(false);
    });

    it('Given: SKU and undefined When: comparing Then: should return false', () => {
      // Arrange
      const result = SKU.create('PROD-001');
      if (result.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = result.unwrap();

      // Act & Assert
      expect(sku.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: SKU When: converting to string Then: should return value', () => {
      // Arrange
      const result = SKU.create('PROD-001');
      if (result.isErr()) {
        throw new Error('Failed to create SKU in test');
      }
      const sku = result.unwrap();

      // Act & Assert
      expect(sku.toString()).toBe('PROD-001');
    });
  });
});
