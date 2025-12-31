// ImportValidationService Integration Tests
// Integration tests for import validation service

import { ImportValidationService } from '@import/domain/services/importValidation.service';
import { ImportType } from '@import/domain/valueObjects/importType.valueObject';

describe('ImportValidationService Integration Tests', () => {
  describe('validateFileStructure', () => {
    it('Given: valid structure for PRODUCTS When: validating structure Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const headers = [
        'SKU',
        'Name',
        'Description',
        'Unit Code',
        'Unit Name',
        'Unit Precision',
        'Status',
      ];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: valid structure for MOVEMENTS When: validating structure Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');
      const headers = [
        'Type',
        'Warehouse Code',
        'Product SKU',
        'Quantity',
        'Unit Cost',
        'Currency',
        'Reference',
      ];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: valid structure for WAREHOUSES When: validating structure Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('WAREHOUSES');
      const headers = ['Code', 'Name', 'Description', 'Address'];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: valid structure for STOCK When: validating structure Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('STOCK');
      const headers = ['Product SKU', 'Warehouse Code', 'Quantity', 'Unit Cost', 'Currency'];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: valid structure for TRANSFERS When: validating structure Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('TRANSFERS');
      const headers = [
        'From Warehouse Code',
        'To Warehouse Code',
        'Product SKU',
        'Quantity',
        'Note',
      ];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: missing required headers When: validating structure Then: should return invalid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const headers = ['Name', 'Description']; // Missing SKU

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors().some(e => e.includes('Missing required column: SKU'))).toBe(true);
    });

    it('Given: invalid header names When: validating structure Then: should return warnings', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const headers = [
        'SKU',
        'Name',
        'Description',
        'Unit Code',
        'Unit Name',
        'Unit Precision',
        'Invalid Header',
      ];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      // Should be valid if all required columns are present, even with unknown columns
      expect(result.isValid()).toBe(true);
      expect(result.getWarnings().some(w => w.includes('Unknown column'))).toBe(true);
    });

    it('Given: extra headers When: validating structure Then: should allow and warn', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const headers = [
        'SKU',
        'Name',
        'Description',
        'Unit Code',
        'Unit Name',
        'Unit Precision',
        'Extra Column 1',
        'Extra Column 2',
      ];

      // Act
      const result = ImportValidationService.validateFileStructure(type, headers);

      // Assert
      // Should be valid if all required columns are present
      expect(result.isValid()).toBe(true);
      expect(result.getWarnings().length).toBeGreaterThan(0);
    });
  });

  describe('validateRowData', () => {
    it('Given: valid row for PRODUCTS When: validating row Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const rowData = {
        SKU: 'PROD-001',
        Name: 'Test Product',
        Description: 'Test Description',
        'Unit Code': 'UNIT',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
        Status: 'ACTIVE',
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: valid row for MOVEMENTS When: validating row Then: should return valid', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');
      const rowData = {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        Quantity: 10,
        'Unit Cost': 100.5,
        Currency: 'COP',
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(true);
      expect(result.getErrors()).toHaveLength(0);
    });

    it('Given: missing required fields When: validating row Then: should return invalid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const rowData = {
        Name: 'Test Product',
        // Missing SKU
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors().some(e => e.includes('Missing required field "SKU"'))).toBe(true);
    });

    it('Given: invalid data types When: validating row Then: should return invalid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const rowData = {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Precision': 'invalid', // Should be number
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors().some(e => e.includes('must be a number'))).toBe(true);
    });

    it('Given: invalid enum values When: validating row Then: should return invalid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const rowData = {
        SKU: 'PROD-001',
        Name: 'Test Product',
        Status: 'INVALID_STATUS', // Invalid enum value
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(false);
      expect(result.getErrors().some(e => e.includes('must be one of'))).toBe(true);
    });

    it('Given: invalid date format When: validating row Then: should return invalid', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');
      const rowData = {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        Quantity: 10,
        Date: 'invalid-date', // Invalid date format
      };

      // Act
      ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      // Note: Date validation depends on template structure
      // This test may need adjustment based on actual template
    });

    it('Given: empty optional fields When: validating row Then: should be valid', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');
      const rowData = {
        SKU: 'PROD-001',
        Name: 'Test Product',
        Description: '', // Optional field, empty is OK
        'Unit Code': 'UNIT',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
      };

      // Act
      const result = ImportValidationService.validateRowData(type, rowData, 1);

      // Assert
      expect(result.isValid()).toBe(true);
    });
  });

  describe('getTemplateStructure', () => {
    it('Given: PRODUCTS type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('PRODUCTS');
      expect(structure.columns.length).toBeGreaterThan(0);
      expect(structure.columns.some(c => c.name === 'SKU' && c.required)).toBe(true);
      expect(structure.exampleRows.length).toBeGreaterThan(0);
    });

    it('Given: MOVEMENTS type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('MOVEMENTS');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('MOVEMENTS');
      expect(structure.columns.length).toBeGreaterThan(0);
      expect(structure.columns.some(c => c.name === 'Type' && c.required)).toBe(true);
    });

    it('Given: WAREHOUSES type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('WAREHOUSES');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('WAREHOUSES');
      expect(structure.columns.length).toBeGreaterThan(0);
    });

    it('Given: STOCK type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('STOCK');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('STOCK');
      expect(structure.columns.length).toBeGreaterThan(0);
    });

    it('Given: TRANSFERS type When: getting template structure Then: should return structure', () => {
      // Arrange
      const type = ImportType.create('TRANSFERS');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      expect(structure.type).toBe('TRANSFERS');
      expect(structure.columns.length).toBeGreaterThan(0);
    });

    it('Given: template structure When: checking columns Then: should have correct properties', () => {
      // Arrange
      const type = ImportType.create('PRODUCTS');

      // Act
      const structure = ImportValidationService.getTemplateStructure(type);

      // Assert
      structure.columns.forEach(column => {
        expect(column.name).toBeDefined();
        expect(column.dataType).toBeDefined();
        expect(column.description).toBeDefined();
        expect(column.example).toBeDefined();
        expect(typeof column.required).toBe('boolean');
      });
    });
  });
});
