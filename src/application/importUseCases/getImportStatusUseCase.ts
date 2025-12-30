import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';

import type { IImportBatchRepository } from '@import/domain';

export interface IGetImportStatusRequest {
  batchId: string;
  orgId: string;
}

export interface IGetImportStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    type: string;
    status: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    validRows: number;
    invalidRows: number;
    progress: number;
    startedAt?: string;
    validatedAt?: string;
    completedAt?: string;
    errorMessage?: string;
    createdBy: string;
    orgId: string;
    createdAt: string;
    updatedAt: string;
  };
  timestamp: string;
}

@Injectable()
export class GetImportStatusUseCase {
  private readonly logger = new Logger(GetImportStatusUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository
  ) {}

  async execute(
    request: IGetImportStatusRequest
  ): Promise<Result<IGetImportStatusResponse, DomainError>> {
    this.logger.log('Getting import status', { batchId: request.batchId });

    try {
      const batch = await this.repository.findById(request.batchId, request.orgId);
      if (!batch) {
        return err(new NotFoundError('Import batch not found'));
      }

      return ok({
        success: true,
        message: 'Import status retrieved successfully',
        data: {
          id: batch.id,
          type: batch.type.getValue(),
          status: batch.status.getValue(),
          fileName: batch.fileName,
          totalRows: batch.totalRows,
          processedRows: batch.processedRows,
          validRows: batch.validRows,
          invalidRows: batch.invalidRows,
          progress: batch.getProgress(),
          startedAt: batch.startedAt?.toISOString(),
          validatedAt: batch.validatedAt?.toISOString(),
          completedAt: batch.completedAt?.toISOString(),
          errorMessage: batch.errorMessage,
          createdBy: batch.createdBy,
          orgId: batch.orgId!,
          createdAt: batch.createdAt.toISOString(),
          updatedAt: batch.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get import status', {
        batchId: request.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new NotFoundError('Failed to retrieve import status'));
    }
  }
}
