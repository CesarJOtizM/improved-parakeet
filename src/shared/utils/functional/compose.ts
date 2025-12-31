// Function composition (right-to-left)
// compose(f, g, h)(x) = f(g(h(x)))

type ComposeFunction<T, R> = (arg: T) => R;

/**
 * Composes functions from right to left
 * @example
 * const add = (x: number) => x + 1;
 * const multiply = (x: number) => x * 2;
 * const result = compose(add, multiply)(5); // (5 * 2) + 1 = 11
 */
export function compose<T1, T2>(fn1: ComposeFunction<T1, T2>): ComposeFunction<T1, T2>;
export function compose<T1, T2, T3>(
  fn2: ComposeFunction<T2, T3>,
  fn1: ComposeFunction<T1, T2>
): ComposeFunction<T1, T3>;
export function compose<T1, T2, T3, T4>(
  fn3: ComposeFunction<T3, T4>,
  fn2: ComposeFunction<T2, T3>,
  fn1: ComposeFunction<T1, T2>
): ComposeFunction<T1, T4>;
export function compose<T1, T2, T3, T4, T5>(
  fn4: ComposeFunction<T4, T5>,
  fn3: ComposeFunction<T3, T4>,
  fn2: ComposeFunction<T2, T3>,
  fn1: ComposeFunction<T1, T2>
): ComposeFunction<T1, T5>;
export function compose<T1, T2, T3, T4, T5, T6>(
  fn5: ComposeFunction<T5, T6>,
  fn4: ComposeFunction<T4, T5>,
  fn3: ComposeFunction<T3, T4>,
  fn2: ComposeFunction<T2, T3>,
  fn1: ComposeFunction<T1, T2>
): ComposeFunction<T1, T6>;
export function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T;
export function compose<T, R>(...fns: Array<(arg: unknown) => unknown>): (arg: T) => R {
  return (arg: T): R => {
    return fns.reduceRight((acc, fn) => fn(acc), arg as unknown) as R;
  };
}
