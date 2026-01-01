import {
  CreateImportBatchUseCase,
  type ICreateImportBatchRequest,
} from '@application/importUseCases/createImportBatchUseCase';
import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

import type { IImportBatchRepository } from '@import/domain';

describe('CreateImportBatchUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockBatchId = 'batch-123';
  const mockUserId = 'user-123';

  let useCase: CreateImportBatchUseCase;
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
    } as jest.Mocked<IImportBatchRepository>;

    useCase = new CreateImportBatchUseCase(mockRepository);
  });

  describe('execute', () => {
    const validRequest: ICreateImportBatchRequest = {
      type: 'PRODUCTS',
      fileName: 'products.xlsx',
      note: 'Test import',
      createdBy: mockUserId,
      orgId: mockOrgId,
    };

    it('Given: valid import batch data When: creating batch Then: should return success result', async () => {
      // Arrange
      const batchWithId = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('PENDING'),
          fileName: validRequest.fileName,
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          note: validRequest.note,
          createdBy: validRequest.createdBy,
        },
        mockBatchId,
        mockOrgId
      );

      mockRepository.save.mockResolvedValue(batchWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Import batch created successfully');
          expect(value.data.type).toBe('PRODUCTS');
          expect(value.data.status).toBe('PENDING');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: invalid import type When: creating batch Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest: ICreateImportBatchRequest = {
        ...validRequest,
        type: 'INVALID_TYPE' as 'PRODUCTS',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

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
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('Given: empty fileName When: creating batch Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        fileName: '',
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('File name is required');
        }
      );
    });
  });
});
