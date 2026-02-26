import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createClient } from 'redis';

const logger = new Logger('CacheFactory');

/**
 * Creates CacheModule async options that try Redis first,
 * falling back to in-memory cache if Redis is unavailable.
 */
export function createCacheModuleOptions(): CacheModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => {
      const auth = configService.get('auth');
      const redisHost = auth?.redis?.host || 'localhost';
      const redisPort = auth?.redis?.port || 6379;
      const redisPassword = auth?.redis?.password;
      const redisDb = auth?.redis?.db || 0;
      const ttl = auth?.redis?.ttl || 3600;

      // Try to connect to Redis
      try {
        const url = redisPassword
          ? `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDb}`
          : `redis://${redisHost}:${redisPort}/${redisDb}`;

        const client = createClient({ url });
        await client.connect();
        await client.ping();
        await client.disconnect();

        logger.log(`Redis available at ${redisHost}:${redisPort} — using Redis cache`);

        return {
          store: 'redis',
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          db: redisDb,
          ttl,
          max: 1000,
        };
      } catch {
        logger.warn(
          `Redis unavailable at ${redisHost}:${redisPort} — falling back to in-memory cache`
        );

        return {
          ttl,
          max: 1000,
        };
      }
    },
    inject: [ConfigService],
  };
}
