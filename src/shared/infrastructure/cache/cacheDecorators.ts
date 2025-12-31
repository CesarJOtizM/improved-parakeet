// Cache Decorators
// Method-level caching utilities for repositories and services

import { generateCacheKey, getTtlForEntity } from '@shared/config/cache.config';
import { ICacheService } from '@shared/ports/cache';

/**
 * Cache decorator options
 */
export interface ICacheOptions {
  entityType: string;
  keyGenerator?: (args: unknown[]) => string;
  ttl?: number;
  orgIdExtractor?: (args: unknown[]) => string | undefined;
}

/**
 * Cache method result
 * Usage: Wrap method calls with this function to cache results
 */
export async function cacheMethod<T>(
  cacheService: ICacheService,
  options: ICacheOptions,
  method: (...args: unknown[]) => Promise<T>,
  ...args: unknown[]
): Promise<T> {
  const { entityType, keyGenerator, ttl, orgIdExtractor } = options;

  // Generate cache key
  const cacheKey = keyGenerator
    ? keyGenerator(args)
    : generateCacheKey(entityType, args[0] as string, orgIdExtractor?.(args));

  // Try to get from cache
  const cachedResult = await cacheService.get<T>(cacheKey);
  if (cachedResult.isOk() && cachedResult.unwrap() !== null) {
    return cachedResult.unwrap()!;
  }

  // Execute method and cache result
  const result = await method(...args);
  const ttlToUse = ttl || getTtlForEntity(entityType);
  await cacheService.set(cacheKey, result, ttlToUse);

  return result;
}

/**
 * Evict cache on method execution
 * Usage: Wrap mutation methods with this function to invalidate cache
 */
export async function evictCache(
  cacheService: ICacheService,
  options: ICacheOptions,
  method: (...args: unknown[]) => Promise<unknown>,
  ...args: unknown[]
): Promise<unknown> {
  const { entityType, keyGenerator, orgIdExtractor } = options;

  // Execute method first
  const result = await method(...args);

  // Generate cache key and evict
  const cacheKey = keyGenerator
    ? keyGenerator(args)
    : generateCacheKey(entityType, args[0] as string, orgIdExtractor?.(args));

  await cacheService.delete(cacheKey);

  return result;
}

/**
 * Update cache after method execution
 * Usage: Wrap mutation methods with this function to update cache
 */
export async function updateCache<T>(
  cacheService: ICacheService,
  options: ICacheOptions,
  method: (...args: unknown[]) => Promise<T>,
  ...args: unknown[]
): Promise<T> {
  const { entityType, keyGenerator, ttl, orgIdExtractor } = options;

  // Execute method
  const result = await method(...args);

  // Generate cache key and update cache
  const cacheKey = keyGenerator
    ? keyGenerator(args)
    : generateCacheKey(entityType, args[0] as string, orgIdExtractor?.(args));

  const ttlToUse = ttl || getTtlForEntity(entityType);
  await cacheService.set(cacheKey, result, ttlToUse);

  return result;
}

/**
 * Helper to create cache key generator for findById methods
 */
export function createFindByIdKeyGenerator(entityType: string): (args: unknown[]) => string {
  return (args: unknown[]): string => {
    const id = args[0] as string;
    const orgId = args[1] as string | undefined;
    return generateCacheKey(entityType, id, orgId);
  };
}

/**
 * Helper to create cache key generator for findBySku methods
 */
export function createFindBySkuKeyGenerator(entityType: string): (args: unknown[]) => string {
  return (args: unknown[]): string => {
    const sku = args[0] as string;
    const orgId = args[1] as string;
    return `${getTtlForEntity(entityType)}:${entityType}:${orgId}:sku:${sku}`;
  };
}
