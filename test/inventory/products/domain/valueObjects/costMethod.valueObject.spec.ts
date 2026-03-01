import { describe, expect, it } from '@jest/globals';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';

describe('CostMethod', () => {
  describe('create', () => {
    it('Given: AVG value When: creating Then: should create successfully', () => {
      // Act
      const method = CostMethod.create('AVG');

      // Assert
      expect(method.getValue()).toBe('AVG');
      expect(method.isAverage()).toBe(true);
      expect(method.isFifo()).toBe(false);
    });

    it('Given: FIFO value When: creating Then: should create successfully', () => {
      // Act
      const method = CostMethod.create('FIFO');

      // Assert
      expect(method.getValue()).toBe('FIFO');
      expect(method.isFifo()).toBe(true);
      expect(method.isAverage()).toBe(false);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => CostMethod.create('LIFO' as any)).toThrow('Invalid cost method: LIFO');
    });

    it('Given: empty string When: creating Then: should throw error', () => {
      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => CostMethod.create('' as any)).toThrow('Invalid cost method: ');
    });
  });

  describe('isAverage', () => {
    it('Given: AVG method When: checking isAverage Then: should return true', () => {
      // Arrange
      const method = CostMethod.create('AVG');

      // Act & Assert
      expect(method.isAverage()).toBe(true);
    });

    it('Given: FIFO method When: checking isAverage Then: should return false', () => {
      // Arrange
      const method = CostMethod.create('FIFO');

      // Act & Assert
      expect(method.isAverage()).toBe(false);
    });
  });

  describe('isFifo', () => {
    it('Given: FIFO method When: checking isFifo Then: should return true', () => {
      // Arrange
      const method = CostMethod.create('FIFO');

      // Act & Assert
      expect(method.isFifo()).toBe(true);
    });

    it('Given: AVG method When: checking isFifo Then: should return false', () => {
      // Arrange
      const method = CostMethod.create('AVG');

      // Act & Assert
      expect(method.isFifo()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any cost method When: getting value Then: should return correct value', () => {
      // Act
      const avg = CostMethod.create('AVG');
      const fifo = CostMethod.create('FIFO');

      // Assert
      expect(avg.getValue()).toBe('AVG');
      expect(fifo.getValue()).toBe('FIFO');
    });
  });
});
