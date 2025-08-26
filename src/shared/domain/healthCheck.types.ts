// Health Check Domain Types - Programación Funcional + DDD

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export type HealthCheckResult = {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly uptime: number;
  readonly version: string;
  readonly environment: string;
};

export type DatabaseHealth = {
  readonly status: HealthStatus;
  readonly responseTime: number;
  readonly lastCheck: string;
};

export type SystemHealth = {
  readonly memory: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly cpu: {
    readonly load: number;
    readonly cores: number;
  };
  readonly disk: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
};

export type DetailedHealthCheck = HealthCheckResult & {
  readonly database: DatabaseHealth;
  readonly system: SystemHealth;
  readonly services: Record<string, HealthStatus>;
};

// Funciones puras para validación
export const isHealthy = (status: HealthStatus): boolean => status === 'healthy';

export const isUnhealthy = (status: HealthStatus): boolean => status === 'unhealthy';

export const isDegraded = (status: HealthStatus): boolean => status === 'degraded';

export const calculateMemoryPercentage = (used: number, total: number): number =>
  Math.round((used / total) * 100);

export const calculateDiskPercentage = (used: number, total: number): number =>
  Math.round((used / total) * 100);
