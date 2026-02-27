import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@infrastructure/database/generated/prisma';

import { IReportParametersInput, REPORT_TYPES, ReportTypeValue } from '../valueObjects';

import { PrismaService } from '@infrastructure/database/prisma.service';
import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';
import type { IReturnRepository } from '@returns/domain/ports/repositories';
import type { ISaleRepository } from '@sale/domain/ports/repositories';
import type { IWarehouseRepository } from '@warehouse/domain/ports/repositories';

// Report data interfaces
export interface IAvailableInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  locationId?: string;
  locationName?: string;
  quantity: number;
  unit: string;
  averageCost: number;
  totalValue: number;
  currency: string;
}

export interface IMovementHistoryItem {
  movementId: string;
  type: string;
  status: string;
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  currency: string;
  reference?: string;
  reason?: string;
  createdAt: Date;
  createdBy: string;
}

export interface IValuationItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  averageCost: number;
  totalValue: number;
  currency: string;
}

export interface ILowStockItem {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  deficit: number;
  severity: 'CRITICAL' | 'WARNING';
  unit: string;
}

export interface IMovementsSummaryItem {
  type: string;
  warehouseId: string;
  warehouseName: string;
  totalMovements: number;
  totalQuantity: number;
  totalValue: number;
  currency: string;
  period: string;
}

export interface IFinancialReportItem {
  warehouseId: string;
  warehouseName: string;
  category?: string;
  totalInventoryValue: number;
  totalCost: number;
  totalRevenue: number;
  grossMargin: number;
  grossMarginPercentage: number;
  currency: string;
  period: string;
}

export interface ITurnoverItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  warehouseId?: string;
  warehouseName?: string;
  cogs: number;
  averageInventory: number;
  turnoverRate: number;
  daysOfInventory: number;
  classification: 'SLOW_MOVING' | 'NORMAL' | 'FAST_MOVING';
  period: string;
  currency: string;
}

export interface ISalesReportItem {
  saleId: string;
  saleNumber: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  customerReference?: string;
  totalAmount: number;
  totalItems: number;
  currency: string;
  saleDate: Date;
  createdBy: string;
}

export interface ISalesByProductItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  averageCost: number;
  margin: number;
  marginPercentage: number;
  salesCount: number;
  currency: string;
  period: string;
}

export interface ISalesByWarehouseItem {
  warehouseId: string;
  warehouseName: string;
  totalSales: number;
  totalRevenue: number;
  averagePerSale: number;
  totalItems: number;
  currency: string;
  period: string;
}

export interface IReturnsReportItem {
  returnId: string;
  returnNumber: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  status: string;
  warehouseId: string;
  warehouseName: string;
  saleId?: string;
  sourceMovementId?: string;
  totalItems: number;
  totalValue: number;
  reason?: string;
  currency: string;
  returnDate: Date;
  createdBy: string;
}

export interface IReturnsByTypeItem {
  type: 'CUSTOMER' | 'SUPPLIER';
  totalReturns: number;
  totalQuantity: number;
  totalValue: number;
  returnRate: number;
  topReasons: Array<{ reason: string; count: number }>;
  currency: string;
  period: string;
}

export interface IReturnsByProductItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  totalQuantityReturned: number;
  totalValueReturned: number;
  returnRate: number;
  returnsCount: number;
  topReasons: Array<{ reason: string; count: number }>;
  currency: string;
  period: string;
}

export interface IAbcAnalysisItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  totalRevenue: number;
  totalQuantitySold: number;
  revenuePercentage: number;
  cumulativePercentage: number;
  abcClassification: 'A' | 'B' | 'C';
  salesCount: number;
  averagePrice: number;
  currency: string;
  period: string;
}

export interface IDeadStockItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  stockValue: number;
  daysSinceLastSale: number;
  lastSaleDate?: Date;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  unit: string;
  currency: string;
}

export interface IReportGenerationResult<T> {
  data: T[];
  metadata: {
    reportType: ReportTypeValue;
    generatedAt: Date;
    parameters: IReportParametersInput;
    totalRecords: number;
    orgId: string;
  };
}

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('MovementRepository')
    private readonly movementRepository: IMovementRepository,
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Batch load all stock rows for an org in a single query.
   * Returns a Map keyed by "productId-warehouseId" with quantity and unitCost.
   * Replaces N+1 getStockWithCost() calls (P×W queries → 1 query).
   */
  private async batchLoadStock(
    orgId: string,
    warehouseId?: string,
    productId?: string
  ): Promise<Map<string, { quantity: number; unitCost: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ productId: string; warehouseId: string; quantity: number; unitCost: number }>
    >`
      SELECT "productId", "warehouseId",
             COALESCE("quantity", 0)::float AS "quantity",
             COALESCE("unitCost", 0)::float AS "unitCost"
      FROM "stock"
      WHERE "orgId" = ${orgId}
        ${warehouseId ? Prisma.sql`AND "warehouseId" = ${warehouseId}` : Prisma.empty}
        ${productId ? Prisma.sql`AND "productId" = ${productId}` : Prisma.empty}
    `;

    const map = new Map<string, { quantity: number; unitCost: number }>();
    for (const row of rows) {
      map.set(`${row.productId}-${row.warehouseId}`, {
        quantity: row.quantity,
        unitCost: row.unitCost,
      });
    }
    return map;
  }

  /**
   * Generate a report based on type and parameters
   */
  public async generateReport(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<unknown>> {
    this.logger.log('Generating report', { type, orgId });

    switch (type) {
      case REPORT_TYPES.AVAILABLE_INVENTORY:
        return this.generateInventoryAvailableReport(parameters, orgId);
      case REPORT_TYPES.MOVEMENT_HISTORY:
        return this.generateMovementHistoryReport(parameters, orgId);
      case REPORT_TYPES.VALUATION:
        return this.generateValuationReport(parameters, orgId);
      case REPORT_TYPES.LOW_STOCK:
        return this.generateLowStockReport(parameters, orgId);
      case REPORT_TYPES.MOVEMENTS:
        return this.generateMovementsReport(parameters, orgId);
      case REPORT_TYPES.FINANCIAL:
        return this.generateFinancialReport(parameters, orgId);
      case REPORT_TYPES.TURNOVER:
        return this.generateTurnoverReport(parameters, orgId);
      case REPORT_TYPES.SALES:
        return this.generateSalesReport(parameters, orgId);
      case REPORT_TYPES.SALES_BY_PRODUCT:
        return this.generateSalesByProductReport(parameters, orgId);
      case REPORT_TYPES.SALES_BY_WAREHOUSE:
        return this.generateSalesByWarehouseReport(parameters, orgId);
      case REPORT_TYPES.RETURNS:
        return this.generateReturnsReport(parameters, orgId);
      case REPORT_TYPES.RETURNS_BY_TYPE:
        return this.generateReturnsByTypeReport(parameters, orgId);
      case REPORT_TYPES.RETURNS_BY_PRODUCT:
        return this.generateReturnsByProductReport(parameters, orgId);
      case REPORT_TYPES.RETURNS_BY_SALE:
        return this.generateReturnsBySaleReport(parameters, orgId);
      case REPORT_TYPES.RETURNS_CUSTOMER:
        return this.generateCustomerReturnsReport(parameters, orgId);
      case REPORT_TYPES.RETURNS_SUPPLIER:
        return this.generateSupplierReturnsReport(parameters, orgId);
      case REPORT_TYPES.ABC_ANALYSIS:
        return this.generateAbcAnalysisReport(parameters, orgId);
      case REPORT_TYPES.DEAD_STOCK:
        return this.generateDeadStockReport(parameters, orgId);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Generate report stream for large datasets
   * Yields data in batches to avoid memory issues
   */
  public async *generateReportStream(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string,
    batchSize: number = 100
  ): AsyncGenerator<unknown[], void, unknown> {
    this.logger.log('Generating report stream', { type, orgId, batchSize });

    // Generate the full report
    const result = await this.generateReport(type, parameters, orgId);
    const data = result.data as unknown[];

    // Yield data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      yield batch;
    }
  }

  /**
   * 1. Available Inventory Report
   * Current stock by product, warehouse, and location
   */
  public async generateInventoryAvailableReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IAvailableInventoryItem>> {
    this.logger.log('Generating available inventory report', { orgId });

    const [products, warehouses, stockMap] = await Promise.all([
      this.productRepository.findAll(orgId),
      this.warehouseRepository.findAll(orgId),
      this.batchLoadStock(orgId, parameters.warehouseId, parameters.productId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IAvailableInventoryItem[] = [];

    for (const product of products) {
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }
      if (!parameters.includeInactive && product.status.getValue() !== 'ACTIVE') {
        continue;
      }

      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        if (stock && stock.quantity > 0) {
          data.push({
            productId: product.id,
            productName: product.name.getValue(),
            sku: product.sku.getValue(),
            warehouseId: warehouse.id,
            warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
            locationId: parameters.locationId,
            quantity: stock.quantity,
            unit: product.unit.getValue().code,
            averageCost: stock.unitCost,
            totalValue: stock.quantity * stock.unitCost,
            currency: 'COP',
          });
        }
      }
    }

    return this.createResult(data, REPORT_TYPES.AVAILABLE_INVENTORY, parameters, orgId);
  }

  /**
   * 2. Movement History Report
   * Entry/exit/adjustment records with filters
   */
  public async generateMovementHistoryReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IMovementHistoryItem>> {
    this.logger.log('Generating movement history report', { orgId });

    const movementsPromise = parameters.dateRange
      ? this.movementRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.movementRepository.findAll(orgId);

    const [movements, warehouses, products] = await Promise.all([
      movementsPromise,
      this.warehouseRepository.findAll(orgId),
      this.productRepository.findAll(orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));
    const productMap = new Map(
      products.map(p => [p.id, { name: p.name.getValue(), sku: p.sku.getValue() }])
    );

    const data: IMovementHistoryItem[] = [];

    for (const movement of movements) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && movement.warehouseId !== parameters.warehouseId) {
        continue;
      }

      // Filter by movement type if specified
      if (parameters.movementType && movement.type.getValue() !== parameters.movementType) {
        continue;
      }

      for (const line of movement.getLines()) {
        // Filter by product if specified
        if (parameters.productId && line.productId !== parameters.productId) {
          continue;
        }

        const productInfo = productMap.get(line.productId);

        data.push({
          movementId: movement.id,
          type: movement.type.getValue(),
          status: movement.status.getValue(),
          warehouseId: movement.warehouseId,
          warehouseName: warehouseMap.get(movement.warehouseId) || 'Unknown',
          productId: line.productId,
          productName: productInfo?.name || 'Unknown',
          sku: productInfo?.sku || 'Unknown',
          quantity: line.quantity.getNumericValue(),
          unitCost: line.unitCost?.getAmount(),
          totalCost: line.unitCost
            ? line.quantity.getNumericValue() * line.unitCost.getAmount()
            : undefined,
          currency: line.currency,
          reference: movement.reference,
          reason: movement.reason,
          createdAt: movement.createdAt,
          createdBy: movement.createdBy,
        });
      }
    }

    return this.createResult(data, REPORT_TYPES.MOVEMENT_HISTORY, parameters, orgId);
  }

  /**
   * 3. Valuation Report
   * Inventory value by product, warehouse, category (using PPM)
   */
  public async generateValuationReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IValuationItem>> {
    this.logger.log('Generating valuation report', { orgId });

    const [products, warehouses, stockMap] = await Promise.all([
      this.productRepository.findAll(orgId),
      this.warehouseRepository.findAll(orgId),
      this.batchLoadStock(orgId, parameters.warehouseId, parameters.productId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IValuationItem[] = [];

    for (const product of products) {
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }
      if (parameters.category) {
        continue;
      }

      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        if (stock && stock.quantity > 0) {
          const totalValue = stock.quantity * stock.unitCost;

          data.push({
            productId: product.id,
            productName: product.name.getValue(),
            sku: product.sku.getValue(),
            category: parameters.category,
            warehouseId: warehouse.id,
            warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
            quantity: stock.quantity,
            averageCost: stock.unitCost,
            totalValue,
            currency: 'COP',
          });
        }
      }
    }

    return this.createResult(data, REPORT_TYPES.VALUATION, parameters, orgId);
  }

  /**
   * 4. Low Stock Report
   * Products below minimum with alerts
   */
  public async generateLowStockReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<ILowStockItem>> {
    this.logger.log('Generating low stock report', { orgId });

    const [products, warehouses, stockMap] = await Promise.all([
      this.productRepository.findLowStock(orgId),
      this.warehouseRepository.findAll(orgId),
      this.batchLoadStock(orgId, parameters.warehouseId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: ILowStockItem[] = [];

    for (const product of products) {
      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        const currentStock = stock?.quantity ?? 0;

        const minimumStock = 10;
        const reorderPoint = 15;

        if (currentStock < minimumStock) {
          const deficit = minimumStock - currentStock;
          const severity = currentStock === 0 ? 'CRITICAL' : 'WARNING';

          if (parameters.severity && severity !== parameters.severity) {
            continue;
          }

          data.push({
            productId: product.id,
            productName: product.name.getValue(),
            sku: product.sku.getValue(),
            warehouseId: warehouse.id,
            warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
            currentStock,
            minimumStock,
            reorderPoint,
            deficit,
            severity,
            unit: product.unit.getValue().code,
          });
        }
      }
    }

    return this.createResult(data, REPORT_TYPES.LOW_STOCK, parameters, orgId);
  }

  /**
   * 5. Movements Report
   * Summary by type, warehouse, period
   */
  public async generateMovementsReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IMovementsSummaryItem>> {
    this.logger.log('Generating movements summary report', { orgId });

    const movementsPromise = parameters.dateRange
      ? this.movementRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.movementRepository.findPostedMovements(orgId);

    const [movements, warehouses] = await Promise.all([
      movementsPromise,
      this.warehouseRepository.findAll(orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    // Group by type and warehouse
    const summaryMap = new Map<
      string,
      {
        type: string;
        warehouseId: string;
        totalMovements: number;
        totalQuantity: number;
        totalValue: number;
      }
    >();

    for (const movement of movements) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && movement.warehouseId !== parameters.warehouseId) {
        continue;
      }

      // Filter by movement type if specified
      if (parameters.movementType && movement.type.getValue() !== parameters.movementType) {
        continue;
      }

      const key = `${movement.type.getValue()}-${movement.warehouseId}`;
      const existing = summaryMap.get(key) || {
        type: movement.type.getValue(),
        warehouseId: movement.warehouseId,
        totalMovements: 0,
        totalQuantity: 0,
        totalValue: 0,
      };

      existing.totalMovements += 1;
      for (const line of movement.getLines()) {
        existing.totalQuantity += line.quantity.getNumericValue();
        if (line.unitCost) {
          existing.totalValue += line.quantity.getNumericValue() * line.unitCost.getAmount();
        }
      }

      summaryMap.set(key, existing);
    }

    const period = this.getPeriodString(parameters.dateRange);
    const data: IMovementsSummaryItem[] = Array.from(summaryMap.values()).map(summary => ({
      ...summary,
      warehouseName: warehouseMap.get(summary.warehouseId) || 'Unknown',
      currency: 'COP',
      period,
    }));

    return this.createResult(data, REPORT_TYPES.MOVEMENTS, parameters, orgId);
  }

  /**
   * 6. Financial Report
   * Total valuation, costs, margins by period
   */
  public async generateFinancialReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IFinancialReportItem>> {
    this.logger.log('Generating financial report', { orgId });

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [warehouses, products, sales, stockMap] = await Promise.all([
      this.warehouseRepository.findAll(orgId),
      this.productRepository.findAll(orgId),
      salesPromise,
      this.batchLoadStock(orgId, parameters.warehouseId),
    ]);

    const data: IFinancialReportItem[] = [];
    const period = this.getPeriodString(parameters.dateRange);

    for (const warehouse of warehouses) {
      if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
        continue;
      }

      let totalInventoryValue = 0;
      const totalCost = 0;
      let totalRevenue = 0;

      // Calculate inventory value from batch-loaded stock map
      for (const product of products) {
        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        if (stock) {
          totalInventoryValue += stock.quantity * stock.unitCost;
        }
      }

      // Calculate revenue from sales
      const warehouseSales = sales.filter(s => s.warehouseId === warehouse.id);
      for (const sale of warehouseSales) {
        if (sale.status.getValue() === 'CONFIRMED') {
          for (const line of sale.getLines()) {
            totalRevenue += line.quantity.getNumericValue() * line.salePrice.getAmount();
          }
        }
      }

      const grossMargin = totalRevenue - totalCost;
      const grossMarginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

      data.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        category: parameters.category,
        totalInventoryValue,
        totalCost,
        totalRevenue,
        grossMargin,
        grossMarginPercentage,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.FINANCIAL, parameters, orgId);
  }

  /**
   * 7. Turnover Report
   * Rotation analysis (COGS / Average Inventory)
   */
  public async generateTurnoverReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<ITurnoverItem>> {
    this.logger.log('Generating turnover report', { orgId });

    const [products, warehouses, stockMap] = await Promise.all([
      this.productRepository.findAll(orgId),
      this.warehouseRepository.findAll(orgId),
      this.batchLoadStock(orgId, parameters.warehouseId, parameters.productId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: ITurnoverItem[] = [];
    const period = this.getPeriodString(parameters.dateRange);
    const daysInPeriod = this.getDaysInPeriod(parameters.dateRange);

    for (const product of products) {
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }

      const cogs = 0;

      let totalInventory = 0;
      let warehouseCount = 0;
      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        if (stock) {
          totalInventory += stock.quantity * stock.unitCost;
          warehouseCount++;
        }
      }

      const averageInventory = warehouseCount > 0 ? totalInventory / warehouseCount : 0;
      const turnoverRate = averageInventory > 0 ? cogs / averageInventory : 0;
      const daysOfInventory = turnoverRate > 0 ? daysInPeriod / turnoverRate : daysInPeriod;

      let classification: 'SLOW_MOVING' | 'NORMAL' | 'FAST_MOVING';
      if (turnoverRate < 1) {
        classification = 'SLOW_MOVING';
      } else if (turnoverRate < 4) {
        classification = 'NORMAL';
      } else {
        classification = 'FAST_MOVING';
      }

      if (averageInventory > 0 || cogs > 0) {
        data.push({
          productId: product.id,
          productName: product.name.getValue(),
          sku: product.sku.getValue(),
          category: parameters.category,
          warehouseId: parameters.warehouseId,
          warehouseName: parameters.warehouseId
            ? warehouseMap.get(parameters.warehouseId)
            : undefined,
          cogs,
          averageInventory,
          turnoverRate,
          daysOfInventory,
          classification,
          period,
          currency: 'COP',
        });
      }
    }

    return this.createResult(data, REPORT_TYPES.TURNOVER, parameters, orgId);
  }

  /**
   * 8. Sales Report
   * Summary by period, warehouse, product
   */
  public async generateSalesReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<ISalesReportItem>> {
    this.logger.log('Generating sales report', { orgId });

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [sales, warehouses] = await Promise.all([
      salesPromise,
      this.warehouseRepository.findAll(orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: ISalesReportItem[] = [];

    for (const sale of sales) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && sale.warehouseId !== parameters.warehouseId) {
        continue;
      }

      // Filter by status if specified
      if (parameters.status && sale.status.getValue() !== parameters.status) {
        continue;
      }

      // Filter by customer reference if specified
      if (parameters.customerReference && sale.customerReference !== parameters.customerReference) {
        continue;
      }

      let totalAmount = 0;
      let totalItems = 0;
      for (const line of sale.getLines()) {
        totalAmount += line.quantity.getNumericValue() * line.salePrice.getAmount();
        totalItems += line.quantity.getNumericValue();
      }

      data.push({
        saleId: sale.id,
        saleNumber: sale.saleNumber.getValue(),
        warehouseId: sale.warehouseId,
        warehouseName: warehouseMap.get(sale.warehouseId) || 'Unknown',
        status: sale.status.getValue(),
        customerReference: sale.customerReference,
        totalAmount,
        totalItems,
        currency: 'COP',
        saleDate: sale.createdAt,
        createdBy: sale.createdBy,
      });
    }

    return this.createResult(data, REPORT_TYPES.SALES, parameters, orgId);
  }

  /**
   * 9. Sales by Product Report
   * Analysis broken down by product
   */
  public async generateSalesByProductReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<ISalesByProductItem>> {
    this.logger.log('Generating sales by product report', { orgId });

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [sales, products] = await Promise.all([
      salesPromise,
      this.productRepository.findAll(orgId),
    ]);
    const productMap = new Map(
      products.map(p => [p.id, { name: p.name.getValue(), sku: p.sku.getValue() }])
    );

    const productSalesMap = new Map<
      string,
      {
        totalQuantitySold: number;
        totalRevenue: number;
        totalCost: number;
        salesCount: number;
      }
    >();

    const confirmedSales = sales.filter(s => s.status.getValue() === 'CONFIRMED');

    for (const sale of confirmedSales) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && sale.warehouseId !== parameters.warehouseId) {
        continue;
      }

      for (const line of sale.getLines()) {
        // Filter by product if specified
        if (parameters.productId && line.productId !== parameters.productId) {
          continue;
        }

        const existing = productSalesMap.get(line.productId) || {
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalCost: 0,
          salesCount: 0,
        };

        existing.totalQuantitySold += line.quantity.getNumericValue();
        existing.totalRevenue += line.quantity.getNumericValue() * line.salePrice.getAmount();
        // Note: SaleLine does not have unitCost, cost calculation would require
        // fetching product cost separately if needed
        existing.salesCount += 1;

        productSalesMap.set(line.productId, existing);
      }
    }

    const period = this.getPeriodString(parameters.dateRange);
    const data: ISalesByProductItem[] = [];

    for (const [productId, stats] of productSalesMap) {
      const productInfo = productMap.get(productId);
      const averagePrice = stats.salesCount > 0 ? stats.totalRevenue / stats.totalQuantitySold : 0;
      const averageCost = stats.salesCount > 0 ? stats.totalCost / stats.totalQuantitySold : 0;
      const margin = stats.totalRevenue - stats.totalCost;
      const marginPercentage = stats.totalRevenue > 0 ? (margin / stats.totalRevenue) * 100 : 0;

      data.push({
        productId,
        productName: productInfo?.name || 'Unknown',
        sku: productInfo?.sku || 'Unknown',
        category: parameters.category,
        totalQuantitySold: stats.totalQuantitySold,
        totalRevenue: stats.totalRevenue,
        averagePrice,
        averageCost,
        margin,
        marginPercentage,
        salesCount: stats.salesCount,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.SALES_BY_PRODUCT, parameters, orgId);
  }

  /**
   * 10. Sales by Warehouse Report
   * Analysis by warehouse
   */
  public async generateSalesByWarehouseReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<ISalesByWarehouseItem>> {
    this.logger.log('Generating sales by warehouse report', { orgId });

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [sales, warehouses] = await Promise.all([
      salesPromise,
      this.warehouseRepository.findAll(orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const warehouseSalesMap = new Map<
      string,
      { totalSales: number; totalRevenue: number; totalItems: number }
    >();

    const confirmedSales = sales.filter(s => s.status.getValue() === 'CONFIRMED');

    for (const sale of confirmedSales) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && sale.warehouseId !== parameters.warehouseId) {
        continue;
      }

      const existing = warehouseSalesMap.get(sale.warehouseId) || {
        totalSales: 0,
        totalRevenue: 0,
        totalItems: 0,
      };

      existing.totalSales += 1;
      for (const line of sale.getLines()) {
        existing.totalRevenue += line.quantity.getNumericValue() * line.salePrice.getAmount();
        existing.totalItems += line.quantity.getNumericValue();
      }

      warehouseSalesMap.set(sale.warehouseId, existing);
    }

    const period = this.getPeriodString(parameters.dateRange);
    const data: ISalesByWarehouseItem[] = [];

    for (const [warehouseId, stats] of warehouseSalesMap) {
      const averagePerSale = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;

      data.push({
        warehouseId,
        warehouseName: warehouseMap.get(warehouseId) || 'Unknown',
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue,
        averagePerSale,
        totalItems: stats.totalItems,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.SALES_BY_WAREHOUSE, parameters, orgId);
  }

  /**
   * 11. Returns Report
   * Summary by period, type, warehouse
   */
  public async generateReturnsReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsReportItem>> {
    this.logger.log('Generating returns report', { orgId });

    const returnsPromise = parameters.dateRange
      ? this.returnRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.returnRepository.findAll(orgId);

    const [returns, warehouses] = await Promise.all([
      returnsPromise,
      this.warehouseRepository.findAll(orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IReturnsReportItem[] = [];

    for (const returnEntity of returns) {
      // Filter by return type if specified
      // Convert RETURN_CUSTOMER/RETURN_SUPPLIER to CUSTOMER/SUPPLIER for comparison
      if (parameters.returnType) {
        const returnTypeValue = returnEntity.type.getValue();
        const normalizedType = returnTypeValue === 'RETURN_CUSTOMER' ? 'CUSTOMER' : 'SUPPLIER';
        if (normalizedType !== parameters.returnType) {
          continue;
        }
      }

      // Filter by status if specified
      if (parameters.status && returnEntity.status.getValue() !== parameters.status) {
        continue;
      }

      // Filter by warehouse if specified
      if (parameters.warehouseId && returnEntity.warehouseId !== parameters.warehouseId) {
        continue;
      }

      let totalItems = 0;
      let totalValue = 0;
      for (const line of returnEntity.getLines()) {
        totalItems += line.quantity.getNumericValue();
        if (line.originalUnitCost) {
          totalValue += line.quantity.getNumericValue() * line.originalUnitCost.getAmount();
        }
      }

      data.push({
        returnId: returnEntity.id,
        returnNumber: returnEntity.returnNumber.getValue(),
        type: returnEntity.type.getValue() as 'CUSTOMER' | 'SUPPLIER',
        status: returnEntity.status.getValue(),
        warehouseId: returnEntity.warehouseId,
        warehouseName: warehouseMap.get(returnEntity.warehouseId) || 'Unknown',
        saleId: returnEntity.saleId,
        sourceMovementId: returnEntity.sourceMovementId,
        totalItems,
        totalValue,
        reason: returnEntity.reason.getValue() ?? undefined,
        currency: 'COP',
        returnDate: returnEntity.createdAt,
        createdBy: returnEntity.createdBy,
      });
    }

    return this.createResult(data, REPORT_TYPES.RETURNS, parameters, orgId);
  }

  /**
   * 12. Returns by Type Report
   * Separate analysis for customer vs supplier returns
   */
  public async generateReturnsByTypeReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsByTypeItem>> {
    this.logger.log('Generating returns by type report', { orgId });

    const returnsPromise = parameters.dateRange
      ? this.returnRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.returnRepository.findAll(orgId);

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [returns, sales] = await Promise.all([returnsPromise, salesPromise]);

    const typeStatsMap = new Map<
      string,
      {
        totalReturns: number;
        totalQuantity: number;
        totalValue: number;
        reasons: Map<string, number>;
      }
    >();

    for (const returnEntity of returns) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && returnEntity.warehouseId !== parameters.warehouseId) {
        continue;
      }

      // Filter by return type if specified
      // Convert RETURN_CUSTOMER/RETURN_SUPPLIER to CUSTOMER/SUPPLIER for comparison
      if (parameters.returnType) {
        const returnTypeValue = returnEntity.type.getValue();
        const normalizedType = returnTypeValue === 'RETURN_CUSTOMER' ? 'CUSTOMER' : 'SUPPLIER';
        if (normalizedType !== parameters.returnType) {
          continue;
        }
      }

      const type = returnEntity.type.getValue();
      const existing = typeStatsMap.get(type) || {
        totalReturns: 0,
        totalQuantity: 0,
        totalValue: 0,
        reasons: new Map<string, number>(),
      };

      existing.totalReturns += 1;
      for (const line of returnEntity.getLines()) {
        existing.totalQuantity += line.quantity.getNumericValue();
        if (line.originalUnitCost) {
          existing.totalValue +=
            line.quantity.getNumericValue() * line.originalUnitCost.getAmount();
        }
      }

      if (returnEntity.reason) {
        const reasonValue = returnEntity.reason.getValue() ?? 'Unknown';
        existing.reasons.set(reasonValue, (existing.reasons.get(reasonValue) || 0) + 1);
      }

      typeStatsMap.set(type, existing);
    }

    const period = this.getPeriodString(parameters.dateRange);
    const totalSales = sales.length;
    const data: IReturnsByTypeItem[] = [];

    for (const [type, stats] of typeStatsMap) {
      const returnRate = totalSales > 0 ? (stats.totalReturns / totalSales) * 100 : 0;
      const topReasons = Array.from(stats.reasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      data.push({
        type: type as 'CUSTOMER' | 'SUPPLIER',
        totalReturns: stats.totalReturns,
        totalQuantity: stats.totalQuantity,
        totalValue: stats.totalValue,
        returnRate,
        topReasons,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.RETURNS_BY_TYPE, parameters, orgId);
  }

  /**
   * 13. Returns by Product Report
   * Analysis broken down by product
   */
  public async generateReturnsByProductReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsByProductItem>> {
    this.logger.log('Generating returns by product report', { orgId });

    const returnsPromise = parameters.dateRange
      ? this.returnRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.returnRepository.findAll(orgId);

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [returns, products, sales] = await Promise.all([
      returnsPromise,
      this.productRepository.findAll(orgId),
      salesPromise,
    ]);
    const productMap = new Map(
      products.map(p => [p.id, { name: p.name.getValue(), sku: p.sku.getValue() }])
    );

    // Calculate quantity sold per product
    const productSalesMap = new Map<string, number>();
    for (const sale of sales) {
      if (sale.status.getValue() === 'CONFIRMED') {
        for (const line of sale.getLines()) {
          productSalesMap.set(
            line.productId,
            (productSalesMap.get(line.productId) || 0) + line.quantity.getNumericValue()
          );
        }
      }
    }

    const productReturnsMap = new Map<
      string,
      {
        totalQuantityReturned: number;
        totalValueReturned: number;
        returnsCount: number;
        reasons: Map<string, number>;
      }
    >();

    for (const returnEntity of returns) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && returnEntity.warehouseId !== parameters.warehouseId) {
        continue;
      }

      // Filter by return type if specified
      // Convert RETURN_CUSTOMER/RETURN_SUPPLIER to CUSTOMER/SUPPLIER for comparison
      if (parameters.returnType) {
        const returnTypeValue = returnEntity.type.getValue();
        const normalizedType = returnTypeValue === 'RETURN_CUSTOMER' ? 'CUSTOMER' : 'SUPPLIER';
        if (normalizedType !== parameters.returnType) {
          continue;
        }
      }

      for (const line of returnEntity.getLines()) {
        // Filter by product if specified
        if (parameters.productId && line.productId !== parameters.productId) {
          continue;
        }

        const existing = productReturnsMap.get(line.productId) || {
          totalQuantityReturned: 0,
          totalValueReturned: 0,
          returnsCount: 0,
          reasons: new Map<string, number>(),
        };

        existing.totalQuantityReturned += line.quantity.getNumericValue();
        if (line.originalUnitCost) {
          existing.totalValueReturned +=
            line.quantity.getNumericValue() * line.originalUnitCost.getAmount();
        }
        existing.returnsCount += 1;

        if (returnEntity.reason) {
          const reasonValue = returnEntity.reason.getValue() ?? 'Unknown';
          existing.reasons.set(reasonValue, (existing.reasons.get(reasonValue) || 0) + 1);
        }

        productReturnsMap.set(line.productId, existing);
      }
    }

    const period = this.getPeriodString(parameters.dateRange);
    const data: IReturnsByProductItem[] = [];

    for (const [productId, stats] of productReturnsMap) {
      const productInfo = productMap.get(productId);
      const quantitySold = productSalesMap.get(productId) || 0;
      const returnRate = quantitySold > 0 ? (stats.totalQuantityReturned / quantitySold) * 100 : 0;
      const topReasons = Array.from(stats.reasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      data.push({
        productId,
        productName: productInfo?.name || 'Unknown',
        sku: productInfo?.sku || 'Unknown',
        category: parameters.category,
        totalQuantityReturned: stats.totalQuantityReturned,
        totalValueReturned: stats.totalValueReturned,
        returnRate,
        returnsCount: stats.returnsCount,
        topReasons,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.RETURNS_BY_PRODUCT, parameters, orgId);
  }

  /**
   * 14. Returns by Sale Report
   * Returns for a specific sale
   */
  public async generateReturnsBySaleReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsReportItem>> {
    this.logger.log('Generating returns by sale report', { orgId, saleId: parameters.saleId });

    if (!parameters.saleId) {
      throw new Error('Sale ID is required for returns by sale report');
    }

    // Validate sale + fetch returns + warehouses in parallel
    const [sale, returns, warehouses] = await Promise.all([
      this.saleRepository.findById(parameters.saleId, orgId),
      this.returnRepository.findBySaleId(parameters.saleId, orgId),
      this.warehouseRepository.findAll(orgId),
    ]);

    if (!sale) {
      throw new Error(`Sale with ID ${parameters.saleId} not found`);
    }
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IReturnsReportItem[] = [];

    for (const returnEntity of returns) {
      let returnItems = 0;
      let returnValue = 0;

      for (const line of returnEntity.getLines()) {
        returnItems += line.quantity.getNumericValue();
        if (line.originalSalePrice) {
          returnValue += line.quantity.getNumericValue() * line.originalSalePrice.getAmount();
        } else if (line.originalUnitCost) {
          returnValue += line.quantity.getNumericValue() * line.originalUnitCost.getAmount();
        }
      }

      data.push({
        returnId: returnEntity.id,
        returnNumber: returnEntity.returnNumber.getValue(),
        type: returnEntity.type.getValue() as 'CUSTOMER' | 'SUPPLIER',
        status: returnEntity.status.getValue(),
        warehouseId: returnEntity.warehouseId,
        warehouseName: warehouseMap.get(returnEntity.warehouseId) || 'Unknown',
        saleId: returnEntity.saleId,
        sourceMovementId: returnEntity.sourceMovementId,
        totalItems: returnItems,
        totalValue: returnValue,
        reason: returnEntity.reason.getValue() ?? undefined,
        currency: 'COP',
        returnDate: returnEntity.createdAt,
        createdBy: returnEntity.createdBy,
      });
    }

    return this.createResult(data, REPORT_TYPES.RETURNS_BY_SALE, parameters, orgId);
  }

  /**
   * 15. Customer Returns Report
   * Returns filtered by type CUSTOMER
   */
  public async generateCustomerReturnsReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsReportItem>> {
    this.logger.log('Generating customer returns report', { orgId });

    // Use generateReturnsReport with CUSTOMER filter
    const customerParameters: IReportParametersInput = {
      ...parameters,
      returnType: 'CUSTOMER',
    };

    const result = await this.generateReturnsReport(customerParameters, orgId);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        reportType: REPORT_TYPES.RETURNS_CUSTOMER,
      },
    };
  }

  /**
   * 16. Supplier Returns Report
   * Returns filtered by type SUPPLIER
   */
  public async generateSupplierReturnsReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IReturnsReportItem>> {
    this.logger.log('Generating supplier returns report', { orgId });

    // Use generateReturnsReport with SUPPLIER filter
    const supplierParameters: IReportParametersInput = {
      ...parameters,
      returnType: 'SUPPLIER',
    };

    const result = await this.generateReturnsReport(supplierParameters, orgId);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        reportType: REPORT_TYPES.RETURNS_SUPPLIER,
      },
    };
  }

  // Helper methods
  /**
   * 17. ABC Analysis Report
   * Pareto analysis: sorts products by revenue, classifies A (top 80%), B (next 15%), C (remaining 5%)
   */
  public async generateAbcAnalysisReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IAbcAnalysisItem>> {
    this.logger.log('Generating ABC analysis report', { orgId });

    const salesPromise = parameters.dateRange
      ? this.saleRepository.findByDateRange(
          parameters.dateRange.startDate,
          parameters.dateRange.endDate,
          orgId
        )
      : this.saleRepository.findAll(orgId);

    const [sales, products] = await Promise.all([
      salesPromise,
      this.productRepository.findAll(orgId),
    ]);
    const productMap = new Map(
      products.map(p => [p.id, { name: p.name.getValue(), sku: p.sku.getValue() }])
    );
    // O(1) lookup map for full product entities (used for category filtering)
    const productByIdMap = new Map(products.map(p => [p.id, p]));

    // Aggregate revenue per product from confirmed sales
    const productRevenueMap = new Map<
      string,
      { totalRevenue: number; totalQuantitySold: number; salesCount: number }
    >();

    const confirmedSales = sales.filter(s => s.status.getValue() === 'CONFIRMED');

    for (const sale of confirmedSales) {
      if (parameters.warehouseId && sale.warehouseId !== parameters.warehouseId) {
        continue;
      }

      for (const line of sale.getLines()) {
        if (parameters.productId && line.productId !== parameters.productId) {
          continue;
        }

        const existing = productRevenueMap.get(line.productId) || {
          totalRevenue: 0,
          totalQuantitySold: 0,
          salesCount: 0,
        };

        const lineRevenue = line.quantity.getNumericValue() * line.salePrice.getAmount();
        existing.totalRevenue += lineRevenue;
        existing.totalQuantitySold += line.quantity.getNumericValue();
        existing.salesCount += 1;

        productRevenueMap.set(line.productId, existing);
      }
    }

    // Sort products by revenue descending
    const sortedProducts = Array.from(productRevenueMap.entries()).sort(
      (a, b) => b[1].totalRevenue - a[1].totalRevenue
    );

    const totalRevenue = sortedProducts.reduce((sum, [, stats]) => sum + stats.totalRevenue, 0);
    const period = this.getPeriodString(parameters.dateRange);
    const data: IAbcAnalysisItem[] = [];
    let cumulativeRevenue = 0;

    for (const [productId, stats] of sortedProducts) {
      const productInfo = productMap.get(productId);
      cumulativeRevenue += stats.totalRevenue;
      const revenuePercentage = totalRevenue > 0 ? (stats.totalRevenue / totalRevenue) * 100 : 0;
      const cumulativePercentage = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;

      let abcClassification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        abcClassification = 'A';
      } else if (cumulativePercentage <= 95) {
        abcClassification = 'B';
      } else {
        abcClassification = 'C';
      }

      const averagePrice =
        stats.totalQuantitySold > 0 ? stats.totalRevenue / stats.totalQuantitySold : 0;

      // Filter by category if specified
      if (parameters.category) {
        const product = productByIdMap.get(productId);
        const categoryNames = product?.categories?.map(c => c.name) ?? [];
        if (product && !categoryNames.includes(parameters.category)) {
          continue;
        }
      }

      const product = productByIdMap.get(productId);
      const categoryName = product?.categories?.[0]?.name;

      data.push({
        productId,
        productName: productInfo?.name || 'Unknown',
        sku: productInfo?.sku || 'Unknown',
        category: categoryName,
        totalRevenue: stats.totalRevenue,
        totalQuantitySold: stats.totalQuantitySold,
        revenuePercentage,
        cumulativePercentage,
        abcClassification,
        salesCount: stats.salesCount,
        averagePrice,
        currency: 'COP',
        period,
      });
    }

    return this.createResult(data, REPORT_TYPES.ABC_ANALYSIS, parameters, orgId);
  }

  /**
   * 18. Dead Stock Report
   * Products with stock > 0 but no sales in the last N days
   */
  public async generateDeadStockReport(
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportGenerationResult<IDeadStockItem>> {
    this.logger.log('Generating dead stock report', { orgId });

    const deadStockDays = parameters.deadStockDays || 90;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - deadStockDays * 24 * 60 * 60 * 1000);

    // Fetch sales only from cutoff date forward (we only need to know if a sale exists after cutoff)
    const [products, warehouses, stockMap, recentSales] = await Promise.all([
      this.productRepository.findAll(orgId),
      this.warehouseRepository.findAll(orgId),
      this.batchLoadStock(orgId, parameters.warehouseId, parameters.productId),
      this.saleRepository.findByDateRange(cutoffDate, now, orgId),
    ]);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    // Build set of products that have sales after cutoff (these are NOT dead stock)
    const recentlySoldProducts = new Set<string>();
    const lastSaleDateMap = new Map<string, Date>();
    const confirmedRecentSales = recentSales.filter(s => s.status.getValue() === 'CONFIRMED');
    for (const sale of confirmedRecentSales) {
      for (const line of sale.getLines()) {
        recentlySoldProducts.add(line.productId);
        const existing = lastSaleDateMap.get(line.productId);
        const saleDate = sale.createdAt;
        if (!existing || saleDate > existing) {
          lastSaleDateMap.set(line.productId, saleDate);
        }
      }
    }

    const data: IDeadStockItem[] = [];

    for (const product of products) {
      if (!parameters.includeInactive && product.status.getValue() !== 'ACTIVE') {
        continue;
      }
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }

      // Skip products that have recent sales (after cutoff)
      if (recentlySoldProducts.has(product.id)) {
        continue;
      }

      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stock = stockMap.get(`${product.id}-${warehouse.id}`);
        if (!stock || stock.quantity <= 0) {
          continue;
        }

        const stockValue = stock.quantity * stock.unitCost;
        const lastSaleDate = lastSaleDateMap.get(product.id);

        const daysSinceLastSale = lastSaleDate
          ? Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        if (!lastSaleDate || daysSinceLastSale > deadStockDays * 2) {
          riskLevel = 'HIGH';
        } else if (daysSinceLastSale > deadStockDays * 1.5) {
          riskLevel = 'MEDIUM';
        } else {
          riskLevel = 'LOW';
        }

        data.push({
          productId: product.id,
          productName: product.name.getValue(),
          sku: product.sku.getValue(),
          category: parameters.category,
          warehouseId: warehouse.id,
          warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
          currentStock: stock.quantity,
          stockValue,
          daysSinceLastSale,
          lastSaleDate,
          riskLevel,
          unit: product.unit?.getCode() || 'UNIT',
          currency: 'COP',
        });
      }
    }

    // Sort by risk level (HIGH first) then by stock value descending
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    data.sort((a, b) => {
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.stockValue - a.stockValue;
    });

    return this.createResult(data, REPORT_TYPES.DEAD_STOCK, parameters, orgId);
  }

  private createResult<T>(
    data: T[],
    reportType: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string
  ): IReportGenerationResult<T> {
    return {
      data,
      metadata: {
        reportType,
        generatedAt: new Date(),
        parameters,
        totalRecords: data.length,
        orgId,
      },
    };
  }

  private getPeriodString(dateRange?: { startDate: Date; endDate: Date }): string {
    if (!dateRange) {
      return 'All Time';
    }
    const start = dateRange.startDate.toISOString().split('T')[0];
    const end = dateRange.endDate.toISOString().split('T')[0];
    return `${start} to ${end}`;
  }

  private getDaysInPeriod(dateRange?: { startDate: Date; endDate: Date }): number {
    if (!dateRange) {
      return 365; // Default to one year
    }
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
