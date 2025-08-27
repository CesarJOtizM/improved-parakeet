// Health Check Application Service Tests - Caso de Uso
// Tests unitarios para la orquestación del dominio siguiendo AAA y Given-When-Then

import {
  HEALTH_CHECK_PORT_TOKEN,
  HealthCheckApplicationService,
} from '@application/healthCheck/healthCheck.application.service';
import { Test, TestingModule } from '@nestjs/testing';

import type { DetailedHealthCheck, HealthCheckPort, HealthCheckResult } from '@healthCheck/index';

// Mock del HealthCheckPort para tests
const mockHealthCheckPort: jest.Mocked<HealthCheckPort> = {
  checkBasic: jest.fn(),
  checkDetailed: jest.fn(),
  checkDatabase: jest.fn(),
  checkSystem: jest.fn(),
};

describe('HealthCheckApplicationService', () => {
  let service: HealthCheckApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckApplicationService,
        {
          provide: HEALTH_CHECK_PORT_TOKEN,
          useValue: mockHealthCheckPort,
        },
      ],
    }).compile();

    service = module.get<HealthCheckApplicationService>(HealthCheckApplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBasicHealth', () => {
    it('Given: healthy port response When: getting basic health Then: should return basic health from port', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'test',
      };
      mockHealthCheckPort.checkBasic.mockResolvedValue(mockResult);

      // Act
      const result = await service.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckPort.checkBasic).toHaveBeenCalledTimes(1);
    });

    it('Given: port error When: getting basic health Then: should handle port errors gracefully', async () => {
      // Arrange
      const portError = new Error('Port error');
      mockHealthCheckPort.checkBasic.mockRejectedValue(portError);

      // Act & Assert
      await expect(service.getBasicHealth()).rejects.toThrow('Port error');
      expect(mockHealthCheckPort.checkBasic).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDetailedHealth', () => {
    it('Given: healthy detailed port response When: getting detailed health Then: should return detailed health from port', async () => {
      // Arrange
      const mockResult: DetailedHealthCheck = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'test',
        database: {
          status: 'healthy',
          responseTime: 45,
          lastCheck: '2024-01-15T10:30:00.000Z',
        },
        system: {
          memory: { used: 512000000, total: 1073741824, percentage: 48 },
          cpu: { load: 0.75, cores: 8 },
          disk: { used: 50000000000, total: 100000000000, percentage: 50 },
        },
        services: {
          database: 'healthy',
          system: 'healthy',
          api: 'healthy',
        },
      };
      mockHealthCheckPort.checkDetailed.mockResolvedValue(mockResult);

      // Act
      const result = await service.getDetailedHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckPort.checkDetailed).toHaveBeenCalledTimes(1);
    });

    it('Given: port error When: getting detailed health Then: should handle port errors gracefully', async () => {
      // Arrange
      const portError = new Error('Port error');
      mockHealthCheckPort.checkDetailed.mockRejectedValue(portError);

      // Act & Assert
      await expect(service.getDetailedHealth()).rejects.toThrow('Port error');
      expect(mockHealthCheckPort.checkDetailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFullHealthCheck', () => {
    it('Given: healthy database and system When: getting full health check Then: should return full health with domain orchestration', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });

    it('Given: database failure, healthy system When: getting full health check Then: should return unhealthy status', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(false);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });

    it('Given: healthy database, system failure When: getting full health check Then: should return unhealthy status', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(false);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });

    it('Given: environment variables set When: getting full health check Then: should use environment variables for version and environment', async () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      const originalEnv = process.env.NODE_ENV;

      process.env.npm_package_version = '2.0.0';
      process.env.NODE_ENV = 'production';

      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.version).toBe('2.0.0');
      expect(result.environment).toBe('production');

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

    it('Given: no environment variables When: getting full health check Then: should use default values', async () => {
      // Arrange
      const originalVersion = process.env.npm_package_version;
      const originalEnv = process.env.NODE_ENV;

      delete process.env.npm_package_version;
      delete process.env.NODE_ENV;

      mockHealthCheckPort.checkDatabase.mockResolvedValue(true);
      mockHealthCheckPort.checkSystem.mockResolvedValue(true);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('development');

      // Cleanup: Restaurar variables originales
      if (originalVersion) {
        process.env.npm_package_version = originalVersion;
      }
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('Given: both database and system unhealthy When: getting full health check Then: should return unhealthy status', async () => {
      // Arrange
      mockHealthCheckPort.checkDatabase.mockResolvedValue(false);
      mockHealthCheckPort.checkSystem.mockResolvedValue(false);

      // Act
      const result = await service.getFullHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });
  });
});
