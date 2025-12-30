import { ImportBatch } from '../entities/importBatch.entity';
import { ImportRow } from '../entities/importRow.entity';
import { ImportType } from '../valueObjects/importType.valueObject';

/**
 * Processing result for a single row
 */
export interface IRowProcessingResult {
  rowNumber: number;
  success: boolean;
  error?: string;
  entityId?: string;
}

/**
 * Processing result for the entire batch
 */
export interface IBatchProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: IRowProcessingResult[];
  errorMessage?: string;
}

/**
 * Row processor function type
 * To be provided by use cases that integrate with other domain services
 */
export type RowProcessor = (
  row: ImportRow,
  type: ImportType,
  orgId: string
) => Promise<IRowProcessingResult>;

/**
 * Import Processing Service
 * Domain service for processing import batches
 */
export class ImportProcessingService {
  /**
   * Process a batch using a provided row processor
   * This allows use cases to inject their own processing logic
   */
  public static async processBatch(
    batch: ImportBatch,
    rowProcessor: RowProcessor,
    options: {
      skipInvalidRows?: boolean;
      checkpointInterval?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<IBatchProcessingResult> {
    const { skipInvalidRows = true, checkpointInterval = 100, onProgress } = options;
    const results: IRowProcessingResult[] = [];
    let processedCount = 0;
    let failedCount = 0;

    // Get rows to process
    const rowsToProcess = skipInvalidRows ? batch.getValidRows() : batch.getRows();

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];

      try {
        const result = await rowProcessor(row, batch.type, batch.orgId!);
        results.push(result);

        if (result.success) {
          processedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        results.push({
          rowNumber: row.rowNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Report progress
      if (onProgress && (i + 1) % checkpointInterval === 0) {
        onProgress(i + 1, rowsToProcess.length);
      }
    }

    // Final progress report
    if (onProgress) {
      onProgress(rowsToProcess.length, rowsToProcess.length);
    }

    return {
      success: failedCount === 0,
      processedCount,
      failedCount,
      results,
      errorMessage: failedCount > 0 ? `Failed to process ${failedCount} row(s)` : undefined,
    };
  }

  /**
   * Transform row data for a specific import type
   * Converts generic row data to typed data suitable for domain operations
   */
  public static transformRowData<T>(
    row: ImportRow,
    _type: ImportType,
    transformer: (data: Record<string, unknown>) => T
  ): T {
    return transformer(row.data);
  }

  /**
   * Get transformed data for products import
   */
  public static toProductData(rowData: Record<string, unknown>): {
    sku: string;
    name: string;
    description?: string;
    unitCode: string;
    unitName: string;
    unitPrecision: number;
    barcode?: string;
    brand?: string;
    model?: string;
    status?: string;
    costMethod?: string;
    category?: string;
  } {
    return {
      sku: String(rowData['SKU'] || ''),
      name: String(rowData['Name'] || ''),
      description: rowData['Description'] ? String(rowData['Description']) : undefined,
      unitCode: String(rowData['Unit Code'] || ''),
      unitName: String(rowData['Unit Name'] || ''),
      unitPrecision: Number(rowData['Unit Precision'] || 0),
      barcode: rowData['Barcode'] ? String(rowData['Barcode']) : undefined,
      brand: rowData['Brand'] ? String(rowData['Brand']) : undefined,
      model: rowData['Model'] ? String(rowData['Model']) : undefined,
      status: rowData['Status'] ? String(rowData['Status']) : undefined,
      costMethod: rowData['Cost Method'] ? String(rowData['Cost Method']) : undefined,
      category: rowData['Category'] ? String(rowData['Category']) : undefined,
    };
  }

  /**
   * Get transformed data for movements import
   */
  public static toMovementData(rowData: Record<string, unknown>): {
    type: string;
    warehouseCode: string;
    productSku: string;
    locationCode?: string;
    quantity: number;
    unitCost?: number;
    currency?: string;
    reference?: string;
    reason?: string;
    note?: string;
  } {
    return {
      type: String(rowData['Type'] || ''),
      warehouseCode: String(rowData['Warehouse Code'] || ''),
      productSku: String(rowData['Product SKU'] || ''),
      locationCode: rowData['Location Code'] ? String(rowData['Location Code']) : undefined,
      quantity: Number(rowData['Quantity'] || 0),
      unitCost: rowData['Unit Cost'] ? Number(rowData['Unit Cost']) : undefined,
      currency: rowData['Currency'] ? String(rowData['Currency']) : undefined,
      reference: rowData['Reference'] ? String(rowData['Reference']) : undefined,
      reason: rowData['Reason'] ? String(rowData['Reason']) : undefined,
      note: rowData['Note'] ? String(rowData['Note']) : undefined,
    };
  }

  /**
   * Get transformed data for warehouses import
   */
  public static toWarehouseData(rowData: Record<string, unknown>): {
    code: string;
    name: string;
    description?: string;
    address?: string;
  } {
    return {
      code: String(rowData['Code'] || ''),
      name: String(rowData['Name'] || ''),
      description: rowData['Description'] ? String(rowData['Description']) : undefined,
      address: rowData['Address'] ? String(rowData['Address']) : undefined,
    };
  }

  /**
   * Get transformed data for stock import
   */
  public static toStockData(rowData: Record<string, unknown>): {
    productSku: string;
    warehouseCode: string;
    locationCode?: string;
    quantity: number;
    unitCost?: number;
    currency?: string;
  } {
    return {
      productSku: String(rowData['Product SKU'] || ''),
      warehouseCode: String(rowData['Warehouse Code'] || ''),
      locationCode: rowData['Location Code'] ? String(rowData['Location Code']) : undefined,
      quantity: Number(rowData['Quantity'] || 0),
      unitCost: rowData['Unit Cost'] ? Number(rowData['Unit Cost']) : undefined,
      currency: rowData['Currency'] ? String(rowData['Currency']) : undefined,
    };
  }

  /**
   * Get transformed data for transfers import
   */
  public static toTransferData(rowData: Record<string, unknown>): {
    fromWarehouseCode: string;
    toWarehouseCode: string;
    productSku: string;
    fromLocationCode?: string;
    toLocationCode?: string;
    quantity: number;
    note?: string;
  } {
    return {
      fromWarehouseCode: String(rowData['From Warehouse Code'] || ''),
      toWarehouseCode: String(rowData['To Warehouse Code'] || ''),
      productSku: String(rowData['Product SKU'] || ''),
      fromLocationCode: rowData['From Location Code']
        ? String(rowData['From Location Code'])
        : undefined,
      toLocationCode: rowData['To Location Code'] ? String(rowData['To Location Code']) : undefined,
      quantity: Number(rowData['Quantity'] || 0),
      note: rowData['Note'] ? String(rowData['Note']) : undefined,
    };
  }
}
