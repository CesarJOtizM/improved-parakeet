import { GetProductByIdUseCase } from '@application/productUseCases/getProductByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('GetProductByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockProductId = 'product-123';

  let useCase: GetProductByIdUseCase;
  let mockProductRepository: jest.Mocked<IProductRepository>;

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

    useCase = new GetProductByIdUseCase(mockProductRepository);
  });

  describe('execute', () => {
    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        description: 'Test Description',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        barcode: '1234567890',
        brand: 'Test Brand',
        model: 'Test Model',
        status: 'ACTIVE',
        costMethod: 'AVG',
      }).unwrap();
      return Product.reconstitute(props, mockProductId, mockOrgId);
    };

    it('Given: existing product ID When: getting product by ID Then: should return product', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const request = {
        productId: mockProductId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Product retrieved successfully');
          expect(value.data.id).toBe(mockProductId);
          expect(value.data.sku).toBe('PROD-001');
          expect(value.data.name).toBe('Test Product');
          expect(value.data.orgId).toBe(mockOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith(mockProductId, mockOrgId);
    });

    it('Given: non-existent product ID When: getting product by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        productId: 'non-existent-id',
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
          expect(error.message).toBe('Product not found');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith('non-existent-id', mockOrgId);
    });

    it('Given: product from different organization When: getting product by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        productId: mockProductId,
        orgId: 'different-org-id',
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
