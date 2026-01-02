import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let mockPrismaService: any;

  const mockProductData = {
    id: 'product-123',
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'Test description',
    unit: 'UNIT',
    barcode: '1234567890',
    brand: 'Test Brand',
    model: 'Test Model',
    isActive: true,
    costMethod: 'AVG',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    // Create repository without cache service for simpler testing
    repository = new PrismaProductRepository(mockPrismaService, undefined);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return product', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductData);

      // Act
      const result = await repository.findById('product-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('product-123');
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: wrong orgId When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductData);

      // Act
      const result = await repository.findById('product-123', 'wrong-org');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return products', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-123');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
      });
    });

    it('Given: no products When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findBySku', () => {
    it('Given: valid sku and orgId When: finding by sku Then: should return product', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(mockProductData);

      // Act
      const result = await repository.findBySku('SKU-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.sku.getValue()).toBe('SKU-001');
    });

    it('Given: non-existent sku When: finding by sku Then: should return null', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findBySku('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('Given: existing product When: saving Then: should update product', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-001'),
          name: ProductName.reconstitute('Updated Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-123',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductData);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProductData,
        name: 'Updated Product',
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });
  });

  describe('existsBySku', () => {
    it('Given: existing sku When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsBySku('SKU-001', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent sku When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsBySku('NON-EXISTENT', 'org-123');

      // Assert
      expect(result).toBe(false);
    });
  });
});
