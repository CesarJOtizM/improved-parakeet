import { ProcessImportUseCase } from '@application/importUseCases/processImportUseCase';
import { ImportBatch, ImportProcessingService } from '@import/domain';
import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';

describe('ProcessImportUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';

  let useCase: ProcessImportUseCase;
  let mockRepository: jest.Mocked<IImportBatchRepository>;
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

    useCase = new ProcessImportUseCase(
      mockRepository,
      mockEventDispatcher,
      mockRowProcessorFactory
    );
  });

  describe('execute', () => {
    const createMockBatch = (status: 'VALIDATED' | 'PROCESSING' = 'VALIDATED') => {
      return ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create(status),
          fileName: 'products.xlsx',
          totalRows: 10,
          processedRows: 0,
          validRows: 10,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        mockBatchId,
        mockOrgId
      );
    };

    it('Given: validated batch When: processing import Then: should return success result', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATED');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: true,
        processedCount: 10,
        failedCount: 0,
        results: [],
        errorMessage: undefined,
      });

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
        skipInvalidRows: false,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import batch processed successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent batch When: processing import Then: should return NotFoundError', async () => {
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

    it('Given: batch that cannot be processed When: processing import Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockBatch = createMockBatch('PROCESSING');
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
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: processing fails with errorMessage When: processing import Then: should call batch.fail with errorMessage', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATED');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: false,
        processedCount: 8,
        failedCount: 2,
        results: [],
        errorMessage: 'Failed to process 2 row(s)',
      });

      const failSpy = jest.spyOn(mockBatch, 'fail');

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
        skipInvalidRows: false,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(failSpy).toHaveBeenCalledWith('Failed to process 2 row(s)');
      result.match(
        value => {
          expect(value.message).toBe('Import batch processing completed with errors');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: processing fails without errorMessage When: processing import Then: should call batch.fail with fallback message', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATED');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      jest.spyOn(ImportProcessingService, 'processBatch').mockResolvedValue({
        success: false,
        processedCount: 0,
        failedCount: 10,
        results: [],
        errorMessage: undefined,
      });

      const failSpy = jest.spyOn(mockBatch, 'fail');

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
        skipInvalidRows: true,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(failSpy).toHaveBeenCalledWith('Processing failed');
    });

    it('Given: repository throws error When: processing import Then: should return BusinessRuleError from outer catch', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Database connection failed'));

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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Processing failed: Database connection failed');
        }
      );
    });

    it('Given: skipInvalidRows not provided When: processing import Then: should default to true', async () => {
      // Arrange
      const mockBatch = createMockBatch('VALIDATED');
      mockRepository.findById.mockResolvedValue(mockBatch);
      mockRepository.save.mockImplementation(async batch => batch);

      const processBatchSpy = jest
        .spyOn(ImportProcessingService, 'processBatch')
        .mockResolvedValue({
          success: true,
          processedCount: 10,
          failedCount: 0,
          results: [],
          errorMessage: undefined,
        });

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
        // skipInvalidRows intentionally omitted
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(processBatchSpy).toHaveBeenCalledWith(
        mockBatch,
        expect.any(Function),
        expect.objectContaining({
          skipInvalidRows: true,
        })
      );
    });
  });
});
