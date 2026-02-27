import { GetDashboardMetricsUseCase } from '@application/dashboardUseCases';
import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  controllers: [DashboardController],
  providers: [GetDashboardMetricsUseCase],
})
export class DashboardHttpModule {}
