import {
  ImportBatch,
  ImportProcessingService,
  ImportRow,
  ImportStatus,
  ImportType,
  ImportValidationService,
  type IImportBatchRepository,
  type ImportTypeValue,
} from '@import/domain';
import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IMPORT_INVALID_TYPE,
  IMPORT_FILE_VALIDATION_FAILED,
  IMPORT_STRUCTURE_INVALID,
  IMPORT_EXECUTION_FAILED,
} from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';

import type { IDomainEventDispatcher } from '@shared/domain/events';
import type { IFileParsingService } from '@shared/ports/externalServices';

export interface IExecuteImportRequest {
  type: ImportTypeValue;
  file: Express.Multer.File;
  note?: string;
  createdBy: string;
  orgId: string;
}

export interface IExecuteImportResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    totalRows: number;
    processedRows: number;
    validRows: number;
    invalidRows: number;
  };
  timestamp: string;
}

@Injectable()
export class ExecuteImportUseCase {
  private readonly logger = new Logger(ExecuteImportUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository,
    @Inject('FileParsingService')
    private readonly fileParsingService: IFileParsingService,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly rowProcessorFactory: ImportRowProcessorFactory
  ) {}

  async execute(
    request: IExecuteImportRequest
  ): Promise<Result<IExecuteImportResponse, DomainError>> {
    this.logger.log('Executing import', {
      type: request.type,
      fileName: request.file?.originalname,
      orgId: request.orgId,
    });

    try {
      // STEP 1: Validate import type
      let importType: ImportType;
      try {
        importType = ImportType.create(request.type);
      } catch {
        return err(
          new ValidationError(`Invalid import type: ${request.type}`, IMPORT_INVALID_TYPE)
        );
      }

      // STEP 2: Validate file format
      const fileValidation = this.fileParsingService.validateFileFormat(request.file);
      if (!fileValidation.isValid) {
        return err(
          new ValidationError(fileValidation.errors.join(', '), IMPORT_FILE_VALIDATION_FAILED)
        );
      }

      // STEP 3: Parse file
      const parsedData = await this.fileParsingService.parseFile(request.file);

      // STEP 4: Validate file structure (headers)
      const structureValidation = ImportValidationService.validateFileStructure(
        importType,
        parsedData.headers
      );

      if (!structureValidation.isValid()) {
        const errors = structureValidation.getErrors().join(', ');
        return err(
          new ValidationError(
            `File structure validation failed: ${errors}`,
            IMPORT_STRUCTURE_INVALID
          )
        );
      }

      // STEP 5: Validate all rows (in-memory, no persistence yet)
      const rows: ImportRow[] = [];
      const validationErrors: string[] = [];

      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2

        // Validate row data
        const rowValidation = ImportValidationService.validateRowData(
          importType,
          rowData,
          rowNumber
        );

        // Create ImportRow entity (in-memory only)
        const row = ImportRow.create(
          {
            rowNumber,
            data: rowData,
            validationResult: rowValidation,
          },
          request.orgId
        );

        rows.push(row);

        // Collect errors for rejection check
        if (!rowValidation.isValid()) {
          validationErrors.push(`Row ${rowNumber}: ${rowValidation.getErrors().join(', ')}`);
        }
      }

      // STEP 6: If there are ANY errors, reject immediately (no persistence)
      if (validationErrors.length > 0) {
        const errorMessage = `Import rejected: ${validationErrors.length} row(s) have validation errors. First error: ${validationErrors[0]}`;
        this.logger.warn('Import rejected due to validation errors', {
          type: request.type,
          errorCount: validationErrors.length,
        });
        return err(new ValidationError(errorMessage, IMPORT_EXECUTION_FAILED));
      }

      // STEP 7: All validations passed - proceed with creation and processing
      // Create batch
      const batch = ImportBatch.create(
        {
          type: importType,
          status: ImportStatus.create('PENDING'),
          fileName: request.file.originalname || 'import.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          note: request.note?.trim(),
          createdBy: request.createdBy,
        },
        request.orgId
      );

      // Start validation (changes status to VALIDATING)
      batch.start();

      // Set rows and mark as validated
      batch.setRows(rows);
      batch.markAsValidated();

      // Save batch with rows
      await this.repository.save(batch);

      // Dispatch validation events
      batch.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(batch.domainEvents);
      batch.clearEvents();

      // STEP 8: Process the batch
      batch.markAsProcessing();
      await this.repository.save(batch);

      // Get row processor
      const rowProcessor = this.rowProcessorFactory.createProcessor(importType);

      // Process batch using domain service
      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor, {
        skipInvalidRows: true, // Skip invalid rows (shouldn't happen since we validated, but safety)
        onProgress: async (processed, total) => {
          batch.updateProgress(processed);
          // Periodically save progress (every 100 rows)
          if (processed % 100 === 0 || processed === total) {
            await this.repository.save(batch);
          }
        },
      });

      // Update rows with execution errors so they are persisted
      for (const result of processResult.results) {
        if (!result.success && result.error) {
          const row = rows.find(r => r.rowNumber === result.rowNumber);
          if (row) {
            const updatedValidation = row.validationResult.addError(
              `Execution error: ${result.error}`
            );
            row.updateValidation(updatedValidation);
          }
        }
      }

      // Complete or fail based on result
      if (processResult.success) {
        batch.complete();
      } else {
        batch.fail(processResult.errorMessage ?? 'Processing failed');
      }

      // Save final state
      await this.repository.save(batch);

      // Dispatch completion events
      batch.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(batch.domainEvents);
      batch.clearEvents();

      this.logger.log('Import execution completed', {
        batchId: batch.id,
        status: batch.status.getValue(),
        totalRows: batch.totalRows,
        processedRows: batch.processedRows,
      });

      return ok({
        success: true,
        message:
          batch.status.getValue() === 'COMPLETED'
            ? 'Import executed successfully'
            : 'Import execution completed with errors',
        data: {
          id: batch.id,
          status: batch.status.getValue(),
          totalRows: batch.totalRows,
          processedRows: batch.processedRows,
          validRows: batch.validRows,
          invalidRows: batch.invalidRows,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to execute import', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new BusinessRuleError(
          `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          IMPORT_EXECUTION_FAILED
        )
      );
    }
  }
}
