import {
  ImportProcessingService,
  type IImportBatchRepository,
  type RowProcessor,
} from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
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
 * For each import type, it would typically call the corresponding domain services
 * (e.g., CreateProductUseCase for PRODUCTS import, CreateMovementUseCase for MOVEMENTS, etc.)
 *
 * In a production implementation, the rowProcessor would be injected based on the import type.
 * For now, this provides a placeholder that demonstrates the processing flow.
 */
@Injectable()
export class ProcessImportUseCase {
  private readonly logger = new Logger(ProcessImportUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
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
        return err(new NotFoundError('Import batch not found'));
      }

      // 2. Check if batch can be processed
      if (!batch.status.canProcess()) {
        return err(
          new BusinessRuleError(
            `Import batch cannot be processed in status: ${batch.status.getValue()}`
          )
        );
      }

      // 3. Mark as processing
      batch.markAsProcessing();
      await this.repository.save(batch);

      // 4. Get the row processor based on import type
      // In a full implementation, this would inject specific use cases for each type
      const rowProcessor = this.getRowProcessor();

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
          `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Get the row processor for a specific import type.
   * In a production system, this would return processors that call actual domain services.
   *
   * Example implementation for PRODUCTS:
   * - Would inject CreateProductUseCase
   * - Would call createProductUseCase.execute() for each row
   * - Would handle the result and return success/failure
   */
  private getRowProcessor(): RowProcessor {
    // This is a placeholder implementation
    // In production, inject specific use cases and return proper processors
    return async (row, importType, _orgId) => {
      // Simulate processing
      this.logger.log('Processing row', {
        rowNumber: row.rowNumber,
        type: importType.getValue(),
      });

      // For now, just mark as success if the row is valid
      return {
        rowNumber: row.rowNumber,
        success: row.isValid(),
        error: row.isValid() ? undefined : 'Row has validation errors',
      };
    };
  }
}
