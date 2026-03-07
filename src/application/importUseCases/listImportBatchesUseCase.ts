import {
  type IImportBatchRepository,
  type ImportStatusValue,
  type ImportTypeValue,
} from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, ok, Result, BusinessRuleError } from '@shared/domain/result';
import { IMPORT_PROCESSING_ERROR } from '@shared/constants/error-codes';

export interface IListImportBatchesRequest {
  page?: number;
  limit?: number;
  type?: ImportTypeValue;
  status?: ImportStatusValue;
  orgId: string;
}

export interface IImportBatchSummary {
  id: string;
  type: string;
  status: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  progress: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface IListImportBatchesResponse {
  success: boolean;
  message: string;
  data: IImportBatchSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

@Injectable()
export class ListImportBatchesUseCase {
  private readonly logger = new Logger(ListImportBatchesUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository
  ) {}

  async execute(
    request: IListImportBatchesRequest
  ): Promise<Result<IListImportBatchesResponse, DomainError>> {
    this.logger.log('Listing import batches', {
      page: request.page,
      limit: request.limit,
      type: request.type,
      status: request.status,
    });

    try {
      const page = request.page ?? 1;
      const limit = Math.min(request.limit ?? 20, 100);

      const result = await this.repository.findPaginated(request.orgId, {
        page,
        limit,
        type: request.type,
        status: request.status,
      });

      const data: IImportBatchSummary[] = result.data.map(batch => ({
        id: batch.id,
        type: batch.type.getValue(),
        status: batch.status.getValue(),
        fileName: batch.fileName,
        totalRows: batch.totalRows,
        processedRows: batch.processedRows,
        validRows: batch.validRows,
        invalidRows: batch.invalidRows,
        progress: batch.getProgress(),
        createdBy: batch.createdBy,
        createdAt: batch.startedAt?.toISOString() ?? new Date().toISOString(),
        completedAt: batch.completedAt?.toISOString(),
      }));

      return ok({
        success: true,
        message: 'Import batches retrieved successfully',
        data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to list import batches', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new BusinessRuleError(
          `Failed to list import batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
          IMPORT_PROCESSING_ERROR
        )
      );
    }
  }
}
