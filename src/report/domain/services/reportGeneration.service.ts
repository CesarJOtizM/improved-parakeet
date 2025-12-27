import { IMovementRepository } from '@movement/domain/ports/repositories';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IProductRepository } from '@product/domain/ports/repositories';
import { IReturnRepository } from '@returns/domain/ports/repositories';
import { ISaleRepository } from '@sale/domain/ports/repositories';
import { IStockRepository } from '@stock/domain/ports/repositories';
import { IWarehouseRepository } from '@warehouse/domain/ports/repositories';

import { IReportParametersInput, REPORT_TYPES, ReportTypeValue } from '../valueObjects';

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
    @Inject('StockRepository')
    private readonly stockRepository: IStockRepository,
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository
  ) {}

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
      default:
        throw new Error(`Unknown report type: ${type}`);
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

    const products = await this.productRepository.findAll(orgId);
    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IAvailableInventoryItem[] = [];

    for (const product of products) {
      // Filter by product if specified
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }

      // Skip inactive products unless includeInactive is true
      if (!parameters.includeInactive && product.status.getValue() !== 'ACTIVE') {
        continue;
      }

      for (const warehouse of warehouses) {
        // Filter by warehouse if specified
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stockData = await this.stockRepository.getStockWithCost(
          product.id,
          warehouse.id,
          orgId,
          parameters.locationId
        );

        if (stockData && stockData.quantity.getNumericValue() > 0) {
          data.push({
            productId: product.id,
            productName: product.name.getValue(),
            sku: product.sku.getValue(),
            warehouseId: warehouse.id,
            warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
            locationId: parameters.locationId,
            quantity: stockData.quantity.getNumericValue(),
            unit: product.unit.getValue().code,
            averageCost: stockData.averageCost.getAmount(),
            totalValue: stockData.quantity.getNumericValue() * stockData.averageCost.getAmount(),
            currency: stockData.averageCost.getCurrency(),
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

    let movements;
    if (parameters.dateRange) {
      movements = await this.movementRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      movements = await this.movementRepository.findAll(orgId);
    }

    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const products = await this.productRepository.findAll(orgId);
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

    const products = await this.productRepository.findAll(orgId);
    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IValuationItem[] = [];

    for (const product of products) {
      // Filter by product if specified
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }

      // Filter by category if specified
      if (parameters.category) {
        // Assuming category is stored somehow - simplified for now
        continue;
      }

      for (const warehouse of warehouses) {
        // Filter by warehouse if specified
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stockData = await this.stockRepository.getStockWithCost(
          product.id,
          warehouse.id,
          orgId
        );

        if (stockData && stockData.quantity.getNumericValue() > 0) {
          const totalValue =
            stockData.quantity.getNumericValue() * stockData.averageCost.getAmount();

          data.push({
            productId: product.id,
            productName: product.name.getValue(),
            sku: product.sku.getValue(),
            category: parameters.category,
            warehouseId: warehouse.id,
            warehouseName: warehouseMap.get(warehouse.id) || 'Unknown',
            quantity: stockData.quantity.getNumericValue(),
            averageCost: stockData.averageCost.getAmount(),
            totalValue,
            currency: stockData.averageCost.getCurrency(),
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

    const products = await this.productRepository.findLowStock(orgId);
    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: ILowStockItem[] = [];

    for (const product of products) {
      for (const warehouse of warehouses) {
        // Filter by warehouse if specified
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const quantity = await this.stockRepository.getStockQuantity(
          product.id,
          warehouse.id,
          orgId
        );

        // Simplified - assuming minimum stock is configured elsewhere
        const minimumStock = 10; // Default value
        const reorderPoint = 15; // Default value
        const currentStock = quantity.getNumericValue();

        if (currentStock < minimumStock) {
          const deficit = minimumStock - currentStock;
          const severity = currentStock === 0 ? 'CRITICAL' : 'WARNING';

          // Filter by severity if specified
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

    let movements;
    if (parameters.dateRange) {
      movements = await this.movementRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      movements = await this.movementRepository.findPostedMovements(orgId);
    }

    const warehouses = await this.warehouseRepository.findAll(orgId);
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

    const warehouses = await this.warehouseRepository.findAll(orgId);
    const products = await this.productRepository.findAll(orgId);

    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

    const data: IFinancialReportItem[] = [];
    const period = this.getPeriodString(parameters.dateRange);

    for (const warehouse of warehouses) {
      // Filter by warehouse if specified
      if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
        continue;
      }

      let totalInventoryValue = 0;
      let totalCost = 0;
      let totalRevenue = 0;

      // Calculate inventory value
      for (const product of products) {
        const stockData = await this.stockRepository.getStockWithCost(
          product.id,
          warehouse.id,
          orgId
        );
        if (stockData) {
          totalInventoryValue +=
            stockData.quantity.getNumericValue() * stockData.averageCost.getAmount();
        }
      }

      // Calculate revenue from sales
      const warehouseSales = sales.filter(s => s.warehouseId === warehouse.id);
      for (const sale of warehouseSales) {
        if (sale.status.getValue() === 'CONFIRMED') {
          for (const line of sale.getLines()) {
            totalRevenue += line.quantity.getNumericValue() * line.unitPrice.getAmount();
            if (line.unitCost) {
              totalCost += line.quantity.getNumericValue() * line.unitCost.getAmount();
            }
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

    const products = await this.productRepository.findAll(orgId);
    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

    const data: ITurnoverItem[] = [];
    const period = this.getPeriodString(parameters.dateRange);
    const daysInPeriod = this.getDaysInPeriod(parameters.dateRange);

    for (const product of products) {
      // Filter by product if specified
      if (parameters.productId && product.id !== parameters.productId) {
        continue;
      }

      // Calculate COGS for this product
      let cogs = 0;
      const confirmedSales = sales.filter(s => s.status.getValue() === 'CONFIRMED');
      for (const sale of confirmedSales) {
        for (const line of sale.getLines()) {
          if (line.productId === product.id && line.unitCost) {
            cogs += line.quantity.getNumericValue() * line.unitCost.getAmount();
          }
        }
      }

      // Calculate average inventory (simplified)
      let totalInventory = 0;
      let warehouseCount = 0;
      for (const warehouse of warehouses) {
        if (parameters.warehouseId && warehouse.id !== parameters.warehouseId) {
          continue;
        }

        const stockData = await this.stockRepository.getStockWithCost(
          product.id,
          warehouse.id,
          orgId
        );
        if (stockData) {
          totalInventory +=
            stockData.quantity.getNumericValue() * stockData.averageCost.getAmount();
          warehouseCount++;
        }
      }

      const averageInventory = warehouseCount > 0 ? totalInventory / warehouseCount : 0;
      const turnoverRate = averageInventory > 0 ? cogs / averageInventory : 0;
      const daysOfInventory = turnoverRate > 0 ? daysInPeriod / turnoverRate : daysInPeriod;

      // Classify based on turnover rate
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

    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

    const warehouses = await this.warehouseRepository.findAll(orgId);
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
        totalAmount += line.quantity.getNumericValue() * line.unitPrice.getAmount();
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

    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

    const products = await this.productRepository.findAll(orgId);
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
        existing.totalRevenue += line.quantity.getNumericValue() * line.unitPrice.getAmount();
        if (line.unitCost) {
          existing.totalCost += line.quantity.getNumericValue() * line.unitCost.getAmount();
        }
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

    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

    const warehouses = await this.warehouseRepository.findAll(orgId);
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
        existing.totalRevenue += line.quantity.getNumericValue() * line.unitPrice.getAmount();
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

    let returns;
    if (parameters.dateRange) {
      returns = await this.returnRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      returns = await this.returnRepository.findAll(orgId);
    }

    const warehouses = await this.warehouseRepository.findAll(orgId);
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    const data: IReturnsReportItem[] = [];

    for (const returnEntity of returns) {
      // Filter by return type if specified
      if (parameters.returnType && returnEntity.returnType.getValue() !== parameters.returnType) {
        continue;
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
        if (line.unitCost) {
          totalValue += line.quantity.getNumericValue() * line.unitCost.getAmount();
        }
      }

      data.push({
        returnId: returnEntity.id,
        returnNumber: returnEntity.returnNumber.getValue(),
        type: returnEntity.returnType.getValue() as 'CUSTOMER' | 'SUPPLIER',
        status: returnEntity.status.getValue(),
        warehouseId: returnEntity.warehouseId,
        warehouseName: warehouseMap.get(returnEntity.warehouseId) || 'Unknown',
        saleId: returnEntity.saleId,
        sourceMovementId: returnEntity.sourceMovementId,
        totalItems,
        totalValue,
        reason: returnEntity.reason,
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

    let returns;
    if (parameters.dateRange) {
      returns = await this.returnRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      returns = await this.returnRepository.findAll(orgId);
    }

    // Get sales count for return rate calculation
    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

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
      if (parameters.returnType && returnEntity.returnType.getValue() !== parameters.returnType) {
        continue;
      }

      const type = returnEntity.returnType.getValue();
      const existing = typeStatsMap.get(type) || {
        totalReturns: 0,
        totalQuantity: 0,
        totalValue: 0,
        reasons: new Map<string, number>(),
      };

      existing.totalReturns += 1;
      for (const line of returnEntity.getLines()) {
        existing.totalQuantity += line.quantity.getNumericValue();
        if (line.unitCost) {
          existing.totalValue += line.quantity.getNumericValue() * line.unitCost.getAmount();
        }
      }

      if (returnEntity.reason) {
        existing.reasons.set(
          returnEntity.reason,
          (existing.reasons.get(returnEntity.reason) || 0) + 1
        );
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

    let returns;
    if (parameters.dateRange) {
      returns = await this.returnRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      returns = await this.returnRepository.findAll(orgId);
    }

    const products = await this.productRepository.findAll(orgId);
    const productMap = new Map(
      products.map(p => [p.id, { name: p.name.getValue(), sku: p.sku.getValue() }])
    );

    // Get sales for return rate calculation
    let sales;
    if (parameters.dateRange) {
      sales = await this.saleRepository.findByDateRange(
        parameters.dateRange.startDate,
        parameters.dateRange.endDate,
        orgId
      );
    } else {
      sales = await this.saleRepository.findAll(orgId);
    }

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
      if (parameters.returnType && returnEntity.returnType.getValue() !== parameters.returnType) {
        continue;
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
        if (line.unitCost) {
          existing.totalValueReturned +=
            line.quantity.getNumericValue() * line.unitCost.getAmount();
        }
        existing.returnsCount += 1;

        if (returnEntity.reason) {
          existing.reasons.set(
            returnEntity.reason,
            (existing.reasons.get(returnEntity.reason) || 0) + 1
          );
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

  // Helper methods
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

  private groupBy<T>(items: T[], keyGetter: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = keyGetter(item);
      const existing = map.get(key) || [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }
}
