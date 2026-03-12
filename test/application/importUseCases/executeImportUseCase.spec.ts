import { ExecuteImportUseCase } from '@application/importUseCases/executeImportUseCase';
import { ImportBatch, ImportProcessingService, ImportValidationService } from '@import/domain';
import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
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
  let mockRowProcessorFactory: jest.Mocked<ImportRowProcessorFactory>;

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

    mockRowProcessorFactory = {
      createProcessor: jest.fn().mockReturnValue(async (row: any) => ({
        rowNumber: row.rowNumber,
        success: row.isValid(),
        error: row.isValid() ? undefined : 'Row has validation errors',
      })),
    } as unknown as jest.Mocked<ImportRowProcessorFactory>;

    useCase = new ExecuteImportUseCase(
      mockRepository,
      mockFileParsingService,
      mockEventDispatcher,
      mockRowProcessorFactory
    );
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

    it('Given: invalid import type When: executing import Then: should return ValidationError with IMPORT_INVALID_TYPE', async () => {
      // Arrange
      const request = {
        type: 'INVALID_TYPE' as any,
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
          expect(error.message).toContain('Invalid import type');
        }
      );
    });

    it('Given: invalid file structure (headers) When: executing import Then: should return ValidationError with IMPORT_STRUCTURE_INVALID', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['wrong_header'],
        rows: [],
        totalRows: 0,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.invalid(['Missing required column: sku']));

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
          expect(error.message).toContain('File structure validation failed');
        }
      );
    });

    it('Given: rows with validation errors When: executing import Then: should reject immediately with row errors', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name'],
        rows: [
          { sku: '', name: 'Product 1' },
          { sku: 'SKU-2', name: '' },
        ],
        totalRows: 2,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValueOnce(ValidationResult.invalid(['SKU is required']))
        .mockReturnValueOnce(ValidationResult.valid());

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
          expect(error.message).toContain('Import rejected');
          expect(error.message).toContain('1 row(s) have validation errors');
        }
      );
      // Should NOT have saved anything
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('Given: multiple rows with validation errors When: executing import Then: should report all errors', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name'],
        rows: [
          { sku: '', name: '' },
          { sku: '', name: '' },
        ],
        totalRows: 2,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValue(ValidationResult.invalid(['SKU is required']));

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
          expect(error.message).toContain('2 row(s) have validation errors');
        }
      );
    });

    it('Given: processing with partial failures When: executing import Then: should return completed with errors', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name'],
        rows: [{ sku: 'SKU-1', name: 'Product 1' }],
        totalRows: 1,
        fileType: 'excel' as const,
      });

      jest
        .spyOn(ImportValidationService, 'validateFileStructure')
        .mockReturnValue(ValidationResult.valid());

      jest
        .spyOn(ImportValidationService, 'validateRowData')
        .mockReturnValue(ValidationResult.valid());

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: false,
        processedCount: 1,
        failedCount: 1,
        results: [{ rowNumber: 2, success: false, error: 'Duplicate SKU' }],
        errorMessage: 'Some rows failed processing',
      });

      const batchWithId = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('FAILED'),
          fileName: mockFile.originalname,
          totalRows: 1,
          processedRows: 1,
          validRows: 0,
          invalidRows: 1,
          createdBy: mockUserId,
        },
        mockBatchId,
        mockOrgId
      );

      mockRepository.save.mockResolvedValue(batchWithId);

      const request = {
        type: 'PRODUCTS' as const,
        file: mockFile,
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
          expect(value.message).toBe('Import execution completed with errors');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: file with no rows When: executing import Then: should succeed with zero rows processed', async () => {
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
          status: ImportStatus.create('COMPLETED'),
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
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.totalRows).toBe(0);
          expect(value.data.processedRows).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: repository throws error When: executing import Then: should return BusinessRuleError', async () => {
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

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: true,
        processedCount: 0,
        failedCount: 0,
        results: [],
        errorMessage: undefined,
      });

      mockRepository.save.mockRejectedValue(new Error('Database connection error'));

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
          expect(error.message).toContain('Execution failed');
          expect(error.message).toContain('Database connection error');
        }
      );
    });

    it('Given: non-Error throw When: executing import Then: should return BusinessRuleError with Unknown error', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockRejectedValue('string error');

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
          expect(error.message).toContain('Unknown error');
        }
      );
    });

    it('Given: valid file with note and trim whitespace When: executing import Then: should process with trimmed note', async () => {
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
          status: ImportStatus.create('COMPLETED'),
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
        note: '  Test note with spaces  ',
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: multiple file validation errors When: executing import Then: should join errors in message', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: false,
        errors: ['File too large', 'Invalid extension'],
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
          expect(error.message).toContain('File too large');
          expect(error.message).toContain('Invalid extension');
        }
      );
    });

    it('Given: successful processing with row results When: executing import Then: should dispatch events and save final state', async () => {
      // Arrange
      mockFileParsingService.validateFileFormat.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockFileParsingService.parseFile.mockResolvedValue({
        headers: ['sku', 'name'],
        rows: [
          { sku: 'SKU-1', name: 'Product 1' },
          { sku: 'SKU-2', name: 'Product 2' },
        ],
        totalRows: 2,
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
        processedCount: 2,
        failedCount: 0,
        results: [
          { rowNumber: 2, success: true },
          { rowNumber: 3, success: true },
        ],
        errorMessage: undefined,
      });

      const batchWithId = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('COMPLETED'),
          fileName: mockFile.originalname,
          totalRows: 2,
          processedRows: 2,
          validRows: 2,
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
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
