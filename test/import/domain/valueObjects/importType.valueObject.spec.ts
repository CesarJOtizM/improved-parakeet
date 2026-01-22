import { ImportType, IMPORT_TYPES } from '@import/domain/valueObjects/importType.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('ImportType', () => {
  describe('create', () => {
    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: valid type %s When: creating ImportType Then: should create successfully',
      (type: string) => {
        // Act
        const importType = ImportType.create(type);

        // Assert
        expect(importType.getValue()).toBe(type);
      }
    );

    it('Given: invalid type When: creating ImportType Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportType.create('INVALID')).toThrow(
        'Invalid import type: INVALID. Valid types: PRODUCTS, MOVEMENTS, WAREHOUSES, STOCK, TRANSFERS'
      );
    });

    it('Given: lowercase type When: creating ImportType Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportType.create('products')).toThrow('Invalid import type');
    });

    it('Given: empty string When: creating ImportType Then: should throw error', () => {
      // Act & Assert
      expect(() => ImportType.create('')).toThrow('Invalid import type');
    });
  });

  describe('isProducts', () => {
    it('Given: PRODUCTS type When: checking isProducts Then: should return true', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act & Assert
      expect(type.isProducts()).toBe(true);
    });

    it.each([['MOVEMENTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: %s type When: checking isProducts Then: should return false',
      (typeValue: string) => {
        // Arrange
        const type = ImportType.create(typeValue);

        // Act & Assert
        expect(type.isProducts()).toBe(false);
      }
    );
  });

  describe('isMovements', () => {
    it('Given: MOVEMENTS type When: checking isMovements Then: should return true', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');

      // Act & Assert
      expect(type.isMovements()).toBe(true);
    });

    it.each([['PRODUCTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: %s type When: checking isMovements Then: should return false',
      (typeValue: string) => {
        // Arrange
        const type = ImportType.create(typeValue);

        // Act & Assert
        expect(type.isMovements()).toBe(false);
      }
    );
  });

  describe('isWarehouses', () => {
    it('Given: WAREHOUSES type When: checking isWarehouses Then: should return true', () => {
      // Arrange
      const type = ImportType.create('WAREHOUSES');

      // Act & Assert
      expect(type.isWarehouses()).toBe(true);
    });

    it.each([['PRODUCTS'], ['MOVEMENTS'], ['STOCK'], ['TRANSFERS']])(
      'Given: %s type When: checking isWarehouses Then: should return false',
      (typeValue: string) => {
        // Arrange
        const type = ImportType.create(typeValue);

        // Act & Assert
        expect(type.isWarehouses()).toBe(false);
      }
    );
  });

  describe('isStock', () => {
    it('Given: STOCK type When: checking isStock Then: should return true', () => {
      // Arrange
      const type = ImportType.create('STOCK');

      // Act & Assert
      expect(type.isStock()).toBe(true);
    });

    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['TRANSFERS']])(
      'Given: %s type When: checking isStock Then: should return false',
      (typeValue: string) => {
        // Arrange
        const type = ImportType.create(typeValue);

        // Act & Assert
        expect(type.isStock()).toBe(false);
      }
    );
  });

  describe('isTransfers', () => {
    it('Given: TRANSFERS type When: checking isTransfers Then: should return true', () => {
      // Arrange
      const type = ImportType.create('TRANSFERS');

      // Act & Assert
      expect(type.isTransfers()).toBe(true);
    });

    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['STOCK']])(
      'Given: %s type When: checking isTransfers Then: should return false',
      (typeValue: string) => {
        // Arrange
        const type = ImportType.create(typeValue);

        // Act & Assert
        expect(type.isTransfers()).toBe(false);
      }
    );
  });

  describe('getValue', () => {
    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: %s type When: getting value Then: should return correct value',
      (type: string) => {
        // Arrange
        const importType = ImportType.create(type);

        // Act
        const value = importType.getValue();

        // Assert
        expect(value).toBe(type);
      }
    );
  });

  describe('toString', () => {
    it.each([['PRODUCTS'], ['MOVEMENTS'], ['WAREHOUSES'], ['STOCK'], ['TRANSFERS']])(
      'Given: %s type When: converting to string Then: should return type value',
      (type: string) => {
        // Arrange
        const importType = ImportType.create(type);

        // Act
        const result = importType.toString();

        // Assert
        expect(result).toBe(type);
      }
    );
  });

  describe('IMPORT_TYPES constant', () => {
    it('Given: IMPORT_TYPES constant When: checking values Then: should contain all valid types', () => {
      // Assert
      expect(IMPORT_TYPES.PRODUCTS).toBe('PRODUCTS');
      expect(IMPORT_TYPES.MOVEMENTS).toBe('MOVEMENTS');
      expect(IMPORT_TYPES.WAREHOUSES).toBe('WAREHOUSES');
      expect(IMPORT_TYPES.STOCK).toBe('STOCK');
      expect(IMPORT_TYPES.TRANSFERS).toBe('TRANSFERS');
    });

    it('Given: IMPORT_TYPES constant When: counting values Then: should have 5 types', () => {
      // Assert
      expect(Object.keys(IMPORT_TYPES)).toHaveLength(5);
    });
  });
});
