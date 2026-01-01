import { ExecuteImportUseCase } from '@application/importUseCases/executeImportUseCase';
import { ImportBatch, ImportProcessingService, ImportValidationService } from '@import/domain';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';
import type { IFileParsingService } from '@shared/ports/externalServices';

describe('ExecuteImportUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';
  const mockUserId = 'user-123';

  let useCase: ExecuteImportUseCase;
  let mockRepository: jest.Mocked<IImportBatchRepository>;
  let mockFileParsingService: jest.Mocked<IFileParsingService>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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
    } as jest.Mocked<IImportBatchRepository>;

    mockFileParsingService = {
      validateFileFormat: jest.fn(),
      parseFile: jest.fn(),
    } as jest.Mocked<IFileParsingService>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new ExecuteImportUseCase(mockRepository, mockFileParsingService, mockEventDispatcher);
  });

  describe('execute', () => {
    const mockFile = {
      originalname: 'products.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('Given: valid file When: executing import Then: should return success result', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name'],
        rows: [],
        totalRows: 0,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValue(ValidationResult.valid());

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: true,
        processedCount: 0,
        failedCount: 0,
        results: [],
        errorMessage: undefined,
      });

      const batchWithId = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('PENDING'),
          fileName: mockFile.originalname,
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: mockUserId,
        },
        mockBatchId,
        mockOrgId
      );

      mockRepository.save.mockResolvedValue(batchWithId);

      const request = {
        type: 'PRODUCTS' as const,
        file: mockFile,
        note: 'Test import',
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import executed successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: invalid file format When: executing import Then: should return ValidationError', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: false,
        errors: ['Invalid file format'],
      });

      const request = {
        type: 'PRODUCTS' as const,
        file: mockFile,
        createdBy: mockUserId,
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
        }
      );
    });
  });
});
