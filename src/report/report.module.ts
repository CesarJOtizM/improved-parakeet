import {
  CreateReportTemplateUseCase,
  ExportReportUseCase,
  GetReportTemplatesUseCase,
  GetReportsUseCase,
  UpdateReportTemplateUseCase,
  ViewReportUseCase,
} from '@application/reportUseCases';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaReportRepository } from '@infrastructure/database/repositories/report.repository';
import { PrismaReportTemplateRepository } from '@infrastructure/database/repositories/reportTemplate.repository';
import { DocumentGenerationService } from '@infrastructure/externalServices';
import { ReportController, ReportTemplateController } from '@interface/http/report';
import { Module } from '@nestjs/common';

import { ExportService, ReportGenerationService, ReportViewService } from './domain/services';

// Note: This module requires the following repositories from other modules:
// - ProductRepository, WarehouseRepository, MovementRepository, StockRepository
// - SaleRepository, ReturnRepository
// These should be provided by their respective modules or a shared inventory module

@Module({
  imports: [PrismaModule],
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
    // Use Cases
    ViewReportUseCase,
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
    ExportReportUseCase,
    CreateReportTemplateUseCase,
    UpdateReportTemplateUseCase,
    GetReportTemplatesUseCase,
    GetReportsUseCase,
  ],
})
export class ReportModule {}
