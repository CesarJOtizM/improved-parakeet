import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductBusinessRulesService } from '@product/domain/services/productBusinessRules.service';
import { ProductMapper } from '@product/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('CreateProductUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockProductId = 'product-123';

  let useCase: CreateProductUseCase;
  let mockProductRepository: jest.Mocked<IProductRepository>;
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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CreateProductUseCase(mockProductRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    const validRequest = {
      sku: 'PROD-001',
      name: 'Test Product',
      description: 'Test Description',
      unit: {
        code: 'UNIT',
        name: 'Unit',
        precision: 0,
      },
      barcode: '1234567890',
      brand: 'Test Brand',
      model: 'Test Model',
      status: 'ACTIVE' as const,
      costMethod: 'AVG' as const,
      orgId: mockOrgId,
    };

    it('Given: valid product data When: creating product Then: should return success result', async () => {
      // Arrange
      jest.spyOn(ProductBusinessRulesService, 'validateProductCreationRules').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const productWithId = Product.reconstitute(
        ProductMapper.toDomainProps(validRequest).unwrap(),
        mockProductId,
        mockOrgId
      );

      mockProductRepository.save.mockResolvedValue(productWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Product created successfully');
          expect(value.data.sku).toBe(validRequest.sku);
          expect(value.data.name).toBe(validRequest.name);
          expect(value.data.orgId).toBe(mockOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: duplicate SKU When: creating product Then: should return ConflictError', async () => {
      // Arrange
      jest.spyOn(ProductBusinessRulesService, 'validateProductCreationRules').mockResolvedValue({
        isValid: false,
        errors: ['SKU already exists'],
      });

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
          expect(error.message).toContain('SKU already exists');
        }
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('Given: invalid product data When: creating product Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        sku: '', // Invalid empty SKU
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
        }
      );
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('Given: repository error When: creating product Then: should return ValidationError', async () => {
      // Arrange
      jest.spyOn(ProductBusinessRulesService, 'validateProductCreationRules').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      mockProductRepository.save.mockRejectedValue(new Error('Database error'));

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
        }
      );
    });

    it('Given: valid product data without optional fields When: creating product Then: should return success result', async () => {
      // Arrange
      const minimalRequest = {
        sku: 'PROD-002',
        name: 'Minimal Product',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        orgId: mockOrgId,
      };

      jest.spyOn(ProductBusinessRulesService, 'validateProductCreationRules').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const productWithId = Product.reconstitute(
        ProductMapper.toDomainProps(minimalRequest).unwrap(),
        mockProductId,
        mockOrgId
      );

      mockProductRepository.save.mockResolvedValue(productWithId);

      // Act
      const result = await useCase.execute(minimalRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.sku).toBe(minimalRequest.sku);
          expect(value.data.name).toBe(minimalRequest.name);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
