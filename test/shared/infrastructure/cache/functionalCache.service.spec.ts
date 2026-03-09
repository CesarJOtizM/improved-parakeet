import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { FunctionalCacheService } from '@shared/infrastructure/cache/functionalCache.service';

describe('FunctionalCacheService', () => {
  let service: FunctionalCacheService;
  let mockCacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunctionalCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<FunctionalCacheService>(FunctionalCacheService);
  });

  describe('get', () => {
    it('Given: key exists in cache When: getting value Then: should return ok result with value', async () => {
      // Arrange
      const key = 'test-key';
      const expectedValue = { id: '123', name: 'Test' };
      mockCacheManager.get.mockResolvedValue(expectedValue);

      // Act
      const result = await service.get<typeof expectedValue>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(expectedValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('Given: key does not exist in cache When: getting value Then: should return ok result with null', async () => {
      // Arrange
      const key = 'non-existent-key';
      mockCacheManager.get.mockResolvedValue(undefined);

      // Act
      const result = await service.get<string>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeNull();
    });

    it('Given: cache throws error When: getting value Then: should return err result', async () => {
      // Arrange
      const key = 'error-key';
      mockCacheManager.get.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.get<string>(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Failed to get cache value');
    });
  });

  describe('set', () => {
    it('Given: valid key and value When: setting value Then: should return ok result', async () => {
      // Arrange
      const key = 'test-key';
      const value = { id: '123', name: 'Test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.set(key, value);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('Given: key, value and TTL When: setting value Then: should convert TTL to milliseconds', async () => {
      // Arrange
      const key = 'test-key';
      const value = 'test-value';
      const ttlSeconds = 60;
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.set(key, value, ttlSeconds);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, 60000);
    });

    it('Given: cache throws error When: setting value Then: should return err result', async () => {
      // Arrange
      const key = 'error-key';
      const value = 'test-value';
      mockCacheManager.set.mockRejectedValue(new Error('Write failed'));

      // Act
      const result = await service.set(key, value);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Failed to set cache value');
    });
  });

  describe('delete', () => {
    it('Given: key exists in cache When: deleting value Then: should return ok result', async () => {
      // Arrange
      const key = 'test-key';
      mockCacheManager.del.mockResolvedValue(undefined);

      // Act
      const result = await service.delete(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it('Given: cache throws error When: deleting value Then: should return err result', async () => {
      // Arrange
      const key = 'error-key';
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));

      // Act
      const result = await service.delete(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Failed to delete cache value');
    });
  });

  describe('exists', () => {
    it('Given: key exists in cache When: checking existence Then: should return ok result with true', async () => {
      // Arrange
      const key = 'existing-key';
      mockCacheManager.get.mockResolvedValue('some-value');

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it('Given: key does not exist in cache When: checking existence Then: should return ok result with false', async () => {
      // Arrange
      const key = 'non-existent-key';
      mockCacheManager.get.mockResolvedValue(undefined);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('Given: key value is null When: checking existence Then: should return ok result with false', async () => {
      // Arrange
      const key = 'null-key';
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('Given: cache throws error When: checking existence Then: should return err result', async () => {
      // Arrange
      const key = 'error-key';
      mockCacheManager.get.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Failed to check cache key existence');
    });
  });

  describe('clear', () => {
    it('Given: cache service When: clearing cache Then: should return ok result', async () => {
      // Act
      const result = await service.clear();

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });

  describe('get - additional branch coverage', () => {
    it('Given: cache returns null value When: getting value Then: should return ok result with null', async () => {
      // Arrange
      const key = 'null-value-key';
      mockCacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.get<string>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeNull();
    });

    it('Given: cache returns number value When: getting value Then: should return ok result with number', async () => {
      // Arrange
      const key = 'number-key';
      mockCacheManager.get.mockResolvedValue(42);

      // Act
      const result = await service.get<number>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('Given: cache returns boolean false When: getting value Then: should return ok result with false', async () => {
      // Arrange
      const key = 'bool-key';
      mockCacheManager.get.mockResolvedValue(false);

      // Act
      const result = await service.get<boolean>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('Given: cache returns empty string When: getting value Then: should return ok result with empty string', async () => {
      // Arrange
      const key = 'empty-string-key';
      mockCacheManager.get.mockResolvedValue('');

      // Act
      const result = await service.get<string>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('');
    });

    it('Given: cache returns array When: getting value Then: should return ok result with array', async () => {
      // Arrange
      const key = 'array-key';
      const arrayValue = [1, 2, 3];
      mockCacheManager.get.mockResolvedValue(arrayValue);

      // Act
      const result = await service.get<number[]>(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it('Given: cache throws non-Error object When: getting value Then: should return err result with Unknown error', async () => {
      // Arrange
      const key = 'non-error-key';
      mockCacheManager.get.mockRejectedValue('string-error');

      // Act
      const result = await service.get<string>(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Unknown error');
    });
  });

  describe('set - additional branch coverage', () => {
    it('Given: key and null value When: setting value Then: should return ok result', async () => {
      // Arrange
      const key = 'null-key';
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.set(key, null);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, null, undefined);
    });

    it('Given: TTL of 0 When: setting value Then: should pass undefined TTL (falsy)', async () => {
      // Arrange
      const key = 'zero-ttl-key';
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.set(key, 'value', 0);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, 'value', undefined);
    });

    it('Given: cache throws non-Error object When: setting value Then: should return err with Unknown error', async () => {
      // Arrange
      const key = 'non-error-key';
      mockCacheManager.set.mockRejectedValue({ code: 'ECONNREFUSED' });

      // Act
      const result = await service.set(key, 'value');

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Unknown error');
    });
  });

  describe('delete - additional branch coverage', () => {
    it('Given: cache throws non-Error object When: deleting value Then: should return err with Unknown error', async () => {
      // Arrange
      const key = 'non-error-key';
      mockCacheManager.del.mockRejectedValue(42);

      // Act
      const result = await service.delete(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Unknown error');
    });
  });

  describe('exists - additional branch coverage', () => {
    it('Given: cache throws non-Error object When: checking existence Then: should return err with Unknown error', async () => {
      // Arrange
      const key = 'non-error-key';
      mockCacheManager.get.mockRejectedValue('string-error');

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Unknown error');
    });

    it('Given: cache returns zero When: checking existence Then: should return true (non-null, non-undefined)', async () => {
      // Arrange
      const key = 'zero-key';
      mockCacheManager.get.mockResolvedValue(0);

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it('Given: cache returns empty string When: checking existence Then: should return true', async () => {
      // Arrange
      const key = 'empty-string-key';
      mockCacheManager.get.mockResolvedValue('');

      // Act
      const result = await service.exists(key);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });
  });

  describe('getMany - additional branch coverage', () => {
    it('Given: empty keys array When: getting many Then: should return empty map', async () => {
      // Act
      const result = await service.getMany<string>([]);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().size).toBe(0);
    });

    it('Given: one key fails individually When: getting many Then: should set null for failed key', async () => {
      // Arrange
      const keys = ['key1', 'key2'];
      mockCacheManager.get.mockResolvedValueOnce('value1').mockRejectedValueOnce(new Error('fail'));

      // Act
      const result = await service.getMany<string>(keys);

      // Assert
      expect(result.isOk()).toBe(true);
      const map = result.unwrap();
      expect(map.get('key1')).toBe('value1');
      expect(map.get('key2')).toBeNull();
    });
  });

  describe('setMany - additional branch coverage', () => {
    it('Given: empty entries array When: setting many Then: should return ok result', async () => {
      // Act
      const result = await service.setMany([]);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });

  describe('deleteMany - additional branch coverage', () => {
    it('Given: empty keys array When: deleting many Then: should return ok result', async () => {
      // Act
      const result = await service.deleteMany([]);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });

  describe('getMany', () => {
    it('Given: multiple keys exist When: getting many values Then: should return map with all values', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      mockCacheManager.get
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2')
        .mockResolvedValueOnce('value3');

      // Act
      const result = await service.getMany<string>(keys);

      // Assert
      expect(result.isOk()).toBe(true);
      const map = result.unwrap();
      expect(map.get('key1')).toBe('value1');
      expect(map.get('key2')).toBe('value2');
      expect(map.get('key3')).toBe('value3');
    });

    it('Given: some keys do not exist When: getting many values Then: should return null for missing keys', async () => {
      // Arrange
      const keys = ['key1', 'key2'];
      mockCacheManager.get.mockResolvedValueOnce('value1').mockResolvedValueOnce(undefined);

      // Act
      const result = await service.getMany<string>(keys);

      // Assert
      expect(result.isOk()).toBe(true);
      const map = result.unwrap();
      expect(map.get('key1')).toBe('value1');
      expect(map.get('key2')).toBeNull();
    });
  });

  describe('setMany', () => {
    it('Given: multiple entries When: setting many values Then: should return ok result', async () => {
      // Arrange
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.setMany(entries);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
    });

    it('Given: entries with TTL When: setting many values Then: should use provided TTLs', async () => {
      // Arrange
      const entries = [
        { key: 'key1', value: 'value1', ttl: 60 },
        { key: 'key2', value: 'value2', ttl: 120 },
      ];
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      const result = await service.setMany(entries);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.set).toHaveBeenNthCalledWith(1, 'key1', 'value1', 60000);
      expect(mockCacheManager.set).toHaveBeenNthCalledWith(2, 'key2', 'value2', 120000);
    });

    it('Given: cache throws error on one entry When: setting many values Then: should return err result', async () => {
      // Arrange
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];
      mockCacheManager.set
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write failed'));

      // Act
      const result = await service.setMany(entries);

      // Assert
      expect(result.isErr()).toBe(true);
    });
  });

  describe('deleteMany', () => {
    it('Given: multiple keys When: deleting many values Then: should return ok result', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      mockCacheManager.del.mockResolvedValue(undefined);

      // Act
      const result = await service.deleteMany(keys);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
    });

    it('Given: cache throws error on one key When: deleting many values Then: should return err result', async () => {
      // Arrange
      const keys = ['key1', 'key2'];
      mockCacheManager.del
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'));

      // Act
      const result = await service.deleteMany(keys);

      // Assert
      expect(result.isErr()).toBe(true);
    });
  });
});
