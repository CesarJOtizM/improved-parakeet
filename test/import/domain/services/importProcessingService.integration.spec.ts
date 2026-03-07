// ImportProcessingService Integration Tests
// Integration tests for import processing service

import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportRow } from '@import/domain/entities/importRow.entity';
import {
  ImportProcessingService,
  IRowProcessingResult,
} from '@import/domain/services/importProcessing.service';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';

describe('ImportProcessingService Integration Tests', () => {
  const orgId = 'org-123';

  describe('processBatch', () => {
    it('Given: batch with all valid rows When: processing batch Then: should process all rows successfully', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      const row1 = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: 'PROD-001', Name: 'Product 1' },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );

      const row2 = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-002', Name: 'Product 2' },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );

      batch.start();
      batch.setRows([row1, row2]);
      batch.markAsValidated();

      const rowProcessor = jest.fn<Promise<IRowProcessingResult>, [ImportRow, ImportType, string]>(
        async row => {
          return {
            rowNumber: row.rowNumber,
            success: true,
            entityId: `entity-${row.rowNumber}`,
          };
        }
      );

      // Act
      const result = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.success)).toBe(true);
      expect(rowProcessor).toHaveBeenCalledTimes(2);
    });

    it('Given: batch with some invalid rows When: processing with skipInvalidRows=true Then: should skip invalid rows', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      const validRow = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: 'PROD-001', Name: 'Product 1' },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );

      const invalidRow = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: '', Name: 'Product 2' },
          validationResult: ValidationResult.invalid(['Missing required field']),
        },
        orgId
      );

      const validRow2 = ImportRow.create(
        {
          rowNumber: 3,
          data: { SKU: 'PROD-003', Name: 'Product 3' },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );

      batch.start();
      batch.setRows([validRow, invalidRow, validRow2]);
      batch.markAsValidated();

      const rowProcessor = jest.fn<Promise<IRowProcessingResult>, [ImportRow, ImportType, string]>(
        async row => {
          return {
            rowNumber: row.rowNumber,
            success: true,
            entityId: `entity-${row.rowNumber}`,
          };
        }
      );

      // Act
      const result = await ImportProcessingService.processBatch(batch, rowProcessor, {
        skipInvalidRows: true,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2); // Only valid rows processed
      expect(result.failedCount).toBe(0);
      expect(rowProcessor).toHaveBeenCalledTimes(2); // Only called for valid rows
    });

    it('Given: batch with some invalid rows When: processing with skipInvalidRows=false Then: should process all rows', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      const validRow = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: 'PROD-001', Name: 'Product 1' },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );

      const invalidRow = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: '', Name: 'Product 2' },
          validationResult: ValidationResult.invalid(['Missing required field']),
        },
        orgId
      );

      batch.start();
      batch.setRows([validRow, invalidRow]);
      batch.markAsValidated();

      const rowProcessor = jest.fn<Promise<IRowProcessingResult>, [ImportRow, ImportType, string]>(
        async row => {
          if (row.isValid()) {
            return {
              rowNumber: row.rowNumber,
              success: true,
              entityId: `entity-${row.rowNumber}`,
            };
          }
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: 'Validation failed',
          };
        }
      );

      // Act
      const result = await ImportProcessingService.processBatch(batch, rowProcessor, {
        skipInvalidRows: false,
      });

      // Assert
      expect(result.success).toBe(false); // Has failures
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(rowProcessor).toHaveBeenCalledTimes(2); // Called for all rows
    });

    it('Given: batch with progress callback When: processing batch Then: should call progress callback', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      const rows = Array.from({ length: 5 }, (_, i) =>
        ImportRow.create(
          {
            rowNumber: i + 1,
            data: { SKU: `PROD-00${i + 1}`, Name: `Product ${i + 1}` },
            validationResult: ValidationResult.valid(),
          },
          orgId
        )
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      const progressCallback = jest.fn();
      const rowProcessor = jest.fn<Promise<IRowProcessingResult>, [ImportRow, ImportType, string]>(
        async row => {
          return {
            rowNumber: row.rowNumber,
            success: true,
            entityId: `entity-${row.rowNumber}`,
          };
        }
      );

      // Act
      await ImportProcessingService.processBatch(batch, rowProcessor, {
        checkpointInterval: 2,
        onProgress: progressCallback,
      });

      // Assert
      expect(progressCallback).toHaveBeenCalled();
      // Should be called at checkpoints (2, 4) and final (5)
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
    });

    it('Given: row processor throws error When: processing batch Then: should handle error gracefully', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      const rows = [
        ImportRow.create(
          {
            rowNumber: 1,
            data: { SKU: 'PROD-001', Name: 'Product 1' },
            validationResult: ValidationResult.valid(),
          },
          orgId
        ),
        ImportRow.create(
          {
            rowNumber: 2,
            data: { SKU: 'PROD-002', Name: 'Product 2' },
            validationResult: ValidationResult.valid(),
          },
          orgId
        ),
      ];

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      const rowProcessor = jest.fn<Promise<IRowProcessingResult>, [ImportRow, ImportType, string]>(
        async row => {
          if (row.rowNumber === 2) {
            throw new Error('Processing error');
          }
          return {
            rowNumber: row.rowNumber,
            success: true,
            entityId: `entity-${row.rowNumber}`,
          };
        }
      );

      // Act
      const result = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Processing error');
    });

    it('Given: empty batch When: processing batch Then: should return success with zero counts', async () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: 'test.xlsx',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows([]);
      batch.markAsValidated();

      const rowProcessor = jest.fn<
        Promise<IRowProcessingResult>,
        [ImportRow, ImportType, string]
      >();

      // Act
      const result = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(rowProcessor).not.toHaveBeenCalled();
    });
  });

  describe('transformRowData', () => {
    it('Given: an ImportRow and a transformer function When: transforming row data Then: should apply the transformer to row data', () => {
      // Arrange
      const row = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: 'PROD-001', Name: 'Widget', Quantity: 10 },
          validationResult: ValidationResult.valid(),
        },
        orgId
      );
      const type = ImportType.create('PRODUCTS');
      const transformer = (data: Record<string, unknown>) => ({
        sku: String(data['SKU']),
        name: String(data['Name']),
        quantity: Number(data['Quantity']),
      });

      // Act
      const result = ImportProcessingService.transformRowData(row, type, transformer);

      // Assert
      expect(result).toEqual({ sku: 'PROD-001', name: 'Widget', quantity: 10 });
    });
  });

  describe('toProductData', () => {
    it('Given: row data with all optional fields When: converting to product data Then: should map all fields correctly', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        SKU: 'SKU-100',
        Name: 'Premium Widget',
        Description: 'A premium widget',
        'Unit Code': 'PCS',
        'Unit Name': 'Pieces',
        'Unit Precision': 2,
        Barcode: '1234567890123',
        Brand: 'Acme',
        Model: 'Pro-X',
        Status: 'ACTIVE',
        'Cost Method': 'AVERAGE',
        Category: 'Electronics',
      };

      // Act
      const result = ImportProcessingService.toProductData(rowData);

      // Assert
      expect(result).toEqual({
        sku: 'SKU-100',
        name: 'Premium Widget',
        description: 'A premium widget',
        unitCode: 'PCS',
        unitName: 'Pieces',
        unitPrecision: 2,
        barcode: '1234567890123',
        brand: 'Acme',
        model: 'Pro-X',
        status: 'ACTIVE',
        costMethod: 'AVERAGE',
        category: 'Electronics',
        companyCode: undefined,
      });
    });

    it('Given: row data with only required fields When: converting to product data Then: should return undefined for optional fields', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        SKU: 'SKU-200',
        Name: 'Basic Widget',
        'Unit Code': 'EA',
        'Unit Name': 'Each',
        'Unit Precision': 0,
      };

      // Act
      const result = ImportProcessingService.toProductData(rowData);

      // Assert
      expect(result).toEqual({
        sku: 'SKU-200',
        name: 'Basic Widget',
        description: undefined,
        unitCode: 'EA',
        unitName: 'Each',
        unitPrecision: 0,
        barcode: undefined,
        brand: undefined,
        model: undefined,
        status: undefined,
        costMethod: undefined,
        category: undefined,
        companyCode: undefined,
      });
    });
  });

  describe('toMovementData', () => {
    it('Given: row data with all fields When: converting to movement data Then: should map all fields correctly', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        Type: 'ENTRY',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        'Location Code': 'LOC-A1',
        Quantity: 50,
        'Unit Cost': 12.5,
        Currency: 'USD',
        Reference: 'PO-2024-001',
        Reason: 'Purchase order receipt',
        Note: 'First batch delivery',
      };

      // Act
      const result = ImportProcessingService.toMovementData(rowData);

      // Assert
      expect(result).toEqual({
        type: 'ENTRY',
        warehouseCode: 'WH-001',
        productSku: 'PROD-001',
        locationCode: 'LOC-A1',
        quantity: 50,
        unitCost: 12.5,
        currency: 'USD',
        reference: 'PO-2024-001',
        reason: 'Purchase order receipt',
        note: 'First batch delivery',
      });
    });

    it('Given: row data with only required fields When: converting to movement data Then: should return undefined for optional fields', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        Type: 'EXIT',
        'Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-002',
        Quantity: 10,
      };

      // Act
      const result = ImportProcessingService.toMovementData(rowData);

      // Assert
      expect(result).toEqual({
        type: 'EXIT',
        warehouseCode: 'WH-002',
        productSku: 'PROD-002',
        locationCode: undefined,
        quantity: 10,
        unitCost: undefined,
        currency: undefined,
        reference: undefined,
        reason: undefined,
        note: undefined,
      });
    });
  });

  describe('toWarehouseData', () => {
    it('Given: row data with all fields When: converting to warehouse data Then: should map all fields correctly', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        Code: 'WH-MAIN',
        Name: 'Main Warehouse',
        Description: 'Primary storage facility',
        Address: '123 Industrial Ave',
      };

      // Act
      const result = ImportProcessingService.toWarehouseData(rowData);

      // Assert
      expect(result).toEqual({
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        description: 'Primary storage facility',
        address: '123 Industrial Ave',
      });
    });

    it('Given: row data with only required fields When: converting to warehouse data Then: should return undefined for optional fields', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        Code: 'WH-SEC',
        Name: 'Secondary Warehouse',
      };

      // Act
      const result = ImportProcessingService.toWarehouseData(rowData);

      // Assert
      expect(result).toEqual({
        code: 'WH-SEC',
        name: 'Secondary Warehouse',
        description: undefined,
        address: undefined,
      });
    });
  });

  describe('toStockData', () => {
    it('Given: row data with all fields When: converting to stock data Then: should map all fields correctly', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        'Product SKU': 'PROD-001',
        'Warehouse Code': 'WH-001',
        'Location Code': 'LOC-B2',
        Quantity: 100,
        'Unit Cost': 25.99,
        Currency: 'EUR',
      };

      // Act
      const result = ImportProcessingService.toStockData(rowData);

      // Assert
      expect(result).toEqual({
        productSku: 'PROD-001',
        warehouseCode: 'WH-001',
        locationCode: 'LOC-B2',
        quantity: 100,
        unitCost: 25.99,
        currency: 'EUR',
      });
    });

    it('Given: row data with only required fields When: converting to stock data Then: should return undefined for optional fields', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        'Product SKU': 'PROD-003',
        'Warehouse Code': 'WH-002',
        Quantity: 5,
      };

      // Act
      const result = ImportProcessingService.toStockData(rowData);

      // Assert
      expect(result).toEqual({
        productSku: 'PROD-003',
        warehouseCode: 'WH-002',
        locationCode: undefined,
        quantity: 5,
        unitCost: undefined,
        currency: undefined,
      });
    });
  });

  describe('toTransferData', () => {
    it('Given: row data with all fields When: converting to transfer data Then: should map all fields correctly', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        'From Location Code': 'LOC-A1',
        'To Location Code': 'LOC-B2',
        Quantity: 30,
        Note: 'Rebalancing stock between warehouses',
      };

      // Act
      const result = ImportProcessingService.toTransferData(rowData);

      // Assert
      expect(result).toEqual({
        fromWarehouseCode: 'WH-001',
        toWarehouseCode: 'WH-002',
        productSku: 'PROD-001',
        fromLocationCode: 'LOC-A1',
        toLocationCode: 'LOC-B2',
        quantity: 30,
        note: 'Rebalancing stock between warehouses',
      });
    });

    it('Given: row data with only required fields When: converting to transfer data Then: should return undefined for optional fields', () => {
      // Arrange
      const rowData: Record<string, unknown> = {
        'From Warehouse Code': 'WH-003',
        'To Warehouse Code': 'WH-004',
        'Product SKU': 'PROD-005',
        Quantity: 15,
      };

      // Act
      const result = ImportProcessingService.toTransferData(rowData);

      // Assert
      expect(result).toEqual({
        fromWarehouseCode: 'WH-003',
        toWarehouseCode: 'WH-004',
        productSku: 'PROD-005',
        fromLocationCode: undefined,
        toLocationCode: undefined,
        quantity: 15,
        note: undefined,
      });
    });
  });
});
