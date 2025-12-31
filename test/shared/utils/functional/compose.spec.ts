// Compose Function Tests
// Unit tests for the compose function following AAA and Given-When-Then patterns

import { compose } from '@shared/utils/functional';

describe('compose', () => {
  describe('Basic composition', () => {
    it('Given: single function When: composing Then: should return the function unchanged', () => {
      // Arrange
      const addOne = (x: number) => x + 1;

      // Act
      const composed = compose(addOne);

      // Assert
      expect(composed(5)).toBe(6);
    });

    it('Given: two functions When: composing Then: should compose right to left', () => {
      // Arrange
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;

      // Act
      const composed = compose(multiplyByTwo, addOne);

      // Assert
      expect(composed(5)).toBe(12); // (5 + 1) * 2 = 12
    });

    it('Given: three functions When: composing Then: should compose right to left', () => {
      // Arrange
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;
      const subtractThree = (x: number) => x - 3;

      // Act
      const composed = compose(subtractThree, multiplyByTwo, addOne);

      // Assert
      expect(composed(5)).toBe(9); // ((5 + 1) * 2) - 3 = 9
    });

    it('Given: empty arguments When: composing Then: should return identity function', () => {
      // Arrange
      const value = 42;

      // Act
      const composed = compose();

      // Assert
      expect(composed(value)).toBe(value);
    });
  });

  describe('Comparison with pipe', () => {
    it('Given: same functions in reverse order When: using compose vs pipe Then: should produce same result', () => {
      // Arrange
      const addOne = (x: number) => x + 1;
      const multiplyByTwo = (x: number) => x * 2;
      const subtractThree = (x: number) => x - 3;

      // Act
      const piped = (x: number) => subtractThree(multiplyByTwo(addOne(x)));
      const composed = compose(subtractThree, multiplyByTwo, addOne);

      // Assert
      expect(composed(5)).toBe(piped(5));
      expect(composed(5)).toBe(9);
    });
  });

  describe('Type safety', () => {
    it('Given: functions with different types When: composing Then: should handle type transformations', () => {
      // Arrange
      const toString = (x: number) => x.toString();
      const toUpperCase = (x: string) => x.toUpperCase();
      const addExclamation = (x: string) => x + '!';

      // Act
      const composed = compose(addExclamation, toUpperCase, toString);

      // Assert
      expect(composed(42)).toBe('42!');
    });
  });
});
