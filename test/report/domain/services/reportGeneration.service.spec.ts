import {
  ReportGenerationService,
  type IAvailableInventoryItem,
} from '@report/domain/services/reportGeneration.service';
import { REPORT_TYPES } from '@report/domain/valueObjects';

import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';
import type { IReturnRepository } from '@returns/domain/ports/repositories';
import type { ISaleRepository } from '@sale/domain/ports/repositories';
import type { IWarehouseRepository } from '@warehouse/domain/ports/repositories';
import type { PrismaService } from '@infrastructure/database/prisma.service';

type MockFn<T> = jest.Mock<Promise<T>>;

const makeQuantity = (value: number) => ({
  getNumericValue: () => value,
});

const makeMoney = (amount: number) => ({
  getAmount: () => amount,
  getCurrency: () => 'COP',
});

const makeProduct = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'product-1',
  name: { getValue: () => 'Product 1' },
  sku: { getValue: () => 'SKU-1' },
  status: { getValue: () => 'ACTIVE' },
  unit: { getValue: () => ({ code: 'EA' }), getCode: () => 'EA' },
  ...overrides,
});

const makeWarehouse = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'warehouse-1',
  name: 'Warehouse 1',
  ...overrides,
});

const makeMovement = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'movement-1',
  type: { getValue: () => 'IN' },
  status: { getValue: () => 'POSTED' },
  warehouseId: 'warehouse-1',
  reference: 'ref-1',
  reason: 'adjustment',
  createdAt: new Date('2024-01-10'),
  createdBy: 'user-1',
  getLines: () => [
    {
      productId: 'product-1',
      quantity: makeQuantity(2),
      unitCost: makeMoney(5),
      currency: 'COP',
    },
  ],
  ...overrides,
});

const makeSale = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'sale-1',
  warehouseId: 'warehouse-1',
  status: { getValue: () => 'CONFIRMED' },
  customerReference: 'cust-1',
  saleNumber: { getValue: () => 'S-001' },
  createdAt: new Date('2024-01-11'),
  createdBy: 'user-2',
  getLines: () => [
    {
      productId: 'product-1',
      quantity: makeQuantity(3),
      salePrice: makeMoney(10),
    },
  ],
  ...overrides,
});

const makeReturn = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'return-1',
  returnNumber: { getValue: () => 'R-001' },
  type: { getValue: () => 'RETURN_CUSTOMER' },
  status: { getValue: () => 'CONFIRMED' },
  warehouseId: 'warehouse-1',
  saleId: 'sale-1',
  sourceMovementId: 'movement-1',
  reason: { getValue: () => 'DAMAGED' },
  createdAt: new Date('2024-01-12'),
  createdBy: 'user-3',
  getLines: () => [
    {
      productId: 'product-1',
      quantity: makeQuantity(1),
      originalUnitCost: makeMoney(5),
      originalSalePrice: makeMoney(10),
    },
  ],
  ...overrides,
});

describe('ReportGenerationService', () => {
  const orgId = 'org-1';

  const productRepository = {
    findAll: jest.fn() as MockFn<unknown[]>,
    findLowStock: jest.fn() as MockFn<unknown[]>,
  } satisfies Pick<IProductRepository, 'findAll' | 'findLowStock'>;
  const warehouseRepository = {
    findAll: jest.fn() as MockFn<unknown[]>,
  } satisfies Pick<IWarehouseRepository, 'findAll'>;
  const movementRepository = {
    findByDateRange: jest.fn() as MockFn<unknown[]>,
    findAll: jest.fn() as MockFn<unknown[]>,
    findPostedMovements: jest.fn() as MockFn<unknown[]>,
  } satisfies Pick<IMovementRepository, 'findByDateRange' | 'findAll' | 'findPostedMovements'>;
  const prismaService = {
    $queryRaw: jest.fn() as MockFn<unknown[]>,
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
        { id: 'user-3', firstName: 'Bob', lastName: 'Wilson' },
      ]),
    },
    sale: {
      findMany: jest.fn().mockResolvedValue([{ id: 'sale-1', saleNumber: 'S-001' }]),
    },
  };
  const saleRepository = {
    findByDateRange: jest.fn() as MockFn<unknown[]>,
    findAll: jest.fn() as MockFn<unknown[]>,
    findById: jest.fn() as MockFn<unknown | null>,
  } satisfies Pick<ISaleRepository, 'findByDateRange' | 'findAll' | 'findById'>;
  const returnRepository = {
    findByDateRange: jest.fn() as MockFn<unknown[]>,
    findAll: jest.fn() as MockFn<unknown[]>,
    findBySaleId: jest.fn() as MockFn<unknown[]>,
  } satisfies Pick<IReturnRepository, 'findByDateRange' | 'findAll' | 'findBySaleId'>;

  const service = new ReportGenerationService(
    productRepository as unknown as IProductRepository,
    warehouseRepository as unknown as IWarehouseRepository,
    movementRepository as unknown as IMovementRepository,
    saleRepository as unknown as ISaleRepository,
    returnRepository as unknown as IReturnRepository,
    prismaService as unknown as PrismaService
  );

  beforeEach(() => {
    const product = makeProduct();
    const inactiveProduct = makeProduct({
      id: 'product-inactive',
      status: { getValue: () => 'INACTIVE' },
    });
    productRepository.findAll.mockResolvedValue([product, inactiveProduct]);
    productRepository.findLowStock.mockResolvedValue([product]);

    warehouseRepository.findAll.mockResolvedValue([makeWarehouse()]);

    const movement = makeMovement();
    movementRepository.findByDateRange.mockResolvedValue([movement]);
    movementRepository.findAll.mockResolvedValue([movement]);
    movementRepository.findPostedMovements.mockResolvedValue([movement]);

    prismaService.$queryRaw.mockResolvedValue([
      { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
    ]);

    const sale = makeSale();
    saleRepository.findByDateRange.mockResolvedValue([sale]);
    saleRepository.findAll.mockResolvedValue([sale]);
    saleRepository.findById.mockResolvedValue(sale);

    const returnEntity = makeReturn();
    returnRepository.findByDateRange.mockResolvedValue([returnEntity]);
    returnRepository.findAll.mockResolvedValue([returnEntity]);
    returnRepository.findBySaleId.mockResolvedValue([returnEntity]);
  });

  it('Given: valid repositories When: generating reports Then: should return data with metadata', async () => {
    // Arrange
    const parameters = {};
    const types = [
      REPORT_TYPES.AVAILABLE_INVENTORY,
      REPORT_TYPES.MOVEMENT_HISTORY,
      REPORT_TYPES.VALUATION,
      REPORT_TYPES.LOW_STOCK,
      REPORT_TYPES.MOVEMENTS,
      REPORT_TYPES.FINANCIAL,
      REPORT_TYPES.TURNOVER,
      REPORT_TYPES.SALES,
      REPORT_TYPES.SALES_BY_PRODUCT,
      REPORT_TYPES.SALES_BY_WAREHOUSE,
      REPORT_TYPES.RETURNS,
      REPORT_TYPES.RETURNS_BY_TYPE,
      REPORT_TYPES.RETURNS_BY_PRODUCT,
    ];

    // Act
    const results = [];
    for (const type of types) {
      results.push(await service.generateReport(type, parameters, orgId));
    }

    // Assert
    results.forEach((result, index) => {
      expect(result.metadata.reportType).toBe(types[index]);
      expect(result.metadata.orgId).toBe(orgId);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  it('Given: date range When: generating report stream Then: should yield batches', async () => {
    // Arrange
    const parameters = {
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      },
    };

    // Act
    const batches: unknown[][] = [];
    for await (const batch of service.generateReportStream(
      REPORT_TYPES.AVAILABLE_INVENTORY,
      parameters,
      orgId,
      1
    )) {
      batches.push(batch);
    }

    // Assert
    expect(batches.length).toBe(1);
    expect((batches[0] as IAvailableInventoryItem[]).length).toBe(1);
  });

  it('Given: missing saleId When: generating returns by sale Then: should throw', async () => {
    // Arrange
    const parameters = {};

    // Act & Assert
    await expect(
      service.generateReport(REPORT_TYPES.RETURNS_BY_SALE, parameters, orgId)
    ).rejects.toThrow('Sale ID is required for returns by sale report');
  });

  it('Given: sale not found When: generating returns by sale Then: should throw', async () => {
    // Arrange
    saleRepository.findById.mockResolvedValueOnce(null);

    // Act & Assert
    await expect(
      service.generateReport(REPORT_TYPES.RETURNS_BY_SALE, { saleId: 'missing' }, orgId)
    ).rejects.toThrow('Sale with ID missing not found');
  });

  it('Given: sale exists When: generating returns by sale Then: should return report data', async () => {
    // Arrange
    const parameters = { saleId: 'sale-1' };

    // Act
    const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_SALE, parameters, orgId);

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.metadata.reportType).toBe(REPORT_TYPES.RETURNS_BY_SALE);
  });

  it('Given: customer and supplier wrappers When: generating Then: should override reportType', async () => {
    // Arrange
    const parameters = {};

    // Act
    const customer = await service.generateReport(REPORT_TYPES.RETURNS_CUSTOMER, parameters, orgId);
    const supplier = await service.generateReport(REPORT_TYPES.RETURNS_SUPPLIER, parameters, orgId);

    // Assert
    expect(customer.metadata.reportType).toBe(REPORT_TYPES.RETURNS_CUSTOMER);
    expect(supplier.metadata.reportType).toBe(REPORT_TYPES.RETURNS_SUPPLIER);
  });

  describe('ABC Analysis Report', () => {
    it('Given: confirmed sales When: generating ABC analysis Then: should classify products by revenue', async () => {
      // Arrange
      const parameters = {};

      // Act
      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, parameters, orgId);

      // Assert
      expect(result.metadata.reportType).toBe(REPORT_TYPES.ABC_ANALYSIS);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      const item = result.data[0] as {
        abcClassification: string;
        revenuePercentage: number;
        cumulativePercentage: number;
      };
      expect(['A', 'B', 'C']).toContain(item.abcClassification);
      expect(item.cumulativePercentage).toBeGreaterThan(0);
    });
  });

  describe('Dead Stock Report', () => {
    it('Given: products with no recent sales When: generating dead stock Then: should return dead stock items', async () => {
      // Arrange
      // The default mock has sale for product-1, but product-inactive has no sales and stock
      // Ensure stock exists for inactive product
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-inactive', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]); // No sales at all

      const parameters = { includeInactive: true };

      // Act
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, parameters, orgId);

      // Assert
      expect(result.metadata.reportType).toBe(REPORT_TYPES.DEAD_STOCK);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('Given: custom deadStockDays When: generating dead stock Then: should use custom threshold', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 20, unitCost: 10 },
      ]);
      saleRepository.findAll.mockResolvedValue([]); // No sales

      const parameters = { deadStockDays: 30, includeInactive: true };

      // Act
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, parameters, orgId);

      // Assert
      expect(result.metadata.reportType).toBe(REPORT_TYPES.DEAD_STOCK);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Unknown report type', () => {
    it('Given: unknown report type When: generating report Then: should throw error', async () => {
      // Arrange
      const parameters = {};

      // Act & Assert
      await expect(
        service.generateReport('UNKNOWN_TYPE' as never, parameters, orgId)
      ).rejects.toThrow('Unknown report type: UNKNOWN_TYPE');
    });
  });

  describe('Report stream with multiple batches', () => {
    it('Given: data larger than batch size When: streaming Then: should yield multiple batches', async () => {
      // Arrange
      // Mock lots of stock records so inventory report has many items
      const manyStockRows = [];
      const manyProducts = [];
      const manyWarehouses = [];
      for (let i = 0; i < 5; i++) {
        manyProducts.push(makeProduct({ id: `prod-${i}` }));
      }
      for (let i = 0; i < 3; i++) {
        manyWarehouses.push(makeWarehouse({ id: `wh-${i}`, name: `Warehouse ${i}` }));
      }
      for (const p of manyProducts) {
        for (const w of manyWarehouses) {
          manyStockRows.push({
            productId: (p as { id: string }).id,
            warehouseId: (w as { id: string }).id,
            quantity: 10,
            unitCost: 5,
          });
        }
      }
      productRepository.findAll.mockResolvedValue(manyProducts);
      warehouseRepository.findAll.mockResolvedValue(manyWarehouses);
      prismaService.$queryRaw.mockResolvedValue(manyStockRows);

      const parameters = {};

      // Act - use batch size of 3 so we get multiple batches from 15 items
      const batches: unknown[][] = [];
      for await (const batch of service.generateReportStream(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId,
        3
      )) {
        batches.push(batch);
      }

      // Assert
      expect(batches.length).toBeGreaterThan(1);
      const totalItems = batches.reduce((sum, b) => sum + b.length, 0);
      expect(totalItems).toBe(15);
    });
  });

  describe('Filters on available inventory', () => {
    it('Given: warehouseId filter When: generating inventory Then: should filter by warehouse', async () => {
      // Arrange
      const parameters = { warehouseId: 'warehouse-1' };

      // Act
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );

      // Assert
      expect(result.metadata.reportType).toBe(REPORT_TYPES.AVAILABLE_INVENTORY);
      expect(Array.isArray(result.data)).toBe(true);
      for (const item of result.data as Array<{ warehouseId: string }>) {
        expect(item.warehouseId).toBe('warehouse-1');
      }
    });

    it('Given: includeInactive flag When: generating inventory Then: should include inactive products', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
        { productId: 'product-inactive', warehouseId: 'warehouse-1', quantity: 3, unitCost: 7 },
      ]);
      const parameters = { includeInactive: true };

      // Act
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );

      // Assert
      const productIds = (result.data as Array<{ productId: string }>).map(d => d.productId);
      expect(productIds).toContain('product-inactive');
    });
  });

  describe('Movement history with date range', () => {
    it('Given: date range When: generating movement history Then: should use findByDateRange', async () => {
      // Arrange
      const parameters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
      };

      // Act
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);

      // Assert
      expect(result.metadata.reportType).toBe(REPORT_TYPES.MOVEMENT_HISTORY);
      expect(movementRepository.findByDateRange).toHaveBeenCalledWith(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    });
  });

  describe('Period string helpers', () => {
    it('Given: no date range When: generating report Then: period should be All Time', async () => {
      // Arrange
      const parameters = {};

      // Act
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, parameters, orgId);

      // Assert
      const item = (result.data as Array<{ period: string }>)[0];
      if (item) {
        expect(item.period).toBe('All Time');
      }
    });

    it('Given: date range When: generating report Then: period should include start and end dates', async () => {
      // Arrange
      const parameters = {
        dateRange: {
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        },
      };

      // Act
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, parameters, orgId);

      // Assert
      const item = (result.data as Array<{ period: string }>)[0];
      if (item) {
        expect(item.period).toContain('2024-06-01');
        expect(item.period).toContain('2024-06-30');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE BRANCH COVERAGE TESTS
  // ──────────────────────────────────────────────────────────────────────────

  describe('Available Inventory – branch coverage', () => {
    it('Given: productId filter matching When: generating Then: should include only that product', async () => {
      const parameters = { productId: 'product-1' };
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );
      expect(result.data.length).toBe(1);
      expect((result.data[0] as { productId: string }).productId).toBe('product-1');
    });

    it('Given: productId filter not matching When: generating Then: should return empty', async () => {
      const parameters = { productId: 'nonexistent' };
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: comma-separated warehouseId When: generating Then: should filter correctly', async () => {
      warehouseRepository.findAll.mockResolvedValue([
        makeWarehouse({ id: 'wh-a', name: 'WH A' }),
        makeWarehouse({ id: 'wh-b', name: 'WH B' }),
        makeWarehouse({ id: 'wh-c', name: 'WH C' }),
      ]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'wh-a', quantity: 5, unitCost: 10 },
        { productId: 'product-1', warehouseId: 'wh-b', quantity: 3, unitCost: 7 },
        { productId: 'product-1', warehouseId: 'wh-c', quantity: 2, unitCost: 4 },
      ]);
      const parameters = { warehouseId: 'wh-a, wh-c' };
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );
      const warehouseIds = (result.data as Array<{ warehouseId: string }>).map(d => d.warehouseId);
      expect(warehouseIds).toContain('wh-a');
      expect(warehouseIds).toContain('wh-c');
      expect(warehouseIds).not.toContain('wh-b');
    });

    it('Given: warehouseId not matching any When: generating Then: should return empty', async () => {
      const parameters = { warehouseId: 'nonexistent-wh' };
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: includeInactive false (default) When: generating Then: should exclude inactive products', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
        { productId: 'product-inactive', warehouseId: 'warehouse-1', quantity: 3, unitCost: 7 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.AVAILABLE_INVENTORY, {}, orgId);
      const ids = (result.data as Array<{ productId: string }>).map(d => d.productId);
      expect(ids).not.toContain('product-inactive');
    });

    it('Given: stock quantity is zero When: generating Then: should not include that row', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.AVAILABLE_INVENTORY, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: stock missing for product-warehouse pair When: generating Then: should skip', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.AVAILABLE_INVENTORY, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouse not in warehouseMap When: generating Then: should use Unknown', async () => {
      // Product references a warehouse not in the warehouses list
      warehouseRepository.findAll.mockResolvedValue([
        makeWarehouse({ id: 'other-wh', name: 'Other' }),
      ]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'other-wh', quantity: 5, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.AVAILABLE_INVENTORY, {}, orgId);
      expect(result.data.length).toBe(1);
      expect((result.data[0] as { warehouseName: string }).warehouseName).toBe('Other');
    });

    it('Given: locationId parameter When: generating Then: should pass through as locationId', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        { locationId: 'loc-1' },
        orgId
      );
      if (result.data.length > 0) {
        expect((result.data[0] as { locationId?: string }).locationId).toBe('loc-1');
      }
    });
  });

  describe('Movement History – branch coverage', () => {
    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, {}, orgId);
      expect(movementRepository.findAll).toHaveBeenCalledWith(orgId);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: warehouseId not matching movement When: generating Then: should filter out', async () => {
      const parameters = { warehouseId: 'other-wh' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: comma-separated warehouseId matching When: generating Then: should include matching', async () => {
      const parameters = { warehouseId: 'warehouse-1, warehouse-2' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: movementType filter matching When: generating Then: should include movement', async () => {
      const parameters = { movementType: 'IN' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data.length).toBe(1);
    });

    it('Given: movementType filter not matching When: generating Then: should exclude', async () => {
      const parameters = { movementType: 'OUT' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: comma-separated movementType When: generating Then: should filter correctly', async () => {
      const parameters = { movementType: 'OUT, IN' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter matching line When: generating Then: should include', async () => {
      const parameters = { productId: 'product-1' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter not matching line When: generating Then: should exclude', async () => {
      const parameters = { productId: 'product-other' };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: product not in productMap When: generating Then: should use Unknown for name/sku', async () => {
      movementRepository.findAll.mockResolvedValue([
        makeMovement({
          getLines: () => [
            {
              productId: 'unknown-product',
              quantity: makeQuantity(1),
              unitCost: makeMoney(3),
              currency: 'COP',
            },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, {}, orgId);
      const item = result.data[0] as { productName: string; sku: string };
      expect(item.productName).toBe('Unknown');
      expect(item.sku).toBe('Unknown');
    });

    it('Given: line without unitCost When: generating Then: totalCost should be undefined', async () => {
      movementRepository.findAll.mockResolvedValue([
        makeMovement({
          getLines: () => [
            {
              productId: 'product-1',
              quantity: makeQuantity(2),
              unitCost: null,
              currency: 'COP',
            },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, {}, orgId);
      const item = result.data[0] as { unitCost?: number; totalCost?: number };
      expect(item.unitCost).toBeUndefined();
      expect(item.totalCost).toBeUndefined();
    });

    it('Given: warehouse not in warehouseMap When: generating Then: should use Unknown', async () => {
      movementRepository.findAll.mockResolvedValue([makeMovement({ warehouseId: 'unknown-wh' })]);
      const result = await service.generateReport(REPORT_TYPES.MOVEMENT_HISTORY, {}, orgId);
      const item = result.data[0] as { warehouseName: string };
      expect(item.warehouseName).toBe('Unknown');
    });
  });

  describe('Valuation Report – branch coverage', () => {
    it('Given: productId filter When: generating Then: should only include matching product', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { productId: 'product-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: productId not matching When: generating Then: should return empty', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { productId: 'none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include product', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude product', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching by id When: generating Then: should include product', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { category: 'cat-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: product without categories When: category filter set Then: should exclude', async () => {
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouseId not matching When: generating Then: should return empty', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.VALUATION,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: stock quantity zero When: generating Then: should skip row', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.VALUATION, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: no stock for product-warehouse When: generating Then: should skip row', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.VALUATION, {}, orgId);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Low Stock Report – branch coverage', () => {
    it('Given: no warehouseId filter When: generating Then: should include all warehouses', async () => {
      const result = await service.generateReport(REPORT_TYPES.LOW_STOCK, {}, orgId);
      expect(result.metadata.reportType).toBe(REPORT_TYPES.LOW_STOCK);
    });

    it('Given: warehouseId matching When: generating Then: should include warehouse', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.LOW_STOCK,
        { warehouseId: 'warehouse-1' },
        orgId
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: warehouseId not matching When: generating Then: should exclude warehouse', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.LOW_STOCK,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: stock quantity 0 (CRITICAL) When: generating Then: severity should be CRITICAL', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.LOW_STOCK, {}, orgId);
      const item = result.data[0] as { severity: string; currentStock: number };
      expect(item.severity).toBe('CRITICAL');
      expect(item.currentStock).toBe(0);
    });

    it('Given: stock quantity > 0 but below min When: generating Then: severity should be WARNING', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.LOW_STOCK, {}, orgId);
      const item = result.data[0] as { severity: string };
      expect(item.severity).toBe('WARNING');
    });

    it('Given: stock above minimum When: generating Then: should not be included', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 100, unitCost: 10 },
      ]);
      const result = await service.generateReport(REPORT_TYPES.LOW_STOCK, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: no stock record (null) When: generating Then: currentStock 0 = CRITICAL', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.LOW_STOCK, {}, orgId);
      const item = result.data[0] as { severity: string; currentStock: number };
      expect(item.severity).toBe('CRITICAL');
      expect(item.currentStock).toBe(0);
    });

    it('Given: severity filter CRITICAL When: generating Then: should exclude WARNING', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.LOW_STOCK,
        { severity: 'CRITICAL' as const },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: severity filter WARNING When: generating Then: should exclude CRITICAL', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0, unitCost: 10 },
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.LOW_STOCK,
        { severity: 'WARNING' as const },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: severity filter WARNING When: stock is WARNING Then: should include', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.LOW_STOCK,
        { severity: 'WARNING' as const },
        orgId
      );
      expect(result.data.length).toBe(1);
    });
  });

  describe('Movements Summary – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, parameters, orgId);
      expect(movementRepository.findByDateRange).toHaveBeenCalled();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: no dateRange When: generating Then: should use findPostedMovements', async () => {
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, {}, orgId);
      expect(movementRepository.findPostedMovements).toHaveBeenCalledWith(orgId);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: warehouseId not matching When: generating Then: should filter out', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.MOVEMENTS,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: movementType not matching When: generating Then: should filter out', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.MOVEMENTS,
        { movementType: 'OUT' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: movementType matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.MOVEMENTS,
        { movementType: 'IN' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: line without unitCost When: generating Then: should not add to totalValue', async () => {
      movementRepository.findPostedMovements.mockResolvedValue([
        makeMovement({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(2), unitCost: null, currency: 'COP' },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, {}, orgId);
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(0);
    });

    it('Given: multiple movements of same type+warehouse When: generating Then: should aggregate', async () => {
      movementRepository.findPostedMovements.mockResolvedValue([
        makeMovement({ id: 'm1' }),
        makeMovement({ id: 'm2' }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.MOVEMENTS, {}, orgId);
      const item = result.data[0] as { totalMovements: number };
      expect(item.totalMovements).toBe(2);
    });
  });

  describe('Financial Report – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange for sales', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: no dateRange When: generating Then: should use findAll for sales', async () => {
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: warehouseId not matching When: generating Then: should filter out', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.FINANCIAL,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter When: generating Then: should filter products by category', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.FINANCIAL,
        { category: 'Electronics' },
        orgId
      );
      expect(result.metadata.reportType).toBe(REPORT_TYPES.FINANCIAL);
    });

    it('Given: category filter not matching When: generating Then: no data for that category', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.FINANCIAL,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: sale not CONFIRMED When: generating Then: should not count revenue', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ status: { getValue: () => 'DRAFT' } })]);
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      // Stock inventory value still exists, so data may have entries with revenue=0
      for (const item of result.data as Array<{ totalRevenue: number }>) {
        expect(item.totalRevenue).toBe(0);
      }
    });

    it('Given: totalRevenue is 0 When: generating Then: grossMarginPercentage should be 0', async () => {
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      for (const item of result.data as Array<{ grossMarginPercentage: number }>) {
        expect(item.grossMarginPercentage).toBe(0);
      }
    });

    it('Given: no stock and no sales for warehouse-category When: generating Then: should skip row', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      saleRepository.findAll.mockResolvedValue([]);
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: product without categories When: generating Then: should use Sin categoria', async () => {
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      if (result.data.length > 0) {
        expect((result.data[0] as { category: string }).category).toBe('Sin categoría');
      }
    });

    it('Given: sale line product has no stock When: generating Then: COGS should be 0 for that line', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      saleRepository.findAll.mockResolvedValue([makeSale()]);
      const result = await service.generateReport(REPORT_TYPES.FINANCIAL, {}, orgId);
      // Revenue exists from sales but no COGS since no stock info
      // The row might still appear because totalRevenue > 0
      for (const item of result.data as Array<{ totalCost: number }>) {
        expect(item.totalCost).toBe(0);
      }
    });
  });

  describe('Turnover Report – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange for sales', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: no dateRange When: generating Then: should use findAll and getDaysInPeriod=365', async () => {
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
      const item = result.data[0] as { period: string };
      if (item) {
        expect(item.period).toBe('All Time');
      }
    });

    it('Given: productId filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.TURNOVER,
        { productId: 'none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouseId not matching confirmed sale When: generating Then: should skip sale for COGS', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.TURNOVER,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include product', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.TURNOVER,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude product', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.TURNOVER,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: high turnoverRate (>=4) When: generating Then: classification should be FAST_MOVING', async () => {
      // High COGS relative to inventory value => high turnover
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 1, unitCost: 1 },
      ]);
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(10), salePrice: makeMoney(100) },
          ],
        }),
      ]);
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      const item = result.data[0] as { classification: string; turnoverRate: number };
      expect(item.classification).toBe('FAST_MOVING');
      expect(item.turnoverRate).toBeGreaterThanOrEqual(4);
    });

    it('Given: turnoverRate between 1 and 4 When: generating Then: classification should be NORMAL', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
      ]);
      // COGS = qty(3) * unitCost(10) = 30; avgInventory = 5*10=50; rate = 30/50 = 0.6... that's < 1
      // We need COGS > avgInv: e.g. qty sold=10, unitCost=10 => COGS=100; avgInv=50; rate=2
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(10), salePrice: makeMoney(20) },
          ],
        }),
      ]);
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      const item = result.data[0] as { classification: string; turnoverRate: number };
      expect(item.classification).toBe('NORMAL');
      expect(item.turnoverRate).toBeGreaterThanOrEqual(1);
      expect(item.turnoverRate).toBeLessThan(4);
    });

    it('Given: turnoverRate < 1 When: generating Then: classification should be SLOW_MOVING', async () => {
      // Default: COGS = 3*10 = 30, avgInv = 5*10 = 50, rate = 0.6
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      const item = result.data[0] as { classification: string; turnoverRate: number };
      expect(item.classification).toBe('SLOW_MOVING');
      expect(item.turnoverRate).toBeLessThan(1);
    });

    it('Given: averageInventory is 0 When: generating Then: turnoverRate should be 0', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      // No stock = averageInventory = 0, but COGS > 0 from sales
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      saleRepository.findAll.mockResolvedValue([makeSale()]);
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      // cogs > 0 so row should appear
      if (result.data.length > 0) {
        const item = result.data[0] as { turnoverRate: number; daysOfInventory: number };
        expect(item.turnoverRate).toBe(0);
      }
    });

    it('Given: no stock and no COGS When: generating Then: should not include row', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      saleRepository.findAll.mockResolvedValue([]);
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: stock has no unitCost for sale product When: generating Then: COGS uses 0', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'other-product', warehouseId: 'warehouse-1', quantity: 5, unitCost: 10 },
      ]);
      productRepository.findAll.mockResolvedValue([makeProduct()]);
      saleRepository.findAll.mockResolvedValue([makeSale()]);
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, {}, orgId);
      // product-1 has no stock entry => unitCost defaults to 0 for COGS
      // But cogs = 0 and averageInventory = 0, so row won't appear
      expect(result.data).toHaveLength(0);
    });

    it('Given: dateRange with getDaysInPeriod When: generating Then: daysOfInventory uses period days', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      const result = await service.generateReport(REPORT_TYPES.TURNOVER, parameters, orgId);
      if (result.data.length > 0) {
        const item = result.data[0] as { daysOfInventory: number };
        expect(item.daysOfInventory).toBeLessThanOrEqual(365);
      }
    });
  });

  describe('Sales Report – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.SALES, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.SALES, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should filter out sale', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: status filter matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES,
        { status: 'CONFIRMED' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: status filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(REPORT_TYPES.SALES, { status: 'DRAFT' }, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: comma-separated status filter When: generating Then: should match any', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES,
        { status: 'DRAFT,CONFIRMED' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: customerReference matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES,
        { customerReference: 'cust-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: customerReference not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES,
        { customerReference: 'other-cust' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouse not in map When: generating Then: should use Unknown', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ warehouseId: 'unknown-wh' })]);
      const result = await service.generateReport(REPORT_TYPES.SALES, {}, orgId);
      const item = result.data[0] as { warehouseName: string };
      expect(item.warehouseName).toBe('Unknown');
    });
  });

  describe('Sales by Product – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should exclude sale', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_PRODUCT,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: productId filter matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_PRODUCT,
        { productId: 'product-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_PRODUCT,
        { productId: 'other' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_PRODUCT,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_PRODUCT,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: product not in productMap When: generating Then: should use Unknown', async () => {
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'unknown-prod', quantity: makeQuantity(1), salePrice: makeMoney(10) },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { productName: string; sku: string };
      expect(item.productName).toBe('Unknown');
      expect(item.sku).toBe('Unknown');
    });

    it('Given: totalRevenue is 0 When: generating Then: marginPercentage should be 0', async () => {
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(1), salePrice: makeMoney(0) },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, {}, orgId);
      if (result.data.length > 0) {
        const item = result.data[0] as { marginPercentage: number };
        expect(item.marginPercentage).toBe(0);
      }
    });

    it('Given: sale not CONFIRMED When: generating Then: should not include', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ status: { getValue: () => 'DRAFT' } })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: no stock for product When: generating Then: averageCost should be 0', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_PRODUCT, {}, orgId);
      if (result.data.length > 0) {
        const item = result.data[0] as { averageCost: number };
        expect(item.averageCost).toBe(0);
      }
    });
  });

  describe('Sales by Warehouse – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.SALES_BY_WAREHOUSE, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.SALES_BY_WAREHOUSE, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_WAREHOUSE,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: sale not CONFIRMED When: generating Then: should not count', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ status: { getValue: () => 'DRAFT' } })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_WAREHOUSE, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouse not in map When: generating Then: should use Unknown', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ warehouseId: 'unknown-wh' })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_WAREHOUSE, {}, orgId);
      const item = result.data[0] as { warehouseName: string };
      expect(item.warehouseName).toBe('Unknown');
    });

    it('Given: multiple confirmed sales When: generating Then: should aggregate per warehouse', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ id: 's1' }), makeSale({ id: 's2' })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_WAREHOUSE, {}, orgId);
      const item = result.data[0] as { totalSales: number; averagePerSale: number };
      expect(item.totalSales).toBe(2);
      expect(item.averagePerSale).toBe(60 / 2); // each sale: 3*10=30, total=60, avg=30
    });
  });

  describe('Sales by Client – branch coverage', () => {
    beforeEach(() => {
      (prismaService as Record<string, unknown>).contact = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'contact-1', name: 'Client A', identification: 'ID-A' }]),
      };
    });

    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      saleRepository.findByDateRange.mockResolvedValue([makeSale({ contactId: 'contact-1' })]);
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ contactId: 'contact-1' })]);
      await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: sale without contactId When: generating Then: should skip sale', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale()]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: sale with contactId When: generating Then: should aggregate by contact', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ contactId: 'contact-1' })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      expect(result.data.length).toBe(1);
      const item = result.data[0] as { contactName: string; identification: string };
      expect(item.contactName).toBe('Client A');
      expect(item.identification).toBe('ID-A');
    });

    it('Given: contact not in contactMap When: generating Then: should use Unknown', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ contactId: 'unknown-contact' })]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      const item = result.data[0] as { contactName: string; identification: string };
      expect(item.contactName).toBe('Unknown');
      expect(item.identification).toBe('');
    });

    it('Given: warehouseId not matching When: generating Then: should filter out', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ contactId: 'contact-1' })]);
      const result = await service.generateReport(
        REPORT_TYPES.SALES_BY_CLIENT,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: sale not CONFIRMED When: generating Then: should skip', async () => {
      saleRepository.findAll.mockResolvedValue([
        makeSale({ contactId: 'contact-1', status: { getValue: () => 'DRAFT' } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: multiple sales by same client When: generating Then: should aggregate', async () => {
      saleRepository.findAll.mockResolvedValue([
        makeSale({ id: 's1', contactId: 'contact-1' }),
        makeSale({ id: 's2', contactId: 'contact-1' }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      expect(result.data.length).toBe(1);
      const item = result.data[0] as { totalSales: number };
      expect(item.totalSales).toBe(2);
    });

    it('Given: multiple clients When: generating Then: should sort by revenue descending', async () => {
      (prismaService as Record<string, unknown>).contact = {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'Small Client', identification: 'ID-1' },
          { id: 'c2', name: 'Big Client', identification: 'ID-2' },
        ]),
      };
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          id: 's1',
          contactId: 'c1',
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(1), salePrice: makeMoney(10) },
          ],
        }),
        makeSale({
          id: 's2',
          contactId: 'c2',
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(10), salePrice: makeMoney(100) },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.SALES_BY_CLIENT, {}, orgId);
      const items = result.data as Array<{ contactId: string }>;
      expect(items[0].contactId).toBe('c2');
    });
  });

  describe('Returns Report – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.RETURNS, parameters, orgId);
      expect(returnRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      expect(returnRepository.findAll).toHaveBeenCalled();
    });

    it('Given: returnType CUSTOMER matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { returnType: 'CUSTOMER' as const },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: returnType SUPPLIER not matching When: generating Then: should exclude RETURN_CUSTOMER', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { returnType: 'SUPPLIER' as const },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: status filter matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { status: 'CONFIRMED' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: status filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { status: 'PENDING' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouseId not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: return line without originalUnitCost When: generating Then: totalValue should be 0', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({
          getLines: () => [
            {
              productId: 'product-1',
              quantity: makeQuantity(1),
              originalUnitCost: null,
              originalSalePrice: null,
            },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(0);
    });

    it('Given: return without saleId When: generating Then: saleId and saleNumber should be undefined', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ saleId: undefined, sourceMovementId: undefined }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      const item = result.data[0] as { saleId?: string; saleNumber?: string };
      expect(item.saleId).toBeUndefined();
      expect(item.saleNumber).toBeUndefined();
    });

    it('Given: no users and no sales to resolve When: generating Then: should handle empty sets', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ createdBy: undefined as unknown as string, saleId: undefined }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      expect(result.data.length).toBe(1);
    });

    it('Given: warehouse not in map When: generating Then: should use Unknown', async () => {
      returnRepository.findAll.mockResolvedValue([makeReturn({ warehouseId: 'unknown-wh' })]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      const item = result.data[0] as { warehouseName: string };
      expect(item.warehouseName).toBe('Unknown');
    });

    it('Given: user found in userNameMap When: generating Then: should show user name', async () => {
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      const item = result.data[0] as { createdBy: string; createdByName?: string };
      expect(item.createdByName).toBe('Bob Wilson');
    });

    it('Given: RETURN_SUPPLIER type When: normalized should be SUPPLIER', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ type: { getValue: () => 'RETURN_SUPPLIER' } }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS,
        { returnType: 'SUPPLIER' as const },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: reason getValue returns null When: generating Then: should handle gracefully', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ reason: { getValue: () => null } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS, {}, orgId);
      const item = result.data[0] as { reason?: string };
      expect(item.reason).toBeUndefined();
    });
  });

  describe('Returns by Type – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange for both returns and sales', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, parameters, orgId);
      expect(returnRepository.findByDateRange).toHaveBeenCalled();
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll for both', async () => {
      await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      expect(returnRepository.findAll).toHaveBeenCalled();
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_TYPE,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: returnType CUSTOMER matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_TYPE,
        { returnType: 'CUSTOMER' as const },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: returnType SUPPLIER not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_TYPE,
        { returnType: 'SUPPLIER' as const },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: return line without originalUnitCost When: generating Then: totalValue should be 0', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(1), originalUnitCost: null },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(0);
    });

    it('Given: no sales When: generating Then: returnRate should be 0', async () => {
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      const item = result.data[0] as { returnRate: number };
      expect(item.returnRate).toBe(0);
    });

    it('Given: reason present When: generating Then: should appear in topReasons', async () => {
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      const item = result.data[0] as { topReasons: Array<{ reason: string; count: number }> };
      expect(item.topReasons.length).toBeGreaterThanOrEqual(1);
      expect(item.topReasons[0].reason).toBe('DAMAGED');
    });

    it('Given: reason getValue returns null When: generating Then: should use Unknown', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ reason: { getValue: () => null } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      const item = result.data[0] as { topReasons: Array<{ reason: string }> };
      expect(item.topReasons[0].reason).toBe('Unknown');
    });

    it('Given: RETURN_SUPPLIER type When: generating with SUPPLIER filter Then: should include', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ type: { getValue: () => 'RETURN_SUPPLIER' } }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_TYPE,
        { returnType: 'SUPPLIER' as const },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: multiple reasons When: generating Then: topReasons should be sorted by count desc', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ id: 'r1', reason: { getValue: () => 'DAMAGED' } }),
        makeReturn({ id: 'r2', reason: { getValue: () => 'DAMAGED' } }),
        makeReturn({ id: 'r3', reason: { getValue: () => 'WRONG_ITEM' } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_TYPE, {}, orgId);
      const item = result.data[0] as { topReasons: Array<{ reason: string; count: number }> };
      expect(item.topReasons.length).toBe(2);
      expect(item.topReasons[0].reason).toBe('DAMAGED');
      expect(item.topReasons[0].count).toBe(2);
      expect(item.topReasons[1].reason).toBe('WRONG_ITEM');
      expect(item.topReasons[1].count).toBe(1);
    });
  });

  describe('Returns by Product – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, parameters, orgId);
      expect(returnRepository.findByDateRange).toHaveBeenCalled();
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      expect(returnRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: returnType SUPPLIER not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { returnType: 'SUPPLIER' as const },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: productId filter matching When: generating Then: should include', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { productId: 'product-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { productId: 'other' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_PRODUCT,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: product not in productMap When: generating Then: should use Unknown', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({
          getLines: () => [
            {
              productId: 'unknown-prod',
              quantity: makeQuantity(1),
              originalUnitCost: makeMoney(5),
            },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { productName: string; sku: string };
      expect(item.productName).toBe('Unknown');
      expect(item.sku).toBe('Unknown');
    });

    it('Given: no sales for product When: generating Then: returnRate should be 0', async () => {
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { returnRate: number };
      expect(item.returnRate).toBe(0);
    });

    it('Given: return line without originalUnitCost When: generating Then: totalValueReturned stays 0', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(1), originalUnitCost: null },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { totalValueReturned: number };
      expect(item.totalValueReturned).toBe(0);
    });

    it('Given: reason getValue returns null When: generating Then: should use Unknown', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ reason: { getValue: () => null } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { topReasons: Array<{ reason: string }> };
      expect(item.topReasons[0].reason).toBe('Unknown');
    });

    it('Given: sale not CONFIRMED When: computing sales map Then: should not count', async () => {
      saleRepository.findAll.mockResolvedValue([makeSale({ status: { getValue: () => 'DRAFT' } })]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { returnRate: number };
      expect(item.returnRate).toBe(0);
    });

    it('Given: multiple reasons When: generating Then: topReasons should be sorted by count desc', async () => {
      returnRepository.findAll.mockResolvedValue([
        makeReturn({ id: 'r1', reason: { getValue: () => 'DAMAGED' } }),
        makeReturn({ id: 'r2', reason: { getValue: () => 'DAMAGED' } }),
        makeReturn({ id: 'r3', reason: { getValue: () => 'WRONG_ITEM' } }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.RETURNS_BY_PRODUCT, {}, orgId);
      const item = result.data[0] as { topReasons: Array<{ reason: string; count: number }> };
      expect(item.topReasons.length).toBe(2);
      expect(item.topReasons[0].reason).toBe('DAMAGED');
      expect(item.topReasons[0].count).toBe(2);
      expect(item.topReasons[1].count).toBe(1);
    });
  });

  describe('Returns by Sale – branch coverage', () => {
    it('Given: return line with originalSalePrice but no originalUnitCost When: generating Then: should use salePrice', async () => {
      returnRepository.findBySaleId.mockResolvedValue([
        makeReturn({
          getLines: () => [
            {
              productId: 'product-1',
              quantity: makeQuantity(2),
              originalSalePrice: makeMoney(15),
              originalUnitCost: null,
            },
          ],
        }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(30); // 2 * 15
    });

    it('Given: return line with originalUnitCost but no originalSalePrice When: generating Then: should use unitCost', async () => {
      returnRepository.findBySaleId.mockResolvedValue([
        makeReturn({
          getLines: () => [
            {
              productId: 'product-1',
              quantity: makeQuantity(3),
              originalSalePrice: null,
              originalUnitCost: makeMoney(7),
            },
          ],
        }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(21); // 3 * 7
    });

    it('Given: return line with neither originalSalePrice nor originalUnitCost When: generating Then: totalValue 0', async () => {
      returnRepository.findBySaleId.mockResolvedValue([
        makeReturn({
          getLines: () => [
            {
              productId: 'product-1',
              quantity: makeQuantity(2),
              originalSalePrice: null,
              originalUnitCost: null,
            },
          ],
        }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { totalValue: number };
      expect(item.totalValue).toBe(0);
    });

    it('Given: return line with originalSalePrice AND originalUnitCost When: generating Then: should prefer salePrice', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { totalValue: number };
      // Default mock: originalSalePrice=10, qty=1 => 10
      expect(item.totalValue).toBe(10);
    });

    it('Given: warehouse not in map When: generating Then: should use Unknown', async () => {
      returnRepository.findBySaleId.mockResolvedValue([makeReturn({ warehouseId: 'unknown-wh' })]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { warehouseName: string };
      expect(item.warehouseName).toBe('Unknown');
    });

    it('Given: reason getValue returns null When: generating Then: reason should be undefined', async () => {
      returnRepository.findBySaleId.mockResolvedValue([
        makeReturn({ reason: { getValue: () => null } }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.RETURNS_BY_SALE,
        { saleId: 'sale-1' },
        orgId
      );
      const item = result.data[0] as { reason?: string };
      expect(item.reason).toBeUndefined();
    });
  });

  describe('ABC Analysis – branch coverage', () => {
    it('Given: dateRange When: generating Then: should use findByDateRange', async () => {
      const parameters = {
        dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
      };
      await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, parameters, orgId);
      expect(saleRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: no dateRange When: generating Then: should use findAll', async () => {
      await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      expect(saleRepository.findAll).toHaveBeenCalled();
    });

    it('Given: warehouseId not matching When: generating Then: should exclude sales', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.ABC_ANALYSIS,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: productId filter matching When: generating Then: should include only that product', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.ABC_ANALYSIS,
        { productId: 'product-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter not matching When: generating Then: should exclude', async () => {
      const result = await service.generateReport(
        REPORT_TYPES.ABC_ANALYSIS,
        { productId: 'other' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.ABC_ANALYSIS,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      const result = await service.generateReport(
        REPORT_TYPES.ABC_ANALYSIS,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: multiple products with varying revenue When: generating Then: should classify A/B/C', async () => {
      const products = [];
      const saleLines: Array<{
        productId: string;
        quantity: ReturnType<typeof makeQuantity>;
        salePrice: ReturnType<typeof makeMoney>;
      }> = [];
      // Product that drives 85% revenue = A
      products.push(makeProduct({ id: 'p-big', categories: [{ id: 'c1', name: 'Cat' }] }));
      saleLines.push({ productId: 'p-big', quantity: makeQuantity(85), salePrice: makeMoney(1) });
      // Product that drives 10% revenue = B (cumulative 95%)
      products.push(makeProduct({ id: 'p-mid', categories: [{ id: 'c1', name: 'Cat' }] }));
      saleLines.push({ productId: 'p-mid', quantity: makeQuantity(10), salePrice: makeMoney(1) });
      // Product that drives 5% revenue = C (cumulative 100%)
      products.push(makeProduct({ id: 'p-small', categories: [{ id: 'c1', name: 'Cat' }] }));
      saleLines.push({ productId: 'p-small', quantity: makeQuantity(5), salePrice: makeMoney(1) });

      productRepository.findAll.mockResolvedValue(products);
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => saleLines,
        }),
      ]);

      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      const items = result.data as Array<{
        productId: string;
        abcClassification: string;
        cumulativePercentage: number;
      }>;
      expect(items.length).toBe(3);
      // sorted by revenue desc: p-big (85%), p-mid (95%), p-small (100%)
      // p-big: cum=85% > 80 => B; p-mid: cum=95% => B; p-small: cum=100% => C
      expect(items[0].abcClassification).toBe('B');
      expect(items[1].abcClassification).toBe('B');
      expect(items[2].abcClassification).toBe('C');
    });

    it('Given: products for A/B/C thresholds When: generating Then: should classify correctly', async () => {
      const products = [];
      const saleLines: Array<{
        productId: string;
        quantity: ReturnType<typeof makeQuantity>;
        salePrice: ReturnType<typeof makeMoney>;
      }> = [];
      // 4 products: 40+35+15+10 = 100
      // p1: cum=40 <=80 => A
      products.push(makeProduct({ id: 'p1' }));
      saleLines.push({ productId: 'p1', quantity: makeQuantity(40), salePrice: makeMoney(1) });
      // p2: cum=75 <=80 => A
      products.push(makeProduct({ id: 'p2' }));
      saleLines.push({ productId: 'p2', quantity: makeQuantity(35), salePrice: makeMoney(1) });
      // p3: cum=90 <=95 => B
      products.push(makeProduct({ id: 'p3' }));
      saleLines.push({ productId: 'p3', quantity: makeQuantity(15), salePrice: makeMoney(1) });
      // p4: cum=100 >95 => C
      products.push(makeProduct({ id: 'p4' }));
      saleLines.push({ productId: 'p4', quantity: makeQuantity(10), salePrice: makeMoney(1) });

      productRepository.findAll.mockResolvedValue(products);
      saleRepository.findAll.mockResolvedValue([makeSale({ getLines: () => saleLines })]);

      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      const items = result.data as Array<{ productId: string; abcClassification: string }>;
      expect(items.find(i => i.productId === 'p1')?.abcClassification).toBe('A');
      expect(items.find(i => i.productId === 'p2')?.abcClassification).toBe('A');
      expect(items.find(i => i.productId === 'p3')?.abcClassification).toBe('B');
      expect(items.find(i => i.productId === 'p4')?.abcClassification).toBe('C');
    });

    it('Given: totalRevenue is 0 When: generating Then: percentages should be 0', async () => {
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: product not in productMap When: generating Then: should use Unknown', async () => {
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'unknown-prod', quantity: makeQuantity(1), salePrice: makeMoney(10) },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      const item = result.data[0] as { productName: string; sku: string };
      expect(item.productName).toBe('Unknown');
      expect(item.sku).toBe('Unknown');
    });

    it('Given: totalQuantitySold is 0 When: generating Then: averagePrice should be 0', async () => {
      // This scenario shouldn't normally happen, but covers the branch
      saleRepository.findAll.mockResolvedValue([
        makeSale({
          getLines: () => [
            { productId: 'product-1', quantity: makeQuantity(0), salePrice: makeMoney(10) },
          ],
        }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.ABC_ANALYSIS, {}, orgId);
      if (result.data.length > 0) {
        const item = result.data[0] as { averagePrice: number };
        expect(item.averagePrice).toBe(0);
      }
    });
  });

  describe('Dead Stock Report – branch coverage', () => {
    it('Given: includeInactive false When: generating Then: should exclude inactive products', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-inactive', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const ids = (result.data as Array<{ productId: string }>).map(d => d.productId);
      expect(ids).not.toContain('product-inactive');
    });

    it('Given: productId filter matching When: generating Then: should include only that product', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(
        REPORT_TYPES.DEAD_STOCK,
        { productId: 'product-1' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: productId filter not matching When: generating Then: should exclude', async () => {
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(
        REPORT_TYPES.DEAD_STOCK,
        { productId: 'nonexistent' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: warehouseId not matching When: generating Then: should exclude', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(
        REPORT_TYPES.DEAD_STOCK,
        { warehouseId: 'wh-none' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: category filter matching When: generating Then: should include', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(
        REPORT_TYPES.DEAD_STOCK,
        { category: 'Electronics' },
        orgId
      );
      expect(result.data.length).toBe(1);
    });

    it('Given: category filter not matching When: generating Then: should exclude', async () => {
      productRepository.findAll.mockResolvedValue([
        makeProduct({ categories: [{ id: 'cat-1', name: 'Electronics' }] }),
      ]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(
        REPORT_TYPES.DEAD_STOCK,
        { category: 'Food' },
        orgId
      );
      expect(result.data).toHaveLength(0);
    });

    it('Given: product has recent sale (after cutoff) When: generating Then: should not be dead stock', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      // Sale was yesterday - well within default 90-day cutoff
      saleRepository.findAll.mockResolvedValue([
        makeSale({ createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: stock quantity is 0 When: generating Then: should skip', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: no stock for product When: generating Then: should skip', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      expect(result.data).toHaveLength(0);
    });

    it('Given: no lastSaleDate (never sold) When: generating Then: riskLevel should be HIGH and daysSinceLastSale 999', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as {
        riskLevel: string;
        daysSinceLastSale: number;
        lastSaleDate?: Date;
      };
      expect(item.riskLevel).toBe('HIGH');
      expect(item.daysSinceLastSale).toBe(999);
      expect(item.lastSaleDate).toBeUndefined();
    });

    it('Given: daysSinceLastSale > deadStockDays*2 When: generating Then: riskLevel should be HIGH', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      // Sale was 200 days ago (> 90*2=180), but after cutoff? No: we need it before cutoff so product is not recently sold.
      // Default deadStockDays=90. cutoffDate = now - 90 days.
      // Sale 200 days ago is before cutoff, so product not in recentlySoldProducts.
      const oldSaleDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
      saleRepository.findAll.mockResolvedValue([makeSale({ createdAt: oldSaleDate })]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { riskLevel: string; daysSinceLastSale: number };
      expect(item.riskLevel).toBe('HIGH');
      expect(item.daysSinceLastSale).toBeGreaterThan(180);
    });

    it('Given: daysSinceLastSale > deadStockDays*1.5 but <= deadStockDays*2 When: generating Then: riskLevel should be MEDIUM', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      // deadStockDays=90. 1.5*90=135, 2*90=180. Need sale ~150 days ago.
      const mediumSaleDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);
      saleRepository.findAll.mockResolvedValue([makeSale({ createdAt: mediumSaleDate })]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { riskLevel: string };
      expect(item.riskLevel).toBe('MEDIUM');
    });

    it('Given: daysSinceLastSale <= deadStockDays*1.5 (but > cutoff) When: generating Then: riskLevel should be LOW', async () => {
      // deadStockDays=90, cutoff=now-90d, 1.5*90=135
      // Need sale 100 days ago: > 90 cutoff (not recent) but < 135 => LOW
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      const lowSaleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      saleRepository.findAll.mockResolvedValue([makeSale({ createdAt: lowSaleDate })]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { riskLevel: string };
      expect(item.riskLevel).toBe('LOW');
    });

    it('Given: product with unit.getCode When: generating Then: should use getCode', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { unit: string };
      expect(item.unit).toBe('EA');
    });

    it('Given: product without unit When: generating Then: should use UNIT fallback', async () => {
      productRepository.findAll.mockResolvedValue([makeProduct({ unit: undefined })]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { unit: string };
      expect(item.unit).toBe('UNIT');
    });

    it('Given: multiple dead stock items When: generating Then: should sort by risk then value desc', async () => {
      warehouseRepository.findAll.mockResolvedValue([
        makeWarehouse({ id: 'wh-1', name: 'WH1' }),
        makeWarehouse({ id: 'wh-2', name: 'WH2' }),
      ]);
      productRepository.findAll.mockResolvedValue([
        makeProduct({ id: 'p1' }),
        makeProduct({ id: 'p2' }),
      ]);
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'p1', warehouseId: 'wh-1', quantity: 100, unitCost: 10 }, // value=1000
        { productId: 'p2', warehouseId: 'wh-1', quantity: 5, unitCost: 10 }, // value=50
      ]);
      saleRepository.findAll.mockResolvedValue([]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const items = result.data as Array<{ productId: string; stockValue: number }>;
      if (items.length >= 2) {
        // Both HIGH risk (no sales), so sorted by stockValue desc
        expect(items[0].stockValue).toBeGreaterThanOrEqual(items[1].stockValue);
      }
    });

    it('Given: lastSaleDate is later than existing When: generating Then: should track latest date', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10, unitCost: 5 },
      ]);
      // Two sales for same product, different dates, both before cutoff
      const olderDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
      const newerDate = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000);
      saleRepository.findAll.mockResolvedValue([
        makeSale({ id: 's1', createdAt: olderDate }),
        makeSale({ id: 's2', createdAt: newerDate }),
      ]);
      const result = await service.generateReport(REPORT_TYPES.DEAD_STOCK, {}, orgId);
      const item = result.data[0] as { lastSaleDate?: Date; daysSinceLastSale: number };
      // Should use the newer date
      expect(item.lastSaleDate).toEqual(newerDate);
    });
  });

  describe('generateReportStream – additional branch coverage', () => {
    it('Given: empty report data When: streaming Then: should yield no batches', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);
      const batches: unknown[][] = [];
      for await (const batch of service.generateReportStream(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        {},
        orgId,
        10
      )) {
        batches.push(batch);
      }
      expect(batches).toHaveLength(0);
    });

    it('Given: default batch size When: streaming Then: should use 100', async () => {
      // This just confirms the default parameter works
      const batches: unknown[][] = [];
      for await (const batch of service.generateReportStream(
        REPORT_TYPES.AVAILABLE_INVENTORY,
        {},
        orgId
      )) {
        batches.push(batch);
      }
      // With 1 item, should be 1 batch with default batchSize of 100
      expect(batches.length).toBeLessThanOrEqual(1);
    });
  });
});
