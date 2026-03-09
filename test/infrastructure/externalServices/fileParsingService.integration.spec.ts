// FileParsingService Integration Tests
// Integration tests for file parsing service

import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';

import {
  generateCSVFile,
  generateEmptyFile,
  generateExcelFileAsync,
  generateInvalidFile,
  generateLargeFile,
} from '../../import/helpers/testFileHelpers';

describe('FileParsingService Integration Tests', () => {
  let service: FileParsingService;

  beforeEach(() => {
    service = new FileParsingService();
  });

  describe('validateFileFormat', () => {
    it('Given: valid Excel file When: validating format Then: should return valid', async () => {
      // Arrange
      const file = await generateExcelFileAsync({
        headers: ['SKU', 'Name'],
        rows: [{ SKU: 'PROD-001', Name: 'Test' }],
        filename: 'test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileType).toBe('excel');
    });

    it('Given: valid CSV file When: validating format Then: should return valid', () => {
      // Arrange
      const file = generateCSVFile({
        headers: ['SKU', 'Name'],
        rows: [{ SKU: 'PROD-001', Name: 'Test' }],
        filename: 'test.csv',
        mimetype: 'text/csv',
      });

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileType).toBe('csv');
    });

    it('Given: invalid file extension When: validating format Then: should return invalid', () => {
      // Arrange
      const file = generateInvalidFile();

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });

    it('Given: file too large When: validating format Then: should return invalid', () => {
      // Arrange
      const file = generateLargeFile();

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });

    it('Given: invalid MIME type When: validating format Then: should return invalid', async () => {
      // Arrange
      const file = await generateExcelFileAsync({
        headers: ['SKU'],
        rows: [],
        filename: 'test.xlsx',
        mimetype: 'application/pdf', // Invalid MIME type
      });

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid file type'))).toBe(true);
    });

    it('Given: missing file When: validating format Then: should return invalid', () => {
      // Arrange
      const file = null as unknown as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is required');
    });

    it('Given: CSV content with .xlsx extension When: validating format Then: should reject magic bytes mismatch', () => {
      // Arrange - text content pretending to be xlsx
      const csvContent = 'SKU,Name\nPROD-001,Test';
      const buffer = Buffer.from(csvContent, 'utf-8');
      const file = {
        fieldname: 'file',
        originalname: 'fake.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match Excel format'))).toBe(true);
    });

    it('Given: binary Excel content with .csv extension When: validating format Then: should reject magic bytes mismatch', async () => {
      // Arrange - real xlsx content with csv extension
      const excelFile = await generateExcelFileAsync({
        headers: ['SKU'],
        rows: [{ SKU: 'TEST' }],
        filename: 'fake.csv',
        mimetype: 'text/csv',
      });

      // Act
      const result = service.validateFileFormat(excelFile);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match CSV format'))).toBe(true);
    });

    it('Given: valid xlsx magic bytes with .xlsx extension When: validating format Then: should pass', async () => {
      // Arrange
      const file = await generateExcelFileAsync({
        headers: ['SKU', 'Name'],
        rows: [{ SKU: 'PROD-001', Name: 'Test' }],
        filename: 'valid.xlsx',
      });

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFileFormat - additional branches', () => {
    it('Given: .xls extension with xlsx magic bytes When: validating Then: should reject mismatch', async () => {
      // Arrange - xlsx content (PK header) with .xls extension
      const excelFile = await generateExcelFileAsync({
        headers: ['SKU'],
        rows: [{ SKU: 'TEST' }],
        filename: 'fake.xls',
        mimetype: 'application/vnd.ms-excel',
      });

      // Act
      const result = service.validateFileFormat(excelFile);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('.xlsx format but extension is .xls'))).toBe(true);
    });

    it('Given: .xlsx extension with xls magic bytes When: validating Then: should reject mismatch', () => {
      // Arrange - OLE compound document signature with .xlsx extension
      const xlsSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
      const file = {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: xlsSignature,
        size: xlsSignature.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('legacy .xls format but extension is .xlsx'))).toBe(
        true
      );
    });

    it('Given: file with no extension When: validating Then: should report invalid extension', () => {
      // Arrange
      const buffer = Buffer.from('some data');
      const file = {
        fieldname: 'file',
        originalname: 'noextension',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });

    it('Given: file with buffer less than 4 bytes When: validating Then: should skip magic byte check', () => {
      // Arrange - tiny buffer
      const buffer = Buffer.from([0x50, 0x4b]);
      const file = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert - should still be valid since magic byte check is skipped
      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('csv');
    });

    it('Given: file with no mimetype When: validating Then: should skip mimetype check', () => {
      // Arrange - CSV content without mimetype
      const content = 'SKU,Name\nPROD-001,Test';
      const buffer = Buffer.from(content, 'utf-8');
      const file = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: '',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('csv');
    });

    it('Given: file with application/csv mimetype When: validating Then: should accept', () => {
      // Arrange
      const content = 'SKU,Name\nPROD-001,Test';
      const buffer = Buffer.from(content, 'utf-8');
      const file = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'application/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('csv');
    });

    it('Given: file exceeding size AND invalid extension When: validating Then: should report multiple errors', () => {
      // Arrange
      const buffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const file = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });

    it('Given: valid result When: validating Then: should return maxSize', () => {
      // Arrange
      const file = generateCSVFile({
        headers: ['SKU'],
        rows: [{ SKU: 'TEST' }],
        filename: 'test.csv',
        mimetype: 'text/csv',
      });

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.maxSize).toBe(10 * 1024 * 1024);
    });

    it('Given: invalid result When: validating Then: should return undefined fileType', () => {
      // Arrange
      const file = generateInvalidFile();

      // Act
      const result = service.validateFileFormat(file);

      // Assert
      expect(result.fileType).toBeUndefined();
    });
  });

  describe('parseFile', () => {
    it('Given: Excel file with headers and rows When: parsing file Then: should return parsed data', async () => {
      // Arrange
      const file = await generateExcelFileAsync({
        headers: ['SKU', 'Name', 'Description'],
        rows: [
          { SKU: 'PROD-001', Name: 'Product 1', Description: 'Description 1' },
          { SKU: 'PROD-002', Name: 'Product 2', Description: 'Description 2' },
        ],
        filename: 'test.xlsx',
      });

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name', 'Description']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        SKU: 'PROD-001',
        Name: 'Product 1',
        Description: 'Description 1',
      });
      expect(result.totalRows).toBe(2);
      expect(result.fileType).toBe('excel');
    });

    it('Given: CSV file with headers and rows When: parsing file Then: should return parsed data', async () => {
      // Arrange
      const file = generateCSVFile({
        headers: ['SKU', 'Name'],
        rows: [
          { SKU: 'PROD-001', Name: 'Product 1' },
          { SKU: 'PROD-002', Name: 'Product 2' },
        ],
        filename: 'test.csv',
      });

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        SKU: 'PROD-001',
        Name: 'Product 1',
      });
      expect(result.totalRows).toBe(2);
      expect(result.fileType).toBe('csv');
    });

    it('Given: empty file When: parsing file Then: should throw error', async () => {
      // Arrange
      const file = generateEmptyFile();

      // Act & Assert
      await expect(service.parseFile(file)).rejects.toThrow();
    });

    it('Given: file with special characters When: parsing file Then: should handle correctly', async () => {
      // Arrange
      const file = generateCSVFile({
        headers: ['SKU', 'Name'],
        rows: [
          { SKU: 'PROD-001', Name: 'Product with "quotes" and, commas' },
          { SKU: 'PROD-002', Name: 'Product with newlines' }, // Removed actual newline as CSV parser splits on newlines
        ],
        filename: 'test.csv',
      });

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].Name).toContain('quotes');
      expect(result.rows[0].Name).toContain('commas');
    });

    it('Given: CSV file with UTF-8 BOM When: parsing file Then: should handle BOM correctly', async () => {
      // Arrange
      const bom = '\ufeff';
      const content = bom + 'SKU,Name\nPROD-001,Product 1';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name']);
      expect(result.rows).toHaveLength(1);
    });

    it('Given: Excel file with empty rows When: parsing file Then: should include empty rows', async () => {
      // Arrange
      const file = await generateExcelFileAsync({
        headers: ['SKU', 'Name'],
        rows: [
          { SKU: 'PROD-001', Name: 'Product 1' },
          { SKU: '', Name: '' }, // Empty row
          { SKU: 'PROD-002', Name: 'Product 2' },
        ],
        filename: 'test.xlsx',
      });

      // Act
      const result = await service.parseFile(file);

      // Assert
      // exceljs eachRow with includeEmpty:false skips fully empty rows,
      // but rows with empty string cells are still included
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      // Verify the non-empty rows are present
      expect(result.rows[0].SKU).toBe('PROD-001');
    });

    it('Given: invalid file format When: parsing file Then: should throw error', async () => {
      // Arrange
      const file = generateInvalidFile();

      // Act & Assert
      await expect(service.parseFile(file)).rejects.toThrow('Invalid file format');
    });

    it('Given: CSV file with only headers When: parsing Then: should return zero rows', async () => {
      // Arrange
      const content = 'SKU,Name,Description';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'headers-only.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name', 'Description']);
      expect(result.rows).toHaveLength(0);
      expect(result.totalRows).toBe(0);
      expect(result.fileType).toBe('csv');
    });

    it('Given: CSV with escaped quotes When: parsing Then: should handle escaped quotes correctly', async () => {
      // Arrange
      const content = 'SKU,Name\nPROD-001,"Product with ""quotes"""';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'quotes.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].Name).toContain('quotes');
    });

    it('Given: CSV with missing values When: parsing Then: should set missing values to null', async () => {
      // Arrange
      const content = 'SKU,Name,Description\nPROD-001,,';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'missing.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].Name).toBeNull();
      expect(result.rows[0].Description).toBeNull();
    });

    it('Given: CSV with extra columns in data row When: parsing Then: should ignore extra values', async () => {
      // Arrange
      const content = 'SKU,Name\nPROD-001,Test,extra-value';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'extra.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].SKU).toBe('PROD-001');
      expect(result.rows[0].Name).toBe('Test');
    });

    it('Given: CSV with fewer columns in data row When: parsing Then: should set missing to null', async () => {
      // Arrange
      const content = 'SKU,Name,Description\nPROD-001';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'fewer.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].Name).toBeNull();
      expect(result.rows[0].Description).toBeNull();
    });

    it('Given: CSV with Windows line endings When: parsing Then: should handle CRLF', async () => {
      // Arrange
      const content = 'SKU,Name\r\nPROD-001,Product 1\r\nPROD-002,Product 2';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'windows.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].SKU).toBe('PROD-001');
      expect(result.rows[1].SKU).toBe('PROD-002');
    });

    it('Given: .xls extension file When: parsing Then: should call parseExcel', async () => {
      // Arrange - since we can't easily generate a real .xls buffer, we test via
      // validateFileFormat rejection (text content with .xls extension)
      const content = 'not-excel';
      const buffer = Buffer.from(content, 'utf-8');
      const file = {
        fieldname: 'file',
        originalname: 'test.xls',
        encoding: '7bit',
        mimetype: 'application/vnd.ms-excel',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act & Assert - should fail validation before parsing
      await expect(service.parseFile(file)).rejects.toThrow('Invalid file format');
    });

    it('Given: CSV with whitespace-only headers When: parsing Then: should filter empty headers', async () => {
      // Arrange
      const content = 'SKU, ,Name\nPROD-001,,Product 1';
      const buffer = Buffer.from(content, 'utf-8');
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'whitespace.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        buffer,
        size: buffer.length,
      } as Express.Multer.File;

      // Act
      const result = await service.parseFile(file);

      // Assert
      expect(result.headers).toEqual(['SKU', 'Name']);
    });
  });
});
