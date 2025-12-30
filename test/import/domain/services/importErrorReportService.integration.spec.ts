// ImportErrorReportService Integration Tests
// Integration tests for import error report service

import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportRow } from '@import/domain/entities/importRow.entity';
import { ImportErrorReportService } from '@import/domain/services/importErrorReport.service';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { ValidationResult } from '@import/domain/valueObjects/validationResult.valueObject';

describe('ImportErrorReportService Integration Tests', () => {
  const orgId = 'org-123';

  describe('generateErrorReport', () => {
    it('Given: batch with errors only When: generating error report Then: should return report with errors', () => {
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
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Missing required field "SKU"']),
        },
        orgId
      );

      const row2 = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-002', Name: '' },
          validationResult: ValidationResult.invalid(['Missing required field "Name"']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row1, row2]);
      batch.markAsValidated();

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.summary.totalRows).toBe(2);
      expect(report.summary.validRows).toBe(0);
      expect(report.summary.invalidRows).toBe(2);
      expect(report.summary.errorCount).toBe(2);
      expect(report.summary.warningCount).toBe(0);
      expect(report.errors).toHaveLength(2);
      expect(report.errors.every(e => e.severity === 'error')).toBe(true);
    });

    it('Given: batch with warnings only When: generating error report Then: should return report with warnings', () => {
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
          validationResult: ValidationResult.create(true, [], ['Warning: Unknown column']),
        },
        orgId
      );

      const row2 = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-002', Name: 'Product 2' },
          validationResult: ValidationResult.create(true, [], ['Warning: Duplicate SKU']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row1, row2]);
      batch.markAsValidated();

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(2);
      expect(report.errors).toHaveLength(2);
      expect(report.errors.every(e => e.severity === 'warning')).toBe(true);
    });

    it('Given: batch with both errors and warnings When: generating error report Then: should return report with both', () => {
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
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Missing required field "SKU"']),
        },
        orgId
      );

      const row2 = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-002', Name: 'Product 2' },
          validationResult: ValidationResult.create(true, [], ['Warning: Unknown column']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row1, row2]);
      batch.markAsValidated();

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.summary.errorCount).toBe(1);
      expect(report.summary.warningCount).toBe(1);
      expect(report.errors).toHaveLength(2);
      expect(report.errors.some(e => e.severity === 'error')).toBe(true);
      expect(report.errors.some(e => e.severity === 'warning')).toBe(true);
    });

    it('Given: batch with no errors When: generating error report Then: should return empty report', () => {
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

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
      expect(report.errors).toHaveLength(0);
    });

    it('Given: batch with errors When: generating error report Then: should count error types', () => {
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
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Missing required field "SKU"']),
        },
        orgId
      );

      const row2 = ImportRow.create(
        {
          rowNumber: 2,
          data: { SKU: 'PROD-002', Name: '' },
          validationResult: ValidationResult.invalid(['Missing required field "Name"']),
        },
        orgId
      );

      const row3 = ImportRow.create(
        {
          rowNumber: 3,
          data: { SKU: 'PROD-003', Name: 'Product 3' },
          validationResult: ValidationResult.invalid(['Invalid data format']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row1, row2, row3]);
      batch.markAsValidated();

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.summary.errorTypes).toBeDefined();
      expect(Object.keys(report.summary.errorTypes).length).toBeGreaterThan(0);
    });

    it('Given: batch with errors When: generating error report Then: should sort by row number', () => {
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
            rowNumber: 3,
            data: { SKU: '', Name: 'Product 3' },
            validationResult: ValidationResult.invalid(['Error 3']),
          },
          orgId
        ),
        ImportRow.create(
          {
            rowNumber: 1,
            data: { SKU: '', Name: 'Product 1' },
            validationResult: ValidationResult.invalid(['Error 1']),
          },
          orgId
        ),
        ImportRow.create(
          {
            rowNumber: 2,
            data: { SKU: '', Name: 'Product 2' },
            validationResult: ValidationResult.invalid(['Error 2']),
          },
          orgId
        ),
      ];

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Act
      const report = ImportErrorReportService.generateErrorReport(batch);

      // Assert
      expect(report.errors[0].rowNumber).toBe(1);
      expect(report.errors[1].rowNumber).toBe(2);
      expect(report.errors[2].rowNumber).toBe(3);
    });
  });

  describe('generateCSVErrorReport', () => {
    it('Given: batch with errors When: generating CSV report Then: should return CSV content', () => {
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

      const row = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Missing required field "SKU"']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row]);
      batch.markAsValidated();

      // Act
      const csv = ImportErrorReportService.generateCSVErrorReport(batch);

      // Assert
      expect(csv).toContain('# Error Report Summary');
      expect(csv).toContain('Total Rows');
      expect(csv).toContain('# Error Details');
      expect(csv).toContain('Row Number,Severity,Error Message');
      expect(csv).toContain('1,error');
    });

    it('Given: CSV report When: checking format Then: should have proper CSV escaping', () => {
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

      const row = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Error with "quotes" and, commas']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row]);
      batch.markAsValidated();

      // Act
      const csv = ImportErrorReportService.generateCSVErrorReport(batch);

      // Assert
      expect(csv).toContain('Error with');
      expect(csv).toContain('quotes');
      // CSV should properly escape quotes (double quotes in CSV)
      expect(csv).toContain('""quotes""');
    });
  });

  describe('generateCSVErrorReportBuffer', () => {
    it('Given: batch with errors When: generating CSV buffer Then: should return buffer with UTF-8 BOM', () => {
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

      const row = ImportRow.create(
        {
          rowNumber: 1,
          data: { SKU: '', Name: 'Product 1' },
          validationResult: ValidationResult.invalid(['Missing required field "SKU"']),
        },
        orgId
      );

      batch.start();
      batch.setRows([row]);
      batch.markAsValidated();

      // Act
      const buffer = ImportErrorReportService.generateCSVErrorReportBuffer(batch);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      // Check for UTF-8 BOM (0xEF 0xBB 0xBF)
      expect(buffer[0]).toBe(0xef);
      expect(buffer[1]).toBe(0xbb);
      expect(buffer[2]).toBe(0xbf);
    });
  });

  describe('getErrorReportFilename', () => {
    it('Given: batch and format When: getting filename Then: should return correct filename', () => {
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

      // Act
      const csvFilename = ImportErrorReportService.getErrorReportFilename(batch, 'csv');
      const xlsxFilename = ImportErrorReportService.getErrorReportFilename(batch, 'xlsx');

      // Assert
      expect(csvFilename).toContain('import-errors');
      expect(csvFilename).toContain('PRODUCTS');
      expect(csvFilename).toContain(batch.id); // Use the actual generated ID
      expect(csvFilename).toContain('.csv');
      expect(xlsxFilename).toContain('.xlsx');
    });
  });

  describe('getMimeType', () => {
    it('Given: CSV format When: getting MIME type Then: should return text/csv', () => {
      // Act
      const mimeType = ImportErrorReportService.getMimeType('csv');

      // Assert
      expect(mimeType).toBe('text/csv');
    });

    it('Given: XLSX format When: getting MIME type Then: should return Excel MIME type', () => {
      // Act
      const mimeType = ImportErrorReportService.getMimeType('xlsx');

      // Assert
      expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});
