// Health Check Module - NestJS Module
// Configura las dependencias del health check

import { HealthCheckApplicationService } from '@application/healthCheck/healthCheck.application.service';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckAdapter } from '@infrastructure/healthCheck/healthCheck.adapter';
import { HealthCheckController } from '@interface/http/healthCheck/healthCheck.controller';
import { Module } from '@nestjs/common';

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
