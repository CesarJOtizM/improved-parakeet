import {
  CreateReportTemplateUseCase,
  ExportReportUseCase,
  GetReportTemplatesUseCase,
  GetReportsUseCase,
  StreamReportUseCase,
  UpdateReportTemplateUseCase,
  ViewReportUseCase,
} from '@application/reportUseCases';
import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaReportRepository } from '@infrastructure/database/repositories/report.repository';
import { PrismaReportTemplateRepository } from '@infrastructure/database/repositories/reportTemplate.repository';
import { DocumentGenerationService } from '@infrastructure/externalServices';
import { ReportController, ReportTemplateController } from '@interface/http/report';
import { InventoryModule } from '@inventory/inventory.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createCacheModuleOptions } from '@shared/infrastructure/cache';
import { ReturnsModule } from '@returns/returns.module';
import { SalesModule } from '@sales/sales.module';

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
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher
    InventoryModule, // Import InventoryModule to access ProductRepository, WarehouseRepository, MovementRepository, StockRepository
    SalesModule, // Import SalesModule to access SaleRepository
    ReturnsModule, // Import ReturnsModule to access ReturnRepository
    PrismaModule,
    ConfigModule,
    CacheModule.registerAsync(createCacheModuleOptions()),
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
