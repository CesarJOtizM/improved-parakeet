import { describe, expect, it } from '@jest/globals';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

describe('Money', () => {
  describe('create', () => {
    it('Given: valid amount When: creating Then: should create successfully with defaults', () => {
      // Act
      const money = Money.create(100);

      // Assert
      expect(money.getAmount()).toBe(100);
      expect(money.getCurrency()).toBe('COP');
      expect(money.getPrecision()).toBe(2);
    });

    it('Given: valid amount and currency When: creating Then: should create successfully', () => {
      // Act
      const money = Money.create(50.5, 'USD', 4);

      // Assert
      expect(money.getAmount()).toBe(50.5);
      expect(money.getCurrency()).toBe('USD');
      expect(money.getPrecision()).toBe(4);
    });

    it('Given: zero amount When: creating Then: should create successfully', () => {
      // Act
      const money = Money.create(0);

      // Assert
      expect(money.getAmount()).toBe(0);
      expect(money.isZero()).toBe(true);
    });

    it('Given: negative amount When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Money.create(-10)).toThrow('Amount cannot be negative');
    });

    it('Given: empty currency When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Money.create(100, '')).toThrow('Currency is required');
    });

    it('Given: whitespace-only currency When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Money.create(100, '   ')).toThrow('Currency is required');
    });

    it('Given: precision greater than 6 When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Money.create(100, 'COP', 7)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: negative precision When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => Money.create(100, 'COP', -1)).toThrow('Precision must be between 0 and 6');
    });

    it('Given: NaN amount When: creating Then: should sanitize to zero', () => {
      // Act
      const money = Money.create(NaN);

      // Assert
      expect(money.getAmount()).toBe(0);
      expect(money.isZero()).toBe(true);
    });

    it('Given: Infinity amount When: creating Then: should sanitize to zero', () => {
      // Act
      const money = Money.create(Infinity);

      // Assert
      expect(money.getAmount()).toBe(0);
      expect(money.isZero()).toBe(true);
    });
  });

  describe('add', () => {
    it('Given: two money with same currency When: adding Then: should return correct sum', () => {
      // Arrange
      const money1 = Money.create(100, 'COP');
      const money2 = Money.create(50, 'COP');

      // Act
      const result = money1.add(money2);

      // Assert
      expect(result.getAmount()).toBe(150);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: two money with different currencies When: adding Then: should throw error', () => {
      // Arrange
      const money1 = Money.create(100, 'COP');
      const money2 = Money.create(50, 'USD');

      // Act & Assert
      expect(() => money1.add(money2)).toThrow('Cannot add money with different currencies');
    });
  });

  describe('subtract', () => {
    it('Given: money with larger amount When: subtracting smaller Then: should return correct result', () => {
      // Arrange
      const money1 = Money.create(100, 'COP');
      const money2 = Money.create(30, 'COP');

      // Act
      const result = money1.subtract(money2);

      // Assert
      expect(result.getAmount()).toBe(70);
    });

    it('Given: money with smaller amount When: subtracting larger Then: should throw error', () => {
      // Arrange
      const money1 = Money.create(30, 'COP');
      const money2 = Money.create(100, 'COP');

      // Act & Assert
      expect(() => money1.subtract(money2)).toThrow('Result cannot be negative');
    });

    it('Given: two money with different currencies When: subtracting Then: should throw error', () => {
      // Arrange
      const money1 = Money.create(100, 'COP');
      const money2 = Money.create(50, 'USD');

      // Act & Assert
      expect(() => money1.subtract(money2)).toThrow(
        'Cannot subtract money with different currencies'
      );
    });
  });

  describe('multiply', () => {
    it('Given: money and factor When: multiplying Then: should return correct result', () => {
      // Arrange
      const money = Money.create(100, 'COP');

      // Act
      const result = money.multiply(3);

      // Assert
      expect(result.getAmount()).toBe(300);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: money and zero factor When: multiplying Then: should return zero', () => {
      // Arrange
      const money = Money.create(100, 'COP');

      // Act
      const result = money.multiply(0);

      // Assert
      expect(result.getAmount()).toBe(0);
      expect(result.isZero()).toBe(true);
    });
  });

  describe('divide', () => {
    it('Given: money and divisor When: dividing Then: should return correct result', () => {
      // Arrange
      const money = Money.create(100, 'COP');

      // Act
      const result = money.divide(4);

      // Assert
      expect(result.getAmount()).toBe(25);
      expect(result.getCurrency()).toBe('COP');
    });

    it('Given: money and zero divisor When: dividing Then: should throw error', () => {
      // Arrange
      const money = Money.create(100, 'COP');

      // Act & Assert
      expect(() => money.divide(0)).toThrow('Cannot divide by zero');
    });
  });

  describe('isZero', () => {
    it('Given: zero amount When: checking isZero Then: should return true', () => {
      // Arrange
      const money = Money.create(0);

      // Act & Assert
      expect(money.isZero()).toBe(true);
    });

    it('Given: positive amount When: checking isZero Then: should return false', () => {
      // Arrange
      const money = Money.create(100);

      // Act & Assert
      expect(money.isZero()).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('Given: positive amount When: checking isPositive Then: should return true', () => {
      // Arrange
      const money = Money.create(100);

      // Act & Assert
      expect(money.isPositive()).toBe(true);
    });

    it('Given: zero amount When: checking isPositive Then: should return false', () => {
      // Arrange
      const money = Money.create(0);

      // Act & Assert
      expect(money.isPositive()).toBe(false);
    });
  });

  describe('toFixed', () => {
    it('Given: money with precision 2 When: calling toFixed Then: should return formatted string', () => {
      // Arrange
      const money = Money.create(100.5, 'COP', 2);

      // Act & Assert
      expect(money.toFixed()).toBe('100.50');
    });

    it('Given: money with precision 4 When: calling toFixed Then: should return formatted string', () => {
      // Arrange
      const money = Money.create(100.1234, 'USD', 4);

      // Act & Assert
      expect(money.toFixed()).toBe('100.1234');
    });
  });

  describe('format', () => {
    it('Given: money When: calling format Then: should return currency and amount string', () => {
      // Arrange
      const money = Money.create(100.5, 'COP', 2);

      // Act & Assert
      expect(money.format()).toBe('COP 100.50');
    });

    it('Given: USD money When: calling format Then: should return USD formatted string', () => {
      // Arrange
      const money = Money.create(50, 'USD', 2);

      // Act & Assert
      expect(money.format()).toBe('USD 50.00');
    });
  });
});
