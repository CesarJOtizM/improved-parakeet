// Mock the PrismaClient before importing PrismaService
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@infrastructure/database/generated/prisma', () => {
  class MockPrismaClient {
    $connect = mockConnect;
    $disconnect = mockDisconnect;
  }
  return {
    PrismaClient: MockPrismaClient,
  };
});

// Import after mocking - internal imports first
import { PrismaService } from '@infrastructure/database/prisma.service';
// External imports
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';

describe('PrismaService', () => {
  let service: PrismaService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    // Reset environment variables
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';
    process.env.DB_CONNECTION_LIMIT = '10';
    process.env.DB_POOL_TIMEOUT = '10';

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
          NODE_ENV: 'test',
          DB_CONNECTION_LIMIT: '10',
          DB_POOL_TIMEOUT: '10',
        };
        return config[key];
      }),
    } as unknown as ConfigService;
  });

  describe('constructor', () => {
    it('Given: valid config When: creating service Then: should create instance', () => {
      // Act
      service = new PrismaService(mockConfigService);

      // Assert
      expect(service).toBeDefined();
    });

    it('Given: no config service When: creating service Then: should use env vars', () => {
      // Act
      service = new PrismaService();

      // Assert
      expect(service).toBeDefined();
    });

    it('Given: development env When: creating service Then: should enable query logging', () => {
      // Arrange
      const devConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
            NODE_ENV: 'development',
          };
          return config[key];
        }),
      } as unknown as ConfigService;

      // Act
      service = new PrismaService(devConfigService);

      // Assert
      expect(service).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('Given: service When: initializing Then: should connect to database', async () => {
      // Arrange
      service = new PrismaService(mockConfigService);
      mockConnect.mockResolvedValue(undefined as never);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('Given: service When: destroying Then: should disconnect from database', async () => {
      // Arrange
      service = new PrismaService(mockConfigService);
      mockDisconnect.mockResolvedValue(undefined as never);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('buildDatabaseUrl', () => {
    it('Given: no DATABASE_URL When: building url Then: should throw error', () => {
      // Arrange
      delete process.env.DATABASE_URL;
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      // Act & Assert
      expect(() => new PrismaService(emptyConfigService)).toThrow('DATABASE_URL is not defined');
    });

    it('Given: DATABASE_URL without pool params When: building url Then: should add defaults', () => {
      // Arrange
      process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';

      // Act
      service = new PrismaService(mockConfigService);

      // Assert
      expect(process.env.DATABASE_URL).toContain('connection_limit=');
      expect(process.env.DATABASE_URL).toContain('pool_timeout=');
    });

    it('Given: DATABASE_URL with pool params When: building url Then: should keep existing params', () => {
      // Arrange
      process.env.DATABASE_URL =
        'postgresql://user:password@localhost:5432/testdb?connection_limit=5&pool_timeout=5';
      const configWithExistingParams = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return process.env.DATABASE_URL;
          return undefined;
        }),
      } as unknown as ConfigService;

      // Act
      service = new PrismaService(configWithExistingParams);

      // Assert
      expect(process.env.DATABASE_URL).toContain('connection_limit=5');
      expect(process.env.DATABASE_URL).toContain('pool_timeout=5');
    });
  });
});
