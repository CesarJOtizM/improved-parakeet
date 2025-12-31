// Cache Configuration
// Centralized cache configuration for TTL, key prefixes, and invalidation strategies

export interface ICacheConfig {
  enabled: boolean;
  defaultTtl: number;
  entityTtls: Record<string, number>;
  keyPrefixes: Record<string, string>;
}

export const DEFAULT_CACHE_CONFIG: ICacheConfig = {
  enabled: true,
  defaultTtl: 3600, // 1 hour in seconds
  entityTtls: {
    product: 1800, // 30 minutes
    warehouse: 3600, // 1 hour
    user: 1800, // 30 minutes
    movement: 600, // 10 minutes
    sale: 600, // 10 minutes
    return: 600, // 10 minutes
    stock: 300, // 5 minutes
  },
  keyPrefixes: {
    product: 'product:',
    warehouse: 'warehouse:',
    user: 'user:',
    movement: 'movement:',
    sale: 'sale:',
    return: 'return:',
    stock: 'stock:',
  },
};

/**
 * Get TTL for a specific entity type
 */
export function getTtlForEntity(
  entityType: string,
  config: ICacheConfig = DEFAULT_CACHE_CONFIG
): number {
  return config.entityTtls[entityType] || config.defaultTtl;
}

/**
 * Get cache key prefix for a specific entity type
 */
export function getKeyPrefixForEntity(
  entityType: string,
  config: ICacheConfig = DEFAULT_CACHE_CONFIG
): string {
  return config.keyPrefixes[entityType] || `${entityType}:`;
}

/**
 * Generate cache key for an entity
 */
export function generateCacheKey(
  entityType: string,
  id: string,
  orgId?: string,
  config: ICacheConfig = DEFAULT_CACHE_CONFIG
): string {
  const prefix = getKeyPrefixForEntity(entityType, config);
  return orgId ? `${prefix}${orgId}:${id}` : `${prefix}${id}`;
}

/**
 * Generate cache key pattern for invalidation
 */
export function generateCacheKeyPattern(
  entityType: string,
  orgId?: string,
  config: ICacheConfig = DEFAULT_CACHE_CONFIG
): string {
  const prefix = getKeyPrefixForEntity(entityType, config);
  return orgId ? `${prefix}${orgId}:*` : `${prefix}*`;
}
