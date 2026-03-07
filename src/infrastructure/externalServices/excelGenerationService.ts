import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ImportErrorReportService,
  ImportTemplateService,
  type ImportBatch,
  type ImportType,
} from '@import/domain';

import type { IExcelGenerationService } from '@shared/ports/externalServices/iExcelGenerationService.port';

@Injectable()
export class ExcelGenerationService implements IExcelGenerationService {
  private readonly logger = new Logger(ExcelGenerationService.name);

  async generateTemplateXlsx(type: ImportType): Promise<Buffer> {
    this.logger.log('Generating XLSX template', { type: type.getValue() });

    const templateData = ImportTemplateService.getTemplateData(type);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Add header row with styling
    const headerRow = worksheet.addRow(templateData.headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add example rows
    for (const exampleRow of templateData.exampleRows) {
      const values = templateData.headers.map((h: string) => exampleRow[h] ?? '');
      const row = worksheet.addRow(values);
      row.eachCell(cell => {
        cell.font = { color: { argb: 'FF808080' }, italic: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Add column descriptions as a comment/note row
    const structure = ImportTemplateService.getTemplateStructure(type);
    worksheet.addRow([]);
    worksheet.addRow(['']);
    const infoRow = worksheet.addRow(['Column Descriptions:']);
    infoRow.getCell(1).font = { bold: true };

    for (const col of structure.columns) {
      const reqLabel = col.required ? '(Required)' : '(Optional)';
      worksheet.addRow([`${col.name} ${reqLabel}: ${col.description}`]);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        if (cellLength > maxLength) {
          maxLength = Math.min(cellLength, 50);
        }
      });
      column.width = maxLength + 4;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateErrorReportXlsx(batch: ImportBatch): Promise<Buffer> {
    this.logger.log('Generating XLSX error report', { batchId: batch.id });

    const reportData = ImportErrorReportService.getErrorReportData(batch);
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Import Error Report']);
    summarySheet.getRow(1).font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Rows', reportData.summary.totalRows]);
    summarySheet.addRow(['Valid Rows', reportData.summary.validRows]);
    summarySheet.addRow(['Invalid Rows', reportData.summary.invalidRows]);
    summarySheet.addRow(['Error Count', reportData.summary.errorCount]);
    summarySheet.addRow(['Warning Count', reportData.summary.warningCount]);

    // Style summary labels
    for (let i = 3; i <= 7; i++) {
      summarySheet.getRow(i).getCell(1).font = { bold: true };
    }
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 15;

    // Errors sheet
    const errorsSheet = workbook.addWorksheet('Errors');
    const errorHeaders = ['Row', 'Column', 'Value', 'Error', 'Severity'];
    const errorHeaderRow = errorsSheet.addRow(errorHeaders);
    errorHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCC0000' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    for (const error of reportData.errors) {
      const row = errorsSheet.addRow([
        error.rowNumber,
        error.column ?? '',
        error.value != null ? String(error.value) : '',
        error.error,
        error.severity,
      ]);
      // Color code by severity
      if (error.severity === 'error') {
        row.getCell(5).font = { color: { argb: 'FFCC0000' }, bold: true };
      } else {
        row.getCell(5).font = { color: { argb: 'FFFF8C00' } };
      }
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Auto-fit columns
    errorsSheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, cell => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        if (cellLength > maxLength) {
          maxLength = Math.min(cellLength, 60);
        }
      });
      column.width = maxLength + 4;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
