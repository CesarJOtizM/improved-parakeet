// Health Check Domain Service - Programación Funcional + DDD
// Lógica de negocio pura sin efectos secundarios

import type { HealthCheckPort } from './healthCheck.port';
import type { DetailedHealthCheck, HealthCheckResult, HealthStatus } from './healthCheck.types';

// Funciones puras para el dominio
export const createHealthCheckResult = (
  status: HealthStatus,
  version: string,
  environment: string
): HealthCheckResult => ({
  status,
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version,
  environment,
});

export const createDetailedHealthCheck = (
  basicResult: HealthCheckResult,
  database: boolean,
  system: boolean,
  services: Record<string, HealthStatus>,
  systemMetrics?: {
    memory: { used: number; total: number; percentage: number };
    cpu: { load: number; cores: number };
    disk: { used: number; total: number; percentage: number };
  }
): DetailedHealthCheck => {
  const overallStatus = determineOverallStatus(basicResult.status, database, system, services);

  return {
    ...basicResult,
    status: overallStatus,
    database: {
      status: database ? 'healthy' : 'unhealthy',
      responseTime: 0, // Se calculará en el adaptador
      lastCheck: new Date().toISOString(),
    },
    system: systemMetrics || {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      cpu: {
        load: 0,
        cores: 0,
      },
      disk: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    },
    services,
  };
};

export const determineOverallStatus = (
  basicStatus: HealthStatus,
  database: boolean,
  system: boolean,
  services: Record<string, HealthStatus>
): HealthStatus => {
  if (basicStatus === 'unhealthy' || !database || !system) {
    return 'unhealthy';
  }

  const serviceStatuses = Object.values(services);
  const hasUnhealthy = serviceStatuses.some(status => status === 'unhealthy');
  const hasDegraded = serviceStatuses.some(status => status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
};

// Función principal del dominio que orquesta el health check
export const performHealthCheck = async (
  healthCheckPort: HealthCheckPort,
  version: string,
  environment: string
): Promise<DetailedHealthCheck> => {
  const basicResult = createHealthCheckResult('healthy', version, environment);

  const [database, system] = await Promise.all([
    healthCheckPort.checkDatabase(),
    healthCheckPort.checkSystem(),
  ]);

  const services: Record<string, HealthStatus> = {
    database: database ? 'healthy' : 'unhealthy',
    system: system ? 'healthy' : 'unhealthy',
    api: 'healthy',
  };

  return createDetailedHealthCheck(basicResult, database, system, services);
};
