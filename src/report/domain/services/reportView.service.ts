import { Injectable, Logger } from '@nestjs/common';

import { IReportParametersInput, REPORT_TYPES, ReportTypeValue } from '../valueObjects';

import { IReportGenerationResult, ReportGenerationService } from './reportGeneration.service';

/**
 * Column definition for report table display
 */
export interface IReportColumn {
  key: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * View result structure optimized for frontend table display
 */
export interface IReportViewResult<T> {
  columns: IReportColumn[];
  rows: T[];
  metadata: {
    reportType: ReportTypeValue;
    reportTitle: string;
    generatedAt: Date;
    parameters: IReportParametersInput;
    totalRecords: number;
    orgId: string;
  };
  summary?: Record<string, number | string>;
}

@Injectable()
export class ReportViewService {
  private readonly logger = new Logger(ReportViewService.name);

  constructor(private readonly reportGenerationService: ReportGenerationService) {}

  /**
   * Generate and return JSON data for frontend table display
   */
  public async viewReport(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string
  ): Promise<IReportViewResult<unknown>> {
    this.logger.log('Viewing report', { type, orgId });

    const result = await this.reportGenerationService.generateReport(type, parameters, orgId);

    const columns = this.getColumnsForReportType(type);
    const title = this.getReportTitle(type);
    const summary = this.calculateSummary(type, result);

    return {
      columns,
      rows: result.data,
      metadata: {
        reportType: type,
        reportTitle: title,
        generatedAt: result.metadata.generatedAt,
        parameters: result.metadata.parameters,
        totalRecords: result.metadata.totalRecords,
        orgId: result.metadata.orgId,
      },
      summary,
    };
  }

  /**
   * Get column definitions for each report type
   */
  private getColumnsForReportType(type: ReportTypeValue): IReportColumn[] {
    switch (type) {
      case REPORT_TYPES.AVAILABLE_INVENTORY:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'locationName',
            header: 'Location',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'quantity', header: 'Quantity', type: 'number', sortable: true, align: 'right' },
          { key: 'unit', header: 'Unit', type: 'string' },
          {
            key: 'averageCost',
            header: 'Avg Cost',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
        ];

      case REPORT_TYPES.MOVEMENT_HISTORY:
        return [
          { key: 'createdAt', header: 'Date', type: 'date', sortable: true },
          { key: 'type', header: 'Type', type: 'string', sortable: true, filterable: true },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'quantity', header: 'Quantity', type: 'number', sortable: true, align: 'right' },
          {
            key: 'unitCost',
            header: 'Unit Cost',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalCost',
            header: 'Total Cost',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'reference', header: 'Reference', type: 'string', filterable: true },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.VALUATION:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'quantity', header: 'Quantity', type: 'number', sortable: true, align: 'right' },
          {
            key: 'averageCost',
            header: 'Avg Cost (PPM)',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
        ];

      case REPORT_TYPES.LOW_STOCK:
        return [
          { key: 'severity', header: 'Severity', type: 'string', sortable: true, filterable: true },
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'currentStock',
            header: 'Current Stock',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'minimumStock',
            header: 'Minimum',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'reorderPoint', header: 'Reorder Point', type: 'number', align: 'right' },
          { key: 'deficit', header: 'Deficit', type: 'number', sortable: true, align: 'right' },
          { key: 'unit', header: 'Unit', type: 'string' },
        ];

      case REPORT_TYPES.MOVEMENTS:
        return [
          {
            key: 'type',
            header: 'Movement Type',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'totalMovements',
            header: 'Total Movements',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalQuantity',
            header: 'Total Quantity',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.FINANCIAL:
        return [
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'totalInventoryValue',
            header: 'Inventory Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalCost',
            header: 'Total Cost',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalRevenue',
            header: 'Total Revenue',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'grossMargin',
            header: 'Gross Margin',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'grossMarginPercentage',
            header: 'Margin %',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.TURNOVER:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'cogs', header: 'COGS', type: 'currency', sortable: true, align: 'right' },
          {
            key: 'averageInventory',
            header: 'Avg Inventory',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'turnoverRate',
            header: 'Turnover Rate',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'daysOfInventory',
            header: 'Days of Inventory',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'classification',
            header: 'Classification',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.SALES:
        return [
          { key: 'saleDate', header: 'Date', type: 'date', sortable: true },
          { key: 'saleNumber', header: 'Sale #', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'customerReference',
            header: 'Customer',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'totalItems', header: 'Items', type: 'number', sortable: true, align: 'right' },
          { key: 'totalAmount', header: 'Total', type: 'currency', sortable: true, align: 'right' },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.SALES_BY_PRODUCT:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'totalQuantitySold',
            header: 'Qty Sold',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalRevenue',
            header: 'Revenue',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'averagePrice',
            header: 'Avg Price',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'averageCost',
            header: 'Avg Cost',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'margin', header: 'Margin', type: 'currency', sortable: true, align: 'right' },
          {
            key: 'marginPercentage',
            header: 'Margin %',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          {
            key: 'salesCount',
            header: 'Sales Count',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.SALES_BY_WAREHOUSE:
        return [
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'totalSales',
            header: 'Total Sales',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalRevenue',
            header: 'Revenue',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'averagePerSale',
            header: 'Avg per Sale',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalItems',
            header: 'Total Items',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.RETURNS:
        return [
          { key: 'returnDate', header: 'Date', type: 'date', sortable: true },
          {
            key: 'returnNumber',
            header: 'Return #',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'type', header: 'Type', type: 'string', sortable: true, filterable: true },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'totalItems', header: 'Items', type: 'number', sortable: true, align: 'right' },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'reason', header: 'Reason', type: 'string', filterable: true },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.RETURNS_BY_TYPE:
        return [
          { key: 'type', header: 'Return Type', type: 'string', sortable: true, filterable: true },
          {
            key: 'totalReturns',
            header: 'Total Returns',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalQuantity',
            header: 'Total Quantity',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'returnRate',
            header: 'Return Rate',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.RETURNS_BY_PRODUCT:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'totalQuantityReturned',
            header: 'Qty Returned',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalValueReturned',
            header: 'Value Returned',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'returnRate',
            header: 'Return Rate',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          {
            key: 'returnsCount',
            header: 'Returns Count',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.RETURNS_BY_SALE:
        return [
          { key: 'returnDate', header: 'Date', type: 'date', sortable: true },
          {
            key: 'returnNumber',
            header: 'Return #',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'type', header: 'Type', type: 'string', sortable: true, filterable: true },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'totalItems', header: 'Items', type: 'number', sortable: true, align: 'right' },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'reason', header: 'Reason', type: 'string', filterable: true },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.RETURNS_CUSTOMER:
        return [
          { key: 'returnDate', header: 'Date', type: 'date', sortable: true },
          {
            key: 'returnNumber',
            header: 'Return #',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'saleId', header: 'Sale ID', type: 'string', sortable: true, filterable: true },
          { key: 'totalItems', header: 'Items', type: 'number', sortable: true, align: 'right' },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'reason', header: 'Reason', type: 'string', filterable: true },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.RETURNS_SUPPLIER:
        return [
          { key: 'returnDate', header: 'Date', type: 'date', sortable: true },
          {
            key: 'returnNumber',
            header: 'Return #',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'status', header: 'Status', type: 'string', sortable: true, filterable: true },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'sourceMovementId',
            header: 'Movement ID',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'totalItems', header: 'Items', type: 'number', sortable: true, align: 'right' },
          {
            key: 'totalValue',
            header: 'Total Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          { key: 'reason', header: 'Reason', type: 'string', filterable: true },
          { key: 'createdBy', header: 'Created By', type: 'string', filterable: true },
        ];

      case REPORT_TYPES.ABC_ANALYSIS:
        return [
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'category', header: 'Category', type: 'string', sortable: true, filterable: true },
          {
            key: 'abcClassification',
            header: 'Classification',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'totalRevenue',
            header: 'Revenue',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'revenuePercentage',
            header: 'Revenue %',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          {
            key: 'cumulativePercentage',
            header: 'Cumulative %',
            type: 'percentage',
            sortable: true,
            align: 'right',
          },
          {
            key: 'totalQuantitySold',
            header: 'Qty Sold',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          {
            key: 'averagePrice',
            header: 'Avg Price',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'salesCount',
            header: 'Sales Count',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'period', header: 'Period', type: 'string' },
        ];

      case REPORT_TYPES.DEAD_STOCK:
        return [
          {
            key: 'riskLevel',
            header: 'Risk Level',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          { key: 'sku', header: 'SKU', type: 'string', sortable: true, filterable: true },
          {
            key: 'productName',
            header: 'Product',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'warehouseName',
            header: 'Warehouse',
            type: 'string',
            sortable: true,
            filterable: true,
          },
          {
            key: 'currentStock',
            header: 'Current Stock',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'unit', header: 'Unit', type: 'string' },
          {
            key: 'stockValue',
            header: 'Stock Value',
            type: 'currency',
            sortable: true,
            align: 'right',
          },
          {
            key: 'daysSinceLastSale',
            header: 'Days Without Sale',
            type: 'number',
            sortable: true,
            align: 'right',
          },
          { key: 'lastSaleDate', header: 'Last Sale', type: 'date', sortable: true },
        ];

      default:
        return [];
    }
  }

  /**
   * Get human-readable title for each report type
   */
  private getReportTitle(type: ReportTypeValue): string {
    const titles: Record<ReportTypeValue, string> = {
      [REPORT_TYPES.AVAILABLE_INVENTORY]: 'Available Inventory Report',
      [REPORT_TYPES.MOVEMENT_HISTORY]: 'Movement History Report',
      [REPORT_TYPES.VALUATION]: 'Inventory Valuation Report',
      [REPORT_TYPES.LOW_STOCK]: 'Low Stock Alert Report',
      [REPORT_TYPES.MOVEMENTS]: 'Movements Summary Report',
      [REPORT_TYPES.FINANCIAL]: 'Financial Report',
      [REPORT_TYPES.TURNOVER]: 'Inventory Turnover Report',
      [REPORT_TYPES.SALES]: 'Sales Report',
      [REPORT_TYPES.SALES_BY_PRODUCT]: 'Sales by Product Report',
      [REPORT_TYPES.SALES_BY_WAREHOUSE]: 'Sales by Warehouse Report',
      [REPORT_TYPES.RETURNS]: 'Returns Report',
      [REPORT_TYPES.RETURNS_BY_TYPE]: 'Returns by Type Report',
      [REPORT_TYPES.RETURNS_BY_PRODUCT]: 'Returns by Product Report',
      [REPORT_TYPES.RETURNS_BY_SALE]: 'Returns by Sale Report',
      [REPORT_TYPES.RETURNS_CUSTOMER]: 'Customer Returns Report',
      [REPORT_TYPES.RETURNS_SUPPLIER]: 'Supplier Returns Report',
      [REPORT_TYPES.ABC_ANALYSIS]: 'ABC Analysis Report',
      [REPORT_TYPES.DEAD_STOCK]: 'Dead Stock Report',
    };
    return titles[type] || 'Report';
  }

  /**
   * Calculate summary statistics for the report
   */
  private calculateSummary(
    type: ReportTypeValue,
    result: IReportGenerationResult<unknown>
  ): Record<string, number | string> | undefined {
    const data = result.data as Record<string, unknown>[];

    if (data.length === 0) {
      return undefined;
    }

    switch (type) {
      case REPORT_TYPES.AVAILABLE_INVENTORY:
      case REPORT_TYPES.VALUATION:
        return {
          totalRecords: data.length,
          totalValue: this.sumField(data, 'totalValue'),
          totalQuantity: this.sumField(data, 'quantity'),
        };

      case REPORT_TYPES.MOVEMENT_HISTORY:
        return {
          totalRecords: data.length,
          totalCost: this.sumField(data, 'totalCost'),
        };

      case REPORT_TYPES.LOW_STOCK:
        return {
          totalAlerts: data.length,
          criticalCount: data.filter(d => d['severity'] === 'CRITICAL').length,
          warningCount: data.filter(d => d['severity'] === 'WARNING').length,
          totalDeficit: this.sumField(data, 'deficit'),
        };

      case REPORT_TYPES.MOVEMENTS:
        return {
          totalRecords: data.length,
          totalMovements: this.sumField(data, 'totalMovements'),
          totalQuantity: this.sumField(data, 'totalQuantity'),
          totalValue: this.sumField(data, 'totalValue'),
        };

      case REPORT_TYPES.FINANCIAL:
        return {
          totalInventoryValue: this.sumField(data, 'totalInventoryValue'),
          totalRevenue: this.sumField(data, 'totalRevenue'),
          totalCost: this.sumField(data, 'totalCost'),
          totalGrossMargin: this.sumField(data, 'grossMargin'),
        };

      case REPORT_TYPES.TURNOVER:
        return {
          totalRecords: data.length,
          slowMovingCount: data.filter(d => d['classification'] === 'SLOW_MOVING').length,
          normalCount: data.filter(d => d['classification'] === 'NORMAL').length,
          fastMovingCount: data.filter(d => d['classification'] === 'FAST_MOVING').length,
        };

      case REPORT_TYPES.SALES:
        return {
          totalSales: data.length,
          totalAmount: this.sumField(data, 'totalAmount'),
          totalItems: this.sumField(data, 'totalItems'),
        };

      case REPORT_TYPES.SALES_BY_PRODUCT:
        return {
          totalProducts: data.length,
          totalRevenue: this.sumField(data, 'totalRevenue'),
          totalQuantitySold: this.sumField(data, 'totalQuantitySold'),
        };

      case REPORT_TYPES.SALES_BY_WAREHOUSE:
        return {
          totalWarehouses: data.length,
          totalRevenue: this.sumField(data, 'totalRevenue'),
          totalSales: this.sumField(data, 'totalSales'),
        };

      case REPORT_TYPES.RETURNS:
        return {
          totalReturns: data.length,
          totalValue: this.sumField(data, 'totalValue'),
          totalItems: this.sumField(data, 'totalItems'),
        };

      case REPORT_TYPES.RETURNS_BY_TYPE:
        return {
          totalReturns: this.sumField(data, 'totalReturns'),
          totalValue: this.sumField(data, 'totalValue'),
        };

      case REPORT_TYPES.RETURNS_BY_PRODUCT:
        return {
          totalProducts: data.length,
          totalQuantityReturned: this.sumField(data, 'totalQuantityReturned'),
          totalValueReturned: this.sumField(data, 'totalValueReturned'),
        };

      case REPORT_TYPES.RETURNS_BY_SALE:
        return {
          totalReturns: data.length,
          totalItems: this.sumField(data, 'totalItems'),
          totalValue: this.sumField(data, 'totalValue'),
        };

      case REPORT_TYPES.RETURNS_CUSTOMER:
        return {
          totalReturns: data.length,
          totalItems: this.sumField(data, 'totalItems'),
          totalValue: this.sumField(data, 'totalValue'),
        };

      case REPORT_TYPES.RETURNS_SUPPLIER:
        return {
          totalReturns: data.length,
          totalItems: this.sumField(data, 'totalItems'),
          totalValue: this.sumField(data, 'totalValue'),
        };

      case REPORT_TYPES.ABC_ANALYSIS:
        return {
          totalProducts: data.length,
          classA: data.filter(d => d['abcClassification'] === 'A').length,
          classB: data.filter(d => d['abcClassification'] === 'B').length,
          classC: data.filter(d => d['abcClassification'] === 'C').length,
          totalRevenue: this.sumField(data, 'totalRevenue'),
        };

      case REPORT_TYPES.DEAD_STOCK:
        return {
          totalProducts: data.length,
          totalStockValue: this.sumField(data, 'stockValue'),
          highRiskCount: data.filter(d => d['riskLevel'] === 'HIGH').length,
          mediumRiskCount: data.filter(d => d['riskLevel'] === 'MEDIUM').length,
          lowRiskCount: data.filter(d => d['riskLevel'] === 'LOW').length,
        };

      default:
        return { totalRecords: data.length };
    }
  }

  private sumField(data: Record<string, unknown>[], field: string): number {
    return data.reduce((sum, item) => {
      const value = item[field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }
}
