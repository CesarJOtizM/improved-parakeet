// Function currying utilities

type CurriedFunction<T extends unknown[], R> = T extends [infer First, ...infer Rest]
  ? (arg: First) => CurriedFunction<Rest, R>
  : R;

/**
 * Curries a function
 * @example
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * const add5 = curriedAdd(5);
 * const result = add5(3); // 8
 */
export function curry<T extends unknown[], R>(fn: (...args: T) => R): CurriedFunction<T, R> {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...(args as T));
    }
    return (...nextArgs: unknown[]) => curried(...args, ...nextArgs);
  } as CurriedFunction<T, R>;
}

/**
 * Uncurries a curried function
 */
export function uncurry<T extends unknown[], R>(fn: (arg: unknown) => unknown): (...args: T) => R {
  return (...args: T): R => {
    let result: unknown = fn;
    for (const arg of args) {
      result = (result as (arg: unknown) => unknown)(arg);
    }
    return result as R;
  };
}
