import {
  ReportGenerationService,
  type IAvailableInventoryItem,
} from '@report/domain/services/reportGeneration.service';
import { REPORT_TYPES } from '@report/domain/valueObjects';

import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';
import type { IReturnRepository } from '@returns/domain/ports/repositories';
import type { ISaleRepository } from '@sale/domain/ports/repositories';
import type { IStockRepository } from '@stock/domain/ports/repositories';
import type { IWarehouseRepository } from '@warehouse/domain/ports/repositories';

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
  unit: { getValue: () => ({ code: 'EA' }) },
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
  const stockRepository = {
    getStockWithCost: jest.fn() as MockFn<unknown>,
    getStockQuantity: jest.fn() as MockFn<unknown>,
  } satisfies Pick<IStockRepository, 'getStockWithCost' | 'getStockQuantity'>;
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
    stockRepository as unknown as IStockRepository,
    saleRepository as unknown as ISaleRepository,
    returnRepository as unknown as IReturnRepository
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

    stockRepository.getStockWithCost.mockResolvedValue({
      quantity: makeQuantity(5),
      averageCost: makeMoney(10),
    });
    stockRepository.getStockQuantity.mockResolvedValue(makeQuantity(0));

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
});
