// Health Check Application Service - Caso de Uso
// Coordina el dominio y la infraestructura

import { Inject, Injectable } from '@nestjs/common';
import { performHealthCheck } from '@shared/domain/healthCheck.service';

import type {
  DetailedHealthCheck,
  HealthCheckPort,
  HealthCheckResult,
} from '@shared/domain/healthCheck.port';

// Token personalizado para inyección de dependencias
export const HEALTH_CHECK_PORT_TOKEN = 'HealthCheckPort';

@Injectable()
export class HealthCheckApplicationService {
  constructor(
    @Inject(HEALTH_CHECK_PORT_TOKEN)
    private readonly healthCheckPort: HealthCheckPort
  ) {}

  async getBasicHealth(): Promise<HealthCheckResult> {
    return this.healthCheckPort.checkBasic();
  }

  async getDetailedHealth(): Promise<DetailedHealthCheck> {
    return this.healthCheckPort.checkDetailed();
  }

  async getFullHealthCheck(): Promise<DetailedHealthCheck> {
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    return performHealthCheck(this.healthCheckPort, version, environment);
  }
}
