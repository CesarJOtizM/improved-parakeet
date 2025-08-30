// Health Check Domain Service Tests - Programación Funcional + DDD
// Tests unitarios para la lógica de negocio pura siguiendo AAA y Given-When-Then

import {
  createDetailedHealthCheck,
  createHealthCheckResult,
  determineOverallStatus,
  performHealthCheck,
} from '@healthCheck/services/healthCheck.service';
import {
  calculateDiskPercentage,
  calculateMemoryPercentage,
} from '@healthCheck/types/healthCheck.types';

import type { IHealthCheckPort } from '@healthCheck/ports/healthCheck.port';
import type { HealthStatus } from '@healthCheck/types/healthCheck.types';

// Mock del HealthCheckPort para tests
const mockHealthCheckPort: IHealthCheckPort = {
  checkBasic: jest.fn(),
  checkDetailed: jest.fn(),
  checkDatabase: jest.fn(),
  checkSystem: jest.fn(),
};

describe('Health Check Domain Service', () => {
  describe('Funciones de utilidad', () => {
    describe('calculateMemoryPercentage', () => {
      it('Given: used=512, total=1024 When: calculating percentage Then: should return 50', () => {
        // Arrange
        const used = 512;
        const total = 1024;
        const expectedPercentage = 50;

        // Act
        const result = calculateMemoryPercentage(used, total);

        // Assert
        expect(result).toBe(expectedPercentage);
      });

      it('Given: used=333, total=1000 When: calculating percentage Then: should round to 33', () => {
        // Arrange
        const used = 333;
        const total = 1000;
        const expectedPercentage = 33;

        // Act
        const result = calculateMemoryPercentage(used, total);

        // Assert
        expect(result).toBe(expectedPercentage);
      });
    });

    describe('calculateDiskPercentage', () => {
      it('Given: used=75, total=100 When: calculating percentage Then: should return 75', () => {
        // Arrange
        const used = 75;
        const total = 100;
        const expectedPercentage = 75;

        // Act
        const result = calculateDiskPercentage(used, total);

        // Assert
        expect(result).toBe(expectedPercentage);
      });
    });
  });

  describe('createHealthCheckResult', () => {
    it('Given: healthy status, version 1.0.0, test environment When: creating result Then: should return correct health check result', () => {
      // Arrange
      const status: HealthStatus = 'healthy';
      const version = '1.0.0';
      const environment = 'test';

      // Act
      const result = createHealthCheckResult(status, version, environment);

      // Assert
      expect(result.status).toBe(status);
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('Given: degraded status, version 2.0.0, production environment When: creating result Then: should return degraded result', () => {
      // Arrange
      const status: HealthStatus = 'degraded';
      const version = '2.0.0';
      const environment = 'production';

      // Act
      const result = createHealthCheckResult(status, version, environment);

      // Assert
      expect(result.status).toBe(status);
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
    });
  });

  describe('createDetailedHealthCheck', () => {
    it('Given: healthy basic result, healthy database and system When: creating detailed check Then: should return healthy detailed result', () => {
      // Arrange
      const basicResult = createHealthCheckResult('healthy', '1.0.0', 'test');
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = createDetailedHealthCheck(basicResult, database, system, services);

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('healthy');
      expect(result.system.memory.percentage).toBe(0);
      expect(result.services).toEqual(services);
    });

    it('Given: healthy basic result, degraded system When: creating detailed check Then: should return degraded result', () => {
      // Arrange
      const basicResult = createHealthCheckResult('healthy', '1.0.0', 'test');
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'degraded',
        api: 'healthy',
      };

      // Act
      const result = createDetailedHealthCheck(basicResult, database, system, services);

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.services).toEqual(services);
    });
  });

  describe('determineOverallStatus', () => {
    it('Given: healthy basic status, healthy database and system, all healthy services When: determining overall status Then: should return healthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('healthy');
    });

    it('Given: healthy basic status, healthy database and system, some degraded services When: determining overall status Then: should return degraded', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'degraded',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('degraded');
    });

    it('Given: healthy basic status, healthy database and system, some unhealthy services When: determining overall status Then: should return unhealthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'unhealthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('Given: healthy basic status, database down, healthy system When: determining overall status Then: should return unhealthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = false;
      const system = true;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('Given: healthy basic status, healthy database, system down When: determining overall status Then: should return unhealthy', () => {
      // Arrange
      const basicStatus: HealthStatus = 'healthy';
      const database = true;
      const system = false;
      const services: Record<string, HealthStatus> = {
        database: 'healthy',
        system: 'healthy',
        api: 'healthy',
      };

      // Act
      const result = determineOverallStatus(basicStatus, database, system, services);

      // Assert
      expect(result).toBe('unhealthy');
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Given: healthy database and system When: performing health check Then: should return healthy status', async () => {
      // Arrange
      const version = '1.0.0';
      const environment = 'test';
      (mockHealthCheckPort.checkDatabase as jest.Mock).mockResolvedValue(true);
      (mockHealthCheckPort.checkSystem as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await performHealthCheck(mockHealthCheckPort, version, environment);

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
      expect(mockHealthCheckPort.checkDatabase).toHaveBeenCalled();
      expect(mockHealthCheckPort.checkSystem).toHaveBeenCalled();
    });

    it('Given: database failure, healthy system When: performing health check Then: should return unhealthy status', async () => {
      // Arrange
      const version = '1.0.0';
      const environment = 'test';
      (mockHealthCheckPort.checkDatabase as jest.Mock).mockResolvedValue(false);
      (mockHealthCheckPort.checkSystem as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await performHealthCheck(mockHealthCheckPort, version, environment);

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('unhealthy');
      expect(result.services.system).toBe('healthy');
    });

    it('Given: healthy database, system failure When: performing health check Then: should return unhealthy status', async () => {
      // Arrange
      const version = '1.0.0';
      const environment = 'test';
      (mockHealthCheckPort.checkDatabase as jest.Mock).mockResolvedValue(true);
      (mockHealthCheckPort.checkSystem as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await performHealthCheck(mockHealthCheckPort, version, environment);

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('healthy');
      expect(result.services.system).toBe('unhealthy');
    });

    it('Given: both database and system failure When: performing health check Then: should return unhealthy status', async () => {
      // Arrange
      const version = '1.0.0';
      const environment = 'test';
      (mockHealthCheckPort.checkDatabase as jest.Mock).mockResolvedValue(false);
      (mockHealthCheckPort.checkSystem as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await performHealthCheck(mockHealthCheckPort, version, environment);

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('unhealthy');
      expect(result.services.system).toBe('unhealthy');
    });

    it('Given: different version and environment When: performing health check Then: should use provided values', async () => {
      // Arrange
      const version = '2.0.0';
      const environment = 'production';
      (mockHealthCheckPort.checkDatabase as jest.Mock).mockResolvedValue(true);
      (mockHealthCheckPort.checkSystem as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await performHealthCheck(mockHealthCheckPort, version, environment);

      // Assert
      expect(result.version).toBe(version);
      expect(result.environment).toBe(environment);
      expect(result.status).toBe('healthy');
    });
  });
});
