import { ImportTemplateService, ImportType, ImportTypeValue } from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IMPORT_INVALID_TYPE, IMPORT_TEMPLATE_FAILED } from '@shared/constants/error-codes';
import { DomainError, err, ok, Result, ValidationError } from '@shared/domain/result';
import type { IExcelGenerationService } from '@shared/ports/externalServices/iExcelGenerationService.port';

export interface IDownloadImportTemplateRequest {
  type: ImportTypeValue;
  format?: 'xlsx' | 'csv';
  orgId: string;
}

export interface IDownloadImportTemplateResponse {
  success: boolean;
  message: string;
  data: {
    content: Buffer;
    filename: string;
    mimeType: string;
    columns: string;
  };
  timestamp: string;
}

@Injectable()
export class DownloadImportTemplateUseCase {
  private readonly logger = new Logger(DownloadImportTemplateUseCase.name);

  constructor(
    @Inject('ExcelGenerationService')
    private readonly excelService: IExcelGenerationService
  ) {}

  async execute(
    request: IDownloadImportTemplateRequest
  ): Promise<Result<IDownloadImportTemplateResponse, DomainError>> {
    this.logger.log('Downloading import template', {
      type: request.type,
      format: request.format,
    });

    try {
      // Validate type
      let importType: ImportType;
      try {
        importType = ImportType.create(request.type);
      } catch {
        return err(
          new ValidationError(`Invalid import type: ${request.type}`, IMPORT_INVALID_TYPE)
        );
      }

      const format = request.format ?? 'csv';

      // Generate template based on format
      // For xlsx, we would need to use the xlsx library in infrastructure
      // For now, CSV is generated directly from the domain service
      let content: Buffer;
      if (format === 'csv') {
        content = ImportTemplateService.generateCSVTemplateBuffer(importType);
      } else {
        content = await this.excelService.generateTemplateXlsx(importType);
      }

      const filename = ImportTemplateService.getTemplateFilename(importType, format);
      const mimeType = ImportTemplateService.getMimeType(format);
      const columnDescriptions = ImportTemplateService.getColumnDescriptions(importType);

      this.logger.log('Import template generated', { filename, type: request.type });

      return ok({
        success: true,
        message: 'Import template generated successfully',
        data: {
          content,
          filename,
          mimeType,
          columns: columnDescriptions,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to generate import template', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to generate import template', IMPORT_TEMPLATE_FAILED));
    }
  }
}
