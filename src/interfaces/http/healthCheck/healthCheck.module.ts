// Health Check Module - NestJS Module
// Configura las dependencias del health check

import { HealthCheckApplicationService } from '@application/healthCheck/healthCheck.application.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckAdapter } from '@infrastructure/healthCheck/healthCheck.adapter';
import { Module } from '@nestjs/common';

import { HealthCheckController } from './healthCheck.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthCheckController],
  providers: [
    HealthCheckApplicationService,
    {
      provide: 'HealthCheckPort',
      useClass: HealthCheckAdapter,
    },
  ],
  exports: [HealthCheckApplicationService],
})
export class HealthCheckModule {}
