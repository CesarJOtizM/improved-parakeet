import { describe, expect, it, jest } from '@jest/globals';
import { ok } from '@shared/domain/result';
import {
  cacheMethod,
  createFindByIdKeyGenerator,
  createFindBySkuKeyGenerator,
  evictCache,
  updateCache,
} from '@shared/infrastructure/cache/cacheDecorators';

import type { ICacheService } from '@shared/ports/cache';

describe('Cache Decorators', () => {
  const buildCacheService = (): jest.Mocked<ICacheService> => ({
    get: jest.fn<any>(),
    set: jest.fn<any>(),
    delete: jest.fn<any>(),
    exists: jest.fn<any>(),
    clear: jest.fn<any>(),
    getMany: jest.fn<any>(),
    setMany: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
  });

  describe('cacheMethod', () => {
    it('Given: cached value When: calling method Then: should return cached result', async () => {
      // Arrange
      const cacheService = buildCacheService();
      cacheService.get.mockResolvedValue(ok('cached'));
      const method = jest.fn<any>().mockResolvedValue('fresh');

      // Act
      const result = await cacheMethod(
        cacheService,
        { entityType: 'product' },
        method as any,
        'product-1'
      );

      // Assert
      expect(result).toBe('cached');
      expect(method).not.toHaveBeenCalled();
    });

    it('Given: cache miss When: calling method Then: should call method and cache result', async () => {
      // Arrange
      const cacheService = buildCacheService();
      cacheService.get.mockResolvedValue(ok(null));
      cacheService.set.mockResolvedValue(ok(undefined));
      const method = jest.fn<any>().mockResolvedValue({ id: 'product-1' });

      // Act
      const result = await cacheMethod(
        cacheService,
        { entityType: 'product' },
        method as any,
        'product-1',
        'org-1'
      );

      // Assert
      expect(result).toEqual({ id: 'product-1' });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('evictCache', () => {
    it('Given: method result When: evicting cache Then: should delete cache key', async () => {
      // Arrange
      const cacheService = buildCacheService();
      cacheService.delete.mockResolvedValue(ok(undefined));
      const method = jest.fn<any>().mockResolvedValue('done');

      // Act
      const result = await evictCache(
        cacheService,
        {
          entityType: 'product',
          keyGenerator: args => `product:${String(args[0])}`,
        },
        method as any,
        'product-1'
      );

      // Assert
      expect(result).toBe('done');
      expect(cacheService.delete).toHaveBeenCalledWith('product:product-1');
      const methodCallOrder = method.mock.invocationCallOrder[0];
      const deleteCallOrder = (cacheService.delete as jest.Mock).mock.invocationCallOrder[0];
      expect(methodCallOrder).toBeLessThan(deleteCallOrder);
    });
  });

  describe('updateCache', () => {
    it('Given: method result When: updating cache Then: should set cache value', async () => {
      // Arrange
      const cacheService = buildCacheService();
      cacheService.set.mockResolvedValue(ok(undefined));
      const method = jest.fn<any>().mockResolvedValue({ id: 'product-1' });

      // Act
      const result = await updateCache(
        cacheService,
        {
          entityType: 'product',
          keyGenerator: args => `product:${String(args[0])}`,
          ttl: 120,
        },
        method as any,
        'product-1'
      );

      // Assert
      expect(result).toEqual({ id: 'product-1' });
      expect(cacheService.set).toHaveBeenCalledWith('product:product-1', { id: 'product-1' }, 120);
    });
  });

  describe('key generators', () => {
    it('Given: entity type When: creating findById key Then: should include orgId', () => {
      // Arrange
      const generator = createFindByIdKeyGenerator('product');

      // Act
      const key = generator(['product-1', 'org-1']);

      // Assert
      expect(key).toBe('product:org-1:product-1');
    });

    it('Given: entity type When: creating findBySku key Then: should include ttl and sku', () => {
      // Arrange
      const generator = createFindBySkuKeyGenerator('product');

      // Act
      const key = generator(['SKU-1', 'org-1']);

      // Assert
      expect(key).toBe('1800:product:org-1:sku:SKU-1');
    });
  });
});
