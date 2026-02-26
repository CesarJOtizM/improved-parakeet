import { Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';

import type {
  IDocumentColumn,
  IDocumentGenerationRequest,
  IDocumentGenerationResponse,
  IDocumentGenerationService,
} from '@shared/ports/externalServices';

const COLORS = {
  primary: '1B4F72',
  primaryLight: 'D4E6F1',
  headerText: 'FFFFFF',
  summaryLabel: '2C3E50',
  summaryValue: '1B4F72',
  border: 'BDC3C7',
  evenRow: 'F8F9FA',
  currencyPositive: '27AE60',
  currencyNegative: 'E74C3C',
};

@Injectable()
export class DocumentGenerationService implements IDocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  /**
   * Generate PDF document (MOCK - returns text-based placeholder)
   */
  async generatePDF(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log('Generating PDF (MOCK)', {
        title: request.title,
        reportType: request.metadata.reportType,
        rowCount: request.rows.length,
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      const placeholderContent = this.generatePlaceholderPDF(request);
      const buffer = Buffer.from(placeholderContent, 'utf-8');
      const generationTime = Date.now() - startTime;

      return { success: true, buffer, generationTime };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate styled Excel (.xlsx) document using ExcelJS
   */
  async generateExcel(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.log('Generating Excel document', {
        title: request.title,
        reportType: request.metadata.reportType,
        rowCount: request.rows.length,
        columnCount: request.columns.length,
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = request.options?.author ?? 'Nevada Inventory System';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Report', {
        views: [{ state: 'frozen', ySplit: 0 }],
      });

      let currentRow = 1;

      // ── Title section ──
      if (request.options?.includeSummary !== false) {
        // Title row (merged across all columns)
        const titleRow = sheet.getRow(currentRow);
        titleRow.getCell(1).value = request.title;
        titleRow.getCell(1).font = {
          name: 'Calibri',
          size: 16,
          bold: true,
          color: { argb: COLORS.primary },
        };
        titleRow.height = 30;
        sheet.mergeCells(currentRow, 1, currentRow, request.columns.length);
        currentRow++;

        // Subtitle with date and report type
        const subtitleRow = sheet.getRow(currentRow);
        const dateStr = request.metadata.generatedAt.toISOString().split('T')[0];
        subtitleRow.getCell(1).value = `${request.metadata.reportType} | Generated: ${dateStr}`;
        subtitleRow.getCell(1).font = {
          name: 'Calibri',
          size: 10,
          italic: true,
          color: { argb: '7F8C8D' },
        };
        sheet.mergeCells(currentRow, 1, currentRow, request.columns.length);
        currentRow++;

        // Summary section
        if (request.summary && Object.keys(request.summary).length > 0) {
          currentRow++; // blank row

          for (const [key, value] of Object.entries(request.summary)) {
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            const row = sheet.getRow(currentRow);
            row.getCell(1).value = label;
            row.getCell(1).font = {
              name: 'Calibri',
              size: 10,
              bold: true,
              color: { argb: COLORS.summaryLabel },
            };
            row.getCell(2).value = typeof value === 'number' ? value : String(value);
            row.getCell(2).font = {
              name: 'Calibri',
              size: 10,
              bold: true,
              color: { argb: COLORS.summaryValue },
            };
            row.getCell(2).alignment = { horizontal: 'left' };
            currentRow++;
          }
        }

        currentRow++; // blank row before data
      }

      // ── Header row ──
      const headerRowNumber = currentRow;
      if (request.options?.includeHeader !== false) {
        const headerRow = sheet.getRow(currentRow);
        headerRow.height = 24;

        request.columns.forEach((col, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = col.header;
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.headerText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
          cell.alignment = {
            horizontal: this.getAlignment(col.type),
            vertical: 'middle',
          };
          cell.border = {
            bottom: { style: 'medium', color: { argb: COLORS.primary } },
          };
        });

        // Freeze header row
        sheet.views = [{ state: 'frozen', ySplit: currentRow, xSplit: 0 }];
        currentRow++;
      }

      // ── Data rows ──
      for (let rowIdx = 0; rowIdx < request.rows.length; rowIdx++) {
        const dataRow = sheet.getRow(currentRow);
        const isEven = rowIdx % 2 === 0;

        request.columns.forEach((col, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          const rawValue = request.rows[rowIdx][col.key];
          cell.value = this.formatCellValue(rawValue, col) as ExcelJS.CellValue;

          // Font
          cell.font = { name: 'Calibri', size: 10 };

          // Number formats
          if (col.type === 'currency') {
            cell.numFmt = '#,##0.00';
            if (typeof rawValue === 'number' && rawValue < 0) {
              cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.currencyNegative } };
            }
          } else if (col.type === 'percentage') {
            cell.numFmt = '0.00%';
          } else if (col.type === 'number') {
            cell.numFmt = '#,##0';
          } else if (col.type === 'date') {
            cell.numFmt = 'YYYY-MM-DD';
          }

          // Alignment
          cell.alignment = { horizontal: this.getAlignment(col.type), vertical: 'middle' };

          // Zebra striping
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.evenRow } };
          }

          // Light border
          cell.border = {
            bottom: { style: 'thin', color: { argb: COLORS.border } },
          };
        });

        currentRow++;
      }

      // ── Column widths ──
      request.columns.forEach((col, i) => {
        const column = sheet.getColumn(i + 1);
        column.width = col.width ?? Math.max(col.header.length + 4, 14);
      });

      // ── Auto-filter on header ──
      if (request.options?.includeHeader !== false && request.rows.length > 0) {
        sheet.autoFilter = {
          from: { row: headerRowNumber, column: 1 },
          to: { row: headerRowNumber + request.rows.length, column: request.columns.length },
        };
      }

      // ── Write to buffer ──
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const generationTime = Date.now() - startTime;

      this.logger.log('Excel generated successfully', {
        title: request.title,
        size: buffer.length,
        generationTime: `${generationTime}ms`,
      });

      return { success: true, buffer, generationTime };
    } catch (error) {
      this.logger.error('Error generating Excel', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: request.title,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private getAlignment(type: string): 'left' | 'center' | 'right' {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return 'right';
      case 'date':
      case 'boolean':
        return 'center';
      default:
        return 'left';
    }
  }

  private formatCellValue(value: unknown, column: IDocumentColumn): unknown {
    if (value === null || value === undefined) return '';

    switch (column.type) {
      case 'number':
      case 'currency':
        return typeof value === 'number' ? value : Number(value) || 0;
      case 'percentage':
        return typeof value === 'number' ? value / 100 : Number(value) / 100 || 0;
      case 'date':
        if (value instanceof Date) return value;
        if (typeof value === 'string') return new Date(value);
        return value;
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  private generatePlaceholderPDF(request: IDocumentGenerationRequest): string {
    const lines: string[] = [];
    const separator = '='.repeat(80);
    const subSeparator = '-'.repeat(80);

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

    if (request.options?.includeSummary !== false && request.summary) {
      lines.push('SUMMARY');
      lines.push(subSeparator);
      for (const [key, value] of Object.entries(request.summary)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        lines.push(`${formattedKey}: ${value}`);
      }
      lines.push('');
    }

    lines.push('DATA');
    lines.push(subSeparator);

    const headers = request.columns.map(col => col.header.padEnd(15)).join(' | ');
    lines.push(headers);
    lines.push(subSeparator);

    const displayRows = request.rows.slice(0, 100);
    for (const row of displayRows) {
      const values = request.columns.map(col => String(row[col.key] ?? '-').padEnd(15)).join(' | ');
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
}
