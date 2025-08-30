// Health Check Infrastructure Adapter - Arquitectura Hexagonal
// Implementa el port definido por el dominio

import os from 'os';

import {
  createDetailedHealthCheck,
  createHealthCheckResult,
  type DetailedHealthCheck,
  type HealthCheckResult,
  type HealthStatus,
  type IHealthCheckPort,
} from '@healthCheck/index';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthCheckAdapter implements IHealthCheckPort {
  constructor(private readonly prismaService: PrismaService) {}

  async checkBasic(): Promise<HealthCheckResult> {
    return createHealthCheckResult(
      'healthy',
      process.env.npm_package_version || '1.0.0',
      process.env.NODE_ENV || 'development'
    );
  }

  async checkDetailed(): Promise<DetailedHealthCheck> {
    const basicResult = await this.checkBasic();

    const [database, system] = await Promise.all([this.checkDatabase(), this.checkSystem()]);

    const services: Record<string, HealthStatus> = {
      database: database ? 'healthy' : 'unhealthy',
      system: system ? 'healthy' : 'degraded',
      api: 'healthy',
    };

    // Obtener métricas del sistema
    const systemMetrics = this.getSystemMetrics();

    return createDetailedHealthCheck(basicResult, database, system, services, systemMetrics);
  }

  async checkDatabase(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Si la respuesta es muy lenta, consideramos degradado
      return responseTime < 1000; // 1 segundo
    } catch (_error) {
      return false;
    }
  }

  async checkSystem(): Promise<boolean> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      // Si el uso de memoria es muy alto, consideramos degradado
      return memoryPercentage < 90;
    } catch (_error) {
      return false;
    }
  }

  private getSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;

      return {
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round(memoryPercentage * 100) / 100, // Redondear a 2 decimales
        },
        cpu: {
          load: 0, // Por ahora hardcodeado, se puede implementar con os.loadavg()
          cores: os.cpus().length,
        },
        disk: {
          used: 0, // Por ahora hardcodeado, se puede implementar con fs.statSync()
          total: 0,
          percentage: 0,
        },
      };
    } catch (_error) {
      return {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { load: 0, cores: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
      };
    }
  }
}
