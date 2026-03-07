import { DownloadErrorReportUseCase } from '@application/importUseCases/downloadErrorReportUseCase';
import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportErrorReportService } from '@import/domain/services/importErrorReport.service';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';
import type { IExcelGenerationService } from '@shared/ports/externalServices/iExcelGenerationService.port';

describe('DownloadErrorReportUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';

  let useCase: DownloadErrorReportUseCase;
  let mockRepository: jest.Mocked<IImportBatchRepository>;
  let mockExcelService: jest.Mocked<IExcelGenerationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      findByStatus: jest.fn(),
      findByCreatedBy: jest.fn(),
      findByTypeAndStatus: jest.fn(),
      findRecent: jest.fn(),
      countByStatus: jest.fn(),
      findPaginated: jest.fn(),
    } as jest.Mocked<IImportBatchRepository>;

    mockExcelService = {
      generateTemplateXlsx: jest
        .fn<IExcelGenerationService['generateTemplateXlsx']>()
        .mockResolvedValue(Buffer.from('xlsx-content')),
      generateErrorReportXlsx: jest
        .fn<IExcelGenerationService['generateErrorReportXlsx']>()
        .mockResolvedValue(Buffer.from('xlsx-content')),
    };

    useCase = new DownloadErrorReportUseCase(mockRepository, mockExcelService);
  });

  describe('execute', () => {
    const createMockBatch = (status: 'PENDING' | 'VALIDATED' = 'VALIDATED') => {
      return ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create(status),
          fileName: 'products.xlsx',
          totalRows: 10,
          processedRows: 0,
          validRows: 8,
          invalidRows: 2,
          createdBy: 'user-123',
        },
        mockBatchId,
        mockOrgId
      );
    };

    it('Given: validated batch When: downloading error report Then: should return report', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATED');
      mockRepository.findById.mockResolvedValue(mockBatch);

      jest.spyOn(ImportErrorReportService, 'generateErrorReport').mockReturnValue({
        summary: {
          totalRows: 10,
          validRows: 8,
          invalidRows: 2,
          errorCount: 2,
          warningCount: 0,
          errorTypes: {},
        },
        errors: [],
      });

      jest
        .spyOn(ImportErrorReportService, 'generateCSVErrorReportBuffer')
        .mockReturnValue(Buffer.from('test'));
      jest
        .spyOn(ImportErrorReportService, 'getErrorReportFilename')
        .mockReturnValue('error-report.csv');
      jest.spyOn(ImportErrorReportService, 'getMimeType').mockReturnValue('text/csv');

      const request = {
        batchId: mockBatchId,
        format: 'csv' as const,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Error report generated successfully');
          expect(value.data.content).toBeInstanceOf(Buffer);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent batch When: downloading error report Then: should return NotFoundError', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request = {
        batchId: 'non-existent-id',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
        }
      );
    });

    it('Given: pending batch When: downloading error report Then: should return ValidationError', async () => {
      // Arrange
      const mockBatch = createMockBatch('PENDING');
      mockRepository.findById.mockResolvedValue(mockBatch);

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('not been validated');
        }
      );
    });
  });
});
