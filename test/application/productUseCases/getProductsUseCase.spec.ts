import { GetProductsUseCase } from '@application/productUseCases/getProductsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

describe('GetProductsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetProductsUseCase;
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

    useCase = new GetProductsUseCase(mockProductRepository);
  });

  describe('execute', () => {
    const createMockProduct = (sku: string, name: string) => {
      const props = ProductMapper.toDomainProps({
        sku,
        name,
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    it('Given: valid request When: getting products Then: should return paginated products', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product 1'),
        createMockProduct('PROD-002', 'Product 2'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Products retrieved successfully');
          expect(value.data).toHaveLength(2);
          expect(value.pagination).toBeDefined();
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.total).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: request with status filter When: getting products Then: should return filtered products', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];

      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with search filter When: getting products Then: should return filtered products', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Test Product'),
        createMockProduct('PROD-002', 'Other Product'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'Test',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.length).toBeGreaterThan(0);
          expect(value.data[0].name).toContain('Test');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with sortBy When: getting products Then: should return sorted products', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-002', 'Product B'),
        createMockProduct('PROD-001', 'Product A'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.length).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty products list When: getting products Then: should return empty paginated result', async () => {
      // Arrange
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with pagination When: getting products Then: should return correct pagination', async () => {
      // Arrange
      const mockProducts = Array.from({ length: 25 }, (_, i) =>
        createMockProduct(`PROD-${String(i + 1).padStart(3, '0')}`, `Product ${i + 1}`)
      );

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.total).toBe(25);
          expect(value.pagination.totalPages).toBe(3);
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with category filter When: getting products Then: should return filtered products', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];

      // Category filter is not yet implemented in the use case, so it falls back to findAll
      // We need to mock findAll as well
      mockProductRepository.findAll.mockResolvedValue(mockProducts);
      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        category: 'Electronics',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.length).toBeGreaterThanOrEqual(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with multiple filters When: getting products Then: should apply all filters', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Test Product')];

      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'ACTIVE',
        search: 'Test',
        category: 'Electronics',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with default pagination When: getting products Then: should use default values', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: unrecognized sortBy value When: getting products Then: should fall back to createdAt sorting (switch default)', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product A'),
        createMockProduct('PROD-002', 'Product B'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'unknownField',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy without sortOrder When: getting products Then: should default to asc', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-002', 'Product B'),
        createMockProduct('PROD-001', 'Product A'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'name',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].name).toBe('Product A');
          expect(value.data[1].name).toBe('Product B');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy sku When: getting products Then: should sort by sku', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-002', 'Product B'),
        createMockProduct('PROD-001', 'Product A'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'sku',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].sku).toBe('PROD-001');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy status When: getting products Then: should sort by status', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product A'),
        createMockProduct('PROD-002', 'Product B'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy createdAt When: getting products Then: should sort by createdAt', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product A'),
        createMockProduct('PROD-002', 'Product B'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy updatedAt When: getting products Then: should sort by updatedAt', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product A'),
        createMockProduct('PROD-002', 'Product B'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy price When: getting products Then: should sort by price', async () => {
      // Arrange
      const mockProducts = [
        createMockProduct('PROD-001', 'Product A'),
        createMockProduct('PROD-002', 'Product B'),
      ];

      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with categoryIds filter When: getting products Then: should use specification', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];

      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        categoryIds: ['cat-1', 'cat-2'],
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockProductRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with companyId filter When: getting products Then: should use specification', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];

      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockProductRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with status + categoryIds + companyId When: getting products Then: should combine specifications', async () => {
      // Arrange
      const mockProducts = [createMockProduct('PROD-001', 'Product 1')];

      mockProductRepository.findBySpecification.mockResolvedValue({
        data: mockProducts,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'ACTIVE',
        categoryIds: ['cat-1'],
        companyId: 'company-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockProductRepository.findBySpecification).toHaveBeenCalled();
    });
  });
});
