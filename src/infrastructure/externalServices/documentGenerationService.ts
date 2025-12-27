import { Injectable, Logger } from '@nestjs/common';

import type {
  IDocumentGenerationRequest,
  IDocumentGenerationResponse,
  IDocumentGenerationService,
} from '@shared/ports/externalServices';

/**
 * Mock implementation of Document Generation Service
 *
 * This is a placeholder implementation that:
 * - Logs all generation requests for debugging
 * - Returns text-based placeholder content for PDF
 * - Returns CSV content with BOM for Excel (opens in Excel)
 *
 * For production, replace with:
 * - AWS Lambda with Puppeteer/Chrome for PDF
 * - AWS Lambda with ExcelJS for Excel
 * - External microservice
 * - Third-party APIs (DocRaptor, PDFShift, etc.)
 */
@Injectable()
export class DocumentGenerationService implements IDocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  /**
   * Generate PDF document (MOCK - returns text-based placeholder)
   *
   * In production, this would call:
   * - AWS Lambda with Puppeteer/Chrome
   * - External PDF microservice
   * - Third-party API (e.g., DocRaptor, PDFShift)
   */
  async generatePDF(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log('📄 Document Generation Service - Generating PDF (MOCK)', {
        title: request.title,
        reportType: request.metadata.reportType,
        rowCount: request.rows.length,
        columnCount: request.columns.length,
        orgId: request.metadata.orgId,
        timestamp: new Date().toISOString(),
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Generate placeholder PDF content (text-based)
      const placeholderContent = this.generatePlaceholderPDF(request);
      const buffer = Buffer.from(placeholderContent, 'utf-8');

      const generationTime = Date.now() - startTime;

      this.logger.log('✅ PDF generated successfully (MOCK)', {
        title: request.title,
        size: buffer.length,
        generationTime: `${generationTime}ms`,
      });

      this.logger.warn(
        '⚠️ PDF generation is using MOCK implementation. ' +
          'For production, integrate with external service (AWS Lambda, PDFKit service, etc.)'
      );

      return {
        success: true,
        buffer,
        generationTime,
      };
    } catch (error) {
      this.logger.error('❌ Error generating PDF (MOCK)', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: request.title,
        orgId: request.metadata.orgId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate Excel document (MOCK - returns CSV with BOM)
   *
   * In production, this would call:
   * - AWS Lambda with ExcelJS
   * - External Excel microservice
   * - Third-party API
   */
  async generateExcel(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log('📊 Document Generation Service - Generating Excel (MOCK)', {
        title: request.title,
        reportType: request.metadata.reportType,
        rowCount: request.rows.length,
        columnCount: request.columns.length,
        orgId: request.metadata.orgId,
        timestamp: new Date().toISOString(),
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Generate CSV content that Excel can open (with BOM for UTF-8)
      const csvContent = this.generateCSVContent(request);
      const bom = '\ufeff';
      const buffer = Buffer.from(bom + csvContent, 'utf-8');

      const generationTime = Date.now() - startTime;

      this.logger.log('✅ Excel generated successfully (MOCK)', {
        title: request.title,
        size: buffer.length,
        generationTime: `${generationTime}ms`,
      });

      this.logger.warn(
        '⚠️ Excel generation is using MOCK implementation (CSV format). ' +
          'For production, integrate with external service (AWS Lambda with ExcelJS, etc.)'
      );

      return {
        success: true,
        buffer,
        generationTime,
      };
    } catch (error) {
      this.logger.error('❌ Error generating Excel (MOCK)', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: request.title,
        orgId: request.metadata.orgId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    this.logger.log('🏥 Document Generation Service health check (MOCK) - OK');
    return true;
  }

  /**
   * Generate placeholder PDF content (text-based report)
   */
  private generatePlaceholderPDF(request: IDocumentGenerationRequest): string {
    const lines: string[] = [];
    const separator = '='.repeat(80);
    const subSeparator = '-'.repeat(80);

    // Header
    lines.push(separator);
    lines.push(`REPORT: ${request.title}`);
    lines.push(`Type: ${request.metadata.reportType}`);
    lines.push(`Generated: ${request.metadata.generatedAt.toISOString()}`);
    if (request.options?.author) {
      lines.push(`Author: ${request.options.author}`);
    }
    lines.push(`Organization: ${request.metadata.orgId}`);
    lines.push(separator);
    lines.push('');
    lines.push('⚠️ THIS IS A MOCK PDF - Plain text format');
    lines.push('For production, integrate with external PDF generation service.');
    lines.push('');

    // Summary
    if (request.options?.includeSummary !== false && request.summary) {
      lines.push('SUMMARY');
      lines.push(subSeparator);
      for (const [key, value] of Object.entries(request.summary)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        lines.push(`${formattedKey}: ${value}`);
      }
      lines.push('');
    }

    // Data table
    lines.push('DATA');
    lines.push(subSeparator);

    // Headers
    const headers = request.columns.map(col => col.header.padEnd(15)).join(' | ');
    lines.push(headers);
    lines.push(subSeparator);

    // Rows (limit to 100 for mock)
    const displayRows = request.rows.slice(0, 100);
    for (const row of displayRows) {
      const values = request.columns
        .map(col => {
          const value = row[col.key];
          return String(value ?? '-').padEnd(15);
        })
        .join(' | ');
      lines.push(values);
    }

    if (request.rows.length > 100) {
      lines.push(`... and ${request.rows.length - 100} more rows`);
    }

    lines.push('');
    lines.push(separator);
    lines.push(`Total Records: ${request.rows.length}`);
    lines.push(separator);

    return lines.join('\n');
  }

  /**
   * Generate CSV content for Excel mock
   */
  private generateCSVContent(request: IDocumentGenerationRequest): string {
    const lines: string[] = [];

    // Headers
    if (request.options?.includeHeader !== false) {
      const headers = request.columns.map(col => this.escapeCSV(col.header));
      lines.push(headers.join(','));
    }

    // Data rows
    for (const row of request.rows) {
      const values = request.columns.map(col => {
        const value = row[col.key];
        return this.formatCSVValue(value, col.type);
      });
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Escape value for CSV format
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
  private formatCSVValue(value: unknown, type: string): string {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'date':
        return value instanceof Date
          ? this.escapeCSV(value.toISOString().split('T')[0])
          : this.escapeCSV(String(value));
      case 'currency':
        return typeof value === 'number' ? value.toFixed(2) : String(value);
      case 'percentage':
        return typeof value === 'number' ? `${value.toFixed(2)}%` : String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return this.escapeCSV(String(value));
    }
  }
}
