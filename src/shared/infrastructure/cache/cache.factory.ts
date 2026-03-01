import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createClient } from 'redis';

const logger = new Logger('CacheFactory');

/**
 * Creates CacheModule async options that try Redis first,
 * falling back to in-memory cache if Redis is unavailable.
 *
 * Supports REDIS_URL env var directly (e.g. Upstash `rediss://...` with TLS)
 * or falls back to building the URL from individual host/port/password config.
 */
export function createCacheModuleOptions(): CacheModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => {
      const auth = configService.get('auth');
      const ttl = auth?.redis?.ttl || 3600;

      // Prefer REDIS_URL env var (supports Upstash rediss:// with TLS)
      const redisUrl = configService.get<string>('REDIS_URL');
      const redisHost = auth?.redis?.host || 'localhost';
      const redisPort = auth?.redis?.port || 6379;
      const redisPassword = auth?.redis?.password;
      const redisDb = auth?.redis?.db || 0;

      const url =
        redisUrl ||
        (redisPassword
          ? `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDb}`
          : `redis://${redisHost}:${redisPort}/${redisDb}`);

      try {
        const client = createClient({ url });
        await client.connect();
        await client.ping();
        await client.disconnect();

        logger.log(`Redis available — using Redis cache`);

        return {
          store: 'redis',
          url,
          ttl,
          max: 1000,
        };
      } catch {
        logger.warn(`Redis unavailable — falling back to in-memory cache`);

        return {
          ttl,
          max: 1000,
        };
      }
    },
    inject: [ConfigService],
  };
}
