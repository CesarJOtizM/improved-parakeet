import { ImportType, ImportTypeValue } from '../valueObjects/importType.valueObject';
import { ValidationResult } from '../valueObjects/validationResult.valueObject';

/**
 * Template column structure for validation
 */
export interface ITemplateColumn {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  validationRules?: string[];
  enumValues?: string[];
  example: string | number | boolean;
}

/**
 * Template structure for import types
 */
export interface ITemplateStructure {
  type: ImportTypeValue;
  columns: ITemplateColumn[];
  exampleRows: Record<string, unknown>[];
}

/**
 * Import Validation Service
 * Domain service for validating import data
 */
export class ImportValidationService {
  /**
   * Get template structure for an import type
   */
  public static getTemplateStructure(type: ImportType): ITemplateStructure {
    switch (type.getValue()) {
      case 'PRODUCTS':
        return this.getProductsTemplateStructure();
      case 'MOVEMENTS':
        return this.getMovementsTemplateStructure();
      case 'WAREHOUSES':
        return this.getWarehousesTemplateStructure();
      case 'STOCK':
        return this.getStockTemplateStructure();
      case 'TRANSFERS':
        return this.getTransfersTemplateStructure();
      default:
        throw new Error(`Unknown import type: ${type.getValue()}`);
    }
  }

  /**
   * Validate file structure (headers) against template
   */
  public static validateFileStructure(type: ImportType, headers: string[]): ValidationResult {
    const template = this.getTemplateStructure(type);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get required columns
    const requiredColumns = template.columns.filter(c => c.required).map(c => c.name);
    const optionalColumns = template.columns.filter(c => !c.required).map(c => c.name);

    // Check for missing required columns
    for (const required of requiredColumns) {
      if (!headers.includes(required)) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    // Check for unknown columns (warnings)
    const allKnownColumns = [...requiredColumns, ...optionalColumns];
    for (const header of headers) {
      if (!allKnownColumns.includes(header)) {
        warnings.push(`Unknown column: ${header} (will be ignored)`);
      }
    }

    return ValidationResult.create(errors.length === 0, errors, warnings);
  }

  /**
   * Validate row data against template
   */
  public static validateRowData(
    type: ImportType,
    rowData: Record<string, unknown>,
    rowNumber: number
  ): ValidationResult {
    const template = this.getTemplateStructure(type);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const column of template.columns) {
      const value = rowData[column.name];

      // Check required fields
      if (column.required && (value === null || value === undefined || value === '')) {
        errors.push(`Row ${rowNumber}: Missing required field "${column.name}"`);
        continue;
      }

      // Skip validation for empty optional fields
      if (!column.required && (value === null || value === undefined || value === '')) {
        continue;
      }

      // Validate data type
      const typeValidation = this.validateDataType(value, column, rowNumber);
      if (!typeValidation.isValid()) {
        errors.push(...typeValidation.getErrors());
      }
      if (typeValidation.hasWarnings()) {
        warnings.push(...typeValidation.getWarnings());
      }
    }

    return ValidationResult.create(errors.length === 0, errors, warnings);
  }

  /**
   * Validate data type for a value
   */
  private static validateDataType(
    value: unknown,
    column: ITemplateColumn,
    rowNumber: number
  ): ValidationResult {
    const errors: string[] = [];

    switch (column.dataType) {
      case 'string':
        if (typeof value !== 'string' && value !== null) {
          // Try to convert to string
          if (typeof value === 'number' || typeof value === 'boolean') {
            // Allow conversion
          } else {
            errors.push(`Row ${rowNumber}: Field "${column.name}" must be a string`);
          }
        }
        break;

      case 'number':
        if (typeof value === 'string') {
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push(`Row ${rowNumber}: Field "${column.name}" must be a number`);
          }
        } else if (typeof value !== 'number') {
          errors.push(`Row ${rowNumber}: Field "${column.name}" must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (!['true', 'false', 'yes', 'no', '1', '0'].includes(lower)) {
            errors.push(
              `Row ${rowNumber}: Field "${column.name}" must be a boolean (true/false, yes/no, 1/0)`
            );
          }
        } else if (typeof value !== 'boolean') {
          errors.push(`Row ${rowNumber}: Field "${column.name}" must be a boolean`);
        }
        break;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNumber}: Field "${column.name}" must be a valid date`);
          }
        } else if (!(value instanceof Date)) {
          errors.push(`Row ${rowNumber}: Field "${column.name}" must be a valid date`);
        }
        break;

      case 'enum':
        if (column.enumValues && !column.enumValues.includes(String(value))) {
          errors.push(
            `Row ${rowNumber}: Field "${column.name}" must be one of: ${column.enumValues.join(', ')}`
          );
        }
        break;
    }

    return ValidationResult.fromErrors(errors);
  }

  // Template structures for each import type

  private static getProductsTemplateStructure(): ITemplateStructure {
    return {
      type: 'PRODUCTS',
      columns: [
        {
          name: 'SKU',
          dataType: 'string',
          required: true,
          description: 'Unique product SKU',
          example: 'PROD-001',
        },
        {
          name: 'Name',
          dataType: 'string',
          required: true,
          description: 'Product name',
          example: 'Product Example',
        },
        {
          name: 'Description',
          dataType: 'string',
          required: false,
          description: 'Product description',
          example: 'Description here',
        },
        {
          name: 'Unit Code',
          dataType: 'string',
          required: true,
          description: 'Unit code (UND, KG, etc)',
          example: 'UND',
        },
        {
          name: 'Unit Name',
          dataType: 'string',
          required: true,
          description: 'Unit name',
          example: 'Unit',
        },
        {
          name: 'Unit Precision',
          dataType: 'number',
          required: true,
          description: 'Decimal precision for unit',
          example: 0,
        },
        {
          name: 'Barcode',
          dataType: 'string',
          required: false,
          description: 'Product barcode',
          example: '1234567890123',
        },
        {
          name: 'Brand',
          dataType: 'string',
          required: false,
          description: 'Product brand',
          example: 'Brand A',
        },
        {
          name: 'Model',
          dataType: 'string',
          required: false,
          description: 'Product model',
          example: 'Model X',
        },
        {
          name: 'Status',
          dataType: 'enum',
          required: false,
          description: 'Product status',
          enumValues: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
          example: 'ACTIVE',
        },
        {
          name: 'Cost Method',
          dataType: 'enum',
          required: false,
          description: 'Cost calculation method',
          enumValues: ['AVG', 'FIFO'],
          example: 'AVG',
        },
        {
          name: 'Category',
          dataType: 'string',
          required: false,
          description: 'Product category',
          example: 'Category A',
        },
      ],
      exampleRows: [
        {
          SKU: 'PROD-001',
          Name: 'Product Example 1',
          Description: 'Description',
          'Unit Code': 'UND',
          'Unit Name': 'Unit',
          'Unit Precision': 0,
          Barcode: '1234567890123',
          Brand: 'Brand A',
          Model: 'Model X',
          Status: 'ACTIVE',
          'Cost Method': 'AVG',
          Category: 'Category A',
        },
        {
          SKU: 'PROD-002',
          Name: 'Product Example 2',
          Description: 'Another product',
          'Unit Code': 'KG',
          'Unit Name': 'Kilogram',
          'Unit Precision': 3,
          Barcode: '9876543210987',
          Brand: 'Brand B',
          Model: 'Model Y',
          Status: 'ACTIVE',
          'Cost Method': 'FIFO',
          Category: 'Category B',
        },
      ],
    };
  }

  private static getMovementsTemplateStructure(): ITemplateStructure {
    return {
      type: 'MOVEMENTS',
      columns: [
        {
          name: 'Type',
          dataType: 'enum',
          required: true,
          description: 'Movement type',
          enumValues: ['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT'],
          example: 'IN',
        },
        {
          name: 'Warehouse Code',
          dataType: 'string',
          required: true,
          description: 'Warehouse code',
          example: 'WH-001',
        },
        {
          name: 'Product SKU',
          dataType: 'string',
          required: true,
          description: 'Product SKU',
          example: 'PROD-001',
        },
        {
          name: 'Location Code',
          dataType: 'string',
          required: false,
          description: 'Location code',
          example: 'LOC-001',
        },
        {
          name: 'Quantity',
          dataType: 'number',
          required: true,
          description: 'Movement quantity',
          example: 100,
        },
        {
          name: 'Unit Cost',
          dataType: 'number',
          required: false,
          description: 'Unit cost',
          example: 10.5,
        },
        {
          name: 'Currency',
          dataType: 'string',
          required: false,
          description: 'Currency code',
          example: 'COP',
        },
        {
          name: 'Reference',
          dataType: 'string',
          required: false,
          description: 'Reference number',
          example: 'REF-001',
        },
        {
          name: 'Reason',
          dataType: 'string',
          required: false,
          description: 'Movement reason',
          example: 'Purchase',
        },
        {
          name: 'Note',
          dataType: 'string',
          required: false,
          description: 'Additional notes',
          example: 'Initial stock',
        },
      ],
      exampleRows: [
        {
          Type: 'IN',
          'Warehouse Code': 'WH-001',
          'Product SKU': 'PROD-001',
          'Location Code': 'LOC-001',
          Quantity: 100,
          'Unit Cost': 10.5,
          Currency: 'COP',
          Reference: 'REF-001',
          Reason: 'Purchase',
          Note: 'Initial stock',
        },
        {
          Type: 'OUT',
          'Warehouse Code': 'WH-001',
          'Product SKU': 'PROD-002',
          'Location Code': 'LOC-002',
          Quantity: 50,
          'Unit Cost': 15.75,
          Currency: 'COP',
          Reference: 'REF-002',
          Reason: 'Sale',
          Note: 'Regular sale',
        },
      ],
    };
  }

  private static getWarehousesTemplateStructure(): ITemplateStructure {
    return {
      type: 'WAREHOUSES',
      columns: [
        {
          name: 'Code',
          dataType: 'string',
          required: true,
          description: 'Unique warehouse code',
          example: 'WH-001',
        },
        {
          name: 'Name',
          dataType: 'string',
          required: true,
          description: 'Warehouse name',
          example: 'Warehouse Example',
        },
        {
          name: 'Description',
          dataType: 'string',
          required: false,
          description: 'Warehouse description',
          example: 'Main warehouse',
        },
        {
          name: 'Address',
          dataType: 'string',
          required: false,
          description: 'Warehouse address',
          example: '123 Main St',
        },
      ],
      exampleRows: [
        {
          Code: 'WH-001',
          Name: 'Warehouse Example 1',
          Description: 'Main warehouse',
          Address: '123 Main St',
        },
        {
          Code: 'WH-002',
          Name: 'Warehouse Example 2',
          Description: 'Secondary warehouse',
          Address: '456 Oak Ave',
        },
      ],
    };
  }

  private static getStockTemplateStructure(): ITemplateStructure {
    return {
      type: 'STOCK',
      columns: [
        {
          name: 'Product SKU',
          dataType: 'string',
          required: true,
          description: 'Product SKU',
          example: 'PROD-001',
        },
        {
          name: 'Warehouse Code',
          dataType: 'string',
          required: true,
          description: 'Warehouse code',
          example: 'WH-001',
        },
        {
          name: 'Location Code',
          dataType: 'string',
          required: false,
          description: 'Location code',
          example: 'LOC-001',
        },
        {
          name: 'Quantity',
          dataType: 'number',
          required: true,
          description: 'Stock quantity',
          example: 500,
        },
        {
          name: 'Unit Cost',
          dataType: 'number',
          required: false,
          description: 'Unit cost',
          example: 10.5,
        },
        {
          name: 'Currency',
          dataType: 'string',
          required: false,
          description: 'Currency code',
          example: 'COP',
        },
      ],
      exampleRows: [
        {
          'Product SKU': 'PROD-001',
          'Warehouse Code': 'WH-001',
          'Location Code': 'LOC-001',
          Quantity: 500,
          'Unit Cost': 10.5,
          Currency: 'COP',
        },
        {
          'Product SKU': 'PROD-002',
          'Warehouse Code': 'WH-001',
          'Location Code': 'LOC-002',
          Quantity: 300,
          'Unit Cost': 15.75,
          Currency: 'COP',
        },
      ],
    };
  }

  private static getTransfersTemplateStructure(): ITemplateStructure {
    return {
      type: 'TRANSFERS',
      columns: [
        {
          name: 'From Warehouse Code',
          dataType: 'string',
          required: true,
          description: 'Source warehouse code',
          example: 'WH-001',
        },
        {
          name: 'To Warehouse Code',
          dataType: 'string',
          required: true,
          description: 'Destination warehouse code',
          example: 'WH-002',
        },
        {
          name: 'Product SKU',
          dataType: 'string',
          required: true,
          description: 'Product SKU',
          example: 'PROD-001',
        },
        {
          name: 'From Location Code',
          dataType: 'string',
          required: false,
          description: 'Source location code',
          example: 'LOC-001',
        },
        {
          name: 'To Location Code',
          dataType: 'string',
          required: false,
          description: 'Destination location code',
          example: 'LOC-003',
        },
        {
          name: 'Quantity',
          dataType: 'number',
          required: true,
          description: 'Transfer quantity',
          example: 100,
        },
        {
          name: 'Note',
          dataType: 'string',
          required: false,
          description: 'Transfer note',
          example: 'Transfer between warehouses',
        },
      ],
      exampleRows: [
        {
          'From Warehouse Code': 'WH-001',
          'To Warehouse Code': 'WH-002',
          'Product SKU': 'PROD-001',
          'From Location Code': 'LOC-001',
          'To Location Code': 'LOC-003',
          Quantity: 100,
          Note: 'Transfer between warehouses',
        },
        {
          'From Warehouse Code': 'WH-001',
          'To Warehouse Code': 'WH-002',
          'Product SKU': 'PROD-002',
          'From Location Code': 'LOC-002',
          'To Location Code': 'LOC-004',
          Quantity: 50,
          Note: 'Regular transfer',
        },
      ],
    };
  }
}
