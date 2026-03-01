import { describe, expect, it } from '@jest/globals';
import { LocationCode } from '@location/domain/valueObjects/locationCode.valueObject';

describe('LocationCode', () => {
  describe('create', () => {
    it('Given: valid code When: creating Then: should create successfully', () => {
      // Act
      const code = LocationCode.create('ZONE-A1');

      // Assert
      expect(code.getValue()).toBe('ZONE-A1');
    });

    it('Given: lowercase code When: creating Then: should normalize to uppercase', () => {
      // Act
      const code = LocationCode.create('zone-a1');

      // Assert
      expect(code.getValue()).toBe('ZONE-A1');
    });

    it('Given: code with whitespace When: creating Then: should trim and normalize', () => {
      // Act
      const code = LocationCode.create('  rack-b2  ');

      // Assert
      expect(code.getValue()).toBe('RACK-B2');
    });

    it('Given: empty string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('')).toThrow('Location code cannot be empty');
    });

    it('Given: whitespace-only string When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationCode.create('   ')).toThrow('Location code cannot be empty');
    });

    it('Given: code exceeding 50 characters When: creating Then: should throw error', () => {
      // Arrange
      const longCode = 'A'.repeat(51);

      // Act & Assert
      expect(() => LocationCode.create(longCode)).toThrow(
        'Location code cannot exceed 50 characters'
      );
    });

    it('Given: code exactly 50 characters When: creating Then: should create successfully', () => {
      // Arrange
      const exactCode = 'A'.repeat(50);

      // Act
      const code = LocationCode.create(exactCode);

      // Assert
      expect(code.getValue()).toBe(exactCode);
    });
  });

  describe('getValue', () => {
    it('Given: valid code When: getting value Then: should return normalized code', () => {
      // Act
      const code = LocationCode.create('shelf-c3');

      // Assert
      expect(code.getValue()).toBe('SHELF-C3');
    });
  });

  describe('equality', () => {
    it('Given: two codes with same value When: comparing Then: should be equal', () => {
      // Arrange
      const code1 = LocationCode.create('BIN-01');
      const code2 = LocationCode.create('bin-01');

      // Act & Assert
      expect(code1.getValue()).toBe(code2.getValue());
    });

    it('Given: two codes with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const code1 = LocationCode.create('BIN-01');
      const code2 = LocationCode.create('BIN-02');

      // Act & Assert
      expect(code1.getValue()).not.toBe(code2.getValue());
    });
  });
});
