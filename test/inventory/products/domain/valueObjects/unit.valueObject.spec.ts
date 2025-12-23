import { describe, expect, it } from '@jest/globals';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

describe('UnitValueObject', () => {
  describe('create', () => {
    it('Given: valid unit When: creating unit Then: should create successfully', () => {
      // Arrange & Act
      const unit = UnitValueObject.create('KG', 'Kilogram', 2);

      // Assert
      expect(unit).toBeInstanceOf(UnitValueObject);
      expect(unit.getCode()).toBe('KG');
      expect(unit.getName()).toBe('Kilogram');
      expect(unit.getPrecision()).toBe(2);
    });

    it('Given: unit with spaces When: creating unit Then: should trim spaces', () => {
      // Arrange & Act
      const unit = UnitValueObject.create('  KG  ', '  Kilogram  ', 2);

      // Assert
      expect(unit.getCode()).toBe('KG');
      expect(unit.getName()).toBe('Kilogram');
    });

    it('Given: empty unit code When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('', 'Kilogram', 2)).toThrow('Unit code is required');
      expect(() => UnitValueObject.create('   ', 'Kilogram', 2)).toThrow('Unit code is required');
    });

    it('Given: unit code longer than 20 characters When: creating unit Then: should throw error', () => {
      // Arrange
      const longCode = 'A'.repeat(21);

      // Act & Assert
      expect(() => UnitValueObject.create(longCode, 'Kilogram', 2)).toThrow(
        'Unit code must be at most 20 characters long'
      );
    });

    it('Given: unit code with invalid characters When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('KG@', 'Kilogram', 2)).toThrow(
        'Unit code can only contain letters, numbers, and hyphens'
      );
      expect(() => UnitValueObject.create('KG_', 'Kilogram', 2)).toThrow(
        'Unit code can only contain letters, numbers, and hyphens'
      );
      // Note: 'KG ' with trailing space is trimmed, so it becomes valid 'KG'
      // If we want to reject spaces, validation should happen before trim
    });

    it('Given: empty unit name When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('KG', '', 2)).toThrow('Unit name is required');
      expect(() => UnitValueObject.create('KG', '   ', 2)).toThrow('Unit name is required');
    });

    it('Given: unit name shorter than 2 characters When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('KG', 'A', 2)).toThrow(
        'Unit name must be at least 2 characters long'
      );
    });

    it('Given: unit name longer than 100 characters When: creating unit Then: should throw error', () => {
      // Arrange
      const longName = 'A'.repeat(101);

      // Act & Assert
      expect(() => UnitValueObject.create('KG', longName, 2)).toThrow(
        'Unit name must be at most 100 characters long'
      );
    });

    it('Given: precision less than 0 When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('KG', 'Kilogram', -1)).toThrow(
        'Precision must be between 0 and 6'
      );
    });

    it('Given: precision greater than 6 When: creating unit Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => UnitValueObject.create('KG', 'Kilogram', 7)).toThrow(
        'Precision must be between 0 and 6'
      );
    });

    it('Given: valid unit with precision 0 When: creating unit Then: should create successfully', () => {
      // Arrange & Act
      const unit = UnitValueObject.create('PCS', 'Pieces', 0);

      // Assert
      expect(unit.getPrecision()).toBe(0);
    });

    it('Given: valid unit with precision 6 When: creating unit Then: should create successfully', () => {
      // Arrange & Act
      const unit = UnitValueObject.create('G', 'Gram', 6);

      // Assert
      expect(unit.getPrecision()).toBe(6);
    });

    it('Given: valid unit code with hyphen When: creating unit Then: should create successfully', () => {
      // Arrange & Act
      const unit = UnitValueObject.create('M-SQ', 'Square Meter', 2);

      // Assert
      expect(unit.getCode()).toBe('M-SQ');
    });
  });

  describe('equals', () => {
    it('Given: two units with same values When: comparing Then: should return true', () => {
      // Arrange
      const unit1 = UnitValueObject.create('KG', 'Kilogram', 2);
      const unit2 = UnitValueObject.create('KG', 'Kilogram', 2);

      // Act & Assert
      expect(unit1.equals(unit2)).toBe(true);
    });

    it('Given: two units with different codes When: comparing Then: should return false', () => {
      // Arrange
      const unit1 = UnitValueObject.create('KG', 'Kilogram', 2);
      const unit2 = UnitValueObject.create('G', 'Kilogram', 2);

      // Act & Assert
      expect(unit1.equals(unit2)).toBe(false);
    });

    it('Given: two units with different names When: comparing Then: should return false', () => {
      // Arrange
      const unit1 = UnitValueObject.create('KG', 'Kilogram', 2);
      const unit2 = UnitValueObject.create('KG', 'Gram', 2);

      // Act & Assert
      expect(unit1.equals(unit2)).toBe(false);
    });

    it('Given: two units with different precision When: comparing Then: should return false', () => {
      // Arrange
      const unit1 = UnitValueObject.create('KG', 'Kilogram', 2);
      const unit2 = UnitValueObject.create('KG', 'Kilogram', 3);

      // Act & Assert
      expect(unit1.equals(unit2)).toBe(false);
    });

    it('Given: unit and undefined When: comparing Then: should return false', () => {
      // Arrange
      const unit = UnitValueObject.create('KG', 'Kilogram', 2);

      // Act & Assert
      expect(unit.equals(undefined)).toBe(false);
    });

    it('Given: two units with same code but different case When: comparing Then: should return false (case sensitive)', () => {
      // Arrange
      const unit1 = UnitValueObject.create('KG', 'Kilogram', 2);
      const unit2 = UnitValueObject.create('kg', 'Kilogram', 2);

      // Act & Assert
      expect(unit1.equals(unit2)).toBe(false);
    });
  });
});
