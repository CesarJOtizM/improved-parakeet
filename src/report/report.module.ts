import {
  CreateReportTemplateUseCase,
  ExportReportUseCase,
  GetReportTemplatesUseCase,
  GetReportsUseCase,
  StreamReportUseCase,
  UpdateReportTemplateUseCase,
  ViewReportUseCase,
} from '@application/reportUseCases';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaReportRepository } from '@infrastructure/database/repositories/report.repository';
import { PrismaReportTemplateRepository } from '@infrastructure/database/repositories/reportTemplate.repository';
import { DocumentGenerationService } from '@infrastructure/externalServices';
import { ReportController, ReportTemplateController } from '@interface/http/report';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  ExportService,
  ReportCacheService,
  ReportGenerationService,
  ReportViewService,
} from './domain/services';
import { ReportLoggingInterceptor } from './interceptors/reportLogging.interceptor';

// Note: This module requires the following repositories from other modules:
// - ProductRepository, WarehouseRepository, MovementRepository, StockRepository
// - SaleRepository, ReturnRepository
// These should be provided by their respective modules or a shared inventory module

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const auth = configService.get('auth');
        return {
          store: 'redis',
          host: auth?.redis?.host || 'localhost',
          port: auth?.redis?.port || 6379,
          password: auth?.redis?.password,
          db: auth?.redis?.db || 0,
          ttl: auth?.redis?.ttl || 3600,
          max: 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [ReportController, ReportTemplateController],
  providers: [
    // Repositories
    {
      provide: 'ReportRepository',
      useClass: PrismaReportRepository,
    },
    {
      provide: 'ReportTemplateRepository',
      useClass: PrismaReportTemplateRepository,
    },
    // External Services (Ports)
    {
      provide: 'DocumentGenerationService',
      useClass: DocumentGenerationService,
    },
    // Domain Services
    ReportGenerationService,
    ReportViewService,
    ExportService,
    ReportCacheService,
    // Interceptors
    ReportLoggingInterceptor,
    // Use Cases
    ViewReportUseCase,
    StreamReportUseCase,
    ExportReportUseCase,
    CreateReportTemplateUseCase,
    UpdateReportTemplateUseCase,
    GetReportTemplatesUseCase,
    GetReportsUseCase,
  ],
  exports: [
    'ReportRepository',
    'ReportTemplateRepository',
    ReportGenerationService,
    ReportViewService,
    ExportService,
    ViewReportUseCase,
    StreamReportUseCase,
    ExportReportUseCase,
    CreateReportTemplateUseCase,
    UpdateReportTemplateUseCase,
    GetReportTemplatesUseCase,
    GetReportsUseCase,
  ],
})
export class ReportModule {}
