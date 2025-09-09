// Health Check Controller Tests - Adaptador de Entrada
// Tests unitarios para el controller HTTP siguiendo AAA y Given-When-Then

import { HealthCheckApplicationService } from '@application/healthCheck/healthCheck.application.service';
import { HealthCheckController } from '@interface/http/healthCheck/healthCheck.controller';
import { Test, TestingModule } from '@nestjs/testing';

import type { DetailedHealthCheck, HealthCheckResult } from '@healthCheck/types/healthCheck.types';

// Mock del HealthCheckApplicationService para tests
const mockHealthCheckService = {
  getBasicHealth: jest.fn(),
  getDetailedHealth: jest.fn(),
  getFullHealthCheck: jest.fn(),
};

describe('HealthCheckController', () => {
  let controller: HealthCheckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
      providers: [
        {
          provide: HealthCheckApplicationService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBasicHealth', () => {
    it('Given: healthy service response When: getting basic health Then: should return basic health status', async () => {
      // Arrange
      const mockResult: HealthCheckResult = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 3600.5,
        version: '1.0.0',
        environment: 'test',
      };
      mockHealthCheckService.getBasicHealth.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getBasicHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckService.getBasicHealth).toHaveBeenCalledTimes(1);
    });

    it('Given: service error When: getting basic health Then: should propagate service error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockHealthCheckService.getBasicHealth.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getBasicHealth()).rejects.toThrow('Service error');
      expect(mockHealthCheckService.getBasicHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDetailedHealth', () => {
    it('Given: healthy detailed service response When: getting detailed health Then: should return detailed health status', async () => {
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
      mockHealthCheckService.getDetailedHealth.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getDetailedHealth();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckService.getDetailedHealth).toHaveBeenCalledTimes(1);
    });

    it('Given: service error When: getting detailed health Then: should propagate service error', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockHealthCheckService.getDetailedHealth.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getDetailedHealth()).rejects.toThrow('Service error');
      expect(mockHealthCheckService.getDetailedHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFullHealthCheck', () => {
    it('Given: healthy full service response When: getting full health check Then: should return full health status', async () => {
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
      mockHealthCheckService.getFullHealthCheck.mockResolvedValue(mockResult);

      // Act
      const result = await controller.getFullHealthCheck();

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockHealthCheckService.getFullHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('Given: service error When: getting full health check Then: should propagate service error', async () => {
      // Arrange
      const serviceError = new Error('Full health check service error');
      mockHealthCheckService.getFullHealthCheck.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getFullHealthCheck()).rejects.toThrow(
        'Full health check service error'
      );
      expect(mockHealthCheckService.getFullHealthCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe('Controller initialization', () => {
    it('Given: controller created When: checking instance Then: should be instance of HealthCheckController', () => {
      // Arrange & Act
      const isController = controller instanceof HealthCheckController;

      // Assert
      expect(isController).toBe(true);
    });

    it('Given: controller created When: checking methods Then: should have all required methods', () => {
      // Arrange & Act
      const hasBasicHealth = typeof controller.getBasicHealth === 'function';
      const hasDetailedHealth = typeof controller.getDetailedHealth === 'function';
      const hasFullHealthCheck = typeof controller.getFullHealthCheck === 'function';

      // Assert
      expect(hasBasicHealth).toBe(true);
      expect(hasDetailedHealth).toBe(true);
      expect(hasFullHealthCheck).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('Given: detailed health service error When: getting detailed health Then: should propagate service error', async () => {
      // Arrange
      const serviceError = new Error('Detailed health service error');
      mockHealthCheckService.getDetailedHealth.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getDetailedHealth()).rejects.toThrow('Detailed health service error');
      expect(mockHealthCheckService.getDetailedHealth).toHaveBeenCalledTimes(1);
    });

    it('Given: null service response When: getting basic health Then: should handle null gracefully', async () => {
      // Arrange
      mockHealthCheckService.getBasicHealth.mockResolvedValue(null);

      // Act
      const result = await controller.getBasicHealth();

      // Assert
      expect(result).toBeNull();
      expect(mockHealthCheckService.getBasicHealth).toHaveBeenCalledTimes(1);
    });
  });
});
