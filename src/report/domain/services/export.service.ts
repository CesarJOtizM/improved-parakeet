import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  IReportParametersInput,
  REPORT_FORMATS,
  ReportFormat,
  ReportFormatValue,
  ReportTypeValue,
} from '../valueObjects';

import { IReportColumn, ReportViewService } from './reportView.service';

import type { IDocumentColumn, IDocumentGenerationService } from '@shared/ports/externalServices';

/**
 * Export result containing file data and metadata
 */
export interface IExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Export options
 */
export interface IExportOptions {
  includeHeader?: boolean;
  includeSummary?: boolean;
  title?: string;
  author?: string;
}

/**
 * Export Service
 *
 * Handles export of reports to different formats.
 * - CSV and JSON: Generated natively (no external dependencies)
 * - PDF and Excel: Delegated to IDocumentGenerationService (external service port)
 *
 * This follows Hexagonal Architecture by depending on abstractions (ports)
 * rather than concrete implementations for PDF/Excel generation.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly reportViewService: ReportViewService,
    @Inject('DocumentGenerationService')
    private readonly documentGenerationService: IDocumentGenerationService
  ) {}

  /**
   * Export report to specified format
   */
  public async exportReport(
    type: ReportTypeValue,
    format: ReportFormatValue,
    parameters: IReportParametersInput,
    orgId: string,
    options: IExportOptions = {}
  ): Promise<IExportResult> {
    this.logger.log('Exporting report', { type, format, orgId });

    const reportFormat = ReportFormat.create(format);

    switch (reportFormat.getValue()) {
      case REPORT_FORMATS.CSV:
        return this.exportToCSV(type, parameters, orgId, options);
      case REPORT_FORMATS.EXCEL:
        return this.exportToExcel(type, parameters, orgId, options);
      case REPORT_FORMATS.PDF:
        return this.exportToPDF(type, parameters, orgId, options);
      case REPORT_FORMATS.JSON:
        return this.exportToJSON(type, parameters, orgId, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format (native implementation)
   */
  public async exportToCSV(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string,
    options: IExportOptions = {}
  ): Promise<IExportResult> {
    this.logger.log('Exporting to CSV', { type, orgId });

    const viewResult = await this.reportViewService.viewReport(type, parameters, orgId);

    const csvContent = this.generateCSV(
      viewResult.columns,
      viewResult.rows as Record<string, unknown>[],
      options
    );

    const buffer = Buffer.from(csvContent, 'utf-8');
    const filename = this.generateFilename(viewResult.metadata.reportTitle, 'csv');

    return {
      buffer,
      filename,
      mimeType: 'text/csv; charset=utf-8',
      size: buffer.length,
    };
  }

  /**
   * Export to Excel format
   * Delegated to external IDocumentGenerationService
   */
  public async exportToExcel(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string,
    options: IExportOptions = {}
  ): Promise<IExportResult> {
    this.logger.log('Exporting to Excel via DocumentGenerationService', {
      type,
      orgId,
    });

    const viewResult = await this.reportViewService.viewReport(type, parameters, orgId);

    // Delegate to external service
    const result = await this.documentGenerationService.generateExcel({
      title: options.title || viewResult.metadata.reportTitle,
      columns: this.mapToDocumentColumns(viewResult.columns),
      rows: viewResult.rows as Record<string, unknown>[],
      summary: viewResult.summary,
      metadata: {
        reportType: type,
        generatedAt: new Date(),
        generatedBy: options.author,
        orgId,
      },
      options: {
        includeHeader: options.includeHeader,
        includeSummary: options.includeSummary,
        author: options.author,
      },
    });

    if (!result.success || !result.buffer) {
      throw new Error(result.error || 'Failed to generate Excel document');
    }

    const filename = this.generateFilename(viewResult.metadata.reportTitle, 'xlsx');

    return {
      buffer: result.buffer,
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: result.buffer.length,
    };
  }

  /**
   * Export to PDF format
   * Delegated to external IDocumentGenerationService
   */
  public async exportToPDF(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string,
    options: IExportOptions = {}
  ): Promise<IExportResult> {
    this.logger.log('Exporting to PDF via DocumentGenerationService', {
      type,
      orgId,
    });

    const viewResult = await this.reportViewService.viewReport(type, parameters, orgId);

    // Delegate to external service
    const result = await this.documentGenerationService.generatePDF({
      title: options.title || viewResult.metadata.reportTitle,
      columns: this.mapToDocumentColumns(viewResult.columns),
      rows: viewResult.rows as Record<string, unknown>[],
      summary: viewResult.summary,
      metadata: {
        reportType: type,
        generatedAt: new Date(),
        generatedBy: options.author,
        orgId,
      },
      options: {
        includeHeader: options.includeHeader,
        includeSummary: options.includeSummary,
        author: options.author,
      },
    });

    if (!result.success || !result.buffer) {
      throw new Error(result.error || 'Failed to generate PDF document');
    }

    const filename = this.generateFilename(viewResult.metadata.reportTitle, 'pdf');

    return {
      buffer: result.buffer,
      filename,
      mimeType: 'application/pdf',
      size: result.buffer.length,
    };
  }

  /**
   * Export to JSON format (native implementation)
   */
  public async exportToJSON(
    type: ReportTypeValue,
    parameters: IReportParametersInput,
    orgId: string,
    _options: IExportOptions = {}
  ): Promise<IExportResult> {
    this.logger.log('Exporting to JSON', { type, orgId });

    const viewResult = await this.reportViewService.viewReport(type, parameters, orgId);

    const jsonContent = JSON.stringify(viewResult, null, 2);
    const buffer = Buffer.from(jsonContent, 'utf-8');
    const filename = this.generateFilename(viewResult.metadata.reportTitle, 'json');

    return {
      buffer,
      filename,
      mimeType: 'application/json',
      size: buffer.length,
    };
  }

  /**
   * Map IReportColumn to IDocumentColumn
   */
  private mapToDocumentColumns(columns: IReportColumn[]): IDocumentColumn[] {
    return columns.map(col => {
      const documentCol: IDocumentColumn = {
        key: col.key,
        header: col.header,
        type: col.type,
      };

      // Convert width from string to number if provided
      if (col.width !== undefined) {
        const widthNumber = Number.parseFloat(col.width);
        if (!Number.isNaN(widthNumber)) {
          documentCol.width = widthNumber;
        }
      }

      return documentCol;
    });
  }

  /**
   * Generate CSV content from report data
   */
  private generateCSV(
    columns: IReportColumn[],
    rows: Record<string, unknown>[],
    options: IExportOptions
  ): string {
    const lines: string[] = [];

    // Add header row
    if (options.includeHeader !== false) {
      const headers = columns.map(col => this.escapeCSV(col.header));
      lines.push(headers.join(','));
    }

    // Add data rows
    for (const row of rows) {
      const values = columns.map(col => {
        const value = row[col.key];
        return this.formatCSVValue(value, col.type);
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Escape value for CSV
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format value for CSV based on column type
   */
  private formatCSVValue(value: unknown, type: IReportColumn['type']): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'date':
        if (value instanceof Date) {
          return this.escapeCSV(value.toISOString().split('T')[0]);
        }
        return this.escapeCSV(String(value));
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      case 'number':
        return String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return this.escapeCSV(String(value));
    }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(title: string, extension: string): string {
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}-${timestamp}.${extension}`;
  }
}
