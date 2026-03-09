/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductsController } from '@interface/http/inventory/products.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('ProductsController', () => {
  let controller: ProductsController;

  let mockCreateProductUseCase: any;

  let mockGetProductsUseCase: any;

  let mockGetProductByIdUseCase: any;

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

      const result = await controller.getProducts(query as any, 'org-123');

      // Assert - getProducts uses resultToHttpResponse so returns the value directly
      expect(result.success).toBe(true);

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

      const result = await controller.updateProduct(
        'product-123',
        dto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);

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
        controller.updateProduct('non-existent', dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('createProduct - all field mapping', () => {
    it('Given: all fields When: creating product Then: should pass all fields to use case', async () => {
      // Arrange
      const dto = {
        sku: 'SKU-FULL',
        name: 'Full Product',
        description: 'Full description',
        categoryIds: ['cat-1', 'cat-2'],
        unit: { code: 'KG', name: 'Kilogram', precision: 2 },
        barcode: '1234567890123',
        brand: 'TestBrand',
        model: 'ModelX',
        price: 99.99,
        currency: 'USD',
        status: 'ACTIVE',
        costMethod: 'FIFO',
        companyId: 'comp-123',
      };
      mockCreateProductUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockProductData, ...dto },
          message: 'Product created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createProduct(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith({
        sku: 'SKU-FULL',
        name: 'Full Product',
        description: 'Full description',
        categoryIds: ['cat-1', 'cat-2'],
        unit: { code: 'KG', name: 'Kilogram', precision: 2 },
        barcode: '1234567890123',
        brand: 'TestBrand',
        model: 'ModelX',
        price: 99.99,
        currency: 'USD',
        status: 'ACTIVE',
        costMethod: 'FIFO',
        companyId: 'comp-123',
        orgId: 'org-123',
      });
    });

    it('Given: only required fields When: creating product Then: should pass undefined for optional fields', async () => {
      // Arrange
      const dto = {
        sku: 'SKU-MIN',
        name: 'Minimal Product',
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
      await controller.createProduct(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith({
        sku: 'SKU-MIN',
        name: 'Minimal Product',
        description: undefined,
        categoryIds: undefined,
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        barcode: undefined,
        brand: undefined,
        model: undefined,
        price: undefined,
        currency: undefined,
        status: undefined,
        costMethod: undefined,
        companyId: undefined,
        orgId: 'org-123',
      });
    });
  });

  describe('getProducts - all query params', () => {
    it('Given: all filters When: getting products Then: should pass all filters to use case', async () => {
      // Arrange
      const query = {
        page: 2,
        limit: 25,
        status: 'ACTIVE',
        categoryIds: 'cat-1,cat-2',
        companyId: 'comp-123',
        search: 'test product',
        sortBy: 'price',
        sortOrder: 'desc',
      };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 2, limit: 25 },
        message: 'Products retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetProductsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getProducts(query as any, 'org-123');

      // Assert
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: 2,
        limit: 25,
        status: 'ACTIVE',
        categoryIds: 'cat-1,cat-2',
        companyId: 'comp-123',
        search: 'test product',
        sortBy: 'price',
        sortOrder: 'desc',
      });
    });

    it('Given: no filters When: getting products Then: should pass all filters as undefined', async () => {
      // Arrange
      const query = {};
      const responseData = {
        success: true,
        data: { items: [], total: 0 },
        message: 'Products retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetProductsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getProducts(query as any, 'org-123');

      // Assert
      expect(mockGetProductsUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: undefined,
        limit: undefined,
        status: undefined,
        categoryIds: undefined,
        companyId: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });

    it('Given: use case error When: getting products Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetProductsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve products'))
      );

      // Act & Assert
      await expect(controller.getProducts(query as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('updateProduct - all field mapping', () => {
    it('Given: all fields When: updating product Then: should pass all fields to use case', async () => {
      // Arrange
      const dto = {
        name: 'Updated Full Product',
        description: 'Updated description',
        categoryIds: ['cat-3'],
        unit: { code: 'LB', name: 'Pound', precision: 2 },
        barcode: '9876543210987',
        brand: 'NewBrand',
        model: 'ModelY',
        price: 149.99,
        currency: 'EUR',
        status: 'INACTIVE',
        costMethod: 'AVG',
        companyId: 'comp-456',
      };
      mockUpdateProductUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockProductData, ...dto },
          message: 'Product updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateProduct('product-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-123',
        orgId: 'org-123',
        name: 'Updated Full Product',
        description: 'Updated description',
        categoryIds: ['cat-3'],
        unit: { code: 'LB', name: 'Pound', precision: 2 },
        barcode: '9876543210987',
        brand: 'NewBrand',
        model: 'ModelY',
        price: 149.99,
        currency: 'EUR',
        status: 'INACTIVE',
        costMethod: 'AVG',
        companyId: 'comp-456',
        updatedBy: 'user-123',
      });
    });

    it('Given: only name When: updating product Then: should pass undefined for other fields', async () => {
      // Arrange
      const dto = { name: 'Name Only' };
      mockUpdateProductUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockProductData, name: 'Name Only' },
          message: 'Product updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateProduct('product-123', dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockUpdateProductUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-123',
        orgId: 'org-123',
        name: 'Name Only',
        description: undefined,
        categoryIds: undefined,
        unit: undefined,
        barcode: undefined,
        brand: undefined,
        model: undefined,
        price: undefined,
        currency: undefined,
        status: undefined,
        costMethod: undefined,
        companyId: undefined,
        updatedBy: 'user-123',
      });
    });

    it('Given: validation error When: updating product Then: should throw', async () => {
      // Arrange
      const dto = { name: '' };
      mockUpdateProductUseCase.execute.mockResolvedValue(
        err(new ValidationError('Product name cannot be empty'))
      );

      // Act & Assert
      await expect(
        controller.updateProduct('product-123', dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getProductById - param mapping', () => {
    it('Given: valid product id When: getting by id Then: should pass correct params to use case', async () => {
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
      await controller.getProductById('product-456', 'org-123');

      // Assert
      expect(mockGetProductByIdUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-456',
        orgId: 'org-123',
      });
    });
  });
});
