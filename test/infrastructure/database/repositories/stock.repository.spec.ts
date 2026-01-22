import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaStockRepository } from '@infrastructure/database/repositories/stock.repository';
import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('PrismaStockRepository', () => {
  let repository: PrismaStockRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { stock: Record<string, jest.Mock<any>> };
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
    };

    mockProductRepository = {
      findById: jest.fn(),
    };

    repository = new PrismaStockRepository(
      mockPrismaService as unknown as PrismaService,
      mockProductRepository
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
    it('Given: existing stock When: incrementing Then: should add to current quantity', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockPrismaService.stock.update.mockResolvedValue({
        ...mockStockData,
        quantity: 150,
      });

      const incrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity);

      // Assert
      expect(mockPrismaService.stock.update).toHaveBeenCalled();
    });

    it('Given: no existing stock When: incrementing Then: should create new stock with zero cost', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(null);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockPrismaService.stock.create.mockResolvedValue({
        ...mockStockData,
        quantity: 50,
        unitCost: 0,
      });

      const incrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity);

      // Assert
      expect(mockPrismaService.stock.create).toHaveBeenCalled();
    });

    it('Given: database error When: incrementing Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue(new Error('Increment failed'));

      const incrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.incrementStock('product-123', 'warehouse-123', 'org-123', incrementQuantity)
      ).rejects.toThrow('Increment failed');
    });
  });

  describe('decrementStock', () => {
    it('Given: existing stock When: decrementing Then: should subtract from quantity', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(mockStockData);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockPrismaService.stock.update.mockResolvedValue({
        ...mockStockData,
        quantity: 50,
      });

      const decrementQuantity = Quantity.create(50, 0);

      // Act
      await repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity);

      // Assert
      expect(mockPrismaService.stock.update).toHaveBeenCalled();
    });

    it('Given: no existing stock When: decrementing Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockResolvedValue(null);

      const decrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity)
      ).rejects.toThrow('Stock not found for product product-123 in warehouse warehouse-123');
    });

    it('Given: database error When: decrementing Then: should throw error', async () => {
      // Arrange
      mockPrismaService.stock.findFirst.mockRejectedValue(new Error('Decrement failed'));

      const decrementQuantity = Quantity.create(50, 0);

      // Act & Assert
      await expect(
        repository.decrementStock('product-123', 'warehouse-123', 'org-123', decrementQuantity)
      ).rejects.toThrow('Decrement failed');
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
});
