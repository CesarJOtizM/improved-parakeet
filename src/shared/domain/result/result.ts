// Result Monad - Functional error handling pattern
// Provides type-safe error handling with explicit error types

// Re-export type
export type { Result } from './result.types';

// Re-export classes and factory functions for convenience
export { Err, err } from './err';
export { Ok, ok } from './ok';
