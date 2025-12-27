// Err - Error variant of Result monad
import type { Ok } from './ok';
import type { Result } from './result.types';

export class Err<T, E> {
  readonly _tag = 'Err' as const;
  readonly _error: E;

  private constructor(error: E) {
    this._error = error;
  }

  public static create<T, E>(error: E): Err<T, E> {
    return new Err(error);
  }

  public isOk(): this is Ok<T, E> {
    return false;
  }

  public isErr(): this is Err<T, E> {
    return true;
  }

  public map<U>(_fn: (value: T) => U): Result<U, E> {
    return Err.create(this._error) as Result<U, E>;
  }

  public flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return Err.create(this._error) as Result<U, E>;
  }

  public mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return Err.create(fn(this._error)) as Result<T, F>;
  }

  public unwrap(): T {
    throw new Error(`Called unwrap() on Err: ${String(this._error)}`);
  }

  public unwrapErr(): E {
    return this._error;
  }

  public unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  public unwrapOrElse(fn: (error: E) => T): T {
    return fn(this._error);
  }

  public match<U>(_onOk: (value: T) => U, onErr: (error: E) => U): U {
    return onErr(this._error);
  }
}

// Factory function
export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return Err.create(error) as Result<T, E>;
}
