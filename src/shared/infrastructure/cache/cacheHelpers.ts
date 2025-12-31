// Cache Helper Functions
// Utility functions for common cache operations

import { Logger } from '@nestjs/common';
import {
  generateCacheKey,
  generateCacheKeyPattern,
  getTtlForEntity,
} from '@shared/config/cache.config';
import { ICacheService } from '@shared/ports/cache';

const logger = new Logger('CacheHelpers');

/**
 * Cache an entity by ID
 */
export async function cacheEntity<T>(
  cacheService: ICacheService,
  entityType: string,
  id: string,
  entity: T,
  orgId?: string,
  ttl?: number
): Promise<void> {
  const key = generateCacheKey(entityType, id, orgId);
  const ttlToUse = ttl || getTtlForEntity(entityType);
  const result = await cacheService.set(key, entity, ttlToUse);
  if (result.isErr()) {
    // Log error but don't throw - cache failures shouldn't break the application
    const error = result.unwrapErr();
    logger.error(`Failed to cache ${entityType} ${id}:`, error.message);
  }
}

/**
 * Get a cached entity by ID
 */
export async function getCachedEntity<T>(
  cacheService: ICacheService,
  entityType: string,
  id: string,
  orgId?: string
): Promise<T | null> {
  const key = generateCacheKey(entityType, id, orgId);
  const result = await cacheService.get<T>(key);
  return result.match(
    value => value,
    () => null
  );
}

/**
 * Invalidate cache for an entity
 */
export async function invalidateEntityCache(
  cacheService: ICacheService,
  entityType: string,
  id: string,
  orgId?: string
): Promise<void> {
  const key = generateCacheKey(entityType, id, orgId);
  const result = await cacheService.delete(key);
  if (result.isErr()) {
    // Log error but don't throw - cache failures shouldn't break the application
    const error = result.unwrapErr();
    logger.error(`Failed to invalidate cache for ${entityType} ${id}:`, error.message);
  }
}

/**
 * Invalidate all cache entries for an entity type in an organization
 */
export async function invalidateEntityTypeCache(
  _cacheService: ICacheService,
  entityType: string,
  orgId?: string
): Promise<void> {
  // Note: Full pattern matching would require Redis SCAN or similar
  // For now, this is a placeholder that can be extended with Redis-specific implementation
  // The cacheService parameter is reserved for future implementation
  const pattern = generateCacheKeyPattern(entityType, orgId);
  // In a real implementation, you would use Redis SCAN to find and delete matching keys
  logger.warn(`Pattern-based cache invalidation not fully implemented for pattern: ${pattern}`);
}
