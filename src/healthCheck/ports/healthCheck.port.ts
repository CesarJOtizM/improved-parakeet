// Health Check Port - Arquitectura Hexagonal
// Define la interfaz que el dominio necesita

import type { DetailedHealthCheck, HealthCheckResult } from '../types/healthCheck.types';

export interface HealthCheckPort {
  readonly checkBasic: () => Promise<HealthCheckResult>;
  readonly checkDetailed: () => Promise<DetailedHealthCheck>;
  readonly checkDatabase: () => Promise<boolean>;
  readonly checkSystem: () => Promise<boolean>;
}
