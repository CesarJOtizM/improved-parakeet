import { ImportBatch } from '../entities/importBatch.entity';

/**
 * Error detail structure
 */
export interface IErrorDetail {
  rowNumber: number;
  column?: string;
  value?: unknown;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Error summary structure
 */
export interface IErrorSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  warningCount: number;
  errorTypes: Record<string, number>;
}

/**
 * Error report data structure
 */
export interface IErrorReportData {
  summary: IErrorSummary;
  errors: IErrorDetail[];
}

/**
 * Import Error Report Service
 * Domain service for generating import error reports
 */
export class ImportErrorReportService {
  /**
   * Generate error report data from an import batch
   */
  public static generateErrorReport(batch: ImportBatch): IErrorReportData {
    const errors: IErrorDetail[] = [];
    const errorTypes: Record<string, number> = {};
    let errorCount = 0;
    let warningCount = 0;

    for (const row of batch.getRows()) {
      // Process errors
      for (const error of row.errors) {
        errors.push({
          rowNumber: row.rowNumber,
          error,
          severity: 'error',
        });
        errorCount++;

        // Count error types
        const errorType = this.extractErrorType(error);
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }

      // Process warnings
      for (const warning of row.warnings) {
        errors.push({
          rowNumber: row.rowNumber,
          error: warning,
          severity: 'warning',
        });
        warningCount++;
      }
    }

    // Sort by row number
    errors.sort((a, b) => a.rowNumber - b.rowNumber);

    return {
      summary: {
        totalRows: batch.totalRows,
        validRows: batch.validRows,
        invalidRows: batch.invalidRows,
        errorCount,
        warningCount,
        errorTypes,
      },
      errors,
    };
  }

  /**
   * Generate CSV content for error report
   */
  public static generateCSVErrorReport(batch: ImportBatch): string {
    const report = this.generateErrorReport(batch);
    const lines: string[] = [];

    // Add summary section
    lines.push('# Error Report Summary');
    lines.push('');
    lines.push(`Total Rows,${report.summary.totalRows}`);
    lines.push(`Valid Rows,${report.summary.validRows}`);
    lines.push(`Invalid Rows,${report.summary.invalidRows}`);
    lines.push(`Error Count,${report.summary.errorCount}`);
    lines.push(`Warning Count,${report.summary.warningCount}`);
    lines.push('');

    // Add error types
    lines.push('# Error Types');
    lines.push('');
    for (const [type, count] of Object.entries(report.summary.errorTypes)) {
      lines.push(`${type},${count}`);
    }
    lines.push('');

    // Add error details header
    lines.push('# Error Details');
    lines.push('Row Number,Severity,Error Message');

    // Add error details
    for (const error of report.errors) {
      lines.push(this.escapeCSVLine([String(error.rowNumber), error.severity, error.error]));
    }

    return lines.join('\n');
  }

  /**
   * Generate CSV buffer for error report
   */
  public static generateCSVErrorReportBuffer(batch: ImportBatch): Buffer {
    const content = this.generateCSVErrorReport(batch);
    // Add UTF-8 BOM for Excel compatibility
    const bom = '\ufeff';
    return Buffer.from(bom + content, 'utf-8');
  }

  /**
   * Get error report filename
   */
  public static getErrorReportFilename(batch: ImportBatch, format: 'xlsx' | 'csv'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `import-errors-${batch.type.getValue()}-${batch.id}-${timestamp}.${format}`;
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
   * Get error report data for Excel generation (to be used by infrastructure layer)
   */
  public static getErrorReportData(batch: ImportBatch): {
    summary: IErrorSummary;
    errors: IErrorDetail[];
    columns: string[];
  } {
    const report = this.generateErrorReport(batch);
    return {
      ...report,
      columns: ['Row Number', 'Severity', 'Error Message'],
    };
  }

  /**
   * Extract error type from error message
   */
  private static extractErrorType(error: string): string {
    // Try to extract the main error type from common patterns
    if (error.includes('Missing required')) {
      return 'Missing required field';
    }
    if (error.includes('Invalid') || error.includes('must be')) {
      return 'Invalid data format';
    }
    if (error.includes('not found') || error.includes('does not exist')) {
      return 'Reference not found';
    }
    if (error.includes('duplicate') || error.includes('already exists')) {
      return 'Duplicate entry';
    }
    return 'Other error';
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
}
