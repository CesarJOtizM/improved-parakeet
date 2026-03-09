import { GetDashboardMetricsUseCase } from '@application/dashboardUseCases/getDashboardMetricsUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessRuleError } from '@shared/domain/result/domainError';

describe('GetDashboardMetricsUseCase', () => {
  const mockOrgId = 'org-123';

  let useCase: GetDashboardMetricsUseCase;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrismaService = {
      product: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      sale: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      movement: {
        findMany: jest.fn(),
      },
      return: {
        findMany: jest.fn(),
      },
      transfer: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetDashboardMetricsUseCase(mockPrismaService);
  });

  describe('execute', () => {
    const setupSuccessMocks = () => {
      // detectCurrency
      mockPrismaService.product.findFirst.mockResolvedValue({ currency: 'COP' });

      // getInventorySummary
      mockPrismaService.product.count.mockResolvedValue(50);

      // getMonthlySales - sale count
      mockPrismaService.sale.count.mockResolvedValue(25);

      // $queryRaw calls: stockSummary, lowStockCount, salesRevenue, salesTrend, topProducts, stockByWarehouse
      mockPrismaService.$queryRaw
        // stockSummary
        .mockResolvedValueOnce([{ totalQuantity: BigInt(1000), totalValue: '500000.00' }])
        // lowStockCount
        .mockResolvedValueOnce([{ count: BigInt(3) }])
        // salesRevenue
        .mockResolvedValueOnce([{ revenue: '125000.50' }])
        // salesTrend
        .mockResolvedValueOnce([
          { date: new Date('2026-02-25'), count: BigInt(5), revenue: '25000.00' },
          { date: new Date('2026-02-26'), count: BigInt(8), revenue: '40000.00' },
        ])
        // topProducts
        .mockResolvedValueOnce([
          { name: 'Product A', sku: 'SKU-A', revenue: '50000.00', quantitySold: '100' },
          { name: 'Product B', sku: 'SKU-B', revenue: '30000.00', quantitySold: '75' },
        ])
        // stockByWarehouse
        .mockResolvedValueOnce([
          { warehouseName: 'Main Warehouse', quantity: BigInt(800), value: '400000.00' },
          { warehouseName: 'Secondary', quantity: BigInt(200), value: '100000.00' },
        ]);

      // recentActivity
      mockPrismaService.sale.findMany.mockResolvedValue([
        { saleNumber: 'S-001', status: 'CONFIRMED', createdAt: new Date('2026-02-28T10:00:00Z') },
      ]);
      mockPrismaService.movement.findMany.mockResolvedValue([
        {
          id: 'mov-123456789',
          type: 'INPUT',
          status: 'POSTED',
          reference: 'REF-001',
          createdAt: new Date('2026-02-28T09:00:00Z'),
        },
      ]);
      mockPrismaService.return.findMany.mockResolvedValue([
        {
          returnNumber: 'R-001',
          status: 'CONFIRMED',
          type: 'RETURN_CUSTOMER',
          createdAt: new Date('2026-02-28T08:00:00Z'),
        },
      ]);
      mockPrismaService.transfer.findMany.mockResolvedValue([
        {
          id: 'tr-1234567890',
          status: 'IN_TRANSIT',
          createdAt: new Date('2026-02-28T07:00:00Z'),
        },
      ]);
    };

    it('Given: all data available When: getting metrics Then: should return complete dashboard data', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Dashboard metrics retrieved successfully');
          expect(value.timestamp).toBeDefined();

          // Inventory
          expect(value.data.inventory.totalProducts).toBe(50);
          expect(value.data.inventory.totalStockQuantity).toBe(1000);
          expect(value.data.inventory.totalInventoryValue).toBe(500000);
          expect(value.data.inventory.currency).toBe('COP');

          // Low stock
          expect(value.data.lowStock.count).toBe(3);

          // Sales
          expect(value.data.sales.monthlyCount).toBe(25);
          expect(value.data.sales.monthlyRevenue).toBe(125000.5);
          expect(value.data.sales.currency).toBe('COP');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: all data available When: getting metrics Then: should include sales trend data', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.salesTrend).toHaveLength(2);
          expect(value.data.salesTrend[0].date).toBe('2026-02-25');
          expect(value.data.salesTrend[0].count).toBe(5);
          expect(value.data.salesTrend[0].revenue).toBe(25000);
          expect(value.data.salesTrend[1].date).toBe('2026-02-26');
          expect(value.data.salesTrend[1].count).toBe(8);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: all data available When: getting metrics Then: should include top products', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.topProducts).toHaveLength(2);
          expect(value.data.topProducts[0].name).toBe('Product A');
          expect(value.data.topProducts[0].sku).toBe('SKU-A');
          expect(value.data.topProducts[0].revenue).toBe(50000);
          expect(value.data.topProducts[0].quantitySold).toBe(100);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: all data available When: getting metrics Then: should include stock by warehouse', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.stockByWarehouse).toHaveLength(2);
          expect(value.data.stockByWarehouse[0].warehouseName).toBe('Main Warehouse');
          expect(value.data.stockByWarehouse[0].quantity).toBe(800);
          expect(value.data.stockByWarehouse[0].value).toBe(400000);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: all data available When: getting metrics Then: should include sorted recent activity', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.recentActivity.length).toBeGreaterThan(0);
          expect(value.data.recentActivity.length).toBeLessThanOrEqual(5);
          // Should be sorted by createdAt descending
          for (let i = 1; i < value.data.recentActivity.length; i++) {
            const prev = new Date(value.data.recentActivity[i - 1].createdAt).getTime();
            const curr = new Date(value.data.recentActivity[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no currency found in products When: getting metrics Then: should default to COP', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.inventory.currency).toBe('COP');
          expect(value.data.sales.currency).toBe('COP');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty stock summary When: getting metrics Then: should return zero values', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue({ currency: 'COP' });
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.sale.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ totalQuantity: BigInt(0), totalValue: '0' }])
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([{ revenue: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.sale.findMany.mockResolvedValue([]);
      mockPrismaService.movement.findMany.mockResolvedValue([]);
      mockPrismaService.return.findMany.mockResolvedValue([]);
      mockPrismaService.transfer.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.inventory.totalProducts).toBe(0);
          expect(value.data.inventory.totalStockQuantity).toBe(0);
          expect(value.data.inventory.totalInventoryValue).toBe(0);
          expect(value.data.lowStock.count).toBe(0);
          expect(value.data.sales.monthlyCount).toBe(0);
          expect(value.data.sales.monthlyRevenue).toBe(0);
          expect(value.data.salesTrend).toHaveLength(0);
          expect(value.data.topProducts).toHaveLength(0);
          expect(value.data.stockByWarehouse).toHaveLength(0);
          expect(value.data.recentActivity).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: null stock summary row When: getting metrics Then: should default to zero values', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue({ currency: 'USD' });
      mockPrismaService.product.count.mockResolvedValue(5);
      mockPrismaService.sale.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{}]) // no totalQuantity/totalValue
        .mockResolvedValueOnce([{}]) // no count
        .mockResolvedValueOnce([{}]) // no revenue
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrismaService.sale.findMany.mockResolvedValue([]);
      mockPrismaService.movement.findMany.mockResolvedValue([]);
      mockPrismaService.return.findMany.mockResolvedValue([]);
      mockPrismaService.transfer.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.inventory.totalStockQuantity).toBe(0);
          expect(value.data.inventory.totalInventoryValue).toBe(0);
          expect(value.data.lowStock.count).toBe(0);
          expect(value.data.sales.monthlyRevenue).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: database throws error When: getting metrics Then: should return BusinessRuleError', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.product.count.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.sale.count.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.movement.findMany.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.return.findMany.mockRejectedValue(new Error('Connection refused'));
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toBe('Failed to retrieve dashboard metrics');
        }
      );
    });

    it('Given: recent activity from multiple sources When: getting metrics Then: should limit to 5 items sorted by date', async () => {
      // Arrange
      setupSuccessMocks();
      // Override with more activity items
      mockPrismaService.sale.findMany.mockResolvedValue([
        { saleNumber: 'S-001', status: 'CONFIRMED', createdAt: new Date('2026-02-28T12:00:00Z') },
        { saleNumber: 'S-002', status: 'COMPLETED', createdAt: new Date('2026-02-28T11:00:00Z') },
        { saleNumber: 'S-003', status: 'DRAFT', createdAt: new Date('2026-02-28T10:00:00Z') },
      ]);
      mockPrismaService.movement.findMany.mockResolvedValue([
        {
          id: 'mov-111111111',
          type: 'INPUT',
          status: 'POSTED',
          reference: 'REF-001',
          createdAt: new Date('2026-02-28T09:30:00Z'),
        },
        {
          id: 'mov-222222222',
          type: 'OUTPUT',
          status: 'POSTED',
          reference: 'REF-002',
          createdAt: new Date('2026-02-28T09:00:00Z'),
        },
      ]);
      mockPrismaService.return.findMany.mockResolvedValue([
        {
          returnNumber: 'R-001',
          status: 'CONFIRMED',
          type: 'RETURN_SUPPLIER',
          createdAt: new Date('2026-02-28T08:00:00Z'),
        },
      ]);
      mockPrismaService.transfer.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Total entries: 3 sales + 2 movements + 1 return = 6, sliced to 5
          expect(value.data.recentActivity).toHaveLength(5);
          // First should be most recent
          expect(value.data.recentActivity[0].reference).toBe('S-001');
          expect(value.data.recentActivity[0].type).toBe('SALE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: companyId filter When: getting metrics Then: should pass companyId to all queries', async () => {
      // Arrange
      setupSuccessMocks();

      // Act
      const result = await useCase.execute({ orgId: mockOrgId, companyId: 'company-123' });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.inventory).toBeDefined();
          expect(value.data.sales).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: movement without reference When: getting metrics Then: should use truncated ID', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.movement.findMany.mockResolvedValue([
        {
          id: 'mov-abcdefghij',
          type: 'INPUT',
          status: 'POSTED',
          reference: null,
          createdAt: new Date('2026-02-28T09:00:00Z'),
        },
      ]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          const movementActivity = value.data.recentActivity.find(a => a.type === 'MOVEMENT');
          if (movementActivity) {
            expect(movementActivity.reference).toBe('mov-abcd');
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: return of type RETURN_SUPPLIER When: getting metrics Then: should show Supplier return description', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.return.findMany.mockResolvedValue([
        {
          returnNumber: 'R-002',
          status: 'CONFIRMED',
          type: 'RETURN_SUPPLIER',
          createdAt: new Date('2026-02-28T08:00:00Z'),
        },
      ]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          const returnActivity = value.data.recentActivity.find(a => a.type === 'RETURN');
          if (returnActivity) {
            expect(returnActivity.description).toContain('Supplier');
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: return of type RETURN_CUSTOMER When: getting metrics Then: should show Customer return description', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.return.findMany.mockResolvedValue([
        {
          returnNumber: 'R-003',
          status: 'PENDING',
          type: 'RETURN_CUSTOMER',
          createdAt: new Date('2026-02-28T08:00:00Z'),
        },
      ]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          const returnActivity = value.data.recentActivity.find(a => a.type === 'RETURN');
          if (returnActivity) {
            expect(returnActivity.description).toContain('Customer');
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: transfer activity When: getting metrics Then: should include transfer with truncated ID', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.transfer.findMany.mockResolvedValue([
        {
          id: 'tr-abcdefghijk',
          status: 'IN_TRANSIT',
          createdAt: new Date('2026-02-28T07:00:00Z'),
        },
      ]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          const transferActivity = value.data.recentActivity.find(a => a.type === 'TRANSFER');
          if (transferActivity) {
            expect(transferActivity.reference).toBe('tr-abcde');
            expect(transferActivity.description).toContain('Transfer');
          }
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-Error thrown from database When: getting metrics Then: should return BusinessRuleError', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockRejectedValue('string error');
      mockPrismaService.product.count.mockRejectedValue('string error');
      mockPrismaService.sale.count.mockRejectedValue('string error');
      mockPrismaService.$queryRaw.mockRejectedValue('string error');
      mockPrismaService.sale.findMany.mockRejectedValue('string error');
      mockPrismaService.movement.findMany.mockRejectedValue('string error');
      mockPrismaService.return.findMany.mockRejectedValue('string error');
      mockPrismaService.transfer.findMany.mockRejectedValue('string error');

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: empty query raw results When: getting metrics Then: should handle gracefully with defaults', async () => {
      // Arrange
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.sale.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([]) // empty stockSummary
        .mockResolvedValueOnce([]) // empty lowStockCount
        .mockResolvedValueOnce([]) // empty salesRevenue
        .mockResolvedValueOnce([]) // empty salesTrend
        .mockResolvedValueOnce([]) // empty topProducts
        .mockResolvedValueOnce([]); // empty stockByWarehouse
      mockPrismaService.sale.findMany.mockResolvedValue([]);
      mockPrismaService.movement.findMany.mockResolvedValue([]);
      mockPrismaService.return.findMany.mockResolvedValue([]);
      mockPrismaService.transfer.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.inventory.totalStockQuantity).toBe(0);
          expect(value.data.inventory.totalInventoryValue).toBe(0);
          expect(value.data.inventory.currency).toBe('COP');
          expect(value.data.lowStock.count).toBe(0);
          expect(value.data.sales.monthlyRevenue).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product with non-COP currency When: getting metrics Then: should return detected currency', async () => {
      // Arrange
      setupSuccessMocks();
      mockPrismaService.product.findFirst.mockResolvedValue({ currency: 'USD' });

      // Act
      const result = await useCase.execute({ orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.inventory.currency).toBe('USD');
          expect(value.data.sales.currency).toBe('USD');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
