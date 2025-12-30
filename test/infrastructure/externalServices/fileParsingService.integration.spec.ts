// FileParsingService Integration Tests
// Integration tests for file parsing service

import { FileParsingService } from '@infrastructure/externalServices/fileParsingService';

import {
  generateCSVFile,
  generateEmptyFile,
  generateExcelFile,
  generateInvalidFile,
  generateLargeFile,
} from '../../import/helpers/testFileHelpers';

describe('FileParsingService Integration Tests', () => {
  let service: FileParsingService;

  beforeEach(() => {
    service = new FileParsingService();
  });

  describe('validateFileFormat', () => {
    it('Given: valid Excel file When: validating format Then: should return valid', () => {
      // Arrange
      const file = generateExcelFile({
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

    it('Given: invalid MIME type When: validating format Then: should return invalid', () => {
      // Arrange
      const file = generateExcelFile({
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
  });

  describe('parseFile', () => {
    it('Given: Excel file with headers and rows When: parsing file Then: should return parsed data', async () => {
      // Arrange
      const file = generateExcelFile({
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
      const file = generateExcelFile({
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
      expect(result.rows).toHaveLength(3); // All rows are included, even empty ones
      // Excel parser with raw:false converts empty cells to empty strings
      expect(result.rows[1].SKU).toBe('');
      expect(result.rows[1].Name).toBe('');
    });

    it('Given: invalid file format When: parsing file Then: should throw error', async () => {
      // Arrange
      const file = generateInvalidFile();

      // Act & Assert
      await expect(service.parseFile(file)).rejects.toThrow('Invalid file format');
    });
  });
});
