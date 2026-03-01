// Import Flow Integration Tests
// Full flow integration tests for import system

import { ImportBatch } from '@import/domain/entities/importBatch.entity';
import { ImportRow } from '@import/domain/entities/importRow.entity';
import { ImportErrorReportService } from '@import/domain/services/importErrorReport.service';
import { ImportProcessingService } from '@import/domain/services/importProcessing.service';
import { ImportValidationService } from '@import/domain/services/importValidation.service';
import { ImportStatus } from '@import/domain/valueObjects/importStatus.valueObject';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';
import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';

import {
  generateCSVFile,
  generateProductsFileWithErrors,
  generateValidMovementsFile,
  generateValidProductsFile,
} from '../helpers/testFileHelpers';

describe('Import Flow Integration Tests', () => {
  const orgId = 'org-123';
  let fileParsingService: FileParsingService;

  beforeEach(() => {
    fileParsingService = new FileParsingService();
  });

  describe('Full Flow: Preview → Execute', () => {
    it('Given: valid file When: previewing then executing Then: should complete successfully', async () => {
      // Arrange
      const file = await generateValidProductsFile();
      const type = ImportType.create('PRODUCTS');

      // Step 1: Parse file
      const parsedData = await fileParsingService.parseFile(file);

      // Step 2: Validate structure
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Step 3: Validate rows
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Step 4: Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Step 5: Process batch
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      batch.markAsProcessing();
      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(true);
      expect(processResult.processedCount).toBe(rows.length);
      expect(processResult.failedCount).toBe(0);
    });

    it('Given: file with errors When: previewing Then: should return errors and reject execution', async () => {
      // Arrange
      const file = await generateProductsFileWithErrors();
      const type = ImportType.create('PRODUCTS');

      // Step 1: Parse file
      const parsedData = await fileParsingService.parseFile(file);

      // Step 2: Validate structure
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Step 3: Validate rows (should have errors)
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Assert: Should have invalid rows
      const invalidRows = rows.filter(r => !r.isValid());
      expect(invalidRows.length).toBeGreaterThan(0);

      // Step 4: Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Step 5: Generate error report
      const errorReport = ImportErrorReportService.generateErrorReport(batch);
      expect(errorReport.summary.errorCount).toBeGreaterThan(0);
      expect(errorReport.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Flow: Manual (Create → Validate → Process)', () => {
    it('Given: valid file When: creating batch then validating then processing Then: should complete successfully', async () => {
      // Arrange
      const file = await generateValidProductsFile();
      const type = ImportType.create('PRODUCTS');

      // Step 1: Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      // Step 2: Parse and validate file
      const parsedData = await fileParsingService.parseFile(file);
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Step 3: Create and validate rows
      batch.start();
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      batch.setRows(rows);
      batch.markAsValidated();

      // Assert: Batch is validated
      expect(batch.status.getValue()).toBe('VALIDATED');
      expect(batch.validRows).toBe(rows.filter(r => r.isValid()).length);

      // Step 4: Process batch
      batch.markAsProcessing();
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(true);
      expect(processResult.processedCount).toBe(rows.length);
    });

    it('Given: file with validation errors When: validating batch Then: should generate error report', async () => {
      // Arrange
      const file = await generateProductsFileWithErrors();
      const type = ImportType.create('PRODUCTS');

      // Step 1: Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      // Step 2: Parse and validate file
      const parsedData = await fileParsingService.parseFile(file);
      batch.start();

      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      batch.setRows(rows);
      batch.markAsValidated();

      // Step 3: Generate error report
      const errorReport = ImportErrorReportService.generateErrorReport(batch);
      const csvReport = ImportErrorReportService.generateCSVErrorReport(batch);

      // Assert
      expect(errorReport.summary.invalidRows).toBeGreaterThan(0);
      expect(errorReport.errors.length).toBeGreaterThan(0);
      expect(csvReport).toContain('Error Report Summary');
      expect(csvReport).toContain('Error Details');
    });

    it('Given: validated batch with processing errors When: processing batch Then: should handle errors and generate report', async () => {
      // Arrange
      const file = await generateValidProductsFile();
      const type = ImportType.create('PRODUCTS');

      // Step 1: Create and validate batch
      const parsedData = await fileParsingService.parseFile(file);
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: 0,
          processedRows: 0,
          validRows: 0,
          invalidRows: 0,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      batch.setRows(rows);
      batch.markAsValidated();

      // Step 2: Process with errors
      batch.markAsProcessing();
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        // Simulate processing error for second row
        if (row.rowNumber === 3) {
          return {
            rowNumber: row.rowNumber,
            success: false,
            error: 'Processing failed: Entity not found',
          };
        }
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(false);
      expect(processResult.failedCount).toBeGreaterThan(0);
    });
  });

  describe('Full Flow: Real File Imports', () => {
    it('Given: valid products Excel file When: importing products Then: should complete successfully', async () => {
      // Arrange
      const file = await generateValidProductsFile();
      const type = ImportType.create('PRODUCTS');

      // Parse
      const parsedData = await fileParsingService.parseFile(file);

      // Validate structure
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Validate rows
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Process
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      batch.markAsProcessing();
      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(true);
      expect(processResult.processedCount).toBe(rows.length);
    });

    it('Given: valid products CSV file When: importing products Then: should complete successfully', async () => {
      // Arrange
      const file = generateCSVFile({
        headers: [
          'SKU',
          'Name',
          'Description',
          'Unit Code',
          'Unit Name',
          'Unit Precision',
          'Status',
        ],
        rows: [
          {
            SKU: 'PROD-001',
            Name: 'Product 1',
            Description: 'Description 1',
            'Unit Code': 'UNIT',
            'Unit Name': 'Unit',
            'Unit Precision': 0,
            Status: 'ACTIVE',
          },
        ],
        filename: 'products.csv',
      });
      const type = ImportType.create('PRODUCTS');

      // Parse
      const parsedData = await fileParsingService.parseFile(file);

      // Validate
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Create rows
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Process
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      batch.markAsProcessing();
      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(true);
    });

    it('Given: products file with errors When: importing then downloading report Then: should generate error report', async () => {
      // Arrange
      const file = await generateProductsFileWithErrors();
      const type = ImportType.create('PRODUCTS');

      // Parse and validate
      const parsedData = await fileParsingService.parseFile(file);
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Generate error report
      const errorReport = ImportErrorReportService.generateErrorReport(batch);
      const csvBuffer = ImportErrorReportService.generateCSVErrorReportBuffer(batch);

      // Assert
      expect(errorReport.summary.errorCount).toBeGreaterThan(0);
      expect(csvBuffer).toBeInstanceOf(Buffer);
      expect(csvBuffer.length).toBeGreaterThan(0);
    });

    it('Given: valid movements file When: importing movements Then: should complete successfully', async () => {
      // Arrange
      const file = await generateValidMovementsFile();
      const type = ImportType.create('MOVEMENTS');

      // Parse
      const parsedData = await fileParsingService.parseFile(file);

      // Validate structure
      const structureValidation = ImportValidationService.validateFileStructure(
        type,
        parsedData.headers
      );
      expect(structureValidation.isValid()).toBe(true);

      // Validate rows
      const rows: ImportRow[] = [];
      for (let i = 0; i < parsedData.rows.length; i++) {
        const rowData = parsedData.rows[i];
        const rowValidation = ImportValidationService.validateRowData(type, rowData, i + 2);
        const row = ImportRow.create(
          {
            rowNumber: i + 2,
            data: rowData,
            validationResult: rowValidation,
          },
          orgId
        );
        rows.push(row);
      }

      // Create batch
      const batch = ImportBatch.create(
        {
          type,
          status: ImportStatus.create('PENDING'),
          fileName: file.originalname,
          totalRows: rows.length,
          processedRows: 0,
          validRows: rows.filter(r => r.isValid()).length,
          invalidRows: rows.filter(r => !r.isValid()).length,
          createdBy: 'user-123',
        },
        orgId
      );

      batch.start();
      batch.setRows(rows);
      batch.markAsValidated();

      // Process
      const rowProcessor = jest.fn(async (row: ImportRow) => {
        return {
          rowNumber: row.rowNumber,
          success: true,
          entityId: `entity-${row.rowNumber}`,
        };
      });

      batch.markAsProcessing();
      const processResult = await ImportProcessingService.processBatch(batch, rowProcessor);

      // Assert
      expect(processResult.success).toBe(true);
      expect(processResult.processedCount).toBe(rows.length);
    });
  });
});
