import { describe, expect, it } from '@jest/globals';
import { curry } from '@shared/utils/functional/curry';

describe('curry', () => {
  it('Given: binary function When: currying Then: should allow partial application', () => {
    // Arrange
    const add = (a: number, b: number) => a + b;
    const curriedAdd = curry(add);

    // Act
    const add5 = curriedAdd(5);
    const result = add5(3);

    // Assert
    expect(result).toBe(8);
  });

  it('Given: curried function When: calling with all args Then: should return result', () => {
    // Arrange
    const add = (a: number, b: number) => a + b;
    const curriedAdd = curry(add);

    // Act - curry returns a function that takes one arg at a time
    const result = curriedAdd(5)(3);

    // Assert
    expect(result).toBe(8);
  });

  it('Given: ternary function When: currying Then: should allow multiple partial applications', () => {
    // Arrange
    const sum3 = (a: number, b: number, c: number) => a + b + c;
    const curriedSum3 = curry(sum3);

    // Act
    const step1 = curriedSum3(1);
    const step2 = step1(2);
    const result = step2(3);

    // Assert
    expect(result).toBe(6);
  });

  it('Given: function with no args When: currying Then: should return result immediately', () => {
    // Arrange
    const getValue = () => 42;
    const curriedGetValue = curry(getValue);

    // Act - for zero-arg functions, curry still returns a function that can be called
    // TypeScript infers CurriedFunction<[], number> as number, but runtime it's a function
    const result = (curriedGetValue as unknown as () => number)();

    // Assert
    expect(result).toBe(42);
  });

  it('Given: unary function When: currying Then: should work normally', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const curriedDouble = curry(double);

    // Act
    const result = curriedDouble(5);

    // Assert
    expect(result).toBe(10);
  });
});
