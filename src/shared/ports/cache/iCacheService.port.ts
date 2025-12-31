// Cache Service Port Interface
// Defines the contract for cache operations following functional programming principles

import { Result } from '@shared/domain/result';
import { DomainError } from '@shared/domain/result/domainError';

export interface ICacheService {
  /**
   * Get a value from cache
   * Returns Result monad for type-safe error handling
   */
  get<T>(key: string): Promise<Result<T | null, DomainError>>;

  /**
   * Set a value in cache
   * Returns Result monad for type-safe error handling
   */
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void, DomainError>>;

  /**
   * Delete a value from cache
   * Returns Result monad for type-safe error handling
   */
  delete(key: string): Promise<Result<void, DomainError>>;

  /**
   * Check if a key exists in cache
   * Returns Result monad for type-safe error handling
   */
  exists(key: string): Promise<Result<boolean, DomainError>>;

  /**
   * Clear all cache entries (use with caution)
   * Returns Result monad for type-safe error handling
   */
  clear(): Promise<Result<void, DomainError>>;

  /**
   * Get multiple values from cache
   * Returns Result monad for type-safe error handling
   */
  getMany<T>(keys: string[]): Promise<Result<Map<string, T | null>, DomainError>>;

  /**
   * Set multiple values in cache
   * Returns Result monad for type-safe error handling
   */
  setMany<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<Result<void, DomainError>>;

  /**
   * Delete multiple keys from cache
   * Returns Result monad for type-safe error handling
   */
  deleteMany(keys: string[]): Promise<Result<void, DomainError>>;
}
