// Function composition (left-to-right)
// pipe(f, g, h)(x) = h(g(f(x)))

type PipeFunction<T, R> = (arg: T) => R;

/**
 * Composes functions from left to right
 * @example
 * const add = (x: number) => x + 1;
 * const multiply = (x: number) => x * 2;
 * const result = pipe(add, multiply)(5); // (5 + 1) * 2 = 12
 */
export function pipe<T1, T2>(fn1: PipeFunction<T1, T2>): PipeFunction<T1, T2>;
export function pipe<T1, T2, T3>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>
): PipeFunction<T1, T3>;
export function pipe<T1, T2, T3, T4>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>,
  fn3: PipeFunction<T3, T4>
): PipeFunction<T1, T4>;
export function pipe<T1, T2, T3, T4, T5>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>,
  fn3: PipeFunction<T3, T4>,
  fn4: PipeFunction<T4, T5>
): PipeFunction<T1, T5>;
export function pipe<T1, T2, T3, T4, T5, T6>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>,
  fn3: PipeFunction<T3, T4>,
  fn4: PipeFunction<T4, T5>,
  fn5: PipeFunction<T5, T6>
): PipeFunction<T1, T6>;
export function pipe<T1, T2, T3, T4, T5, T6, T7>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>,
  fn3: PipeFunction<T3, T4>,
  fn4: PipeFunction<T4, T5>,
  fn5: PipeFunction<T5, T6>,
  fn6: PipeFunction<T6, T7>
): PipeFunction<T1, T7>;
export function pipe<T1, T2, T3, T4, T5, T6, T7, T8>(
  fn1: PipeFunction<T1, T2>,
  fn2: PipeFunction<T2, T3>,
  fn3: PipeFunction<T3, T4>,
  fn4: PipeFunction<T4, T5>,
  fn5: PipeFunction<T5, T6>,
  fn6: PipeFunction<T6, T7>,
  fn7: PipeFunction<T7, T8>
): PipeFunction<T1, T8>;
export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T;
export function pipe<T, R>(...fns: Array<(arg: unknown) => unknown>): (arg: T) => R {
  return (arg: T): R => {
    return fns.reduce((acc, fn) => fn(acc), arg as unknown) as R;
  };
}
