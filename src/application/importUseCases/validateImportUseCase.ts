import { type IImportBatchRepository, ImportRow, ImportValidationService } from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';

import type { IDomainEventDispatcher } from '@shared/domain/events';
import type { IFileParsingService } from '@shared/ports/externalServices';

export interface IValidateImportRequest {
  batchId: string;
  file: Express.Multer.File;
  orgId: string;
}

export interface IValidateImportResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    structureErrors: string[];
    warnings: string[];
  };
  timestamp: string;
}

@Injectable()
export class ValidateImportUseCase {
  private readonly logger = new Logger(ValidateImportUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository,
    @Inject('FileParsingService')
    private readonly fileParsingService: IFileParsingService,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IValidateImportRequest
  ): Promise<Result<IValidateImportResponse, DomainError>> {
    this.logger.log('Validating import batch', { batchId: request.batchId });

    try {
      // 1. Find batch
      const batch = await this.repository.findById(request.batchId, request.orgId);
      if (!batch) {
        return err(new NotFoundError('Import batch not found'));
      }

      // 2. Check if batch can be validated
      if (!batch.status.canValidate()) {
        return err(
          new BusinessRuleError(
            `Import batch cannot be validated in status: ${batch.status.getValue()}`
          )
        );
      }

      // 3. Validate file format using port
      const fileValidation = this.fileParsingService.validateFileFormat(request.file);
      if (!fileValidation.isValid) {
        return err(new ValidationError(fileValidation.errors.join(', ')));
      }

      // 4. Start validation (changes status to VALIDATING)
      batch.start();

      // 5. Parse file using port (domain doesn't know about xlsx/exceljs)
      const parsedData = await this.fileParsingService.parseFile(request.file);

      // 6. Validate file structure (headers)
      const structureValidation = ImportValidationService.validateFileStructure(
        batch.type,
        parsedData.headers
      );

      if (!structureValidation.isValid()) {
        batch.fail(
          'File structure validation failed: ' + structureValidation.getErrors().join(', ')
        );
        await this.repository.save(batch);
        return err(new ValidationError(structureValidation.getErrors().join(', ')));
      }

      // 7. Create and validate rows
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2

        // Validate row data
        const rowValidation = ImportValidationService.validateRowData(
          batch.type,
          rowData,
          rowNumber
        );

        // Create ImportRow entity
        const row = ImportRow.create(
          {
            rowNumber,
            data: rowData,
            validationResult: rowValidation,
          },
          request.orgId
        );

        rows.push(row);
      }

      // 8. Set rows on batch and mark as validated
      batch.setRows(rows);
      batch.markAsValidated();

      // 9. Save batch with rows
      await this.repository.save(batch);

      // 10. Dispatch domain events
      batch.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(batch.domainEvents);
      batch.clearEvents();

      this.logger.log('Import batch validated successfully', {
        batchId: batch.id,
        totalRows: batch.totalRows,
        validRows: batch.validRows,
        invalidRows: batch.invalidRows,
      });

      return ok({
        success: true,
        message: 'Import batch validated successfully',
        data: {
          id: batch.id,
          status: batch.status.getValue(),
          totalRows: batch.totalRows,
          validRows: batch.validRows,
          invalidRows: batch.invalidRows,
          structureErrors: structureValidation.getErrors(),
          warnings: structureValidation.getWarnings(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to validate import batch', {
        batchId: request.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }
}
