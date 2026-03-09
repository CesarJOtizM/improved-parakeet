import { GetStockUseCase } from '@application/stockUseCases/getStockUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Money, Quantity } from '@inventory/stock';

import type { IStockData, IStockRepository } from '@stock/domain/ports/repositories';

describe('GetStockUseCase', () => {
  const mockOrgId = 'org-123';

  let useCase: GetStockUseCase;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const createStockData = (overrides: Partial<IStockData> = {}): IStockData => ({
    productId: 'product-1',
    productName: 'Product One',
    productSku: 'SKU-001',
    warehouseId: 'warehouse-1',
    warehouseName: 'Main Warehouse',
    warehouseCode: 'WH-01',
    locationId: undefined,
    quantity: Quantity.create(100),
    averageCost: Money.create(50, 'COP'),
    orgId: mockOrgId,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IStockRepository>;

    mockPrismaService = {
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetStockUseCase(mockStockRepository, mockPrismaService);
  });

  describe('execute', () => {
    it('Given: stock records exist When: getting stock Then: should return success with mapped data', async () => {
      // Arrange
      const stockRecords = [
        createStockData(),
        createStockData({
          productId: 'product-2',
          productName: 'Product Two',
          productSku: 'SKU-002',
          warehouseId: 'warehouse-2',
          warehouseName: 'Secondary Warehouse',
          warehouseCode: 'WH-02',
          quantity: Quantity.create(50),
          averageCost: Money.create(75, 'COP'),
        }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Stock retrieved successfully');
          expect(value.data).toHaveLength(2);

          expect(value.data[0].productId).toBe('product-1');
          expect(value.data[0].productName).toBe('Product One');
          expect(value.data[0].quantity).toBe(100);
          expect(value.data[0].averageCost).toBe(50);
          expect(value.data[0].totalValue).toBe(5000);
          expect(value.data[0].currency).toBe('COP');

          expect(value.data[1].productId).toBe('product-2');
          expect(value.data[1].quantity).toBe(50);
          expect(value.data[1].averageCost).toBe(75);
          expect(value.data[1].totalValue).toBe(3750);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no stock records When: getting stock Then: should return success with empty array', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
          expect(value.data).toEqual([]);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouseIds filter When: getting stock Then: should pass filters to repository', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        warehouseIds: ['wh-1', 'wh-2'],
      });

      // Assert
      expect(mockStockRepository.findAll).toHaveBeenCalledWith(mockOrgId, {
        warehouseIds: ['wh-1', 'wh-2'],
        productId: undefined,
        lowStock: undefined,
      });
    });

    it('Given: productId filter When: getting stock Then: should pass productId to repository', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        productId: 'product-1',
      });

      // Assert
      expect(mockStockRepository.findAll).toHaveBeenCalledWith(mockOrgId, {
        warehouseIds: undefined,
        productId: 'product-1',
        lowStock: undefined,
      });
    });

    it('Given: lowStock filter When: getting stock Then: should pass lowStock to repository', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        lowStock: true,
      });

      // Assert
      expect(mockStockRepository.findAll).toHaveBeenCalledWith(mockOrgId, {
        warehouseIds: undefined,
        productId: undefined,
        lowStock: true,
      });
    });

    it('Given: stock records with last movement dates When: getting stock Then: should include lastMovementAt', async () => {
      // Arrange
      const stockRecords = [createStockData()];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      const movementDate = new Date('2026-02-15T10:00:00Z');
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          lastMovementAt: movementDate,
        },
      ]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].lastMovementAt).toBe(movementDate.toISOString());
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: stock records without movement dates When: getting stock Then: lastMovementAt should be null', async () => {
      // Arrange
      const stockRecords = [createStockData()];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].lastMovementAt).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy quantity ascending When: getting stock Then: should sort data ascending', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', quantity: Quantity.create(200) }),
        createStockData({ productId: 'p-2', quantity: Quantity.create(50) }),
        createStockData({ productId: 'p-3', quantity: Quantity.create(150) }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'quantity',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].quantity).toBe(50);
          expect(value.data[1].quantity).toBe(150);
          expect(value.data[2].quantity).toBe(200);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy totalValue descending When: getting stock Then: should sort data descending', async () => {
      // Arrange
      const stockRecords = [
        createStockData({
          productId: 'p-1',
          quantity: Quantity.create(10),
          averageCost: Money.create(100, 'COP'),
        }),
        createStockData({
          productId: 'p-2',
          quantity: Quantity.create(100),
          averageCost: Money.create(100, 'COP'),
        }),
        createStockData({
          productId: 'p-3',
          quantity: Quantity.create(50),
          averageCost: Money.create(100, 'COP'),
        }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'totalValue',
        sortOrder: 'desc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].totalValue).toBe(10000); // 100 * 100
          expect(value.data[1].totalValue).toBe(5000); // 50 * 100
          expect(value.data[2].totalValue).toBe(1000); // 10 * 100
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: last movement query fails When: getting stock Then: should still return stock with null dates', async () => {
      // Arrange
      const stockRecords = [createStockData()];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Query failed'));

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].lastMovementAt).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy productName When: getting stock Then: should sort by productName', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', productName: 'Zebra Widget' }),
        createStockData({ productId: 'p-2', productName: 'Alpha Widget' }),
        createStockData({ productId: 'p-3', productName: 'Mango Widget' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'productName',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].productName).toBe('Alpha Widget');
          expect(value.data[1].productName).toBe('Mango Widget');
          expect(value.data[2].productName).toBe('Zebra Widget');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy productSku When: getting stock Then: should sort by productSku', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', productSku: 'SKU-ZZZ' }),
        createStockData({ productId: 'p-2', productSku: 'SKU-AAA' }),
        createStockData({ productId: 'p-3', productSku: 'SKU-MMM' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'productSku',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].productSku).toBe('SKU-AAA');
          expect(value.data[1].productSku).toBe('SKU-MMM');
          expect(value.data[2].productSku).toBe('SKU-ZZZ');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy warehouseName When: getting stock Then: should sort by warehouseName', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', warehouseId: 'wh-1', warehouseName: 'Warehouse Z' }),
        createStockData({ productId: 'p-2', warehouseId: 'wh-2', warehouseName: 'Warehouse A' }),
        createStockData({ productId: 'p-3', warehouseId: 'wh-3', warehouseName: 'Warehouse M' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'warehouseName',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].warehouseName).toBe('Warehouse A');
          expect(value.data[1].warehouseName).toBe('Warehouse M');
          expect(value.data[2].warehouseName).toBe('Warehouse Z');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy averageCost When: getting stock Then: should sort by averageCost', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', averageCost: Money.create(300, 'COP') }),
        createStockData({ productId: 'p-2', averageCost: Money.create(100, 'COP') }),
        createStockData({ productId: 'p-3', averageCost: Money.create(200, 'COP') }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'averageCost',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].averageCost).toBe(100);
          expect(value.data[1].averageCost).toBe(200);
          expect(value.data[2].averageCost).toBe(300);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy lastMovementAt When: getting stock Then: should sort by lastMovementAt', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', warehouseId: 'wh-1' }),
        createStockData({ productId: 'p-2', warehouseId: 'wh-2' }),
        createStockData({ productId: 'p-3', warehouseId: 'wh-3' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { productId: 'p-1', warehouseId: 'wh-1', lastMovementAt: new Date('2026-01-01T00:00:00Z') },
        { productId: 'p-2', warehouseId: 'wh-2', lastMovementAt: new Date('2026-03-01T00:00:00Z') },
        { productId: 'p-3', warehouseId: 'wh-3', lastMovementAt: new Date('2026-02-01T00:00:00Z') },
      ]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'lastMovementAt',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].productId).toBe('p-1');
          expect(value.data[1].productId).toBe('p-3');
          expect(value.data[2].productId).toBe('p-2');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy unknown field When: getting stock Then: should fallback to productName sort', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', productName: 'Zebra' }),
        createStockData({ productId: 'p-2', productName: 'Alpha' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'nonExistentField',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Default sorts by productName
          expect(value.data[0].productName).toBe('Alpha');
          expect(value.data[1].productName).toBe('Zebra');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: companyId filter When: getting stock Then: should pass companyId to repository', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        companyId: 'company-123',
      });

      // Assert
      expect(mockStockRepository.findAll).toHaveBeenCalledWith(mockOrgId, {
        warehouseIds: undefined,
        productId: undefined,
        companyId: 'company-123',
        lowStock: undefined,
      });
    });

    it('Given: combined filters When: getting stock Then: should pass all filters to repository', async () => {
      // Arrange
      mockStockRepository.findAll.mockResolvedValue([]);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        warehouseIds: ['wh-1', 'wh-2'],
        productId: 'product-1',
        companyId: 'company-1',
        lowStock: true,
      });

      // Assert
      expect(mockStockRepository.findAll).toHaveBeenCalledWith(mockOrgId, {
        warehouseIds: ['wh-1', 'wh-2'],
        productId: 'product-1',
        companyId: 'company-1',
        lowStock: true,
      });
    });

    it('Given: sortBy with no sortOrder When: getting stock Then: should default to asc', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', productName: 'Zebra' }),
        createStockData({ productId: 'p-2', productName: 'Alpha' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'productName',
        // no sortOrder - should default to 'asc'
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].productName).toBe('Alpha');
          expect(value.data[1].productName).toBe('Zebra');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: stock records with null lastMovementAt When: sorting by lastMovementAt Then: null values should sort as 0', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', warehouseId: 'wh-1' }),
        createStockData({ productId: 'p-2', warehouseId: 'wh-2' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      // Only p-2 has a movement date
      mockPrismaService.$queryRaw.mockResolvedValue([
        { productId: 'p-2', warehouseId: 'wh-2', lastMovementAt: new Date('2026-01-15T00:00:00Z') },
      ]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'lastMovementAt',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // p-1 has null lastMovementAt (treated as 0), so comes first in asc
          expect(value.data[0].productId).toBe('p-1');
          expect(value.data[0].lastMovementAt).toBeNull();
          expect(value.data[1].productId).toBe('p-2');
          expect(value.data[1].lastMovementAt).not.toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: stock with undefined productName When: sorting by productName Then: should treat as empty string', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', productName: 'Zulu' }),
        createStockData({ productId: 'p-2', productName: undefined }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'productName',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Empty string '' < 'Zulu', so p-2 comes first
          expect(value.data[0].productId).toBe('p-2');
          expect(value.data[1].productId).toBe('p-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: stock with undefined warehouseName When: sorting by warehouseName Then: should treat as empty string', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', warehouseId: 'wh-1', warehouseName: 'Zulu Warehouse' }),
        createStockData({ productId: 'p-2', warehouseId: 'wh-2', warehouseName: undefined }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'warehouseName',
        sortOrder: 'asc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Empty string '' < 'Zulu Warehouse', so p-2 comes first
          expect(value.data[0].productId).toBe('p-2');
          expect(value.data[1].productId).toBe('p-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no sortBy provided When: getting stock Then: should not sort', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-2', productName: 'Zebra' }),
        createStockData({ productId: 'p-1', productName: 'Alpha' }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        // no sortBy
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Should preserve original order (not sorted)
          expect(value.data[0].productId).toBe('p-2');
          expect(value.data[1].productId).toBe('p-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy quantity descending When: getting stock Then: should sort data descending', async () => {
      // Arrange
      const stockRecords = [
        createStockData({ productId: 'p-1', quantity: Quantity.create(50) }),
        createStockData({ productId: 'p-2', quantity: Quantity.create(200) }),
        createStockData({ productId: 'p-3', quantity: Quantity.create(100) }),
      ];
      mockStockRepository.findAll.mockResolvedValue(stockRecords);
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        sortBy: 'quantity',
        sortOrder: 'desc',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].quantity).toBe(200);
          expect(value.data[1].quantity).toBe(100);
          expect(value.data[2].quantity).toBe(50);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
