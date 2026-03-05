/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaProductRepository } from '@infrastructure/database/repositories/product.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Product } from '@product/domain/entities/product.entity';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { Price } from '@product/domain/valueObjects/price.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
import { IPrismaSpecification } from '@shared/domain/specifications';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;

  let mockPrismaService: {
    product: Record<string, jest.Mock<any>>;
    stock: Record<string, jest.Mock<any>>;
  };

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
    categories: [],
    price: null,
    currency: null,
    statusChangedBy: null,
    statusChangedAt: null,
  };

  const mockProductDataWithPrice = {
    ...mockProductData,
    id: 'product-456',
    sku: 'SKU-002',
    name: 'Product With Price',
    price: 29990,
    currency: 'COP',
  };

  const mockProductDataWithDecimalPrice = {
    ...mockProductData,
    id: 'product-789',
    sku: 'SKU-003',
    name: 'Product With Decimal Price',
    price: { toNumber: () => 15500.5 },
    currency: 'USD',
  };

  const mockInactiveProductData = {
    ...mockProductData,
    id: 'product-inactive',
    sku: 'SKU-INACTIVE',
    name: 'Inactive Product',
    isActive: false,
    costMethod: 'FIFO',
    statusChangedBy: 'user-abc',
    statusChangedAt: new Date('2026-01-15'),
  };

  const mockProductDataWithCategories = {
    ...mockProductData,
    id: 'product-cat',
    sku: 'SKU-CAT',
    name: 'Categorized Product',
    categories: [
      { id: 'cat-1', name: 'Electronics' },
      { id: 'cat-2', name: 'Gadgets' },
    ],
  };

  beforeEach(() => {
    mockPrismaService = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      stock: {
        findMany: jest.fn(),
      },
    };

    // Create repository without cache service for simpler testing

    repository = new PrismaProductRepository(mockPrismaService as any, undefined);
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
        include: {
          categories: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
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

    it('Given: product with numeric price When: finding by id Then: should map price correctly', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductDataWithPrice);

      // Act
      const result = await repository.findById('product-456', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.price).toBeDefined();
      expect(result?.price?.getAmount()).toBe(29990);
      expect(result?.price?.getCurrency()).toBe('COP');
    });

    it('Given: product with Decimal price When: finding by id Then: should call toNumber and map price', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductDataWithDecimalPrice);

      // Act
      const result = await repository.findById('product-789', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.price).toBeDefined();
      expect(result?.price?.getAmount()).toBe(15500.5);
      expect(result?.price?.getCurrency()).toBe('USD');
    });

    it('Given: product with statusChangedBy When: finding by id Then: should map status fields', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockInactiveProductData);

      // Act
      const result = await repository.findById('product-inactive', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.status.getValue()).toBe('INACTIVE');
      expect(result?.statusChangedBy).toBe('user-abc');
      expect(result?.statusChangedAt).toEqual(new Date('2026-01-15'));
      expect(result?.costMethod.getValue()).toBe('FIFO');
    });

    it('Given: product with categories When: finding by id Then: should map categories', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductDataWithCategories);

      // Act
      const result = await repository.findById('product-cat', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.categories).toHaveLength(2);
      expect(result?.categories[0]).toEqual({ id: 'cat-1', name: 'Electronics' });
    });

    it('Given: prisma throws an Error When: finding by id Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockRejectedValue(new Error('DB connection failed'));

      // Act & Assert
      await expect(repository.findById('product-123', 'org-123')).rejects.toThrow(
        'DB connection failed'
      );
    });

    it('Given: prisma throws a non-Error When: finding by id Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findUnique.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findById('product-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('findById with cache', () => {
    let mockCacheService: Record<string, jest.Mock<any>>;
    let cachedRepository: PrismaProductRepository;

    beforeEach(() => {
      mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };

      cachedRepository = new PrismaProductRepository(
        mockPrismaService as any,
        mockCacheService as any
      );
    });

    it('Given: product is cached When: finding by id Then: should return from cache without querying DB', async () => {
      // Arrange
      const cachedProduct = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-001'),
          name: ProductName.reconstitute('Cached Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-123',
        'org-123'
      );
      mockCacheService.get.mockResolvedValue({
        match: (onOk: (v: Product) => Product) => onOk(cachedProduct),
      });

      // Act
      const result = await cachedRepository.findById('product-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.product.findUnique).not.toHaveBeenCalled();
    });

    it('Given: cache miss When: finding by id Then: should query DB and cache result', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue({
        match: (_onOk: unknown, onErr: () => null) => onErr(),
      });
      mockCacheService.set.mockResolvedValue({ isErr: () => false });
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductData);

      // Act
      const result = await cachedRepository.findById('product-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.product.findUnique).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
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
        include: {
          categories: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
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

    it('Given: multiple products with different prices When: finding all Then: should map all correctly', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([
        mockProductData,
        mockProductDataWithPrice,
        mockProductDataWithDecimalPrice,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].price).toBeUndefined();
      expect(result[1].price?.getAmount()).toBe(29990);
      expect(result[2].price?.getAmount()).toBe(15500.5);
    });

    it('Given: prisma throws an Error When: finding all Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Query timeout'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('Query timeout');
    });

    it('Given: prisma throws a non-Error When: finding all Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(42);

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe(42);
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

    it('Given: valid sku When: finding by sku Then: should pass correct where clause', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(mockProductData);

      // Act
      await repository.findBySku('SKU-001', 'org-123');

      // Assert
      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'SKU-001', orgId: 'org-123' },
      });
    });

    it('Given: product with price and Decimal When: finding by sku Then: should map price', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(mockProductDataWithDecimalPrice);

      // Act
      const result = await repository.findBySku('SKU-003', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.price?.getAmount()).toBe(15500.5);
      expect(result?.price?.getCurrency()).toBe('USD');
    });

    it('Given: prisma throws an Error When: finding by sku Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(repository.findBySku('SKU-001', 'org-123')).rejects.toThrow('Connection lost');
    });

    it('Given: prisma throws a non-Error When: finding by sku Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockRejectedValue({ code: 'P2025' });

      // Act & Assert
      await expect(repository.findBySku('SKU-001', 'org-123')).rejects.toEqual({ code: 'P2025' });
    });
  });

  describe('findBySku with cache', () => {
    let mockCacheService: Record<string, jest.Mock<any>>;
    let cachedRepository: PrismaProductRepository;

    beforeEach(() => {
      mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };

      cachedRepository = new PrismaProductRepository(
        mockPrismaService as any,
        mockCacheService as any
      );
    });

    it('Given: cache hit for product ID When: finding by sku Then: should return cached product', async () => {
      // Arrange
      const cachedProduct = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-001'),
          name: ProductName.reconstitute('Cached'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-123',
        'org-123'
      );
      mockPrismaService.product.findFirst.mockResolvedValue(mockProductData);
      mockCacheService.get.mockResolvedValue({
        match: (onOk: (v: Product) => Product) => onOk(cachedProduct),
      });

      // Act
      const result = await cachedRepository.findBySku('SKU-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      // findFirst is still called to get the ID for cache lookup
      expect(mockPrismaService.product.findFirst).toHaveBeenCalled();
    });

    it('Given: cache miss When: finding by sku Then: should cache the result', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(mockProductData);
      mockCacheService.get.mockResolvedValue({
        match: (_onOk: unknown, onErr: () => null) => onErr(),
      });
      mockCacheService.set.mockResolvedValue({ isErr: () => false });

      // Act
      const result = await cachedRepository.findBySku('SKU-001', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('Given: valid categoryId and orgId When: finding by category Then: should return products', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductDataWithCategories]);

      // Act
      const result = await repository.findByCategory('cat-1', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-cat');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { categories: { some: { id: 'cat-1' } }, orgId: 'org-123' },
        include: { categories: { select: { id: true, name: true } } },
      });
    });

    it('Given: no products in category When: finding by category Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByCategory('cat-999', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: multiple products with prices When: finding by category Then: should map all correctly', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([
        mockProductDataWithCategories,
        { ...mockProductDataWithPrice, categories: [{ id: 'cat-1', name: 'Electronics' }] },
      ]);

      // Act
      const result = await repository.findByCategory('cat-1', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].price).toBeUndefined();
      expect(result[1].price?.getAmount()).toBe(29990);
    });

    it('Given: prisma throws an Error When: finding by category Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Category query failed'));

      // Act & Assert
      await expect(repository.findByCategory('cat-1', 'org-123')).rejects.toThrow(
        'Category query failed'
      );
    });

    it('Given: prisma throws a non-Error When: finding by category Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue('unexpected');

      // Act & Assert
      await expect(repository.findByCategory('cat-1', 'org-123')).rejects.toBe('unexpected');
    });
  });

  describe('findByStatus', () => {
    it('Given: ACTIVE status When: finding by status Then: should query with isActive=true', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);

      // Act
      const result = await repository.findByStatus('ACTIVE', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status.getValue()).toBe('ACTIVE');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true, orgId: 'org-123' },
      });
    });

    it('Given: INACTIVE status When: finding by status Then: should query with isActive=false', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockInactiveProductData]);

      // Act
      const result = await repository.findByStatus('INACTIVE', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status.getValue()).toBe('INACTIVE');
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { isActive: false, orgId: 'org-123' },
      });
    });

    it('Given: no products matching status When: finding by status Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByStatus('ACTIVE', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: products with Decimal prices When: finding by status Then: should map prices', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductDataWithDecimalPrice]);

      // Act
      const result = await repository.findByStatus('ACTIVE', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].price?.getAmount()).toBe(15500.5);
    });

    it('Given: prisma throws an Error When: finding by status Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Status query error'));

      // Act & Assert
      await expect(repository.findByStatus('ACTIVE', 'org-123')).rejects.toThrow(
        'Status query error'
      );
    });

    it('Given: prisma throws a non-Error When: finding by status Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(null);

      // Act & Assert
      await expect(repository.findByStatus('ACTIVE', 'org-123')).rejects.toBeNull();
    });
  });

  describe('findByWarehouse', () => {
    const mockStockWithProduct = {
      id: 'stock-1',
      productId: 'product-123',
      warehouseId: 'warehouse-1',
      orgId: 'org-123',
      quantity: 50,
      product: mockProductData,
    };

    const mockStockWithPricedProduct = {
      id: 'stock-2',
      productId: 'product-456',
      warehouseId: 'warehouse-1',
      orgId: 'org-123',
      quantity: 25,
      product: mockProductDataWithPrice,
    };

    it('Given: valid warehouseId When: finding by warehouse Then: should return products from stock', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([mockStockWithProduct]);

      // Act
      const result = await repository.findByWarehouse('warehouse-1', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-123');
      expect(result[0].sku.getValue()).toBe('SKU-001');
      expect(mockPrismaService.stock.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'warehouse-1', orgId: 'org-123', quantity: { gt: 0 } },
        include: { product: true },
      });
    });

    it('Given: no stock in warehouse When: finding by warehouse Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByWarehouse('warehouse-empty', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: multiple products in warehouse When: finding by warehouse Then: should map all with prices', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([
        mockStockWithProduct,
        mockStockWithPricedProduct,
      ]);

      // Act
      const result = await repository.findByWarehouse('warehouse-1', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].price).toBeUndefined();
      expect(result[1].price?.getAmount()).toBe(29990);
    });

    it('Given: product with Decimal price in stock When: finding by warehouse Then: should call toNumber', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([
        {
          ...mockStockWithProduct,
          productId: 'product-789',
          product: mockProductDataWithDecimalPrice,
        },
      ]);

      // Act
      const result = await repository.findByWarehouse('warehouse-1', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].price?.getAmount()).toBe(15500.5);
    });

    it('Given: prisma throws an Error When: finding by warehouse Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockRejectedValue(new Error('Stock query failed'));

      // Act & Assert
      await expect(repository.findByWarehouse('warehouse-1', 'org-123')).rejects.toThrow(
        'Stock query failed'
      );
    });

    it('Given: prisma throws a non-Error When: finding by warehouse Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockRejectedValue('stock error');

      // Act & Assert
      await expect(repository.findByWarehouse('warehouse-1', 'org-123')).rejects.toBe(
        'stock error'
      );
    });
  });

  describe('findLowStock', () => {
    const mockLowStockData = [
      {
        id: 'stock-low-1',
        productId: 'product-123',
        warehouseId: 'warehouse-1',
        orgId: 'org-123',
        quantity: 5,
        product: mockProductData,
      },
    ];

    it('Given: products with low stock When: finding low stock Then: should return those products', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue(mockLowStockData);

      // Act
      const result = await repository.findLowStock('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-123');
      expect(mockPrismaService.stock.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', quantity: { lte: 10 } },
        include: { product: true },
      });
    });

    it('Given: no low stock products When: finding low stock Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findLowStock('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: duplicate productIds in stock When: finding low stock Then: should deduplicate', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([
        {
          id: 'stock-low-1',
          productId: 'product-123',
          warehouseId: 'warehouse-1',
          orgId: 'org-123',
          quantity: 3,
          product: mockProductData,
        },
        {
          id: 'stock-low-2',
          productId: 'product-123',
          warehouseId: 'warehouse-2',
          orgId: 'org-123',
          quantity: 7,
          product: mockProductData,
        },
        {
          id: 'stock-low-3',
          productId: 'product-456',
          warehouseId: 'warehouse-1',
          orgId: 'org-123',
          quantity: 2,
          product: mockProductDataWithPrice,
        },
      ]);

      // Act
      const result = await repository.findLowStock('org-123');

      // Assert
      expect(result).toHaveLength(2);
      const ids = result.map(p => p.id);
      expect(ids).toContain('product-123');
      expect(ids).toContain('product-456');
    });

    it('Given: low stock product with Decimal price When: finding low stock Then: should map price', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockResolvedValue([
        {
          id: 'stock-low-d',
          productId: 'product-789',
          warehouseId: 'warehouse-1',
          orgId: 'org-123',
          quantity: 1,
          product: mockProductDataWithDecimalPrice,
        },
      ]);

      // Act
      const result = await repository.findLowStock('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].price?.getAmount()).toBe(15500.5);
    });

    it('Given: prisma throws an Error When: finding low stock Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockRejectedValue(new Error('Low stock query failed'));

      // Act & Assert
      await expect(repository.findLowStock('org-123')).rejects.toThrow('Low stock query failed');
    });

    it('Given: prisma throws a non-Error When: finding low stock Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.stock.findMany.mockRejectedValue(123);

      // Act & Assert
      await expect(repository.findLowStock('org-123')).rejects.toBe(123);
    });
  });

  describe('exists', () => {
    it('Given: existing product id and orgId When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('product-123', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { id: 'product-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent product id When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws an Error When: checking existence Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.exists('product-123', 'org-123')).rejects.toThrow('Count failed');
    });

    it('Given: prisma throws a non-Error When: checking existence Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue('count error');

      // Act & Assert
      await expect(repository.exists('product-123', 'org-123')).rejects.toBe('count error');
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

    it('Given: new product without id match When: saving Then: should create new product', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-NEW'),
          name: ProductName.reconstitute('New Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-new',
        'org-123'
      );
      // findUnique returns null -> no existing product
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-new',
        sku: 'SKU-NEW',
        name: 'New Product',
        description: null,
        unit: 'UNIT',
        barcode: null,
        brand: null,
        model: null,
        isActive: true,
        costMethod: 'AVG',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
        price: null,
        currency: null,
        statusChangedBy: null,
        statusChangedAt: null,
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(result.id).toBe('product-new');
      expect(result.sku.getValue()).toBe('SKU-NEW');
      expect(mockPrismaService.product.create).toHaveBeenCalled();
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('Given: new product with categories When: saving Then: should connect categories', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-CAT-NEW'),
          name: ProductName.reconstitute('Categorized New'),
          categories: [
            { id: 'cat-1', name: 'Electronics' },
            { id: 'cat-2', name: 'Gadgets' },
          ],
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-cat-new',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-cat-new',
        sku: 'SKU-CAT-NEW',
        name: 'Categorized New',
        description: null,
        unit: 'UNIT',
        barcode: null,
        brand: null,
        model: null,
        isActive: true,
        costMethod: 'AVG',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [
          { id: 'cat-1', name: 'Electronics' },
          { id: 'cat-2', name: 'Gadgets' },
        ],
        price: null,
        currency: null,
        statusChangedBy: null,
        statusChangedAt: null,
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(result.categories).toHaveLength(2);
      const createCall = mockPrismaService.product.create.mock.calls[0][0] as {
        data: { categories?: { connect: { id: string }[] } };
      };
      expect(createCall.data.categories).toEqual({
        connect: [{ id: 'cat-1' }, { id: 'cat-2' }],
      });
    });

    it('Given: existing product with price When: updating Then: should map price correctly', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-002'),
          name: ProductName.reconstitute('Updated Priced Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          price: Price.create(35000, 'COP', 2),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-456',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(mockProductDataWithPrice);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProductDataWithPrice,
        price: 35000,
        name: 'Updated Priced Product',
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(result.price?.getAmount()).toBe(35000);
    });

    it('Given: update returns product with Decimal price When: saving Then: should call toNumber', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-001'),
          name: ProductName.reconstitute('Updated'),
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
        price: { toNumber: () => 999.99 },
        currency: 'COP',
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(result.price?.getAmount()).toBe(999.99);
    });

    it('Given: create returns product with Decimal price When: saving new Then: should call toNumber', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-NEW-D'),
          name: ProductName.reconstitute('New Decimal'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-new-d',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-new-d',
        sku: 'SKU-NEW-D',
        name: 'New Decimal',
        description: null,
        unit: 'UNIT',
        barcode: null,
        brand: null,
        model: null,
        isActive: true,
        costMethod: 'AVG',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
        price: { toNumber: () => 500.25 },
        currency: 'COP',
        statusChangedBy: null,
        statusChangedAt: null,
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result.price?.getAmount()).toBe(500.25);
    });

    it('Given: product with statusChangedBy When: saving Then: should persist status fields', async () => {
      // Arrange
      const changedAt = new Date('2026-02-20');
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-STATUS'),
          name: ProductName.reconstitute('Status Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('INACTIVE'),
          costMethod: CostMethod.create('FIFO'),
          statusChangedBy: 'admin-user',
          statusChangedAt: changedAt,
        },
        'product-status',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-status',
        sku: 'SKU-STATUS',
        name: 'Status Product',
        description: null,
        unit: 'UNIT',
        barcode: null,
        brand: null,
        model: null,
        isActive: false,
        costMethod: 'FIFO',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
        price: null,
        currency: null,
        statusChangedBy: 'admin-user',
        statusChangedAt: changedAt,
      });

      // Act
      const result = await repository.save(product);

      // Assert
      expect(result.statusChangedBy).toBe('admin-user');
      expect(result.statusChangedAt).toEqual(changedAt);
      const createCall = mockPrismaService.product.create.mock.calls[0][0] as {
        data: {
          statusChangedBy: string | null;
          statusChangedAt: Date | null;
          isActive: boolean;
          costMethod: string;
        };
      };
      expect(createCall.data.statusChangedBy).toBe('admin-user');
      expect(createCall.data.statusChangedAt).toEqual(changedAt);
      expect(createCall.data.isActive).toBe(false);
      expect(createCall.data.costMethod).toBe('FIFO');
    });

    it('Given: prisma throws When: saving Then: should rethrow error', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-ERR'),
          name: ProductName.reconstitute('Error Product'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-err',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockRejectedValue(new Error('Save failed'));

      // Act & Assert
      await expect(repository.save(product)).rejects.toThrow('Save failed');
    });

    it('Given: prisma throws a non-Error When: saving Then: should rethrow', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-ERR2'),
          name: ProductName.reconstitute('Error Product 2'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-err2',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockRejectedValue({ code: 'P2002' });

      // Act & Assert
      await expect(repository.save(product)).rejects.toEqual({ code: 'P2002' });
    });
  });

  describe('save with cache', () => {
    let mockCacheService: Record<string, jest.Mock<any>>;
    let cachedRepository: PrismaProductRepository;

    beforeEach(() => {
      mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };

      cachedRepository = new PrismaProductRepository(
        mockPrismaService as any,
        mockCacheService as any
      );
    });

    it('Given: updating existing product with cache When: saving Then: should invalidate and re-cache', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-001'),
          name: ProductName.reconstitute('Updated Cached'),
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
        name: 'Updated Cached',
      });
      mockCacheService.delete.mockResolvedValue({ isErr: () => false });
      mockCacheService.set.mockResolvedValue({ isErr: () => false });

      // Act
      const result = await cachedRepository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('Given: creating new product with cache When: saving Then: should cache new product', async () => {
      // Arrange
      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute('SKU-CACHE-NEW'),
          name: ProductName.reconstitute('Cached New'),
          unit: UnitValueObject.create('UNIT', 'Unit', 0),
          status: ProductStatus.create('ACTIVE'),
          costMethod: CostMethod.create('AVG'),
        },
        'product-cache-new',
        'org-123'
      );
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-cache-new',
        sku: 'SKU-CACHE-NEW',
        name: 'Cached New',
        description: null,
        unit: 'UNIT',
        barcode: null,
        brand: null,
        model: null,
        isActive: true,
        costMethod: 'AVG',
        orgId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        categories: [],
        price: null,
        currency: null,
        statusChangedBy: null,
        statusChangedAt: null,
      });
      mockCacheService.set.mockResolvedValue({ isErr: () => false });

      // Act
      const result = await cachedRepository.save(product);

      // Assert
      expect(result).not.toBeNull();
      expect(mockCacheService.set).toHaveBeenCalled();
      // For create path, no delete call (only cache set)
      expect(mockCacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should soft-delete by setting isActive=false', async () => {
      // Arrange
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('product-123', 'org-123');

      // Assert
      expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'product-123', orgId: 'org-123' },
        data: { isActive: false },
      });
    });

    it('Given: non-existent product When: deleting Then: should still call updateMany without error', async () => {
      // Arrange
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 0 });

      // Act & Assert (should not throw)
      await expect(repository.delete('non-existent', 'org-123')).resolves.toBeUndefined();
    });

    it('Given: prisma throws an Error When: deleting Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.updateMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('product-123', 'org-123')).rejects.toThrow('Delete failed');
    });

    it('Given: prisma throws a non-Error When: deleting Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.updateMany.mockRejectedValue('delete error');

      // Act & Assert
      await expect(repository.delete('product-123', 'org-123')).rejects.toBe('delete error');
    });
  });

  describe('delete with cache', () => {
    let mockCacheService: Record<string, jest.Mock<any>>;
    let cachedRepository: PrismaProductRepository;

    beforeEach(() => {
      mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };

      cachedRepository = new PrismaProductRepository(
        mockPrismaService as any,
        mockCacheService as any
      );
    });

    it('Given: cache service available When: deleting Then: should invalidate cache after soft-delete', async () => {
      // Arrange
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockCacheService.delete.mockResolvedValue({ isErr: () => false });

      // Act
      await cachedRepository.delete('product-123', 'org-123');

      // Assert
      expect(mockPrismaService.product.updateMany).toHaveBeenCalled();
      expect(mockCacheService.delete).toHaveBeenCalled();
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

    it('Given: valid sku When: checking existence Then: should pass correct where clause', async () => {
      // Arrange
      mockPrismaService.product.count.mockResolvedValue(1);

      // Act
      await repository.existsBySku('SKU-001', 'org-123');

      // Assert
      expect(mockPrismaService.product.count).toHaveBeenCalledWith({
        where: { sku: 'SKU-001', orgId: 'org-123' },
      });
    });

    it('Given: prisma throws an Error When: checking sku existence Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue(new Error('SKU check failed'));

      // Act & Assert
      await expect(repository.existsBySku('SKU-001', 'org-123')).rejects.toThrow(
        'SKU check failed'
      );
    });

    it('Given: prisma throws a non-Error When: checking sku existence Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.count.mockRejectedValue('sku error');

      // Act & Assert
      await expect(repository.existsBySku('SKU-001', 'org-123')).rejects.toBe('sku error');
    });
  });

  describe('findBySpecification', () => {
    const mockSpec: IPrismaSpecification<Product> = {
      toPrismaWhere: jest.fn().mockReturnValue({ orgId: 'org-123', isActive: true }),
      isSatisfiedBy: jest.fn().mockReturnValue(true),
    };

    it('Given: spec and no pagination When: finding by specification Then: should return all matching products', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);
      mockPrismaService.product.count.mockResolvedValue(1);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123');

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockSpec.toPrismaWhere).toHaveBeenCalledWith('org-123');
    });

    it('Given: spec with pagination When: finding by specification Then: should pass skip and take', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);
      mockPrismaService.product.count.mockResolvedValue(50);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123', {
        skip: 0,
        take: 10,
      });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('Given: spec with pagination at last page When: finding by specification Then: hasMore should be false', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);
      mockPrismaService.product.count.mockResolvedValue(11);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123', {
        skip: 10,
        take: 10,
      });

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(11);
    });

    it('Given: no matching products When: finding by specification Then: should return empty result', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123');

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('Given: products with prices When: finding by specification Then: should map all data correctly', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([
        mockProductData,
        mockProductDataWithPrice,
        mockProductDataWithDecimalPrice,
        mockProductDataWithCategories,
      ]);
      mockPrismaService.product.count.mockResolvedValue(4);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123');

      // Assert
      expect(result.data).toHaveLength(4);
      expect(result.data[0].price).toBeUndefined();
      expect(result.data[1].price?.getAmount()).toBe(29990);
      expect(result.data[2].price?.getAmount()).toBe(15500.5);
      expect(result.data[3].categories).toHaveLength(2);
    });

    it('Given: only skip provided (no take) When: finding by specification Then: hasMore should be false', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockResolvedValue([mockProductData]);
      mockPrismaService.product.count.mockResolvedValue(100);

      // Act
      const result = await repository.findBySpecification(mockSpec, 'org-123', {
        skip: 5,
      });

      // Assert
      expect(result.hasMore).toBe(false);
    });

    it('Given: prisma throws an Error When: finding by specification Then: should rethrow error', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Specification query failed'));
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act & Assert
      await expect(repository.findBySpecification(mockSpec, 'org-123')).rejects.toThrow(
        'Specification query failed'
      );
    });

    it('Given: prisma throws a non-Error When: finding by specification Then: should rethrow', async () => {
      // Arrange
      mockPrismaService.product.findMany.mockRejectedValue('spec error');
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act & Assert
      await expect(repository.findBySpecification(mockSpec, 'org-123')).rejects.toBe('spec error');
    });
  });
});
