// Health Check DTOs - Data Transfer Objects for Swagger
// API Documentation

import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResultDto {
  @ApiProperty({ example: 'healthy', enum: ['healthy', 'unhealthy', 'degraded'] })
  readonly status!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  readonly timestamp!: string;

  @ApiProperty({ example: 3600.5 })
  readonly uptime!: number;

  @ApiProperty({ example: '1.0.0' })
  readonly version!: string;

  @ApiProperty({ example: 'development' })
  readonly environment!: string;
}

export class DatabaseHealthDto {
  @ApiProperty({ example: 'healthy', enum: ['healthy', 'unhealthy', 'degraded'] })
  readonly status!: string;

  @ApiProperty({ example: 45 })
  readonly responseTime!: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  readonly lastCheck!: string;
}

export class SystemHealthDto {
  @ApiProperty({
    example: {
      used: 512000000,
      total: 1073741824,
      percentage: 48,
    },
  })
  readonly memory!: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };

  @ApiProperty({
    example: {
      load: 0.75,
      cores: 8,
    },
  })
  readonly cpu!: {
    readonly load: number;
    readonly cores: number;
  };

  @ApiProperty({
    example: {
      used: 50000000000,
      total: 100000000000,
      percentage: 50,
    },
  })
  readonly disk!: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
}

export class DetailedHealthCheckDto extends HealthCheckResultDto {
  @ApiProperty({ type: DatabaseHealthDto })
  readonly database!: DatabaseHealthDto;

  @ApiProperty({ type: SystemHealthDto })
  readonly system!: SystemHealthDto;

  @ApiProperty({
    example: {
      database: 'healthy',
      system: 'healthy',
      api: 'healthy',
    },
  })
  readonly services!: Record<string, string>;
}
