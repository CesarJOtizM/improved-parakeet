import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool | null = null;

  constructor(configService?: ConfigService) {
    // Set DATABASE_URL environment variable for Prisma
    const databaseUrl = PrismaService.buildDatabaseUrl(configService);
    process.env.DATABASE_URL = databaseUrl;

    // Parse database URL to extract connection parameters
    const url = new URL(databaseUrl);

    // Create PostgreSQL adapter for Prisma 7.2.0
    // Prisma 7.2.0 requires an adapter when using custom output path
    // Configure SSL for Supabase and other cloud providers
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        url.hostname.includes('supabase') || url.hostname.includes('amazonaws.com')
          ? { rejectUnauthorized: false }
          : undefined,
    });
    const adapter = new PrismaPg(pool);

    // Call super() before accessing 'this'
    super({
      adapter,
      log:
        configService?.get('NODE_ENV') === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Assign pool after super() call
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pool) {
      await this.pool.end();
    }
    this.logger.log('Database connection closed');
  }

  /**
   * Build database URL with connection pooling configuration
   */
  private static buildDatabaseUrl(configService?: ConfigService): string {
    const databaseUrl = configService?.get<string>('DATABASE_URL') || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    // Parse existing URL
    const url = new URL(databaseUrl);

    // Add connection pooling parameters if not present
    const connectionLimit =
      configService?.get<string>('DB_CONNECTION_LIMIT') || process.env.DB_CONNECTION_LIMIT || '10';
    const poolTimeout =
      configService?.get<string>('DB_POOL_TIMEOUT') || process.env.DB_POOL_TIMEOUT || '10';

    // Prisma uses connection_limit and pool_timeout query parameters
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(connectionLimit));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', String(poolTimeout));
    }

    return url.toString();
  }
}
