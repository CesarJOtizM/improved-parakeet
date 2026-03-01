import { GetReorderRulesUseCase } from '@application/reorderRuleUseCases/getReorderRulesUseCase';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

describe('GetReorderRulesUseCase', () => {
  const mockOrgId = 'org-123';

  let useCase: GetReorderRulesUseCase;
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

    useCase = new GetReorderRulesUseCase(mockReorderRuleRepository);
  });

  describe('execute', () => {
    it('Given: rules exist When: getting all rules Then: should return success with mapped data', async () => {
      // Arrange
      const rules = [
        ReorderRule.reconstitute(
          {
            productId: 'product-1',
            warehouseId: 'warehouse-1',
            minQty: MinQuantity.create(10),
            maxQty: MaxQuantity.create(100),
            safetyQty: SafetyStock.create(5),
          },
          'rule-1',
          mockOrgId
        ),
        ReorderRule.reconstitute(
          {
            productId: 'product-2',
            warehouseId: 'warehouse-2',
            minQty: MinQuantity.create(20),
            maxQty: MaxQuantity.create(200),
            safetyQty: SafetyStock.create(15),
          },
          'rule-2',
          mockOrgId
        ),
      ];
      mockReorderRuleRepository.findAll.mockResolvedValue(rules);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Reorder rules retrieved successfully');
          expect(value.data).toHaveLength(2);

          expect(value.data[0].id).toBe('rule-1');
          expect(value.data[0].productId).toBe('product-1');
          expect(value.data[0].warehouseId).toBe('warehouse-1');
          expect(value.data[0].minQty).toBe(10);
          expect(value.data[0].maxQty).toBe(100);
          expect(value.data[0].safetyQty).toBe(5);

          expect(value.data[1].id).toBe('rule-2');
          expect(value.data[1].productId).toBe('product-2');
          expect(value.data[1].minQty).toBe(20);
          expect(value.data[1].maxQty).toBe(200);
          expect(value.data[1].safetyQty).toBe(15);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReorderRuleRepository.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: no rules exist When: getting all rules Then: should return success with empty array', async () => {
      // Arrange
      mockReorderRuleRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.data).toEqual([]);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: single rule exists When: getting all rules Then: should return array with one item', async () => {
      // Arrange
      const rules = [
        ReorderRule.reconstitute(
          {
            productId: 'product-1',
            warehouseId: 'warehouse-1',
            minQty: MinQuantity.create(5),
            maxQty: MaxQuantity.create(50),
            safetyQty: SafetyStock.create(2),
          },
          'rule-1',
          mockOrgId
        ),
      ];
      mockReorderRuleRepository.findAll.mockResolvedValue(rules);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].id).toBe('rule-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: rules exist When: getting all rules Then: response should include timestamp', async () => {
      // Arrange
      mockReorderRuleRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.timestamp).toBeDefined();
          expect(typeof value.timestamp).toBe('string');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: rules with decimal quantities When: getting all rules Then: should return numeric values correctly', async () => {
      // Arrange
      const rules = [
        ReorderRule.reconstitute(
          {
            productId: 'product-1',
            warehouseId: 'warehouse-1',
            minQty: MinQuantity.create(2.5),
            maxQty: MaxQuantity.create(10.75),
            safetyQty: SafetyStock.create(1.25),
          },
          'rule-1',
          mockOrgId
        ),
      ];
      mockReorderRuleRepository.findAll.mockResolvedValue(rules);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].minQty).toBe(2.5);
          expect(value.data[0].maxQty).toBe(10.75);
          expect(value.data[0].safetyQty).toBe(1.25);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
