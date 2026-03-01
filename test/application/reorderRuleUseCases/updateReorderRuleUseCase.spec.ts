import { UpdateReorderRuleUseCase } from '@application/reorderRuleUseCases/updateReorderRuleUseCase';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

describe('UpdateReorderRuleUseCase', () => {
  const mockOrgId = 'org-123';
  const mockRuleId = 'rule-001';

  let useCase: UpdateReorderRuleUseCase;
  let mockReorderRuleRepository: jest.Mocked<IReorderRuleRepository>;

  const createExistingRule = () =>
    ReorderRule.reconstitute(
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

    useCase = new UpdateReorderRuleUseCase(mockReorderRuleRepository);
  });

  describe('execute', () => {
    it('Given: existing rule and valid full update When: updating Then: should return success result', async () => {
      // Arrange
      const existingRule = createExistingRule();
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      const updatedRule = ReorderRule.reconstitute(
        {
          productId: 'product-456',
          warehouseId: 'warehouse-789',
          minQty: MinQuantity.create(20),
          maxQty: MaxQuantity.create(200),
          safetyQty: SafetyStock.create(15),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.update.mockResolvedValue(updatedRule);

      // Act
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        minQty: 20,
        maxQty: 200,
        safetyQty: 15,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Reorder rule updated successfully');
          expect(value.data.id).toBe(mockRuleId);
          expect(value.data.minQty).toBe(20);
          expect(value.data.maxQty).toBe(200);
          expect(value.data.safetyQty).toBe(15);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReorderRuleRepository.findById).toHaveBeenCalledWith(mockRuleId, mockOrgId);
      expect(mockReorderRuleRepository.update).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent rule When: updating Then: should return NotFoundError', async () => {
      // Arrange
      mockReorderRuleRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({
        id: 'non-existent',
        orgId: mockOrgId,
        minQty: 20,
      });

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
      expect(mockReorderRuleRepository.update).not.toHaveBeenCalled();
    });

    it('Given: existing rule and only minQty When: updating partially Then: should only update minQty', async () => {
      // Arrange
      const existingRule = createExistingRule();
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.update.mockResolvedValue(existingRule);

      // Act
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        minQty: 5,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      // Verify the entity was passed to update with the modified minQty
      const updatedEntity = mockReorderRuleRepository.update.mock.calls[0][0];
      expect(updatedEntity.minQty.getNumericValue()).toBe(5);
    });

    it('Given: existing rule and only maxQty When: updating partially Then: should only update maxQty', async () => {
      // Arrange
      const existingRule = createExistingRule();
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.update.mockResolvedValue(existingRule);

      // Act
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        maxQty: 500,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const updatedEntity = mockReorderRuleRepository.update.mock.calls[0][0];
      expect(updatedEntity.maxQty.getNumericValue()).toBe(500);
    });

    it('Given: existing rule and only safetyQty When: updating partially Then: should only update safetyQty', async () => {
      // Arrange
      const existingRule = createExistingRule();
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.update.mockResolvedValue(existingRule);

      // Act
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        safetyQty: 8,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      const updatedEntity = mockReorderRuleRepository.update.mock.calls[0][0];
      expect(updatedEntity.safetyQty.getNumericValue()).toBe(8);
    });

    it('Given: existing rule When: repository update throws error Then: should return ValidationError', async () => {
      // Arrange
      const existingRule = createExistingRule();
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);
      mockReorderRuleRepository.update.mockRejectedValue(new Error('Database timeout'));

      // Act
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        minQty: 20,
        maxQty: 200,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Database timeout');
          expect(error.code).toBe('REORDER_RULE_UPDATE_ERROR');
        }
      );
    });

    it('Given: existing rule When: maxQty set below minQty via entity validation Then: should return error', async () => {
      // Arrange - entity validateQuantities throws when maxQty <= minQty
      const existingRule = createExistingRule(); // minQty=10, maxQty=100
      mockReorderRuleRepository.findById.mockResolvedValue(existingRule);

      // Act - setting maxQty to 5 which is less than existing minQty of 10
      const result = await useCase.execute({
        id: mockRuleId,
        orgId: mockOrgId,
        maxQty: 5,
      });

      // Assert - entity.updateMaxQty throws Error which gets caught
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('MaxQuantity must be greater than MinQuantity');
        }
      );
    });
  });
});
