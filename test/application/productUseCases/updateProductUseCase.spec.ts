import { UpdateProductUseCase } from '@application/productUseCases/updateProductUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductBusinessRulesService } from '@product/domain/services/productBusinessRules.service';
import { ProductMapper } from '@product/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

import type { IProductRepository } from '@product/domain/ports/repositories';
import type { IMovementRepository } from '@product/domain/services/productBusinessRules.service';

describe('UpdateProductUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockProductId = 'product-123';

  let useCase: UpdateProductUseCase;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    mockMovementRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      findByProduct: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
      hasMovements: jest.fn(),
      hasPostedMovements: jest.fn(),
      hasMovementsForProduct: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new UpdateProductUseCase(
      mockProductRepository,
      mockMovementRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockProduct = (status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' = 'ACTIVE') => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        description: 'Test Description',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        status,
        costMethod: 'AVG',
      }).unwrap();
      return Product.reconstitute(props, mockProductId, mockOrgId);
    };

    it('Given: existing product and valid update data When: updating product Then: should return success result', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      jest.spyOn(ProductBusinessRulesService, 'validateCostMethodChange').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const updatedProduct = mockProduct.update({
        name: ProductMapper.toDomainProps({
          sku: 'PROD-001',
          name: 'Updated Product',
          unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        }).unwrap().name,
      });
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        name: 'Updated Product',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Product updated successfully');
          expect(value.data.id).toBe(mockProductId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent product ID When: updating product Then: should return NotFoundError', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        productId: 'non-existent-id',
        orgId: mockOrgId,
        name: 'Updated Product',
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
          expect(error.message).toBe('Product not found');
        }
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('Given: discontinued product When: updating status Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockProduct = createMockProduct('DISCONTINUED');
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        status: 'ACTIVE' as const,
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
          expect(error.message).toContain('Cannot change status');
        }
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('Given: product with movements When: changing cost method Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      jest.spyOn(ProductBusinessRulesService, 'validateCostMethodChange').mockResolvedValue({
        isValid: false,
        errors: ['Cost method cannot be changed when product has movements'],
      });

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        costMethod: 'FIFO' as const,
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
          expect(error.message).toContain('Cost method cannot be changed');
        }
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('Given: invalid product name When: updating product Then: should return ValidationError', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        name: '', // Invalid empty name
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

    it('Given: repository error When: updating product Then: should return ValidationError', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockRejectedValue(new Error('Database error'));

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        name: 'Updated Product',
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
          expect(error.message).toBe('Database error');
        }
      );
    });

    it('Given: valid update with multiple fields When: updating product Then: should return success result', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      jest.spyOn(ProductBusinessRulesService, 'validateCostMethodChange').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const updatedProduct = mockProduct.update({
        name: ProductMapper.toDomainProps({
          sku: 'PROD-001',
          name: 'Updated Product',
          unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        }).unwrap().name,
        description: 'Updated Description',
        brand: 'Updated Brand',
      });
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
        name: 'Updated Product',
        description: 'Updated Description',
        brand: 'Updated Brand',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.name).toBe('Updated Product');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
