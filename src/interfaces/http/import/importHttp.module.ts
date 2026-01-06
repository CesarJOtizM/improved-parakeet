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
import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaImportBatchRepository } from '@infrastructure/database/repositories/prismaImportBatchRepository';
import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';
import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';

@Module({
  imports: [
    PrismaModule,
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher
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
