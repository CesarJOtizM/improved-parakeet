import {
  type IImportBatchRepository,
  ImportBatch,
  ImportStatus,
  ImportType,
  type ImportTypeValue,
} from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, ok, Result, ValidationError } from '@shared/domain/result';

export interface ICreateImportBatchRequest {
  type: ImportTypeValue;
  fileName: string;
  note?: string;
  createdBy: string;
  orgId: string;
}

export interface ICreateImportBatchResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    type: string;
    status: string;
    fileName: string;
  };
  timestamp: string;
}

@Injectable()
export class CreateImportBatchUseCase {
  private readonly logger = new Logger(CreateImportBatchUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository
  ) {}

  async execute(
    request: ICreateImportBatchRequest
  ): Promise<Result<ICreateImportBatchResponse, DomainError>> {
    this.logger.log('Creating import batch', {
      type: request.type,
      fileName: request.fileName,
      orgId: request.orgId,
    });

    try {
      // Validate type
      let importType: ImportType;
      try {
        importType = ImportType.create(request.type);
      } catch {
        return err(new ValidationError(`Invalid import type: ${request.type}`));
      }

      // Validate fileName
      if (!request.fileName || request.fileName.trim() === '') {
        return err(new ValidationError('File name is required'));
      }

      // Create batch
      const batch = ImportBatch.create(
        {
          type: importType,
          status: ImportStatus.create('PENDING'),
          fileName: request.fileName.trim(),
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          note: request.note?.trim(),
          createdBy: request.createdBy,
        },
        request.orgId
      );

      // Save to repository
      await this.repository.save(batch);

      this.logger.log('Import batch created successfully', { batchId: batch.id });

      return ok({
        success: true,
        message: 'Import batch created successfully',
        data: {
          id: batch.id,
          type: batch.type.getValue(),
          status: batch.status.getValue(),
          fileName: batch.fileName,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to create import batch', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to create import batch'));
    }
  }
}
