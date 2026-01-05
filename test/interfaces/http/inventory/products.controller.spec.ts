import { ProductsController } from '@interface/http/inventory/products.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('ProductsController', () => {
  let controller: ProductsController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateProductUseCase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGetProductsUseCase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGetProductByIdUseCase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUpdateProductUseCase: any;

  const mockProductData = {
    id: 'product-123',
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'Test description',
    unit: { code: 'UNIT', name: 'Unit', precision: 0 },
    status: 'ACTIVE',
    costMethod: 'AVG',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: { id: 'user-123', orgId: 'org-123' },
  };

  beforeEach(() => {
    mockCreateProductUseCase = {
      execute: jest.fn(),
    };
    mockGetProductsUseCase = {
      execute: jest.fn(),
    };
    mockGetProductByIdUseCase = {
      execute: jest.fn(),
    };
    mockUpdateProductUseCase = {
      execute: jest.fn(),
    };

    controller = new ProductsController(
      mockCreateProductUseCase,
      mockGetProductsUseCase,
      mockGetProductByIdUseCase,
      mockUpdateProductUseCase
    );
  });

  describe('createProduct', () => {
    it('Given: valid product data When: creating Then: should return created product', async () => {
      // Arrange
      const dto = {
        sku: 'SKU-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      };
      mockCreateProductUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockProductData,
          message: 'Product created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.createProduct(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.sku).toBe('SKU-001');
    });

    it('Given: duplicate SKU When: creating Then: should throw', async () => {
      // Arrange
      const dto = {
        sku: 'SKU-001',
        name: 'Test',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      };
      mockCreateProductUseCase.execute.mockResolvedValue(
        err(new ValidationError('Product with SKU already exists'))
      );

      // Act & Assert

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.createProduct(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getProducts', () => {
    it('Given: valid query When: getting products Then: should return product list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: { items: [mockProductData], total: 1, page: 1, limit: 10 },
        message: 'Products retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetProductsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.getProducts(query as any, 'org-123');

      // Assert - getProducts uses resultToHttpResponse so returns the value directly
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).items).toHaveLength(1);
    });
  });

  describe('getProductById', () => {
    it('Given: valid product id When: getting Then: should return product', async () => {
      // Arrange
      mockGetProductByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockProductData,
          message: 'Product retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getProductById('product-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('product-123');
    });

    it('Given: non-existent product id When: getting Then: should throw', async () => {
      // Arrange
      mockGetProductByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Product not found'))
      );

      // Act & Assert
      await expect(controller.getProductById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('updateProduct', () => {
    it('Given: valid update data When: updating Then: should return updated product', async () => {
      // Arrange
      const dto = { name: 'Updated Product' };
      mockUpdateProductUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockProductData, name: 'Updated Product' },
          message: 'Product updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.updateProduct('product-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).name).toBe('Updated Product');
    });

    it('Given: non-existent product When: updating Then: should throw', async () => {
      // Arrange
      const dto = { name: 'Updated Product' };
      mockUpdateProductUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Product not found'))
      );

      // Act & Assert
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller.updateProduct('non-existent', dto as any, 'org-123')
      ).rejects.toThrow();
    });
  });
});
