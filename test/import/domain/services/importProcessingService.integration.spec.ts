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
});
