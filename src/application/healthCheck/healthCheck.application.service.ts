// Health Check Application Service - Caso de Uso
// Coordina el dominio y la infraestructura

import {
  performHealthCheck,
  type DetailedHealthCheck,
  type HealthCheckPort,
  type HealthCheckResult,
} from '@healthCheck/index';
import { Inject, Injectable } from '@nestjs/common';

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
