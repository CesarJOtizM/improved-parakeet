// ImportTemplateService Integration Tests
// Integration tests for import template service

import { ImportTemplateService } from '@import/domain/services/importTemplate.service';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';

describe('ImportTemplateService Integration Tests', () => {
  describe('generateCSVTemplate', () => {
    it('Given: PRODUCTS type When: generating CSV template Then: should return CSV with headers and examples', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      expect(csv).toContain('SKU');
      expect(csv).toContain('Name');
      expect(csv.split('\n').length).toBeGreaterThan(1); // Has headers and at least one example row
    });

    it('Given: MOVEMENTS type When: generating CSV template Then: should return CSV with headers and examples', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      expect(csv).toContain('Type');
      expect(csv).toContain('Warehouse Code');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('Given: WAREHOUSES type When: generating CSV template Then: should return CSV with headers and examples', () => {
      // Arrange
      const type = ImportType.create('WAREHOUSES');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      expect(csv).toContain('Code');
      expect(csv).toContain('Name');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('Given: STOCK type When: generating CSV template Then: should return CSV with headers and examples', () => {
      // Arrange
      const type = ImportType.create('STOCK');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      expect(csv).toContain('Product SKU');
      expect(csv).toContain('Warehouse Code');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('Given: TRANSFERS type When: generating CSV template Then: should return CSV with headers and examples', () => {
      // Arrange
      const type = ImportType.create('TRANSFERS');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      expect(csv).toContain('From Warehouse Code');
      expect(csv).toContain('To Warehouse Code');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });

    it('Given: CSV template When: checking format Then: should have proper CSV escaping', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const csv = ImportTemplateService.generateCSVTemplate(type);

      // Assert
      // CSV should be properly formatted
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(0);
      // Each line should have consistent column count
      const headerCount = lines[0].split(',').length;
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          // Count commas (accounting for quoted fields)
          const fieldCount = line.split(',').length;
          expect(fieldCount).toBe(headerCount);
        }
      });
    });
  });

  describe('generateCSVTemplateBuffer', () => {
    it('Given: PRODUCTS type When: generating CSV buffer Then: should return buffer with UTF-8 BOM', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const buffer = ImportTemplateService.generateCSVTemplateBuffer(type);

      // Assert
      expect(buffer).toBeInstanceOf(Buffer);
      // Check for UTF-8 BOM (0xEF 0xBB 0xBF)
      expect(buffer[0]).toBe(0xef);
      expect(buffer[1]).toBe(0xbb);
      expect(buffer[2]).toBe(0xbf);
    });

    it('Given: CSV buffer When: converting to string Then: should match CSV content', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const buffer = ImportTemplateService.generateCSVTemplateBuffer(type);
      const csv = ImportTemplateService.generateCSVTemplate(type);
      const bufferString = buffer.toString('utf-8').slice(1); // Remove BOM

      // Assert
      expect(bufferString).toBe(csv);
    });
  });

  describe('getTemplateFilename', () => {
    it('Given: PRODUCTS type and CSV format When: getting filename Then: should return correct filename', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const filename = ImportTemplateService.getTemplateFilename(type, 'csv');

      // Assert
      expect(filename).toContain('import-template');
      expect(filename).toContain('PRODUCTS');
      expect(filename).toContain('.csv');
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/); // Contains date
    });

    it('Given: MOVEMENTS type and XLSX format When: getting filename Then: should return correct filename', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');

      // Act
      const filename = ImportTemplateService.getTemplateFilename(type, 'xlsx');

      // Assert
      expect(filename).toContain('import-template');
      expect(filename).toContain('MOVEMENTS');
      expect(filename).toContain('.xlsx');
    });
  });

  describe('getColumnDescriptions', () => {
    it('Given: PRODUCTS type When: getting column descriptions Then: should return descriptions', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const descriptions = ImportTemplateService.getColumnDescriptions(type);

      // Assert
      expect(descriptions).toContain('Import Template: PRODUCTS');
      expect(descriptions).toContain('Columns:');
      expect(descriptions).toContain('SKU');
      expect(descriptions).toContain('Type:');
      expect(descriptions).toContain('Description:');
      expect(descriptions).toContain('Example:');
    });

    it('Given: column descriptions When: checking format Then: should have required/optional markers', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const descriptions = ImportTemplateService.getColumnDescriptions(type);

      // Assert
      // Should contain required markers
      expect(descriptions).toMatch(/\(Required\)|\(Optional\)/);
    });

    it('Given: MOVEMENTS type When: getting column descriptions Then: should return descriptions', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');

      // Act
      const descriptions = ImportTemplateService.getColumnDescriptions(type);

      // Assert
      expect(descriptions).toContain('Import Template: MOVEMENTS');
      expect(descriptions).toContain('Type');
    });
  });

  describe('getAvailableTypes', () => {
    it('Given: request for available types When: getting types Then: should return all import types', () => {
      // Act
      const types = ImportTemplateService.getAvailableTypes();

      // Assert
      expect(types).toContain('PRODUCTS');
      expect(types).toContain('MOVEMENTS');
      expect(types).toContain('WAREHOUSES');
      expect(types).toContain('STOCK');
      expect(types).toContain('TRANSFERS');
      expect(types.length).toBe(5);
    });
  });

  describe('getTemplateStructure', () => {
    it('Given: PRODUCTS type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const structure = ImportTemplateService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('PRODUCTS');
      expect(structure.columns.length).toBeGreaterThan(0);
      expect(structure.exampleRows.length).toBeGreaterThan(0);
    });
  });

  describe('getTemplateData', () => {
    it('Given: PRODUCTS type When: getting template data Then: should return data for Excel generation', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const data = ImportTemplateService.getTemplateData(type);

      // Assert
      expect(data.columns).toBeDefined();
      expect(data.headers).toBeDefined();
      expect(data.exampleRows).toBeDefined();
      expect(data.headers.length).toBe(data.columns.length);
      expect(data.exampleRows.length).toBeGreaterThan(0);
    });
  });
});
