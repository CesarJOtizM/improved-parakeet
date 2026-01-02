import { describe, expect, it } from '@jest/globals';
import { pipe } from '@shared/utils/functional/pipe';

describe('pipe', () => {
  it('Given: two functions When: piping Then: should execute left to right', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const addOne = (x: number) => x + 1;
    const piped = pipe(double, addOne);

    // Act
    const result = piped(5);

    // Assert
    // double(5) = 10, then addOne(10) = 11
    expect(result).toBe(11);
  });

  it('Given: three functions When: piping Then: should execute left to right', () => {
    // Arrange
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const triple = (x: number) => x * 3;
    const piped = pipe(addOne, double, triple);

    // Act
    const result = piped(1);

    // Assert
    // addOne(1) = 2, double(2) = 4, triple(4) = 12
    expect(result).toBe(12);
  });

  it('Given: single function When: piping Then: should return same function', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const piped = pipe(double);

    // Act
    const result = piped(5);

    // Assert
    expect(result).toBe(10);
  });

  it('Given: no functions When: piping Then: should return identity', () => {
    // Arrange
    const piped = pipe();

    // Act
    const result = piped(42);

    // Assert
    expect(result).toBe(42);
  });

  it('Given: string transformation functions When: piping Then: should work correctly', () => {
    // Arrange
    const toUpper = (s: string) => s.toUpperCase();
    const addExclaim = (s: string) => s + '!';
    const piped = pipe(toUpper, addExclaim);

    // Act
    const result = piped('hello');

    // Assert
    expect(result).toBe('HELLO!');
  });
});
