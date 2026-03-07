import {
  CreateImportBatchUseCase,
  DownloadErrorReportUseCase,
  DownloadImportTemplateUseCase,
  ExecuteImportUseCase,
  GetImportStatusUseCase,
  ListImportBatchesUseCase,
  PreviewImportUseCase,
  ProcessImportUseCase,
  ValidateImportUseCase,
} from '@application/importUseCases';
import { AuthenticationModule } from '@auth/authentication.module';
import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaImportBatchRepository } from '@infrastructure/database/repositories/prismaImportBatchRepository';
import { ExcelGenerationService } from '@infrastructure/externalServices/excelGenerationService';
import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';
import { InventoryModule } from '@inventory/inventory.module';
import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';

@Module({
  imports: [
    PrismaModule,
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher
    InventoryModule, // Import InventoryModule for use cases and repositories
  ],
  controllers: [ImportController],
  providers: [
    // Repository
    {
      provide: 'ImportBatchRepository',
      useClass: PrismaImportBatchRepository,
    },
    // File Parsing Service - Port implementation (can be replaced)
    {
      provide: 'FileParsingService',
      useClass: FileParsingService,
    },
    // Excel Generation Service - Port implementation
    {
      provide: 'ExcelGenerationService',
      useClass: ExcelGenerationService,
    },
    // Row Processor Factory
    ImportRowProcessorFactory,
    // Use Cases
    CreateImportBatchUseCase,
    ValidateImportUseCase,
    ProcessImportUseCase,
    GetImportStatusUseCase,
    ListImportBatchesUseCase,
    DownloadImportTemplateUseCase,
    DownloadErrorReportUseCase,
    PreviewImportUseCase,
    ExecuteImportUseCase,
  ],
  exports: [],
})
export class ImportHttpModule {}
