import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaStockRepository } from '@infrastructure/database/repositories/stock.repository';
import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InsufficientStockError, StockNotFoundError } from '@shared/domain/result';

describe('PrismaStockRepository', () => {
  let repository: PrismaStockRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { stock: Record<string, jest.Mock<any>>; $executeRaw: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockProductRepository: Record<string, jest.Mock<any>>;

  const mockStockData = {
    id: 'stock-123',
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    orgId: 'org-123',
    quantity: 100,
    unitCost: 25.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'product-123',
    unit: {
      getPrecision: () => 2,
    },
  };

  beforeEach(() => {
    mockPrismaService = {
      stock: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $executeRaw: jest.fn(),
    };

    mockProductRepository = {
      findById: jest.fn(),
    };

    repository = new PrismaStockRepository(
      mockPrismaService as unknown as PrismaService,
      mockProductRepository as any
    );
  });

  describe('getStockQuantity', () => {
    it('Given: stock exists When: getting quantity Then: should return quantity', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockQuantity('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result.getNumericValue()).toBe(100);
      expect(mockPrismaService.stock.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'product-123',
          warehouseId: 'warehouse-123',
          orgId: 'org-123',
          locationId: null,
        },
      });
    });

    it('Given: stock does not exist When: getting quantity Then: should return zero quantity', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockQuantity('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result.getNumericValue()).toBe(0);
    });

    it('Given: database error When: getting quantity Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        repository.getStockQuantity('product-123', 'warehouse-123', 'org-123')
      ).rejects.toThrow('Database error');
    });

    it('Given: product repository not available When: getting quantity Then: should use default precision', async () => {
      // Arrange
      const repoWithoutProductRepo = new PrismaStockRepository(
        mockPrismaService as unknown as PrismaService,
        undefined
      );
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);

      // Act
      const result = await repoWithoutProductRepo.getStockQuantity(
        'product-123',
        'warehouse-123',
        'org-123'
      );

      // Assert
      expect(result.getNumericValue()).toBe(100);
    });
  });

  describe('getStockWithCost', () => {
    it('Given: stock exists When: getting stock with cost Then: should return quantity and cost', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockWithCost('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.quantity.getNumericValue()).toBe(100);
      expect(result?.averageCost.getAmount()).toBe(25.5);
    });

    it('Given: stock does not exist When: getting stock with cost Then: should return null', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.getStockWithCost('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: stock with null unitCost When: getting stock Then: should return zero cost', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue({
        ...mockStockData,
        unitCost: null,
      });
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockWithCost('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result?.averageCost.getAmount()).toBe(0);
    });

    it('Given: stock with Decimal unitCost When: getting stock Then: should convert correctly', async () => {
      // Arrange
      const decimalCost = {
        toNumber: () => 30.75,
      };
      mockPrismaService.stock.findFirst.mockResolvedValue({
        ...mockStockData,
        unitCost: decimalCost,
      });
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockWithCost('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result?.averageCost.getAmount()).toBe(30.75);
    });

    it('Given: database error When: getting stock with cost Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue(new Error('Connection error'));

      // Act & Assert
      await expect(
        repository.getStockWithCost('product-123', 'warehouse-123', 'org-123')
      ).rejects.toThrow('Connection error');
    });
  });

  describe('updateStock', () => {
    it('Given: valid stock data When: updating stock Then: should update stock', async () => {
      // Arrange
      const quantity = Quantity.create(150, 0);
      const cost = Money.create(30, 'COP', 2);
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockPrismaService.stock.update.mockResolvedValue({
        ...mockStockData,
        quantity: 150,
        unitCost: 30,
      });

      // Act
      await repository.updateStock('product-123', 'warehouse-123', 'org-123', quantity, cost);

      // Assert
      expect(mockPrismaService.stock.update).toHaveBeenCalledWith({
        where: { id: mockStockData.id },
        data: {
          quantity: 150,
          unitCost: 30,
        },
      });
    });

    it('Given: database error When: updating stock Then: should throw error', async () => {
      // Arrange
      const quantity = Quantity.create(100, 0);
      const cost = Money.create(25, 'COP', 2);
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockPrismaService.stock.update.mockRejectedValue(new Error('Upsert failed'));

      // Act & Assert
      await expect(
        repository.updateStock('product-123', 'warehouse-123', 'org-123', quantity, cost)
      ).rejects.toThrow('Upsert failed');
    });
  });

  describe('incrementStock', () => {
    it('Given: valid parameters When: incrementing Then: should execute atomic upsert', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const incrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('Given: no existing stock When: incrementing Then: should create new stock via upsert', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const incrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('Given: database error When: incrementing Then: should throw error', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Increment failed'));

      const incrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity)
      ).rejects.toThrow('Increment failed');
    });

    it('Given: locationId provided When: incrementing Then: should include locationId in query', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const incrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.incrementStock(
        'product-123',
        'warehouse-123',
        'org-123',
        incrementQuantity,
        'location-123'
      );

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('decrementStock', () => {
    it('Given: sufficient stock When: decrementing Then: should execute atomic update', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1); // 1 row affected = success

      const decrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity);

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('Given: no existing stock When: decrementing Then: should throw StockNotFoundError', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(0); // 0 rows affected
      mockPrismaService.stock.findFirst.mockResolvedValue(null); // Stock doesn't exist

      const decrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity)
      ).rejects.toThrow(StockNotFoundError);
    });

    it('Given: insufficient stock When: decrementing Then: should throw InsufficientStockError', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(0); // 0 rows affected (quantity check failed)
      mockPrismaService.stock.findFirst.mockResolvedValue({
        ...mockStockData,
        quantity: 30, // Only 30 available, trying to decrement 50
      });

      const decrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity)
      ).rejects.toThrow(InsufficientStockError);
    });

    it('Given: database error When: decrementing Then: should throw error', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockRejectedValue(new Error('Decrement failed'));

      const decrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity)
      ).rejects.toThrow('Decrement failed');
    });

    it('Given: locationId provided When: decrementing Then: should include locationId in query', async () => {
      // Arrange
      mockPrismaService.$executeRaw.mockResolvedValue(1);

      const decrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.decrementStock(
        'product-123',
        'warehouse-123',
        'org-123',
        decrementQuantity,
        'location-123'
      );

      // Assert
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getProductPrecision', () => {
    it('Given: product not found When: getting precision Then: should return default 0', async () => {
      // Arrange
      mockProductRepository.findById.mockResolvedValue(null);
      mockPrismaService.stock.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.getStockQuantity('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result.getNumericValue()).toBe(0);
    });

    it('Given: product repository throws error When: getting precision Then: should use default 0', async () => {
      // Arrange
      mockProductRepository.findById.mockRejectedValue(new Error('Product lookup failed'));
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);

      // Act
      const result = await repository.getStockQuantity('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result.getNumericValue()).toBe(100);
    });
  });

  describe('updateStock - create new record', () => {
    it('Given: no existing stock record When: updating stock Then: should create new stock record', async () => {
      // Arrange
      const quantity = Quantity.create(50, 0);
      const cost = Money.create(20, 'COP', 2);
      mockPrismaService.stock.findFirst.mockResolvedValue(null);
      mockPrismaService.stock.create.mockResolvedValue({
        id: 'new-stock-1',
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        orgId: 'org-123',
        quantity: 50,
        unitCost: 20,
      });

      // Act
      await repository.updateStock('product-123', 'warehouse-123', 'org-123', quantity, cost);

      // Assert
      expect(mockPrismaService.stock.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-123',
          warehouseId: 'warehouse-123',
          orgId: 'org-123',
          locationId: null,
          quantity: 50,
          unitCost: 20,
        },
      });
      expect(mockPrismaService.stock.update).not.toHaveBeenCalled();
    });

    it('Given: locationId provided When: creating new stock Then: should include locationId', async () => {
      // Arrange
      const quantity = Quantity.create(30, 0);
      const cost = Money.create(15, 'COP', 2);
      mockPrismaService.stock.findFirst.mockResolvedValue(null);
      mockPrismaService.stock.create.mockResolvedValue({
        id: 'new-stock-2',
        productId: 'product-123',
        warehouseId: 'warehouse-123',
        orgId: 'org-123',
        locationId: 'loc-1',
        quantity: 30,
        unitCost: 15,
      });

      // Act
      await repository.updateStock(
        'product-123',
        'warehouse-123',
        'org-123',
        quantity,
        cost,
        'loc-1'
      );

      // Assert
      expect(mockPrismaService.stock.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-123',
          warehouseId: 'warehouse-123',
          orgId: 'org-123',
          locationId: 'loc-1',
          quantity: 30,
          unitCost: 15,
        },
      });
    });
  });

  describe('getStockQuantity - with locationId', () => {
    it('Given: locationId provided When: getting stock quantity Then: should include locationId in query', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue({
        ...mockStockData,
        locationId: 'loc-1',
      });
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockQuantity(
        'product-123',
        'warehouse-123',
        'org-123',
        'loc-1'
      );

      // Assert
      expect(result.getNumericValue()).toBe(100);
      expect(mockPrismaService.stock.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'product-123',
          warehouseId: 'warehouse-123',
          orgId: 'org-123',
          locationId: 'loc-1',
        },
      });
    });
  });

  describe('getStockWithCost - with locationId', () => {
    it('Given: locationId provided When: getting stock with cost Then: should include locationId in query', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockWithCost(
        'product-123',
        'warehouse-123',
        'org-123',
        'loc-1'
      );

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.stock.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'product-123',
          warehouseId: 'warehouse-123',
          orgId: 'org-123',
          locationId: 'loc-1',
        },
      });
    });

    it('Given: stock with NaN unitCost When: getting stock Then: should return zero cost', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue({
        ...mockStockData,
        unitCost: NaN,
      });
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await repository.getStockWithCost('product-123', 'warehouse-123', 'org-123');

      // Assert
      expect(result?.averageCost.getAmount()).toBe(0);
    });
  });

  describe('getStockWithCost - non-Error throw', () => {
    it('Given: non-Error object thrown When: getting stock with cost Then: should still throw', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(
        repository.getStockWithCost('product-123', 'warehouse-123', 'org-123')
      ).rejects.toBe('string error');
    });
  });

  describe('getStockQuantity - non-Error throw', () => {
    it('Given: non-Error object thrown When: getting stock quantity Then: should still throw', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(
        repository.getStockQuantity('product-123', 'warehouse-123', 'org-123')
      ).rejects.toBe('string error');
    });
  });

  describe('findAll', () => {
    const mockStockWithRelations = {
      id: 'stock-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      orgId: 'org-123',
      quantity: 50,
      unitCost: 10,
      locationId: null,
      product: {
        id: 'product-1',
        sku: 'SKU-001',
        name: 'Product One',
        unit: 'EA',
      },
      warehouse: {
        id: 'warehouse-1',
        code: 'WH-001',
        name: 'Main Warehouse',
      },
    };

    it('Given: stock records exist When: finding all Then: should return stock data with product and warehouse info', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockResolvedValue([mockStockWithRelations]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-1');
      expect(result[0].productName).toBe('Product One');
      expect(result[0].productSku).toBe('SKU-001');
      expect(result[0].warehouseId).toBe('warehouse-1');
      expect(result[0].warehouseName).toBe('Main Warehouse');
      expect(result[0].warehouseCode).toBe('WH-001');
      expect(result[0].quantity.getNumericValue()).toBe(50);
      expect(result[0].averageCost.getAmount()).toBe(10);
    });

    it('Given: warehouseIds filter When: finding all Then: should filter by warehouse', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockResolvedValue([mockStockWithRelations]);

      // Act
      await repository.findAll('org-123', { warehouseIds: ['warehouse-1', 'warehouse-2'] });

      // Assert
      expect(mockPrismaService.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: { in: ['warehouse-1', 'warehouse-2'] },
          }),
        })
      );
    });

    it('Given: productId filter When: finding all Then: should filter by product', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockResolvedValue([mockStockWithRelations]);

      // Act
      await repository.findAll('org-123', { productId: 'product-1' });

      // Assert
      expect(mockPrismaService.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-1',
          }),
        })
      );
    });

    it('Given: lowStock filter with reorder rules When: finding all Then: should filter by low stock', async () => {
      // Arrange
      const stockRecords = [
        {
          ...mockStockWithRelations,
          quantity: 5, // Below minQty of 10
        },
        {
          ...mockStockWithRelations,
          id: 'stock-2',
          productId: 'product-2',
          quantity: 100, // Above minQty
          product: { id: 'product-2', sku: 'SKU-002', name: 'Product Two', unit: 'EA' },
        },
      ];
      mockPrismaService.stock.findMany = jest.fn<any>().mockResolvedValue(stockRecords);

      // Mock reorder rules - add mock for reorderRule
      const mockReorderRule = {
        findMany: jest.fn<any>().mockResolvedValue([
          { productId: 'product-1', warehouseId: 'warehouse-1', minQty: 10 },
          { productId: 'product-2', warehouseId: 'warehouse-1', minQty: 10 },
        ] as any),
      };
      (mockPrismaService as unknown as Record<string, unknown>).reorderRule = mockReorderRule;

      // Act
      const result = await repository.findAll('org-123', { lowStock: true });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-1');
      expect(result[0].quantity.getNumericValue()).toBe(5);
    });

    it('Given: lowStock filter with no reorder rules When: finding all Then: should return empty', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockResolvedValue([mockStockWithRelations]);

      const mockReorderRule = {
        findMany: jest.fn<any>().mockResolvedValue([]),
      };
      (mockPrismaService as unknown as Record<string, unknown>).reorderRule = mockReorderRule;

      // Act
      const result = await repository.findAll('org-123', { lowStock: true });

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: stock with null unitCost When: finding all Then: should default to zero cost', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest
        .fn<any>()
        .mockResolvedValue([{ ...mockStockWithRelations, unitCost: null }]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result[0].averageCost.getAmount()).toBe(0);
    });

    it('Given: stock with Decimal unitCost object When: finding all Then: should convert correctly', async () => {
      // Arrange
      const decimalCost = { toNumber: () => 42.5 };
      mockPrismaService.stock.findMany = jest
        .fn<any>()
        .mockResolvedValue([{ ...mockStockWithRelations, unitCost: decimalCost }]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result[0].averageCost.getAmount()).toBe(42.5);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('Query failed');
    });

    it('Given: non-Error database failure When: finding all Then: should still throw', async () => {
      // Arrange
      mockPrismaService.stock.findMany = jest.fn<any>().mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string error');
    });
  });
});
