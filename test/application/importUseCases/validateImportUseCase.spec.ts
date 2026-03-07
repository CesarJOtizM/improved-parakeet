import { ValidateImportUseCase } from '@application/importUseCases/validateImportUseCase';
import { ImportBatch, ImportValidationService } from '@import/domain';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

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
      findPaginated: jest.fn(),
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

    it('Given: invalid file format When: validating import Then: should return ValidationError', async () => {
      // Arrange
      const mockBatch = createMockBatch('PENDING');
      mockRepository.findById.mockResolvedValue(mockBatch);

      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: false,
        errors: ['Unsupported file type', 'File too large'],
      });

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
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Unsupported file type, File too large');
        }
      );
    });

    it('Given: file structure validation fails When: validating import Then: should fail batch and return ValidationError', async () => {
      // Arrange
      const mockBatch = createMockBatch('PENDING');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['wrong_column'],
        rows: [],
        totalRows: 0,
        fileType: 'excel' as const,
      });

      const structureErrors = ['Missing required column: sku', 'Missing required column: name'];
      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.invalid(structureErrors));

      const failSpy = jest.spyOn(mockBatch, 'fail');

      const request = {
        batchId: mockBatchId,
        file: mockFile,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(failSpy).toHaveBeenCalledWith(
        'File structure validation failed: Missing required column: sku, Missing required column: name'
      );
      expect(mockRepository.save).toHaveBeenCalled();
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Missing required column: sku');
        }
      );
    });

    it('Given: file with valid and invalid rows When: validating import Then: should create rows and return counts', async () => {
      // Arrange
      const mockBatch = createMockBatch('PENDING');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name', 'unit'],
        rows: [
          { sku: 'PROD-001', name: 'Product 1', unit: 'UNIT' },
          { sku: '', name: '', unit: '' },
          { sku: 'PROD-003', name: 'Product 3', unit: 'KG' },
        ],
        totalRows: 3,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValueOnce(ValidationResult.valid())
        .mockReturnValueOnce(ValidationResult.invalid(['SKU is required', 'Name is required']))
        .mockReturnValueOnce(ValidationResult.valid());

      const setRowsSpy = jest.spyOn(mockBatch, 'setRows');

      const request = {
        batchId: mockBatchId,
        file: mockFile,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(setRowsSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ props: expect.objectContaining({ rowNumber: 2 }) }),
          expect.objectContaining({ props: expect.objectContaining({ rowNumber: 3 }) }),
          expect.objectContaining({ props: expect.objectContaining({ rowNumber: 4 }) }),
        ])
      );
      expect(ImportValidationService.validateRowData).toHaveBeenCalledTimes(3);
    });

    it('Given: repository throws error When: validating import Then: should return ValidationError from outer catch', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Database connection lost'));

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
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Validation failed: Database connection lost');
        }
      );
    });
  });
});
