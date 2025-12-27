// Ok - Success variant of Result monad
import type { Err } from './err';
import type { Result } from './result.types';

export class Ok<T, E> {
  readonly _tag = 'Ok' as const;
  readonly _value: T;

  private constructor(value: T) {
    this._value = value;
  }

  public static create<T, E>(value: T): Ok<T, E> {
    return new Ok(value);
  }

  public isOk(): this is Ok<T, E> {
    return true;
  }

  public isErr(): this is Err<T, E> {
    return false;
  }

  public map<U>(fn: (value: T) => U): Result<U, E> {
    return Ok.create(fn(this._value)) as Result<U, E>;
  }

  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this._value);
  }

  public mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return Ok.create(this._value) as Result<T, F>;
  }

  public unwrap(): T {
    return this._value;
  }

  public unwrapErr(): E {
    throw new Error(`Called unwrapErr() on Ok`);
  }

  public unwrapOr(_defaultValue: T): T {
    return this._value;
  }

  public unwrapOrElse(_fn: (error: E) => T): T {
    return this._value;
  }

  public match<U>(onOk: (value: T) => U, _onErr: (error: E) => U): U {
    return onOk(this._value);
  }
}

// Factory function
export function ok<T, E = never>(value: T): Result<T, E> {
  return Ok.create(value) as Result<T, E>;
}
