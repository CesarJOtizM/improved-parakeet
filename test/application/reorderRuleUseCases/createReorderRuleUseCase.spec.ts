import { CreateReorderRuleUseCase } from '@application/reorderRuleUseCases/createReorderRuleUseCase';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

describe('CreateReorderRuleUseCase', () => {
  const mockOrgId = 'org-123';
  const mockProductId = 'product-456';
  const mockWarehouseId = 'warehouse-789';
  const mockRuleId = 'rule-001';

  let useCase: CreateReorderRuleUseCase;
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

    useCase = new CreateReorderRuleUseCase(mockReorderRuleRepository);
  });

  describe('execute', () => {
    const validRequest = {
      productId: mockProductId,
      warehouseId: mockWarehouseId,
      minQty: 10,
      maxQty: 100,
      safetyQty: 5,
      orgId: mockOrgId,
    };

    it('Given: valid reorder rule data When: creating rule Then: should return success result', async () => {
      // Arrange
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);
      const savedRule = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.create.mockResolvedValue(savedRule);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Reorder rule created successfully');
          expect(value.data.id).toBe(mockRuleId);
          expect(value.data.productId).toBe(mockProductId);
          expect(value.data.warehouseId).toBe(mockWarehouseId);
          expect(value.data.minQty).toBe(10);
          expect(value.data.maxQty).toBe(100);
          expect(value.data.safetyQty).toBe(5);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockReorderRuleRepository.findByProductAndWarehouse).toHaveBeenCalledWith(
        mockProductId,
        mockWarehouseId,
        mockOrgId
      );
      expect(mockReorderRuleRepository.create).toHaveBeenCalledTimes(1);
    });

    it('Given: maxQty less than minQty When: creating rule Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        minQty: 100,
        maxQty: 10,
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
          expect(error.message).toContain('Maximum quantity must be greater than minimum quantity');
          expect(error.code).toBe('INVALID_QUANTITIES');
        }
      );
      expect(mockReorderRuleRepository.create).not.toHaveBeenCalled();
    });

    it('Given: maxQty equal to minQty When: creating rule Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        minQty: 50,
        maxQty: 50,
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
          expect(error.message).toContain('Maximum quantity must be greater than minimum quantity');
        }
      );
    });

    it('Given: duplicate product-warehouse combination When: creating rule Then: should return ConflictError', async () => {
      // Arrange
      const existingRule = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          minQty: MinQuantity.create(5),
          maxQty: MaxQuantity.create(50),
          safetyQty: SafetyStock.create(3),
        },
        'existing-rule-id',
        mockOrgId
      );
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(existingRule);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists for this product and warehouse');
          expect(error.code).toBe('REORDER_RULE_CONFLICT');
        }
      );
      expect(mockReorderRuleRepository.create).not.toHaveBeenCalled();
    });

    it('Given: valid data When: repository create throws error Then: should return ValidationError with repo message', async () => {
      // Arrange
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);
      mockReorderRuleRepository.create.mockRejectedValue(new Error('Database connection failed'));

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
          expect(error.message).toBe('Database connection failed');
          expect(error.code).toBe('REORDER_RULE_CREATION_ERROR');
        }
      );
    });

    it('Given: valid data When: unknown error is thrown Then: should return generic error message', async () => {
      // Arrange
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);
      mockReorderRuleRepository.create.mockRejectedValue('string error');

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
          expect(error.message).toBe('Failed to create reorder rule');
        }
      );
    });

    it('Given: valid data When: creating rule Then: should pass correct entity to repository', async () => {
      // Arrange
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);
      const savedRule = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.create.mockResolvedValue(savedRule);

      // Act
      await useCase.execute(validRequest);

      // Assert
      const createdRule = mockReorderRuleRepository.create.mock.calls[0][0];
      expect(createdRule).toBeInstanceOf(ReorderRule);
      expect(createdRule.productId).toBe(mockProductId);
      expect(createdRule.warehouseId).toBe(mockWarehouseId);
      expect(createdRule.minQty.getNumericValue()).toBe(10);
      expect(createdRule.maxQty.getNumericValue()).toBe(100);
      expect(createdRule.safetyQty.getNumericValue()).toBe(5);
    });

    it('Given: valid data When: creating rule Then: response should include timestamp', async () => {
      // Arrange
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);
      const savedRule = ReorderRule.reconstitute(
        {
          productId: mockProductId,
          warehouseId: mockWarehouseId,
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(5),
        },
        mockRuleId,
        mockOrgId
      );
      mockReorderRuleRepository.create.mockResolvedValue(savedRule);

      // Act
      const result = await useCase.execute(validRequest);

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
  });
});
