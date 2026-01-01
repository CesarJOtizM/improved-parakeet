import { ValidateImportUseCase } from '@application/importUseCases/validateImportUseCase';
import { ImportBatch, ImportValidationService } from '@import/domain';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';
import type { IFileParsingService } from '@shared/ports/externalServices';

describe('ValidateImportUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';

  let useCase: ValidateImportUseCase;
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

    useCase = new ValidateImportUseCase(
      mockRepository,
      mockFileParsingService,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockBatch = (status: 'PENDING' | 'VALIDATING' = 'PENDING') => {
      return ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create(status),
          fileName: 'products.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        mockBatchId,
        mockOrgId
      );
    };

    const mockFile = {
      originalname: 'products.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('Given: pending batch and valid file When: validating import Then: should return success result', async () => {
      // Arrange
      const mockBatch = createMockBatch('PENDING');
      mockRepository.findById.mockResolvedValue(mockBatch);

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

      // Mock save to return the batch after it's been modified
      mockRepository.save.mockImplementation(async batch => batch);

      const request = {
        batchId: mockBatchId,
        file: mockFile,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import batch validated successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent batch When: validating import Then: should return NotFoundError', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const request = {
        batchId: 'non-existent-id',
        file: mockFile,
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

    it('Given: batch that cannot be validated When: validating import Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATING');
      mockRepository.findById.mockResolvedValue(mockBatch);

      const request = {
        batchId: mockBatchId,
        file: mockFile,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });
  });
});
