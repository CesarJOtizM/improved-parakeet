import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock redis module before importing the cache factory
const mockConnect = jest.fn();
const mockPing = jest.fn();
const mockDisconnect = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('redis', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { createCacheModuleOptions } from '@shared/infrastructure/cache/cache.factory';
import type { ConfigService } from '@nestjs/config';

describe('CacheFactory - createCacheModuleOptions', () => {
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateClient.mockReturnValue({
      connect: mockConnect,
      ping: mockPing,
      disconnect: mockDisconnect,
    });

    mockConnect.mockResolvedValue(undefined);
    mockPing.mockResolvedValue('PONG');
    mockDisconnect.mockResolvedValue(undefined);

    mockConfigService = {
      get: jest.fn(),
    } as jest.Mocked<Pick<ConfigService, 'get'>>;
  });

  it('Given: createCacheModuleOptions is called When: invoked Then: should return an async options object', () => {
    // Act
    const options = createCacheModuleOptions();

    // Assert
    expect(options).toBeDefined();
    expect(options.useFactory).toBeDefined();
    expect(options.inject).toBeDefined();
  });

  it('Given: Redis is available via REDIS_URL When: factory runs Then: should return Redis store config', async () => {
    // Arrange
    const redisUrl = 'rediss://default:token@host.upstash.io:6379';
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return redisUrl;
      if (key === 'auth') return { redis: { ttl: 7200 } };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = await factory(mockConfigService as unknown as ConfigService);

    // Assert
    expect(result).toEqual({
      store: 'redis',
      url: redisUrl,
      ttl: 7200,
      max: 1000,
    });
    expect(mockCreateClient).toHaveBeenCalledWith({ url: redisUrl });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockPing).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('Given: Redis is available via host/port/password config When: factory runs Then: should build URL and return Redis config', async () => {
    // Arrange
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return undefined;
      if (key === 'auth')
        return {
          redis: {
            host: 'redis.example.com',
            port: 6380,
            password: 'secret123',
            ttl: 3600,
            db: 2,
          },
        };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = (await factory(mockConfigService as unknown as ConfigService)) as {
      store: string;
      url: string;
      ttl: number;
      max: number;
    };

    // Assert
    expect(result.store).toBe('redis');
    expect(result.url).toContain('redis.example.com');
    expect(result.url).toContain('6380');
    expect(result.url).toContain('secret123');
    expect(result.ttl).toBe(3600);
    expect(result.max).toBe(1000);
  });

  it('Given: Redis is available without password When: factory runs Then: should build URL without auth', async () => {
    // Arrange
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return undefined;
      if (key === 'auth')
        return {
          redis: {
            host: 'localhost',
            port: 6379,
            ttl: 1800,
            db: 0,
          },
        };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = (await factory(mockConfigService as unknown as ConfigService)) as {
      store: string;
      url: string;
      ttl: number;
    };

    // Assert
    expect(result.store).toBe('redis');
    expect(result.url).toBe('redis://localhost:6379/0');
    expect(result.ttl).toBe(1800);
  });

  it('Given: Redis is unavailable When: factory runs Then: should fall back to in-memory cache', async () => {
    // Arrange
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return undefined;
      if (key === 'auth') return { redis: { ttl: 3600 } };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = await factory(mockConfigService as unknown as ConfigService);

    // Assert
    expect(result).toEqual({
      ttl: 3600,
      max: 1000,
    });
    expect(result).not.toHaveProperty('store');
  });

  it('Given: Redis ping fails When: factory runs Then: should fall back to in-memory cache', async () => {
    // Arrange
    mockPing.mockRejectedValue(new Error('AUTH required'));
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return undefined;
      if (key === 'auth') return { redis: { ttl: 5000 } };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = await factory(mockConfigService as unknown as ConfigService);

    // Assert
    expect(result).toEqual({
      ttl: 5000,
      max: 1000,
    });
  });

  it('Given: no auth config exists When: factory runs Then: should use default TTL of 3600', async () => {
    // Arrange
    mockConnect.mockRejectedValue(new Error('no redis'));
    mockConfigService.get.mockReturnValue(undefined as never);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = (await factory(mockConfigService as unknown as ConfigService)) as {
      ttl: number;
      max: number;
    };

    // Assert
    expect(result.ttl).toBe(3600);
    expect(result.max).toBe(1000);
  });

  it('Given: REDIS_URL is set When: host/port config also exists Then: should prefer REDIS_URL', async () => {
    // Arrange
    const redisUrl = 'redis://primary:6379/0';
    mockConfigService.get.mockImplementation(((key: string) => {
      if (key === 'REDIS_URL') return redisUrl;
      if (key === 'auth')
        return {
          redis: {
            host: 'secondary',
            port: 6380,
            password: 'pwd',
            ttl: 3600,
          },
        };
      return undefined;
    }) as ConfigService['get']);

    const options = createCacheModuleOptions();
    const factory = options.useFactory as (config: ConfigService) => Promise<unknown>;

    // Act
    const result = (await factory(mockConfigService as unknown as ConfigService)) as {
      store: string;
      url: string;
    };

    // Assert
    expect(result.url).toBe(redisUrl);
    expect(mockCreateClient).toHaveBeenCalledWith({ url: redisUrl });
  });
});
