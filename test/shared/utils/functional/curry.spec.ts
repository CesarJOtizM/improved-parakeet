// Curry Function Tests
// Unit tests for the curry function following AAA and Given-When-Then patterns

import { curry } from '@shared/utils/functional';

describe('curry', () => {
  describe('Basic currying', () => {
    it('Given: two-argument function When: currying Then: should allow partial application', () => {
      // Arrange
      const add = (a: number, b: number) => a + b;

      // Act
      const curriedAdd = curry(add);
      const addFive = curriedAdd(5);

      // Assert
      expect(addFive(10)).toBe(15);
      expect(curriedAdd(5)(10)).toBe(15);
    });

    it('Given: three-argument function When: currying Then: should allow partial application', () => {
      // Arrange
      const multiply = (a: number, b: number, c: number) => a * b * c;

      // Act
      const curriedMultiply = curry(multiply);
      const multiplyByTwo = curriedMultiply(2);
      const multiplyByTwoAndThree = multiplyByTwo(3);

      // Assert
      expect(multiplyByTwoAndThree(4)).toBe(24);
      expect(curriedMultiply(2)(3)(4)).toBe(24);
    });

    it('Given: curried function When: providing all arguments at once Then: should execute immediately', () => {
      // Arrange
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);

      // Act
      const result = curriedAdd(5)(10);

      // Assert
      expect(result).toBe(15);
    });
  });

  describe('Complex scenarios', () => {
    it('Given: function with mixed types When: currying Then: should preserve types', () => {
      // Arrange
      const format = (prefix: string, value: number, suffix: string) =>
        `${prefix}${value}${suffix}`;

      // Act
      const curriedFormat = curry(format);
      const formatWithPrefix = curriedFormat('$');
      const formatWithPrefixAndSuffix = formatWithPrefix(100);

      // Assert
      expect(formatWithPrefixAndSuffix('USD')).toBe('$100USD');
    });

    it('Given: curried function When: chaining calls Then: should work correctly', () => {
      // Arrange
      const calculate = (a: number, b: number, c: number, d: number) => a + b * c - d;
      const curriedCalculate = curry(calculate);

      // Act
      const step1 = curriedCalculate(10);
      const step2 = step1(2);
      const step3 = step2(3);
      const result = step3(4);

      // Assert
      expect(result).toBe(10 + 2 * 3 - 4); // 10 + 6 - 4 = 12
      expect(result).toBe(12);
    });
  });
});
