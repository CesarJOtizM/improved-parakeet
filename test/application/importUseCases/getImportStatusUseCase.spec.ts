import { GetImportStatusUseCase } from '@application/importUseCases/getImportStatusUseCase';
import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';

describe('GetImportStatusUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';

  let useCase: GetImportStatusUseCase;
  let mockRepository: jest.Mocked<IImportBatchRepository>;

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

    useCase = new GetImportStatusUseCase(mockRepository);
  });

  describe('execute', () => {
    const createMockBatch = () => {
      return ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('VALIDATED'),
          fileName: 'products.xlsx',
          totalRows: 10,
          processedRows: 5,
          validRows: 8,
          invalidRows: 2,
          createdBy: 'user-123',
        },
        mockBatchId,
        mockOrgId
      );
    };

    it('Given: existing batch When: getting import status Then: should return status', async () => {
      // Arrange
      const mockBatch = createMockBatch();
      mockRepository.findById.mockResolvedValue(mockBatch);

      const request = {
        batchId: mockBatchId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import status retrieved successfully');
          expect(value.data.id).toBe(mockBatchId);
          expect(value.data.totalRows).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent batch When: getting import status Then: should return NotFoundError', async () => {
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
  });
});
