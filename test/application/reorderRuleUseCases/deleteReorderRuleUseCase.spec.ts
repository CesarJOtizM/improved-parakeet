import { DeleteReorderRuleUseCase } from '@application/reorderRuleUseCases/deleteReorderRuleUseCase';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

describe('DeleteReorderRuleUseCase', () => {
  const mockOrgId = 'org-123';
  const mockRuleId = 'rule-001';

  let useCase: DeleteReorderRuleUseCase;
  let mockReorderRuleRepository: jest.Mocked<IReorderRuleRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReorderRuleRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByProductAndWarehouse: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IReorderRuleRepository>;

    useCase = new DeleteReorderRuleUseCase(mockReorderRuleRepository);
  });

  describe('execute', () => {
    const validRequest = {
      id: mockRuleId,
      orgId: mockOrgId,
    };

    it('Given: existing reorder rule When: deleting Then: should return success result', async () => {
      // Arrange
      const existingRule = ReorderRule.reconstitute(
        {
          productId: 'product-456',
          warehouseId: 'warehouse-789',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Reorder rule deleted successfully');
          expect(value.data.deleted).toBe(true);
          expect(value.timestamp).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReorderRuleRepository.findById).toHaveBeenCalledWith(mockRuleId, mockOrgId);
      expect(mockReorderRuleRepository.delete).toHaveBeenCalledWith(mockRuleId, mockOrgId);
    });

    it('Given: non-existent reorder rule When: deleting Then: should return NotFoundError', async () => {
      // Arrange
      mockReorderRuleRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Reorder rule not found');
          expect(error.code).toBe('REORDER_RULE_NOT_FOUND');
        }
      );
      expect(mockReorderRuleRepository.delete).not.toHaveBeenCalled();
    });

    it('Given: existing rule When: repository delete throws error Then: should return ValidationError', async () => {
      // Arrange
      const existingRule = ReorderRule.reconstitute(
        {
          productId: 'product-456',
          warehouseId: 'warehouse-789',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.delete.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Database error');
          expect(error.code).toBe('REORDER_RULE_DELETE_ERROR');
        }
      );
    });

    it('Given: existing rule When: unknown error is thrown Then: should return generic error message', async () => {
      // Arrange
      const existingRule = ReorderRule.reconstitute(
        {
          productId: 'product-456',
          warehouseId: 'warehouse-789',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.delete.mockRejectedValue('string error');

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Failed to delete reorder rule');
        }
      );
    });

    it('Given: existing rule When: deleting Then: should call repository methods in correct order', async () => {
      // Arrange
      const existingRule = ReorderRule.reconstitute(
        {
          productId: 'product-456',
          warehouseId: 'warehouse-789',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute(validRequest);

      // Assert
      const findByIdOrder = mockReorderRuleRepository.findById.mock.invocationCallOrder[0];
      const deleteOrder = mockReorderRuleRepository.delete.mock.invocationCallOrder[0];
      expect(findByIdOrder).toBeLessThan(deleteOrder);
    });
  });
});
