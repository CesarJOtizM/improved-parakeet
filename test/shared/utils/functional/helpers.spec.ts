import { describe, expect, it, jest } from '@jest/globals';
import {
  constant,
  every,
  filter,
  find,
  flatMap,
  forEach,
  identity,
  map,
  noop,
  reduce,
  some,
} from '@shared/utils/functional/helpers';

describe('Functional Helpers', () => {
  describe('map', () => {
    it('Given: function and array When: mapping Then: should transform each element', () => {
      // Arrange
      const double = (x: number) => x * 2;
      const array = [1, 2, 3];

      // Act
      const result = map(double)(array);

      // Assert
      expect(result).toEqual([2, 4, 6]);
    });

    it('Given: empty array When: mapping Then: should return empty array', () => {
      // Act
      const result = map((x: number) => x * 2)([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('filter', () => {
    it('Given: predicate and array When: filtering Then: should return matching elements', () => {
      // Arrange
      const isEven = (x: number) => x % 2 === 0;
      const array = [1, 2, 3, 4, 5, 6];

      // Act
      const result = filter(isEven)(array);

      // Assert
      expect(result).toEqual([2, 4, 6]);
    });

    it('Given: no matching elements When: filtering Then: should return empty array', () => {
      // Act
      const result = filter((x: number) => x > 10)([1, 2, 3]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('reduce', () => {
    it('Given: reducer and initial value When: reducing Then: should accumulate result', () => {
      // Arrange
      const sum = (acc: number, x: number) => acc + x;
      const array = [1, 2, 3, 4];

      // Act
      const result = reduce(sum, 0)(array);

      // Assert
      expect(result).toBe(10);
    });

    it('Given: empty array When: reducing Then: should return initial value', () => {
      // Act
      const result = reduce((acc: number, x: number) => acc + x, 100)([]);

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('flatMap', () => {
    it('Given: function returning arrays When: flatMapping Then: should flatten result', () => {
      // Arrange
      const duplicate = (x: number) => [x, x];
      const array = [1, 2, 3];

      // Act
      const result = flatMap(duplicate)(array);

      // Assert
      expect(result).toEqual([1, 1, 2, 2, 3, 3]);
    });
  });

  describe('find', () => {
    it('Given: predicate When: finding Then: should return first matching element', () => {
      // Arrange
      const isGreaterThan5 = (x: number) => x > 5;
      const array = [1, 3, 5, 7, 9];

      // Act
      const result = find(isGreaterThan5)(array);

      // Assert
      expect(result).toBe(7);
    });

    it('Given: no matching element When: finding Then: should return undefined', () => {
      // Act
      const result = find((x: number) => x > 100)([1, 2, 3]);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('every', () => {
    it('Given: all elements match When: checking every Then: should return true', () => {
      // Arrange
      const isPositive = (x: number) => x > 0;
      const array = [1, 2, 3, 4, 5];

      // Act
      const result = every(isPositive)(array);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: some elements dont match When: checking every Then: should return false', () => {
      // Act
      const result = every((x: number) => x > 0)([1, 2, -3, 4]);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('some', () => {
    it('Given: some elements match When: checking some Then: should return true', () => {
      // Arrange
      const isNegative = (x: number) => x < 0;
      const array = [1, 2, -3, 4];

      // Act
      const result = some(isNegative)(array);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: no elements match When: checking some Then: should return false', () => {
      // Act
      const result = some((x: number) => x < 0)([1, 2, 3, 4]);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('identity', () => {
    it('Given: value When: calling identity Then: should return same value', () => {
      // Act & Assert
      expect(identity(42)).toBe(42);
      expect(identity('hello')).toBe('hello');
      expect(identity({ key: 'value' })).toEqual({ key: 'value' });
    });
  });

  describe('constant', () => {
    it('Given: value When: calling constant Then: should return function that always returns value', () => {
      // Arrange
      const always42 = constant(42);

      // Act & Assert
      expect(always42()).toBe(42);
      expect(always42()).toBe(42);
    });
  });

  describe('noop', () => {
    it('Given: noop When: calling Then: should return undefined', () => {
      // Act
      const result = noop();

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('forEach', () => {
    it('Given: function and array When: forEach Then: should call function for each element', () => {
      // Arrange
      const mockFn = jest.fn();
      const array = [1, 2, 3];

      // Act
      forEach(mockFn)(array);

      // Assert
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(mockFn).toHaveBeenCalledWith(1, 0, array);
      expect(mockFn).toHaveBeenCalledWith(2, 1, array);
      expect(mockFn).toHaveBeenCalledWith(3, 2, array);
    });
  });
});
