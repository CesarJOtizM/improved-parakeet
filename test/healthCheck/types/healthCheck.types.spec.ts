// Health Check Types Tests - Funciones de validación
// Tests unitarios para las funciones puras de validación siguiendo AAA y Given-When-Then

import {
  calculateDiskPercentage,
  calculateMemoryPercentage,
  isDegraded,
  isHealthy,
  isUnhealthy,
} from '@healthCheck/types/healthCheck.types';

import type { HealthStatus } from '@healthCheck/types/healthCheck.types';

describe('Health Check Types - Funciones de Validación', () => {
  describe('isHealthy', () => {
    it('Given: healthy status When: checking if healthy Then: should return true', () => {
      // Arrange
      const status: HealthStatus = 'healthy';

      // Act
      const result = isHealthy(status);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: unhealthy status When: checking if healthy Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'unhealthy';

      // Act
      const result = isHealthy(status);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: degraded status When: checking if healthy Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'degraded';

      // Act
      const result = isHealthy(status);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isUnhealthy', () => {
    it('Given: unhealthy status When: checking if unhealthy Then: should return true', () => {
      // Arrange
      const status: HealthStatus = 'unhealthy';

      // Act
      const result = isUnhealthy(status);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: healthy status When: checking if unhealthy Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'healthy';

      // Act
      const result = isUnhealthy(status);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: degraded status When: checking if unhealthy Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'degraded';

      // Act
      const result = isUnhealthy(status);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isDegraded', () => {
    it('Given: degraded status When: checking if degraded Then: should return true', () => {
      // Arrange
      const status: HealthStatus = 'degraded';

      // Act
      const result = isDegraded(status);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: healthy status When: checking if degraded Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'healthy';

      // Act
      const result = isDegraded(status);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: unhealthy status When: checking if degraded Then: should return false', () => {
      // Arrange
      const status: HealthStatus = 'unhealthy';

      // Act
      const result = isDegraded(status);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('calculateMemoryPercentage', () => {
    it('Given: used=512, total=1024 When: calculating memory percentage Then: should return 50', () => {
      // Arrange
      const used = 512;
      const total = 1024;
      const expectedPercentage = 50;

      // Act
      const result = calculateMemoryPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=0, total=1000 When: calculating memory percentage Then: should return 0', () => {
      // Arrange
      const used = 0;
      const total = 1000;
      const expectedPercentage = 0;

      // Act
      const result = calculateMemoryPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=1000, total=1000 When: calculating memory percentage Then: should return 100', () => {
      // Arrange
      const used = 1000;
      const total = 1000;
      const expectedPercentage = 100;

      // Act
      const result = calculateMemoryPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=333, total=1000 When: calculating memory percentage Then: should round to 33', () => {
      // Arrange
      const used = 333;
      const total = 1000;
      const expectedPercentage = 33;

      // Act
      const result = calculateMemoryPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=666, total=1000 When: calculating memory percentage Then: should round to 67', () => {
      // Arrange
      const used = 666;
      const total = 1000;
      const expectedPercentage = 67;

      // Act
      const result = calculateMemoryPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });
  });

  describe('calculateDiskPercentage', () => {
    it('Given: used=75, total=100 When: calculating disk percentage Then: should return 75', () => {
      // Arrange
      const used = 75;
      const total = 100;
      const expectedPercentage = 75;

      // Act
      const result = calculateDiskPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=0, total=500 When: calculating disk percentage Then: should return 0', () => {
      // Arrange
      const used = 0;
      const total = 500;
      const expectedPercentage = 0;

      // Act
      const result = calculateDiskPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=500, total=500 When: calculating disk percentage Then: should return 100', () => {
      // Arrange
      const used = 500;
      const total = 500;
      const expectedPercentage = 100;

      // Act
      const result = calculateDiskPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });

    it('Given: used=123, total=456 When: calculating disk percentage Then: should round to 27', () => {
      // Arrange
      const used = 123;
      const total = 456;
      const expectedPercentage = 27;

      // Act
      const result = calculateDiskPercentage(used, total);

      // Assert
      expect(result).toBe(expectedPercentage);
    });
  });
});
