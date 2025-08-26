import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckModule } from '@interface/http/healthCheck/healthCheck.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, HealthCheckModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
