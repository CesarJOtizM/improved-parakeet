import { ImportProcessingService, type IImportBatchRepository } from '@import/domain';
import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IMPORT_BATCH_NOT_FOUND, IMPORT_PROCESSING_ERROR } from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  err,
  ok,
} from '@shared/domain/result';

import type { IDomainEventDispatcher } from '@shared/domain/events';

export interface IProcessImportRequest {
  batchId: string;
  skipInvalidRows?: boolean;
  orgId: string;
}

export interface IProcessImportResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    totalRows: number;
    processedRows: number;
    validRows: number;
    invalidRows: number;
    progress: number;
  };
  timestamp: string;
}

/**
 * ProcessImportUseCase
 *
 * This use case handles the processing of validated import batches.
 * For each import type, it delegates to the ImportRowProcessorFactory which creates
 * real row processors that call actual use cases (CreateProductUseCase, CreateMovementUseCase, etc.)
 */
@Injectable()
export class ProcessImportUseCase {
  private readonly logger = new Logger(ProcessImportUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher,
    private readonly rowProcessorFactory: ImportRowProcessorFactory
  ) {}

  async execute(
    request: IProcessImportRequest
  ): Promise<Result<IProcessImportResponse, DomainError>> {
    this.logger.log('Processing import batch', {
      batchId: request.batchId,
      skipInvalidRows: request.skipInvalidRows,
    });

    try {
      // 1. Find batch
      const batch = await this.repository.findById(request.batchId, request.orgId);
      if (!batch) {
        return err(new NotFoundError('Import batch not found', IMPORT_BATCH_NOT_FOUND));
      }

      // 2. Check if batch can be processed
      if (!batch.status.canProcess()) {
        return err(
          new BusinessRuleError(
            `Import batch cannot be processed in status: ${batch.status.getValue()}`,
            IMPORT_PROCESSING_ERROR
          )
        );
      }

      // 3. Mark as processing
      batch.markAsProcessing();
      await this.repository.save(batch);

      // 4. Get the row processor based on import type
      const rowProcessor = this.rowProcessorFactory.createProcessor(batch.type);

      // 5. Process batch using domain service
      const result = await ImportProcessingService.processBatch(batch, rowProcessor, {
        skipInvalidRows: request.skipInvalidRows ?? true,
        onProgress: async (processed, total) => {
          batch.updateProgress(processed);
          // Periodically save progress (every 100 rows)
          if (processed % 100 === 0 || processed === total) {
            await this.repository.save(batch);
          }
        },
      });

      // 6. Complete or fail based on result
      if (result.success) {
        batch.complete();
      } else {
        batch.fail(result.errorMessage ?? 'Processing failed');
      }

      // 7. Save final state
      await this.repository.save(batch);

      // 8. Dispatch domain events
      batch.markEventsForDispatch();
      await this.eventDispatcher.dispatchEvents(batch.domainEvents);
      batch.clearEvents();

      this.logger.log('Import batch processing completed', {
        batchId: batch.id,
        status: batch.status.getValue(),
        processedRows: batch.processedRows,
      });

      return ok({
        success: true,
        message: result.success
          ? 'Import batch processed successfully'
          : 'Import batch processing completed with errors',
        data: {
          id: batch.id,
          status: batch.status.getValue(),
          totalRows: batch.totalRows,
          processedRows: batch.processedRows,
          validRows: batch.validRows,
          invalidRows: batch.invalidRows,
          progress: batch.getProgress(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to process import batch', {
        batchId: request.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new BusinessRuleError(
          `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          IMPORT_PROCESSING_ERROR
        )
      );
    }
  }
}
