import { describe, expect, it } from '@jest/globals';
import { compose } from '@shared/utils/functional/compose';

describe('compose', () => {
  it('Given: two functions When: composing Then: should execute right to left', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const addOne = (x: number) => x + 1;
    const composed = compose(addOne, double);

    // Act
    const result = composed(5);

    // Assert
    // double(5) = 10, then addOne(10) = 11
    expect(result).toBe(11);
  });

  it('Given: three functions When: composing Then: should execute right to left', () => {
    // Arrange
    const triple = (x: number) => x * 3;
    const double = (x: number) => x * 2;
    const addOne = (x: number) => x + 1;
    const composed = compose(triple, double, addOne);

    // Act
    const result = composed(1);

    // Assert
    // addOne(1) = 2, double(2) = 4, triple(4) = 12
    expect(result).toBe(12);
  });

  it('Given: single function When: composing Then: should return same function', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const composed = compose(double);

    // Act
    const result = composed(5);

    // Assert
    expect(result).toBe(10);
  });

  it('Given: no functions When: composing Then: should return identity', () => {
    // Arrange
    const composed = compose();

    // Act
    const result = composed(42);

    // Assert
    expect(result).toBe(42);
  });

  it('Given: string transformation functions When: composing Then: should work correctly', () => {
    // Arrange
    const toUpper = (s: string) => s.toUpperCase();
    const addExclaim = (s: string) => s + '!';
    const composed = compose(addExclaim, toUpper);

    // Act
    const result = composed('hello');

    // Assert
    expect(result).toBe('HELLO!');
  });
});
