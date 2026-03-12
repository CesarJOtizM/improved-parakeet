import { describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { err, ok } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';
import {
  cacheEntity,
  getCachedEntity,
  invalidateEntityCache,
  invalidateEntityTypeCache,
} from '@shared/infrastructure/cache/cacheHelpers';

import type { ICacheService } from '@shared/ports/cache';

describe('Cache Helpers', () => {
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

  it('Given: cache error When: caching entity Then: should log error', async () => {
    // Arrange
    const cacheService = buildCacheService();
    cacheService.set.mockResolvedValue(err(new ValidationError('cache failed')));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // Act
    await cacheEntity(cacheService, 'product', 'product-1', { id: 'product-1' }, 'org-1');

    // Assert
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('Given: cached value When: getting entity Then: should return value', async () => {
    // Arrange
    const cacheService = buildCacheService();
    cacheService.get.mockResolvedValue(ok({ id: 'product-1' }));

    // Act
    const result = await getCachedEntity(cacheService, 'product', 'product-1', 'org-1');

    // Assert
    expect(result).toEqual({ id: 'product-1' });
  });

  it('Given: cache miss When: getting entity Then: should return null', async () => {
    // Arrange
    const cacheService = buildCacheService();
    cacheService.get.mockResolvedValue(err(new ValidationError('miss')));

    // Act
    const result = await getCachedEntity(cacheService, 'product', 'product-1', 'org-1');

    // Assert
    expect(result).toBeNull();
  });

  it('Given: cache error When: invalidating entity Then: should log error', async () => {
    // Arrange
    const cacheService = buildCacheService();
    cacheService.delete.mockResolvedValue(err(new ValidationError('delete failed')));
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // Act
    await invalidateEntityCache(cacheService, 'product', 'product-1', 'org-1');

    // Assert
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('Given: entity type When: invalidating type cache Then: should warn', async () => {
    // Arrange
    const cacheService = buildCacheService();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    // Act
    await invalidateEntityTypeCache(cacheService, 'product', 'org-1');

    // Assert
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
