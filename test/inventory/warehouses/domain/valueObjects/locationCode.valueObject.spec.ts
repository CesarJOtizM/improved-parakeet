import { describe, expect, it } from '@jest/globals';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

describe('LocationCode', () => {
  describe('create', () => {
    it('Given: valid code When: creating Then: should create successfully', () => {
      // Act
      const code = LocationCode.create('ZONE-A1');

      // Assert
      expect(code.getValue()).toBe('ZONE-A1');
    });

    it('Given: code with leading/trailing whitespace When: creating Then: should trim', () => {
      // Act
      const code = LocationCode.create('  ZONE-A1  ');

      // Assert
      expect(code.getValue()).toBe('ZONE-A1');
    });

    it('Given: minimum length code (2 chars) When: creating Then: should create successfully', () => {
      // Act
      const code = LocationCode.create('AB');

      // Assert
      expect(code.getValue()).toBe('AB');
    });

    it('Given: code with underscores and hyphens When: creating Then: should create successfully', () => {
      // Act
      const code = LocationCode.create('ZONE_A1-B2');

      // Assert
      expect(code.getValue()).toBe('ZONE_A1-B2');
    });

    it('Given: empty string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('')).toThrow('Location code cannot be empty');
    });

    it('Given: whitespace-only string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('   ')).toThrow('Location code cannot be empty');
    });

    it('Given: single character When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('A')).toThrow(
        'Location code must be at least 2 characters long'
      );
    });

    it('Given: code exceeding 50 characters When: creating Then: should throw error', () => {
      // Arrange
      const longCode = 'A'.repeat(51);

      // Act & Assert
      expect(() => LocationCode.create(longCode)).toThrow(
        'Location code must be at most 50 characters long'
      );
    });

    it('Given: code with special characters When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('ZONE@A1')).toThrow(
        'Location code can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: code with spaces When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('ZONE A1')).toThrow(
        'Location code can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: code starting with underscore When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('_ZONE')).toThrow(
        'Location code cannot start with underscore or hyphen'
      );
    });

    it('Given: code starting with hyphen When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('-ZONE')).toThrow(
        'Location code cannot start with underscore or hyphen'
      );
    });

    it('Given: code ending with underscore When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('ZONE_')).toThrow(
        'Location code cannot end with underscore or hyphen'
      );
    });

    it('Given: code ending with hyphen When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('ZONE-')).toThrow(
        'Location code cannot end with underscore or hyphen'
      );
    });
  });

  describe('getValue', () => {
    it('Given: location code When: getting value Then: should return the code string', () => {
      // Arrange
      const code = LocationCode.create('ZONE-A1');

      // Act & Assert
      expect(code.getValue()).toBe('ZONE-A1');
    });
  });

  describe('toString', () => {
    it('Given: location code When: calling toString Then: should return the code string', () => {
      // Arrange
      const code = LocationCode.create('ZONE-A1');

      // Act & Assert
      expect(code.toString()).toBe('ZONE-A1');
    });
  });

  describe('equals', () => {
    it('Given: two codes with same value When: comparing Then: should return true', () => {
      // Arrange
      const code1 = LocationCode.create('ZONE-A1');
      const code2 = LocationCode.create('ZONE-A1');

      // Act & Assert
      expect(code1.equals(code2)).toBe(true);
    });

    it('Given: two codes with same value different case When: comparing Then: should return true (case-insensitive)', () => {
      // Arrange
      const code1 = LocationCode.create('zone-a1');
      const code2 = LocationCode.create('ZONE-A1');

      // Act & Assert
      expect(code1.equals(code2)).toBe(true);
    });

    it('Given: two codes with different values When: comparing Then: should return false', () => {
      // Arrange
      const code1 = LocationCode.create('ZONE-A1');
      const code2 = LocationCode.create('ZONE-B2');

      // Act & Assert
      expect(code1.equals(code2)).toBe(false);
    });

    it('Given: code compared with undefined When: comparing Then: should return false', () => {
      // Arrange
      const code = LocationCode.create('ZONE-A1');

      // Act & Assert
      expect(code.equals(undefined)).toBe(false);
    });
  });
});
