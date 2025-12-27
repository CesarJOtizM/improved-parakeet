// Result Utilities - Helper functions for working with Result monad
import { err } from './err';
import { ok } from './ok';

import type { Result } from './result.types';

/**
 * Convert a Promise to a Result
 * Catches any errors and wraps them in Result.err()
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Wrap a throwing function in a Result
 * Catches any errors and maps them using the provided error mapper
 */
export function fromThrowable<T, E = Error>(
  fn: () => T,
  errorMapper?: (e: unknown) => E
): Result<T, E> {
  try {
    const value = fn();
    return ok(value);
  } catch (error) {
    if (errorMapper) {
      return err(errorMapper(error));
    }
    return err((error instanceof Error ? error : new Error(String(error))) as E);
  }
}

/**
 * Combine multiple Results into a single Result
 * Returns the first error encountered, or all values as a tuple if all succeed
 */
export function combine<T extends readonly unknown[]>(results: {
  [K in keyof T]: Result<T[K], unknown>;
}): Result<T, unknown> {
  const values: unknown[] = [];

  for (const result of results) {
    if (result.isErr()) {
      return err(result.unwrapOrElse(e => e));
    }
    values.push(result.unwrap());
  }

  return ok(values as unknown as T);
}
