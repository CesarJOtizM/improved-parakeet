// Health Check HTTP Controller - Input Adapter
// Exposes health check endpoints

import { HealthCheckApplicationService } from '@application/healthCheck/healthCheck.application.service';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DetailedHealthCheckDto, HealthCheckResultDto } from './dto/healthCheck.dto';

import type { DetailedHealthCheck, HealthCheckResult } from '@shared/domain/healthCheck.types';

@ApiTags('Health Check')
@Controller('health')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckApplicationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Basic health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Basic health status',
    type: HealthCheckResultDto,
  })
  async getBasicHealth(): Promise<HealthCheckResult> {
    return this.healthCheckService.getBasicHealth();
  }

  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detailed health check with system metrics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status with system information',
    type: DetailedHealthCheckDto,
  })
  async getDetailedHealth(): Promise<DetailedHealthCheck> {
    return this.healthCheckService.getDetailedHealth();
  }

  @Get('full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full health check with domain orchestration' })
  @ApiResponse({
    status: 200,
    description: 'Complete health status orchestrated by domain',
    type: DetailedHealthCheckDto,
  })
  async getFullHealthCheck(): Promise<DetailedHealthCheck> {
    return this.healthCheckService.getFullHealthCheck();
  }
}
