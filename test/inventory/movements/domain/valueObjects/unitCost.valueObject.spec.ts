import { UnitCost } from '@inventory/movements/domain/valueObjects/unitCost.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('UnitCost Value Object', () => {
  describe('create', () => {
    it('Given: valid amount When: creating unit cost Then: should set defaults', () => {
      // Arrange
      const amount = 12.5;

      // Act
      const unitCost = UnitCost.create(amount);

      // Assert
      expect(unitCost.getAmount()).toBe(amount);
      expect(unitCost.getCurrency()).toBe('COP');
      expect(unitCost.getPrecision()).toBe(2);
    });

    it('Given: negative amount When: creating unit cost Then: should throw error', () => {
      // Arrange
      const amount = -1;

      // Act & Assert
      expect(() => UnitCost.create(amount)).toThrow('Unit cost cannot be negative');
    });

    it('Given: empty currency When: creating unit cost Then: should throw error', () => {
      // Arrange
      const currency = ' ';

      // Act & Assert
      expect(() => UnitCost.create(10, currency)).toThrow('Currency is required');
    });

    it('Given: invalid precision When: creating unit cost Then: should throw error', () => {
      // Arrange
      const precision = 7;

      // Act & Assert
      expect(() => UnitCost.create(10, 'USD', precision)).toThrow(
        'Precision must be between 0 and 6'
      );
    });
  });

  describe('math operations', () => {
    it('Given: same currency When: adding unit costs Then: should return summed unit cost', () => {
      // Arrange
      const left = UnitCost.create(10, 'USD', 2);
      const right = UnitCost.create(5, 'USD', 2);

      // Act
      const result = left.add(right);

      // Assert
      expect(result.getAmount()).toBe(15);
      expect(result.getCurrency()).toBe('USD');
    });

    it('Given: different currencies When: adding unit costs Then: should throw error', () => {
      // Arrange
      const left = UnitCost.create(10, 'USD');
      const right = UnitCost.create(5, 'EUR');

      // Act & Assert
      expect(() => left.add(right)).toThrow('Cannot add unit costs with different currencies');
    });

    it('Given: same currency When: subtracting unit costs Then: should return difference', () => {
      // Arrange
      const left = UnitCost.create(10, 'USD');
      const right = UnitCost.create(4, 'USD');

      // Act
      const result = left.subtract(right);

      // Assert
      expect(result.getAmount()).toBe(6);
    });

    it('Given: different currencies When: subtracting unit costs Then: should throw error', () => {
      // Arrange
      const left = UnitCost.create(10, 'USD');
      const right = UnitCost.create(4, 'EUR');

      // Act & Assert
      expect(() => left.subtract(right)).toThrow(
        'Cannot subtract unit costs with different currencies'
      );
    });

    it('Given: subtraction resulting negative When: subtracting unit costs Then: should throw error', () => {
      // Arrange
      const left = UnitCost.create(3, 'USD');
      const right = UnitCost.create(4, 'USD');

      // Act & Assert
      expect(() => left.subtract(right)).toThrow('Result cannot be negative');
    });

    it('Given: factor When: multiplying unit cost Then: should scale amount', () => {
      // Arrange
      const unitCost = UnitCost.create(8, 'USD');

      // Act
      const result = unitCost.multiply(2.5);

      // Assert
      expect(result.getAmount()).toBe(20);
    });

    it('Given: divisor When: dividing unit cost Then: should scale amount', () => {
      // Arrange
      const unitCost = UnitCost.create(9, 'USD');

      // Act
      const result = unitCost.divide(3);

      // Assert
      expect(result.getAmount()).toBe(3);
    });

    it('Given: divisor zero When: dividing unit cost Then: should throw error', () => {
      // Arrange
      const unitCost = UnitCost.create(9, 'USD');

      // Act & Assert
      expect(() => unitCost.divide(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('helpers', () => {
    it('Given: zero amount When: checking helpers Then: should return zero and not positive', () => {
      // Arrange
      const unitCost = UnitCost.create(0, 'USD');

      // Act
      const isZero = unitCost.isZero();
      const isPositive = unitCost.isPositive();

      // Assert
      expect(isZero).toBe(true);
      expect(isPositive).toBe(false);
    });

    it('Given: amount and precision When: formatting Then: should format correctly', () => {
      // Arrange
      const unitCost = UnitCost.create(12.3456, 'USD', 3);

      // Act
      const fixed = unitCost.toFixed();
      const formatted = unitCost.format();

      // Assert
      expect(fixed).toBe('12.346');
      expect(formatted).toBe('USD 12.346');
    });
  });
});
