// Functional Cache Service Integration Tests
// Integration tests for FunctionalCacheService with Result monad and error handling

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { FunctionalCacheService } from '@shared/infrastructure/cache/functionalCache.service';

describe('FunctionalCacheService Integration', () => {
  let cacheService: FunctionalCacheService;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock; reset: jest.Mock };

  beforeEach(async () => {
    // Create a mock cache manager
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunctionalCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    cacheService = module.get<FunctionalCacheService>(FunctionalCacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('get', () => {
    it('Given: cached value exists When: getting value Then: should return Ok result with value', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123', name: 'Test' };
      cacheManager.get.mockResolvedValue(value);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        val => {
          expect(val).toEqual(value);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('Given: cached value does not exist When: getting value Then: should return Ok result with null', async () => {
      // Arrange
      const key = 'non-existent-key';
      cacheManager.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        val => {
          expect(val).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: cache error occurs When: getting value Then: should return Err result', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Cache error');
      cacheManager.get.mockRejectedValue(error);

      // Act
      const result = await cacheService.get(key);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        err => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toContain('Failed to get cache value');
        }
      );
    });
  });

  describe('set', () => {
    it('Given: value and TTL When: setting value Then: should return Ok result', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123', name: 'Test' };
      const ttl = 3600; // seconds
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await cacheService.set(key, value, ttl);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl * 1000); // TTL converted to milliseconds
    });

    it('Given: value without TTL When: setting value Then: should use default TTL', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123', name: 'Test' };
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await cacheService.set(key, value);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('Given: cache error occurs When: setting value Then: should return Err result', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123', name: 'Test' };
      const error = new Error('Cache error');
      cacheManager.set.mockRejectedValue(error);

      // Act
      const result = await cacheService.set(key, value);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        err => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toContain('Failed to set cache value');
        }
      );
    });
  });

  describe('delete', () => {
    it('Given: existing key When: deleting value Then: should return Ok result', async () => {
      // Arrange
      const key = 'test-key';
      cacheManager.del.mockResolvedValue(undefined);

      // Act
      const result = await cacheService.delete(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('Given: cache error occurs When: deleting value Then: should return Err result', async () => {
      // Arrange
      const key = 'test-key';
      const error = new Error('Cache error');
      cacheManager.del.mockRejectedValue(error);

      // Act
      const result = await cacheService.delete(key);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        err => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toContain('Failed to delete cache value');
        }
      );
    });
  });

  describe('exists', () => {
    it('Given: existing key When: checking existence Then: should return Ok result with true', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123' };
      cacheManager.get.mockResolvedValue(value);

      // Act
      const result = await cacheService.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        exists => {
          expect(exists).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent key When: checking existence Then: should return Ok result with false', async () => {
      // Arrange
      const key = 'non-existent-key';
      cacheManager.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        exists => {
          expect(exists).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('clear', () => {
    it('Given: cache When: clearing Then: should return Ok result', async () => {
      // Arrange
      // Note: clear() currently only logs a warning, doesn't actually clear cache
      // This is because Cache Manager v5+ doesn't support reset() directly

      // Act
      const result = await cacheService.clear();

      // Assert
      expect(result.isOk()).toBe(true);
      // Note: reset() is not called in current implementation
    });

    it('Given: cache When: clearing Then: should return Ok result without errors', async () => {
      // Arrange
      // The current implementation always returns Ok with a warning

      // Act
      const result = await cacheService.clear();

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        () => {
          // Success - clear operation completed (with warning)
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
