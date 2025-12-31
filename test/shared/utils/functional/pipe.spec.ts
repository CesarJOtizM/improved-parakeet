// Pipe Function Tests
// Unit tests for the pipe function following AAA and Given-When-Then patterns

import { pipe } from '@shared/utils/functional';

describe('pipe', () => {
  describe('Basic composition', () => {
    it('Given: single function When: piping Then: should return the function unchanged', () => {
      // Arrange
      const addOne = (x: number) => x + 1;

      // Act
      const piped = pipe(addOne);

      // Assert
      expect(piped(5)).toBe(6);
    });

    it('Given: two functions When: piping Then: should compose left to right', () => {
      // Arrange
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;

      // Act
      const piped = pipe(addOne, multiplyByTwo);

      // Assert
      expect(piped(5)).toBe(12); // (5 + 1) * 2 = 12
    });

    it('Given: three functions When: piping Then: should compose left to right', () => {
      // Arrange
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;
      const subtractThree = (x: number) => x - 3;

      // Act
      const piped = pipe(addOne, multiplyByTwo, subtractThree);

      // Assert
      expect(piped(5)).toBe(9); // ((5 + 1) * 2) - 3 = 9
    });

    it('Given: empty arguments When: piping Then: should return identity function', () => {
      // Arrange
      const value = 42;

      // Act
      const piped = pipe();

      // Assert
      expect(piped(value)).toBe(value);
    });
  });

  describe('Type safety', () => {
    it('Given: functions with different types When: piping Then: should handle type transformations', () => {
      // Arrange
      const toString = (x: number) => x.toString();
      const toUpperCase = (x: string) => x.toUpperCase();
      const addExclamation = (x: string) => x + '!';

      // Act
      const piped = pipe(toString, toUpperCase, addExclamation);

      // Assert
      expect(piped(42)).toBe('42!');
    });
  });

  describe('Complex scenarios', () => {
    it('Given: array operations When: piping Then: should compose transformations', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const double = (x: number) => x * 2;
      const filterEven = (arr: number[]) => arr.filter(x => x % 2 === 0);
      const sum = (arr: number[]) => arr.reduce((acc, x) => acc + x, 0);

      // Act
      const piped = pipe((arr: number[]) => arr.map(double), filterEven, sum);

      // Assert
      // [1,2,3,4,5] -> [2,4,6,8,10] -> [2,4,6,8,10] (all even) -> 30
      expect(piped(numbers)).toBe(30);
    });

    it('Given: object transformations When: piping Then: should compose object operations', () => {
      // Arrange
      const obj = { name: 'john', age: 30 };
      const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
      const addYear = (age: number) => age + 1;
      const transform = (obj: { name: string; age: number }) => ({
        name: capitalize(obj.name),
        age: addYear(obj.age),
      });

      // Act
      const piped = pipe(transform);

      // Assert
      expect(piped(obj)).toEqual({ name: 'John', age: 31 });
    });
  });
});
