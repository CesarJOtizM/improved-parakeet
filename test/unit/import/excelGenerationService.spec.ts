import { ExcelGenerationService } from '@infrastructure/externalServices/excelGenerationService';
import { ImportBatch, ImportRow, ValidationResult } from '@import/domain';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('ExcelGenerationService', () => {
  let service: ExcelGenerationService;

  beforeEach(() => {
    service = new ExcelGenerationService();
  });

  describe('generateTemplateXlsx', () => {
    it('should generate a buffer for PRODUCTS template', async () => {
      const buffer = await service.generateTemplateXlsx(ImportType.create('PRODUCTS'));
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // XLSX files start with PK (ZIP header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should generate a buffer for MOVEMENTS template', async () => {
      const buffer = await service.generateTemplateXlsx(ImportType.create('MOVEMENTS'));
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate a buffer for WAREHOUSES template', async () => {
      const buffer = await service.generateTemplateXlsx(ImportType.create('WAREHOUSES'));
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate a buffer for STOCK template', async () => {
      const buffer = await service.generateTemplateXlsx(ImportType.create('STOCK'));
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate a buffer for TRANSFERS template', async () => {
      const buffer = await service.generateTemplateXlsx(ImportType.create('TRANSFERS'));
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateErrorReportXlsx', () => {
    it('should generate a buffer for error report', async () => {
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('FAILED'),
          fileName: 'test.csv',
          totalRows: 2,
          processedRows: 2,
          validRows: 1,
          invalidRows: 1,
          createdBy: 'user-1',
        },
        'batch-1',
        'org-1'
      );

      // Add rows with errors using restoreRows (no status validation)
      const validRow = ImportRow.reconstitute(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-001', Name: 'Product 1' },
          validationResult: ValidationResult.valid(),
        },
        'row-1',
        'org-1'
      );

      const invalidRow = ImportRow.reconstitute(
        {
          rowNumber: 3,
          data: { SKU: '', Name: '' },
          validationResult: ValidationResult.fromErrors([
            'Row 3: Missing required field "SKU"',
            'Row 3: Missing required field "Name"',
          ]),
        },
        'row-2',
        'org-1'
      );

      batch.restoreRows([validRow, invalidRow]);

      const buffer = await service.generateErrorReportXlsx(batch);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // XLSX files start with PK (ZIP header)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should generate report for batch with no errors', async () => {
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('PRODUCTS'),
          status: ImportStatus.create('COMPLETED'),
          fileName: 'test.csv',
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-1',
        },
        'batch-2',
        'org-1'
      );

      const buffer = await service.generateErrorReportXlsx(batch);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate report for batch with warnings only', async () => {
      const batch = ImportBatch.reconstitute(
        {
          type: ImportType.create('MOVEMENTS'),
          status: ImportStatus.create('COMPLETED'),
          fileName: 'movements.csv',
          totalRows: 1,
          processedRows: 1,
          validRows: 1,
          invalidRows: 0,
          createdBy: 'user-1',
        },
        'batch-3',
        'org-1'
      );

      const rowWithWarning = ImportRow.reconstitute(
        {
          rowNumber: 2,
          data: { Type: 'IN', 'Warehouse Code': 'WH-001', 'Product SKU': 'PROD-001', Quantity: 10 },
          validationResult: ValidationResult.create(
            true,
            [],
            ['Row 2: Unit cost not provided, defaulting to 0']
          ),
        },
        'row-w1',
        'org-1'
      );

      batch.restoreRows([rowWithWarning]);

      const buffer = await service.generateErrorReportXlsx(batch);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
