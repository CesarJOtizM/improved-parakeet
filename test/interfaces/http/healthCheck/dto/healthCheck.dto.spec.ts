import {
  DatabaseHealthDto,
  DetailedHealthCheckDto,
  HealthCheckResultDto,
  SystemHealthDto,
} from '../../../../../src/interfaces/http/healthCheck/dto/healthCheck.dto';

describe('Health Check DTOs', () => {
  describe('HealthCheckResultDto', () => {
    it('Given: valid health check data When: creating DTO Then: should create instance with correct properties', () => {
      // Arrange
      const healthData = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'development',
      };

      // Act
      const dto = Object.assign(new HealthCheckResultDto(), healthData);

      // Assert
      expect(dto.status).toBe(healthData.status);
      expect(dto.timestamp).toBe(healthData.timestamp);
      expect(dto.uptime).toBe(healthData.uptime);
      expect(dto.version).toBe(healthData.version);
      expect(dto.environment).toBe(healthData.environment);
    });

    it('Given: different health statuses When: creating DTOs Then: should accept all valid statuses', () => {
      // Arrange
      const statuses = ['healthy', 'unhealthy', 'degraded'];

      // Act & Assert
      statuses.forEach(status => {
        const dto = Object.assign(new HealthCheckResultDto(), { status });
        expect(dto.status).toBe(status);
      });
    });
  });

  describe('DatabaseHealthDto', () => {
    it('Given: valid database health data When: creating DTO Then: should create instance with correct properties', () => {
      // Arrange
      const dbData = {
        status: 'healthy',
        responseTime: 45,
        lastCheck: '2024-01-15T10:30:00.000Z',
      };

      // Act
      const dto = Object.assign(new DatabaseHealthDto(), dbData);

      // Assert
      expect(dto.status).toBe(dbData.status);
      expect(dto.responseTime).toBe(dbData.responseTime);
      expect(dto.lastCheck).toBe(dbData.lastCheck);
    });

    it('Given: different database statuses When: creating DTOs Then: should accept all valid statuses', () => {
      // Arrange
      const statuses = ['healthy', 'unhealthy', 'degraded'];

      // Act & Assert
      statuses.forEach(status => {
        const dto = Object.assign(new DatabaseHealthDto(), { status });
        expect(dto.status).toBe(status);
      });
    });
  });

  describe('SystemHealthDto', () => {
    it('Given: valid system health data When: creating DTO Then: should create instance with correct properties', () => {
      // Arrange
      const systemData = {
        memory: {
          used: 512000000,
          total: 1073741824,
          percentage: 48,
        },
        cpu: {
          load: 0.75,
          cores: 8,
        },
        disk: {
          used: 50000000000,
          total: 100000000000,
          percentage: 50,
        },
      };

      // Act
      const dto = Object.assign(new SystemHealthDto(), systemData);

      // Assert
      expect(dto.memory).toEqual(systemData.memory);
      expect(dto.cpu).toEqual(systemData.cpu);
      expect(dto.disk).toEqual(systemData.disk);
    });

    it('Given: system metrics When: creating DTO Then: should handle numeric values correctly', () => {
      // Arrange
      const metrics = {
        memory: { used: 100, total: 200, percentage: 50 },
        cpu: { load: 1.5, cores: 4 },
        disk: { used: 1000, total: 2000, percentage: 50 },
      };

      // Act
      const dto = Object.assign(new SystemHealthDto(), metrics);

      // Assert
      expect(dto.memory.percentage).toBe(50);
      expect(dto.cpu.cores).toBe(4);
      expect(dto.disk.percentage).toBe(50);
    });
  });

  describe('DetailedHealthCheckDto', () => {
    it('Given: valid detailed health check data When: creating DTO Then: should create instance with all properties', () => {
      // Arrange
      const detailedData = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'development',
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

      // Act
      const dto = Object.assign(new DetailedHealthCheckDto(), detailedData);

      // Assert
      expect(dto.status).toBe(detailedData.status);
      expect(dto.database).toEqual(detailedData.database);
      expect(dto.system).toEqual(detailedData.system);
      expect(dto.services).toEqual(detailedData.services);
    });

    it('Given: inherited properties When: creating detailed DTO Then: should have all base properties', () => {
      // Arrange
      const baseData = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'development',
      };

      // Act
      const dto = Object.assign(new DetailedHealthCheckDto(), baseData);

      // Assert
      expect(dto).toHaveProperty('status');
      expect(dto).toHaveProperty('timestamp');
      expect(dto).toHaveProperty('uptime');
      expect(dto).toHaveProperty('version');
      expect(dto).toHaveProperty('environment');
    });
  });
});
