import { ImportType, ImportValidationService, type ImportTypeValue } from '@import/domain';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IMPORT_FILE_VALIDATION_FAILED,
  IMPORT_INVALID_TYPE,
  IMPORT_PREVIEW_ERROR,
} from '@shared/constants/error-codes';
import { DomainError, Result, ValidationError, err, ok } from '@shared/domain/result';

import type { IFileParsingService } from '@shared/ports/externalServices';

export interface IPreviewImportRequest {
  type: ImportTypeValue;
  file: Express.Multer.File;
  orgId: string;
}

export interface IPreviewImportResponse {
  success: boolean;
  message: string;
  data: {
    canBeProcessed: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    structureErrors: string[];
    rowErrors: Array<{ rowNumber: number; errors: string[] }>;
    warnings: string[];
  };
  timestamp: string;
}

@Injectable()
export class PreviewImportUseCase {
  private readonly logger = new Logger(PreviewImportUseCase.name);

  constructor(
    @Inject('FileParsingService')
    private readonly fileParsingService: IFileParsingService
  ) {}

  async execute(
    request: IPreviewImportRequest
  ): Promise<Result<IPreviewImportResponse, DomainError>> {
    this.logger.log('Previewing import file', {
      type: request.type,
      fileName: request.file?.originalname,
    });

    try {
      // 1. Validate import type
      let importType: ImportType;
      try {
        importType = ImportType.create(request.type);
      } catch {
        return err(
          new ValidationError(`Invalid import type: ${request.type}`, IMPORT_INVALID_TYPE)
        );
      }

      // 2. Validate file format using port
      const fileValidation = this.fileParsingService.validateFileFormat(request.file);
      if (!fileValidation.isValid) {
        return err(
          new ValidationError(fileValidation.errors.join(', '), IMPORT_FILE_VALIDATION_FAILED)
        );
      }

      // 3. Parse file using port
      const parsedData = await this.fileParsingService.parseFile(request.file);

      // 4. Validate file structure (headers)
      const structureValidation = ImportValidationService.validateFileStructure(
        importType,
        parsedData.headers
      );

      const structureErrors = structureValidation.getErrors();
      const structureWarnings = structureValidation.getWarnings();

      // 5. Validate each row (without persisting)
      const rowErrors: Array<{ rowNumber: number; errors: string[] }> = [];
      let validRows = 0;
      let invalidRows = 0;

      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header, data starts at row 2

        // Validate row data
        const rowValidation = ImportValidationService.validateRowData(
          importType,
          rowData,
          rowNumber
        );

        if (rowValidation.isValid()) {
          validRows++;
        } else {
          invalidRows++;
          rowErrors.push({
            rowNumber,
            errors: rowValidation.getErrors(),
          });
        }
      }

      const totalRows = parsedData.rows.length;
      const canBeProcessed = structureErrors.length === 0 && invalidRows === 0;

      this.logger.log('Import preview completed', {
        type: request.type,
        totalRows,
        validRows,
        invalidRows,
        canBeProcessed,
      });

      return ok({
        success: true,
        message: canBeProcessed
          ? 'File is valid and can be processed'
          : 'File has validation errors that must be corrected',
        data: {
          canBeProcessed,
          totalRows,
          validRows,
          invalidRows,
          structureErrors,
          rowErrors,
          warnings: structureWarnings,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to preview import file', {
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(
        new ValidationError(
          `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          IMPORT_PREVIEW_ERROR
        )
      );
    }
  }
}
