import { ProcessImportUseCase } from '@application/importUseCases/processImportUseCase';
import { ImportBatch, ImportProcessingService } from '@import/domain';
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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new ProcessImportUseCase(mockRepository, mockEventDispatcher);
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
  });
});
