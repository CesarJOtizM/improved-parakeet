import { describe, expect, it } from '@jest/globals';
import { Unit } from '@product/domain/entities/unit.entity';

describe('Unit', () => {
  describe('create', () => {
    it('Given: valid props When: creating unit Then: should create successfully', () => {
      // Arrange
      const props = {
        code: 'PCS',
        name: 'Pieces',
        precision: 0,
      };

      // Act
      const unit = Unit.create(props, 'org-123');

      // Assert
      expect(unit.code).toBe('PCS');
      expect(unit.name).toBe('Pieces');
      expect(unit.precision).toBe(0);
      expect(unit.orgId).toBe('org-123');
    });

    it('Given: unit with decimal precision When: creating Then: should set correct precision', () => {
      // Arrange
      const props = {
        code: 'KG',
        name: 'Kilograms',
        precision: 3,
      };

      // Act
      const unit = Unit.create(props, 'org-123');

      // Assert
      expect(unit.code).toBe('KG');
      expect(unit.name).toBe('Kilograms');
      expect(unit.precision).toBe(3);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with existing id', () => {
      // Arrange
      const props = {
        code: 'LTR',
        name: 'Liters',
        precision: 2,
      };

      // Act
      const unit = Unit.reconstitute(props, 'unit-123', 'org-123');

      // Assert
      expect(unit.id).toBe('unit-123');
      expect(unit.orgId).toBe('org-123');
      expect(unit.code).toBe('LTR');
    });
  });

  describe('update', () => {
    it('Given: existing unit When: updating code Then: should update code', () => {
      // Arrange
      const unit = Unit.create({ code: 'OLD', name: 'Old Unit', precision: 0 }, 'org-123');

      // Act
      unit.update({ code: 'NEW' });

      // Assert
      expect(unit.code).toBe('NEW');
    });

    it('Given: existing unit When: updating name Then: should update name', () => {
      // Arrange
      const unit = Unit.create({ code: 'PCS', name: 'Old Name', precision: 0 }, 'org-123');

      // Act
      unit.update({ name: 'New Name' });

      // Assert
      expect(unit.name).toBe('New Name');
    });

    it('Given: existing unit When: updating precision Then: should update precision', () => {
      // Arrange
      const unit = Unit.create({ code: 'KG', name: 'Kilograms', precision: 2 }, 'org-123');

      // Act
      unit.update({ precision: 4 });

      // Assert
      expect(unit.precision).toBe(4);
    });

    it('Given: existing unit When: updating multiple props Then: should update all', () => {
      // Arrange
      const unit = Unit.create({ code: 'OLD', name: 'Old', precision: 0 }, 'org-123');

      // Act
      unit.update({ code: 'NEW', name: 'New Unit', precision: 3 });

      // Assert
      expect(unit.code).toBe('NEW');
      expect(unit.name).toBe('New Unit');
      expect(unit.precision).toBe(3);
    });
  });

  describe('getters', () => {
    it('Given: unit When: getting props Then: should return correct values', () => {
      // Arrange
      const unit = Unit.create({ code: 'MTR', name: 'Meters', precision: 2 }, 'org-123');

      // Act & Assert
      expect(unit.code).toBe('MTR');
      expect(unit.name).toBe('Meters');
      expect(unit.precision).toBe(2);
    });
  });
});
