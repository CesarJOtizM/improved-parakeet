import { ImportType, ImportTypeValue } from '../valueObjects/importType.valueObject';

import {
  ImportValidationService,
  ITemplateColumn,
  ITemplateStructure,
} from './importValidation.service';

/**
 * Import Template Service
 * Domain service for generating import templates
 */
export class ImportTemplateService {
  /**
   * Get template structure for an import type
   */
  public static getTemplateStructure(type: ImportType): ITemplateStructure {
    return ImportValidationService.getTemplateStructure(type);
  }

  /**
   * Generate CSV content for a template
   */
  public static generateCSVTemplate(type: ImportType): string {
    const template = this.getTemplateStructure(type);
    const lines: string[] = [];

    // Add header row
    const headers = template.columns.map(col => col.name);
    lines.push(this.escapeCSVLine(headers));

    // Add example rows
    for (const exampleRow of template.exampleRows) {
      const values = headers.map(header => {
        const value = exampleRow[header];
        return value !== undefined && value !== null ? String(value) : '';
      });
      lines.push(this.escapeCSVLine(values));
    }

    return lines.join('\n');
  }

  /**
   * Generate CSV buffer for a template
   */
  public static generateCSVTemplateBuffer(type: ImportType): Buffer {
    const content = this.generateCSVTemplate(type);
    // Add UTF-8 BOM for Excel compatibility
    const bom = '\ufeff';
    return Buffer.from(bom + content, 'utf-8');
  }

  /**
   * Get template filename
   */
  public static getTemplateFilename(type: ImportType, format: 'xlsx' | 'csv'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `import-template-${type.getValue()}-${timestamp}.${format}`;
  }

  /**
   * Get MIME type for format
   */
  public static getMimeType(format: 'xlsx' | 'csv'): string {
    if (format === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'text/csv';
  }

  /**
   * Get column descriptions for documentation
   */
  public static getColumnDescriptions(type: ImportType): string {
    const template = this.getTemplateStructure(type);
    const lines: string[] = [];

    lines.push(`Import Template: ${type.getValue()}`);
    lines.push('');
    lines.push('Columns:');
    lines.push('');

    for (const col of template.columns) {
      const required = col.required ? '(Required)' : '(Optional)';
      lines.push(`- ${col.name} ${required}`);
      lines.push(`  Type: ${col.dataType}`);
      lines.push(`  Description: ${col.description}`);
      lines.push(`  Example: ${col.example}`);
      if (col.enumValues) {
        lines.push(`  Allowed values: ${col.enumValues.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get all available template types
   */
  public static getAvailableTypes(): ImportTypeValue[] {
    return ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'];
  }

  /**
   * Escape CSV line properly
   */
  private static escapeCSVLine(values: string[]): string {
    return values
      .map(value => {
        // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  }

  /**
   * Generate template data for Excel (to be used by infrastructure layer)
   */
  public static getTemplateData(type: ImportType): {
    columns: ITemplateColumn[];
    headers: string[];
    exampleRows: Record<string, unknown>[];
  } {
    const template = this.getTemplateStructure(type);
    return {
      columns: template.columns,
      headers: template.columns.map(c => c.name),
      exampleRows: template.exampleRows,
    };
  }
}
