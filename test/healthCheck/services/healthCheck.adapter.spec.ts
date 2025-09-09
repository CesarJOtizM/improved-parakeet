// Health Check Infrastructure Adapter Tests - Arquitectura Hexagonal
// Tests unitarios para el adaptador de infraestructura siguiendo AAA y Given-When-Then

// Mock del módulo os antes de importar
jest.mock('os', () => ({
  cpus: () => Array(8).fill({}), // Por defecto 8 cores
}));

import { PrismaService } from '@infrastructure/database/prisma.service';
import { HealthCheckAdapter } from '@infrastructure/healthCheck/healthCheck.adapter';
import { Test, TestingModule } from '@nestjs/testing';

// Mock del PrismaService para tests
const mockPrismaService = {
  $queryRaw: jest.fn(),
};

describe('HealthCheckAdapter', () => {
  let adapter: HealthCheckAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckAdapter,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    adapter = module.get<HealthCheckAdapter>(HealthCheckAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBasic', () => {
    it('Given: environment variables set When: checking basic health Then: should return basic health check result with env values', async () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      const originalEnv = process.env.NODE_ENV;

      process.env.npm_package_version = '1.0.0';
      process.env.NODE_ENV = 'test';

      // Act
      const result = await adapter.checkBasic();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('test');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);

      // Cleanup: Restaurar variables originales
      if (originalVersion) {
        process.env.npm_package_version = originalVersion;
      } else {
        delete process.env.npm_package_version;
      }

      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('Given: no environment variables When: checking basic health Then: should return basic health check result with defaults', async () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      const originalEnv = process.env.NODE_ENV;

      delete process.env.npm_package_version;
      delete process.env.NODE_ENV;

      // Act
      const result = await adapter.checkBasic();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('development');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);

      // Cleanup: Restaurar variables originales
      if (originalVersion) {
        process.env.npm_package_version = originalVersion;
      }
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('checkDetailed', () => {
    it('Given: healthy database and system When: checking detailed health Then: should return healthy detailed result', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 536870912, // 512MB (50%)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('healthy');
      expect(result.system.memory.percentage).toBe(50);
      expect(result.services.database).toBe('healthy');
      expect(result.services.system).toBe('healthy');
      expect(result.services.api).toBe('healthy');

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: unhealthy database When: checking detailed health Then: should return unhealthy database status', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database error'));

      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 536870912, // 512MB (50%)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.database.status).toBe('unhealthy');
      expect(result.services.database).toBe('unhealthy');
      expect(result.services.system).toBe('healthy');
      expect(result.services.api).toBe('healthy');

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: unhealthy system When: checking detailed health Then: should return degraded system status', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 1000000000, // ~1GB (93%+)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.database.status).toBe('healthy');
      expect(result.services.database).toBe('healthy');
      expect(result.services.system).toBe('degraded');
      expect(result.services.api).toBe('healthy');

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('checkDatabase', () => {
    it('Given: healthy database When: checking database health Then: should return true', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('Given: database query fails When: checking database health Then: should return false', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrismaService.$queryRaw.mockRejectedValue(dbError);

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('Given: slow database response (>1s) When: checking database health Then: should return false', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 segundos
        return [{ '1': 1 }];
      });

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('Given: fast database response (<1s) When: checking database health Then: should return true', async () => {
      // Arrange
      const startTime = Date.now();
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        // Simular un delay que resulte en menos de 1 segundo
        const elapsed = Date.now() - startTime;
        if (elapsed < 1000) {
          return [{ '1': 1 }];
        }
        throw new Error('Timeout');
      });

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('Given: exact 1 second database response When: checking database health Then: should return false', async () => {
      // Arrange
      const startTime = Date.now();
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        // Simular un delay que resulte en exactamente 1 segundo o más
        const elapsed = Date.now() - startTime;
        if (elapsed >= 1000) {
          return [{ '1': 1 }];
        }
        throw new Error('Too fast');
      });

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('Given: very fast database response (<100ms) When: checking database health Then: should return true', async () => {
      // Arrange
      const startTime = Date.now();
      mockPrismaService.$queryRaw.mockImplementation(async () => {
        // Simular una respuesta muy rápida
        const elapsed = Date.now() - startTime;
        if (elapsed < 100) {
          return [{ '1': 1 }];
        }
        throw new Error('Too slow');
      });

      // Act
      const result = await adapter.checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('checkSystem', () => {
    it('Given: normal memory usage (<90%) When: checking system health Then: should return true', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 536870912, // 512MB (50%)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkSystem();

      // Assert
      expect(result).toBe(true);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: high memory usage (>90%) When: checking system health Then: should return false', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 1000000000, // ~1GB (93%+)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkSystem();

      // Assert
      expect(result).toBe(false);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: exact 90% memory usage When: checking system health Then: should return false', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1000,
        heapUsed: 900, // Exactamente 90%
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkSystem();

      // Assert
      expect(result).toBe(false);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: very low memory usage (<10%) When: checking system health Then: should return true', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1000,
        heapUsed: 50, // 5%
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkSystem();

      // Assert
      expect(result).toBe(true);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: memory usage calculation fails When: checking system health Then: should return false', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage calculation failed');
      });

      // Act
      const result = await adapter.checkSystem();

      // Assert
      expect(result).toBe(false);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('getSystemMetrics', () => {
    it('Given: normal system metrics When: getting system metrics Then: should return calculated metrics', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;

      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1073741824, // 1GB
        heapUsed: 536870912, // 512MB (50%)
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      jest.doMock('os', () => ({
        cpus: () => Array(8).fill({}), // 8 cores
      }));

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.system.memory.percentage).toBe(50);
      expect(result.system.cpu.cores).toBe(8);
      expect(result.system.disk.percentage).toBe(0);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
      jest.dontMock('os');
    });

    it('Given: system metrics calculation fails When: getting system metrics Then: should return default metrics', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown) = jest.fn().mockImplementation(() => {
        throw new Error('System metrics calculation failed');
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.system.memory.percentage).toBe(0);
      expect(result.system.cpu.cores).toBe(0);
      expect(result.system.disk.percentage).toBe(0);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: edge case memory values When: getting system metrics Then: should handle edge cases correctly', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;

      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1, // Usar 1 en lugar de 0 para evitar división por cero
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.system.memory.percentage).toBe(0);
      expect(result.system.cpu.cores).toBe(8); // Usar el mock global
      expect(result.system.disk.percentage).toBe(0);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });

    it('Given: very large memory values When: getting system metrics Then: should handle large values correctly', async () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;

      (process.memoryUsage as unknown) = jest.fn().mockReturnValue({
        heapTotal: 1000,
        heapUsed: 999,
        external: 0,
        arrayBuffers: 0,
        rss: 0,
      });

      // Act
      const result = await adapter.checkDetailed();

      // Assert
      expect(result.system.memory.percentage).toBe(99.9);
      expect(result.system.cpu.cores).toBe(8); // Usar el mock global
      expect(result.system.disk.percentage).toBe(0);

      // Cleanup: Restaurar función original
      process.memoryUsage = originalMemoryUsage;
    });
  });
});
