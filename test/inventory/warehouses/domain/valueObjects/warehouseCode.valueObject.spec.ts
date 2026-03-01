import { describe, expect, it } from '@jest/globals';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

describe('WarehouseCode', () => {
  describe('create', () => {
    it('Given: valid code When: creating Then: should create successfully', () => {
      // Act
      const code = WarehouseCode.create('WH-001');

      // Assert
      expect(code.getValue()).toBe('WH-001');
    });

    it('Given: code with leading/trailing whitespace When: creating Then: should trim', () => {
      // Act
      const code = WarehouseCode.create('  WH-001  ');

      // Assert
      expect(code.getValue()).toBe('WH-001');
    });

    it('Given: minimum length code (3 chars) When: creating Then: should create successfully', () => {
      // Act
      const code = WarehouseCode.create('ABC');

      // Assert
      expect(code.getValue()).toBe('ABC');
    });

    it('Given: code with underscores and hyphens When: creating Then: should create successfully', () => {
      // Act
      const code = WarehouseCode.create('WH_MAIN-01');

      // Assert
      expect(code.getValue()).toBe('WH_MAIN-01');
    });

    it('Given: empty string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('')).toThrow('Warehouse code cannot be empty');
    });

    it('Given: whitespace-only string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('   ')).toThrow('Warehouse code cannot be empty');
    });

    it('Given: code with only 2 characters When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('AB')).toThrow(
        'Warehouse code must be at least 3 characters long'
      );
    });

    it('Given: single character When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('A')).toThrow(
        'Warehouse code must be at least 3 characters long'
      );
    });

    it('Given: code exceeding 50 characters When: creating Then: should throw error', () => {
      // Arrange
      const longCode = 'A'.repeat(51);

      // Act & Assert
      expect(() => WarehouseCode.create(longCode)).toThrow(
        'Warehouse code must be at most 50 characters long'
      );
    });

    it('Given: code with special characters When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('WH@001')).toThrow(
        'Warehouse code can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: code with spaces When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('WH 001')).toThrow(
        'Warehouse code can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: code starting with underscore When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('_WH001')).toThrow(
        'Warehouse code cannot start with underscore or hyphen'
      );
    });

    it('Given: code starting with hyphen When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('-WH001')).toThrow(
        'Warehouse code cannot start with underscore or hyphen'
      );
    });

    it('Given: code ending with underscore When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('WH001_')).toThrow(
        'Warehouse code cannot end with underscore or hyphen'
      );
    });

    it('Given: code ending with hyphen When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => WarehouseCode.create('WH001-')).toThrow(
        'Warehouse code cannot end with underscore or hyphen'
      );
    });
  });

  describe('getValue', () => {
    it('Given: warehouse code When: getting value Then: should return the code string', () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');

      // Act & Assert
      expect(code.getValue()).toBe('WH-001');
    });
  });

  describe('toString', () => {
    it('Given: warehouse code When: calling toString Then: should return the code string', () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');

      // Act & Assert
      expect(code.toString()).toBe('WH-001');
    });
  });

  describe('equals', () => {
    it('Given: two codes with same value When: comparing Then: should return true', () => {
      // Arrange
      const code1 = WarehouseCode.create('WH-001');
      const code2 = WarehouseCode.create('WH-001');

      // Act & Assert
      expect(code1.equals(code2)).toBe(true);
    });

    it('Given: two codes with same value different case When: comparing Then: should return true (case-insensitive)', () => {
      // Arrange
      const code1 = WarehouseCode.create('wh-001');
      const code2 = WarehouseCode.create('WH-001');

      // Act & Assert
      expect(code1.equals(code2)).toBe(true);
    });

    it('Given: two codes with different values When: comparing Then: should return false', () => {
      // Arrange
      const code1 = WarehouseCode.create('WH-001');
      const code2 = WarehouseCode.create('WH-002');

      // Act & Assert
      expect(code1.equals(code2)).toBe(false);
    });

    it('Given: code compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');

      // Act & Assert
      expect(code.equals(undefined)).toBe(false);
    });
  });
});
