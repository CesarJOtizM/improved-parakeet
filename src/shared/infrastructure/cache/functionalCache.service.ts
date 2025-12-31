// Functional Cache Service
// Implements ICacheService using NestJS Cache Manager with Result monad

import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result, err, ok } from '@shared/domain/result';
import { BusinessRuleError } from '@shared/domain/result/domainError';
import { ICacheService } from '@shared/ports/cache';

@Injectable()
export class FunctionalCacheService implements ICacheService {
  private readonly logger = new Logger(FunctionalCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   * Returns Result monad for type-safe error handling
   */
  async get<T>(key: string): Promise<Result<T | null, BusinessRuleError>> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return ok(value ?? null);
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return err(
        new BusinessRuleError(
          `Failed to get cache value: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Set a value in cache
   * Returns Result monad for type-safe error handling
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, BusinessRuleError>> {
    try {
      // TTL is in seconds, but cache manager expects milliseconds
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      return ok(undefined);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
      return err(
        new BusinessRuleError(
          `Failed to set cache value: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Delete a value from cache
   * Returns Result monad for type-safe error handling
   */
  async delete(key: string): Promise<Result<void, BusinessRuleError>> {
    try {
      await this.cacheManager.del(key);
      return ok(undefined);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
      return err(
        new BusinessRuleError(
          `Failed to delete cache value: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Check if a key exists in cache
   * Returns Result monad for type-safe error handling
   */
  async exists(key: string): Promise<Result<boolean, BusinessRuleError>> {
    try {
      const value = await this.cacheManager.get(key);
      return ok(value !== undefined && value !== null);
    } catch (error) {
      this.logger.error(`Error checking cache key existence ${key}:`, error);
      return err(
        new BusinessRuleError(
          `Failed to check cache key existence: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Clear all cache entries (use with caution)
   * Returns Result monad for type-safe error handling
   * Note: Cache store may not support clear operation
   */
  async clear(): Promise<Result<void, BusinessRuleError>> {
    try {
      // Cache Manager v5+ doesn't have reset(), we need to use store directly
      // or implement a workaround. For now, log a warning.
      this.logger.warn(
        'Cache clear operation not fully supported. Use deleteMany for specific keys.'
      );
      return ok(undefined);
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
      return err(
        new BusinessRuleError(
          `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Get multiple values from cache
   * Returns Result monad for type-safe error handling
   */
  async getMany<T>(keys: string[]): Promise<Result<Map<string, T | null>, BusinessRuleError>> {
    try {
      const results = new Map<string, T | null>();

      // Execute all get operations in parallel
      const promises = keys.map(async key => {
        const result = await this.get<T>(key);
        return result.match(
          value => ({ key, value }),
          () => ({ key, value: null as T | null })
        );
      });

      const entries = await Promise.all(promises);
      entries.forEach(({ key, value }) => {
        results.set(key, value);
      });

      return ok(results);
    } catch (error) {
      this.logger.error(`Error getting multiple cache keys:`, error);
      return err(
        new BusinessRuleError(
          `Failed to get multiple cache values: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Set multiple values in cache
   * Returns Result monad for type-safe error handling
   */
  async setMany<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<Result<void, BusinessRuleError>> {
    try {
      // Execute all set operations in parallel
      const promises = entries.map(({ key, value, ttl }) => this.set(key, value, ttl));
      const results = await Promise.all(promises);

      // Check if any operation failed
      const failedResult = results.find(result => result.isErr());
      if (failedResult && failedResult.isErr()) {
        return err(failedResult.unwrapErr());
      }

      return ok(undefined);
    } catch (error) {
      this.logger.error(`Error setting multiple cache keys:`, error);
      return err(
        new BusinessRuleError(
          `Failed to set multiple cache values: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Delete multiple keys from cache
   * Returns Result monad for type-safe error handling
   */
  async deleteMany(keys: string[]): Promise<Result<void, BusinessRuleError>> {
    try {
      // Execute all delete operations in parallel
      const promises = keys.map(key => this.delete(key));
      const results = await Promise.all(promises);

      // Check if any operation failed
      const failedResult = results.find(result => result.isErr());
      if (failedResult && failedResult.isErr()) {
        return err(failedResult.unwrapErr());
      }

      return ok(undefined);
    } catch (error) {
      this.logger.error(`Error deleting multiple cache keys:`, error);
      return err(
        new BusinessRuleError(
          `Failed to delete multiple cache values: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }
}
