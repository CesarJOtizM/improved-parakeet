import { describe, expect, it } from '@jest/globals';
import { curry, uncurry } from '@shared/utils/functional/curry';

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

  it('Given: binary function When: calling curried with both args at once Then: should return result', () => {
    // Arrange
    const add = (a: number, b: number) => a + b;
    const curriedAdd = curry(add) as unknown as (...args: number[]) => number;

    // Act
    const result = curriedAdd(5, 3);

    // Assert
    expect(result).toBe(8);
  });
});

describe('uncurry', () => {
  it('Given: curried binary function When: uncurrying Then: should accept all args at once', () => {
    // Arrange
    const add = (a: number, b: number) => a + b;
    const curriedAdd = curry(add);
    const uncurriedAdd = uncurry<[number, number], number>(
      curriedAdd as unknown as (arg: unknown) => unknown
    );

    // Act
    const result = uncurriedAdd(5, 3);

    // Assert
    expect(result).toBe(8);
  });

  it('Given: curried ternary function When: uncurrying Then: should accept all args at once', () => {
    // Arrange
    const sum3 = (a: number, b: number, c: number) => a + b + c;
    const curriedSum3 = curry(sum3);
    const uncurriedSum3 = uncurry<[number, number, number], number>(
      curriedSum3 as unknown as (arg: unknown) => unknown
    );

    // Act
    const result = uncurriedSum3(1, 2, 3);

    // Assert
    expect(result).toBe(6);
  });

  it('Given: curried unary function When: uncurrying Then: should work with single arg', () => {
    // Arrange
    const double = (x: number) => x * 2;
    const curriedDouble = curry(double);
    const uncurriedDouble = uncurry<[number], number>(
      curriedDouble as unknown as (arg: unknown) => unknown
    );

    // Act
    const result = uncurriedDouble(5);

    // Assert
    expect(result).toBe(10);
  });
});
