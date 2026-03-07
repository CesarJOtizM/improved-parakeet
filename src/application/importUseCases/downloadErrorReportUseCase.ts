import { ImportErrorReportService, type IImportBatchRepository } from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IMPORT_BATCH_NOT_FOUND,
  IMPORT_NOT_VALIDATED,
  IMPORT_ERROR_REPORT_FAILED,
} from '@shared/constants/error-codes';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import type { IExcelGenerationService } from '@shared/ports/externalServices/iExcelGenerationService.port';

export interface IDownloadErrorReportRequest {
  batchId: string;
  format?: 'xlsx' | 'csv';
  orgId: string;
}

export interface IDownloadErrorReportResponse {
  success: boolean;
  message: string;
  data: {
    content: Buffer;
    filename: string;
    mimeType: string;
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      errorCount: number;
      warningCount: number;
    };
  };
  timestamp: string;
}

@Injectable()
export class DownloadErrorReportUseCase {
  private readonly logger = new Logger(DownloadErrorReportUseCase.name);

  constructor(
    @Inject('ImportBatchRepository')
    private readonly repository: IImportBatchRepository,
    @Inject('ExcelGenerationService')
    private readonly excelService: IExcelGenerationService
  ) {}

  async execute(
    request: IDownloadErrorReportRequest
  ): Promise<Result<IDownloadErrorReportResponse, DomainError>> {
    this.logger.log('Downloading error report', {
      batchId: request.batchId,
      format: request.format,
    });

    try {
      // Find batch
      const batch = await this.repository.findById(request.batchId, request.orgId);
      if (!batch) {
        return err(new NotFoundError('Import batch not found', IMPORT_BATCH_NOT_FOUND));
      }

      // Check if batch has been validated
      if (batch.status.isPending()) {
        return err(
          new ValidationError('Import batch has not been validated yet', IMPORT_NOT_VALIDATED)
        );
      }

      const format = request.format ?? 'csv';

      // Generate report
      const reportData = ImportErrorReportService.generateErrorReport(batch);

      // Generate content based on format
      let content: Buffer;
      if (format === 'csv') {
        content = ImportErrorReportService.generateCSVErrorReportBuffer(batch);
      } else {
        content = await this.excelService.generateErrorReportXlsx(batch);
      }

      const filename = ImportErrorReportService.getErrorReportFilename(batch, format);
      const mimeType = ImportErrorReportService.getMimeType(format);

      this.logger.log('Error report generated', {
        batchId: batch.id,
        errorCount: reportData.summary.errorCount,
        warningCount: reportData.summary.warningCount,
      });

      return ok({
        success: true,
        message: 'Error report generated successfully',
        data: {
          content,
          filename,
          mimeType,
          summary: {
            totalRows: reportData.summary.totalRows,
            validRows: reportData.summary.validRows,
            invalidRows: reportData.summary.invalidRows,
            errorCount: reportData.summary.errorCount,
            warningCount: reportData.summary.warningCount,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to generate error report', {
        batchId: request.batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError('Failed to generate error report', IMPORT_ERROR_REPORT_FAILED)
      );
    }
  }
}
