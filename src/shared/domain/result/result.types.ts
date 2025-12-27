// Result Types - Type definitions for Result monad
// This file contains only types to avoid circular dependencies

import type { Err } from './err';
import type { Ok } from './ok';

export type Result<T, E> = Ok<T, E> | Err<T, E>;
