import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_CACHE_CONFIG,
  generateCacheKey,
  generateCacheKeyPattern,
  getKeyPrefixForEntity,
  getTtlForEntity,
  ICacheConfig,
} from '@shared/config/cache.config';

describe('cache.config', () => {
  describe('DEFAULT_CACHE_CONFIG', () => {
    it('Given: default config When: checking enabled flag Then: should be true', () => {
      // Assert
      expect(DEFAULT_CACHE_CONFIG.enabled).toBe(true);
    });

    it('Given: default config When: checking default TTL Then: should be 3600 seconds (1 hour)', () => {
      // Assert
      expect(DEFAULT_CACHE_CONFIG.defaultTtl).toBe(3600);
    });

    it('Given: default config When: checking entity TTLs Then: should have correct values for all entities', () => {
      // Assert
      expect(DEFAULT_CACHE_CONFIG.entityTtls).toEqual({
        product: 1800,
        warehouse: 3600,
        user: 1800,
        movement: 600,
        sale: 600,
        return: 600,
        stock: 300,
      });
    });

    it('Given: default config When: checking key prefixes Then: should have correct prefixes for all entities', () => {
      // Assert
      expect(DEFAULT_CACHE_CONFIG.keyPrefixes).toEqual({
        product: 'product:',
        warehouse: 'warehouse:',
        user: 'user:',
        movement: 'movement:',
        sale: 'sale:',
        return: 'return:',
        stock: 'stock:',
      });
    });
  });

  describe('getTtlForEntity', () => {
    it('Given: known entity type When: getting TTL Then: should return entity-specific TTL', () => {
      // Act & Assert
      expect(getTtlForEntity('product')).toBe(1800);
      expect(getTtlForEntity('stock')).toBe(300);
      expect(getTtlForEntity('warehouse')).toBe(3600);
    });

    it('Given: unknown entity type When: getting TTL Then: should return default TTL', () => {
      // Act
      const ttl = getTtlForEntity('unknown-entity');

      // Assert
      expect(ttl).toBe(DEFAULT_CACHE_CONFIG.defaultTtl);
      expect(ttl).toBe(3600);
    });

    it('Given: custom config When: getting TTL Then: should use custom config values', () => {
      // Arrange
      const customConfig: ICacheConfig = {
        enabled: true,
        defaultTtl: 7200,
        entityTtls: { product: 900 },
        keyPrefixes: { product: 'p:' },
      };

      // Act & Assert
      expect(getTtlForEntity('product', customConfig)).toBe(900);
      expect(getTtlForEntity('unknown', customConfig)).toBe(7200);
    });
  });

  describe('getKeyPrefixForEntity', () => {
    it('Given: known entity type When: getting prefix Then: should return entity-specific prefix', () => {
      // Act & Assert
      expect(getKeyPrefixForEntity('product')).toBe('product:');
      expect(getKeyPrefixForEntity('user')).toBe('user:');
      expect(getKeyPrefixForEntity('sale')).toBe('sale:');
    });

    it('Given: unknown entity type When: getting prefix Then: should return fallback prefix with entity type', () => {
      // Act
      const prefix = getKeyPrefixForEntity('category');

      // Assert
      expect(prefix).toBe('category:');
    });

    it('Given: custom config When: getting prefix Then: should use custom config values', () => {
      // Arrange
      const customConfig: ICacheConfig = {
        enabled: true,
        defaultTtl: 3600,
        entityTtls: {},
        keyPrefixes: { product: 'prod_' },
      };

      // Act & Assert
      expect(getKeyPrefixForEntity('product', customConfig)).toBe('prod_');
      expect(getKeyPrefixForEntity('other', customConfig)).toBe('other:');
    });
  });

  describe('generateCacheKey', () => {
    it('Given: entity type and id without orgId When: generating key Then: should return prefix + id', () => {
      // Act
      const key = generateCacheKey('product', 'abc123');

      // Assert
      expect(key).toBe('product:abc123');
    });

    it('Given: entity type, id, and orgId When: generating key Then: should return prefix + orgId + id', () => {
      // Act
      const key = generateCacheKey('product', 'abc123', 'org-001');

      // Assert
      expect(key).toBe('product:org-001:abc123');
    });

    it('Given: unknown entity type When: generating key Then: should use fallback prefix', () => {
      // Act
      const key = generateCacheKey('category', 'cat-01');

      // Assert
      expect(key).toBe('category:cat-01');
    });

    it('Given: unknown entity type with orgId When: generating key Then: should use fallback prefix with orgId', () => {
      // Act
      const key = generateCacheKey('category', 'cat-01', 'org-001');

      // Assert
      expect(key).toBe('category:org-001:cat-01');
    });

    it('Given: custom config When: generating key Then: should use custom prefixes', () => {
      // Arrange
      const customConfig: ICacheConfig = {
        enabled: true,
        defaultTtl: 3600,
        entityTtls: {},
        keyPrefixes: { product: 'p/' },
      };

      // Act
      const key = generateCacheKey('product', 'abc123', undefined, customConfig);

      // Assert
      expect(key).toBe('p/abc123');
    });
  });

  describe('generateCacheKeyPattern', () => {
    it('Given: entity type without orgId When: generating pattern Then: should return prefix + wildcard', () => {
      // Act
      const pattern = generateCacheKeyPattern('product');

      // Assert
      expect(pattern).toBe('product:*');
    });

    it('Given: entity type with orgId When: generating pattern Then: should return prefix + orgId + wildcard', () => {
      // Act
      const pattern = generateCacheKeyPattern('product', 'org-001');

      // Assert
      expect(pattern).toBe('product:org-001:*');
    });

    it('Given: unknown entity type When: generating pattern Then: should use fallback prefix', () => {
      // Act
      const pattern = generateCacheKeyPattern('category');

      // Assert
      expect(pattern).toBe('category:*');
    });

    it('Given: unknown entity type with orgId When: generating pattern Then: should use fallback prefix with orgId', () => {
      // Act
      const pattern = generateCacheKeyPattern('category', 'org-001');

      // Assert
      expect(pattern).toBe('category:org-001:*');
    });
  });
});
