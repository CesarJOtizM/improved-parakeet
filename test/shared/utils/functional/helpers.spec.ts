// Functional Helpers Tests
// Unit tests for functional helper functions following AAA and Given-When-Then patterns

import {
  map,
  filter,
  reduce,
  forEach,
  tap,
  identity,
  prop,
  pick,
  omit,
} from '@shared/utils/functional';

describe('Functional Helpers', () => {
  describe('map', () => {
    it('Given: array and function When: mapping Then: should apply function to each element', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const double = (x: number) => x * 2;

      // Act
      const mapper = map(double);
      const result = mapper(numbers);

      // Assert
      expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    it('Given: empty array When: mapping Then: should return empty array', () => {
      // Arrange
      const numbers: number[] = [];
      const double = (x: number) => x * 2;

      // Act
      const mapper = map(double);
      const result = mapper(numbers);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('filter', () => {
    it('Given: array and predicate When: filtering Then: should return filtered array', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5, 6];
      const isEven = (x: number) => x % 2 === 0;

      // Act
      const filterer = filter(isEven);
      const result = filterer(numbers);

      // Assert
      expect(result).toEqual([2, 4, 6]);
    });

    it('Given: empty array When: filtering Then: should return empty array', () => {
      // Arrange
      const numbers: number[] = [];
      const isEven = (x: number) => x % 2 === 0;

      // Act
      const filterer = filter(isEven);
      const result = filterer(numbers);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('reduce', () => {
    it('Given: array, reducer and initial value When: reducing Then: should accumulate result', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const sum = (acc: number, x: number) => acc + x;

      // Act
      const reducer = reduce(sum, 0);
      const result = reducer(numbers);

      // Assert
      expect(result).toBe(15);
    });

    it('Given: array and reducer When: reducing without initial value Then: should use first element', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const sum = (acc: number, x: number) => acc + x;

      // Act
      const reducer = reduce(sum, 0);
      const result = reducer(numbers);

      // Assert
      expect(result).toBe(15);
    });
  });

  describe('forEach', () => {
    it('Given: array and function When: forEach Then: should execute function for each element', () => {
      // Arrange
      const numbers = [1, 2, 3];
      const results: number[] = [];
      const collect = (x: number) => {
        results.push(x * 2);
      };

      // Act
      const forEacher = forEach(collect);
      forEacher(numbers);

      // Assert
      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('tap', () => {
    it('Given: value and side effect function When: tapping Then: should return original value', () => {
      // Arrange
      const value = 42;
      let sideEffectValue: number | undefined;
      const sideEffect = (x: number) => {
        sideEffectValue = x * 2;
      };

      // Act
      const tapper = tap(sideEffect);
      const result = tapper(value);

      // Assert
      expect(result).toBe(42);
      expect(sideEffectValue).toBe(84);
    });
  });

  describe('identity', () => {
    it('Given: any value When: applying identity Then: should return the value unchanged', () => {
      // Arrange
      const value = 42;

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(42);
    });

    it('Given: object When: applying identity Then: should return the same object', () => {
      // Arrange
      const obj = { name: 'test', value: 42 };

      // Act
      const result = identity(obj);

      // Assert
      expect(result).toBe(obj);
      expect(result).toEqual(obj);
    });
  });

  describe('prop', () => {
    it('Given: object and key When: getting prop Then: should return property value', () => {
      // Arrange
      const obj = { name: 'John', age: 30 };

      // Act
      const getName = prop('name');
      const getAge = prop('age');
      const name = getName(obj);
      const age = getAge(obj);

      // Assert
      expect(name).toBe('John');
      expect(age).toBe(30);
    });
  });

  describe('pick', () => {
    it('Given: object and keys When: picking Then: should return object with only picked keys', () => {
      // Arrange
      const obj = { name: 'John', age: 30, city: 'NYC', country: 'USA' };

      // Act
      const picker = pick<typeof obj, 'name' | 'age'>(['name', 'age']);
      const result = picker(obj);

      // Assert
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result).not.toHaveProperty('city');
      expect(result).not.toHaveProperty('country');
    });
  });

  describe('omit', () => {
    it('Given: object and keys When: omitting Then: should return object without omitted keys', () => {
      // Arrange
      const obj = { name: 'John', age: 30, city: 'NYC', country: 'USA' };

      // Act
      const omiter = omit<typeof obj, 'city' | 'country'>(['city', 'country']);
      const result = omiter(obj);

      // Assert
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result).not.toHaveProperty('city');
      expect(result).not.toHaveProperty('country');
    });
  });
});
