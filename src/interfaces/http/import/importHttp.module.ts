import {
  CreateImportBatchUseCase,
  DownloadErrorReportUseCase,
  DownloadImportTemplateUseCase,
  ExecuteImportUseCase,
  GetImportStatusUseCase,
  PreviewImportUseCase,
  ProcessImportUseCase,
  ValidateImportUseCase,
} from '@application/importUseCases';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaImportBatchRepository } from '@infrastructure/database/repositories/prismaImportBatchRepository';
import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';
import { Module } from '@nestjs/common';
import { DomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.service';

import { ImportController } from './import.controller';

@Module({
  imports: [PrismaModule],
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
    // Domain Event Dispatcher
    {
      provide: 'DomainEventDispatcher',
      useClass: DomainEventDispatcher,
    },
    // Use Cases
    CreateImportBatchUseCase,
    ValidateImportUseCase,
    ProcessImportUseCase,
    GetImportStatusUseCase,
    DownloadImportTemplateUseCase,
    DownloadErrorReportUseCase,
    PreviewImportUseCase,
    ExecuteImportUseCase,
  ],
  exports: [],
})
export class ImportHttpModule {}
