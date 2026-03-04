import { Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';

import type {
  IFileParsingService,
  IFileValidationResult,
  IParsedFileData,
} from '@shared/ports/externalServices';

/**
 * File Parsing Service Implementation
 *
 * Implements IFileParsingService using xlsx library.
 * This implementation can be easily replaced with:
 * - exceljs (for better Excel support)
 * - csv-parser (for CSV-only parsing)
 * - Any other library without affecting domain/application layers
 *
 * To replace: Just create a new implementation of IFileParsingService
 * and update the provider in the module.
 */
@Injectable()
export class FileParsingService implements IFileParsingService {
  private readonly logger = new Logger(FileParsingService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv
  ];
  private readonly ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

  // Magic bytes for file type detection (independent of client-provided mimetype)
  private readonly XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // PK.. (ZIP/XLSX)
  private readonly XLS_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0]; // OLE compound doc

  validateFileFormat(file: Express.Multer.File): IFileValidationResult {
    const errors: string[] = [];

    // Validate file exists
    if (!file) {
      return {
        isValid: false,
        errors: ['File is required'],
      };
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate extension
    const extension = this.getFileExtension(file.originalname);
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`Invalid file extension. Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // Validate MIME type (client-provided, first check)
    if (file.mimetype && !this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file content via magic bytes (server-side, tamper-proof)
    if (file.buffer && file.buffer.length >= 4) {
      const detectedType = this.detectFileType(file.buffer);
      if (extension === '.csv' && detectedType !== 'csv') {
        errors.push('File content does not match CSV format (binary file detected)');
      } else if ((extension === '.xlsx' || extension === '.xls') && detectedType === 'csv') {
        errors.push('File content does not match Excel format (text file detected)');
      } else if (extension === '.xlsx' && detectedType === 'xls') {
        errors.push('File content indicates legacy .xls format but extension is .xlsx');
      } else if (extension === '.xls' && detectedType === 'xlsx') {
        errors.push('File content indicates .xlsx format but extension is .xls');
      }
    }

    const fileType = extension === '.csv' ? 'csv' : 'excel';

    return {
      isValid: errors.length === 0,
      errors,
      fileType: errors.length === 0 ? fileType : undefined,
      maxSize: this.MAX_FILE_SIZE,
    };
  }

  private detectFileType(buffer: Buffer): 'xlsx' | 'xls' | 'csv' {
    if (this.bufferStartsWith(buffer, this.XLSX_SIGNATURE)) {
      return 'xlsx';
    }
    if (this.bufferStartsWith(buffer, this.XLS_SIGNATURE)) {
      return 'xls';
    }
    return 'csv';
  }

  private bufferStartsWith(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, i) => buffer[i] === byte);
  }

  async parseFile(file: Express.Multer.File): Promise<IParsedFileData> {
    this.logger.log('Parsing file', {
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    // Validate format first
    const validation = this.validateFileFormat(file);
    if (!validation.isValid) {
      throw new Error(`Invalid file format: ${validation.errors.join(', ')}`);
    }

    const extension = this.getFileExtension(file.originalname);

    if (extension === '.csv') {
      return this.parseCSV(file.buffer);
    }
    return this.parseExcel(file.buffer);
  }

  private async parseExcel(buffer: Buffer): Promise<IParsedFileData> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet || worksheet.rowCount === 0) {
        throw new Error('Excel file is empty or has no sheets');
      }

      // First row is headers
      const headerRow = worksheet.getRow(1);
      const cleanHeaders: string[] = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const value = cell.text?.trim();
        if (value) {
          cleanHeaders[colNumber - 1] = value;
        }
      });

      const filteredHeaders = cleanHeaders.filter(h => h !== undefined && h !== '');
      if (filteredHeaders.length === 0) {
        throw new Error('Excel file has no valid headers');
      }

      // Convert rows to objects
      const rows: Record<string, unknown>[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        const rowObj: Record<string, unknown> = {};
        cleanHeaders.forEach((header, colIndex) => {
          if (!header) return;
          const cell = row.getCell(colIndex + 1);
          const value = cell.text?.trim();
          rowObj[header] = value === undefined || value === '' ? null : value;
        });
        rows.push(rowObj);
      });

      this.logger.log('Excel file parsed successfully', {
        headers: filteredHeaders.length,
        rows: rows.length,
      });

      return {
        headers: filteredHeaders,
        rows,
        totalRows: rows.length,
        fileType: 'excel',
      };
    } catch (error) {
      this.logger.error('Error parsing Excel file', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  private parseCSV(buffer: Buffer): IParsedFileData {
    try {
      // Handle UTF-8 BOM if present
      let content = buffer.toString('utf-8');
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // Remove BOM
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse headers
      const headers = this.parseCSVLine(lines[0]);
      if (headers.length === 0) {
        throw new Error('CSV file has no headers');
      }

      // Clean headers
      const cleanHeaders = headers.map(h => h.trim()).filter(h => h !== '');

      if (cleanHeaders.length === 0) {
        throw new Error('CSV file has no valid headers');
      }

      // Parse rows
      const rows = lines.slice(1).map(line => {
        const values = this.parseCSVLine(line);
        const rowObj: Record<string, unknown> = {};
        cleanHeaders.forEach((header, colIndex) => {
          const value = values[colIndex];
          rowObj[header] = value === undefined || value === null ? null : value?.trim() || null;
        });
        return rowObj;
      });

      this.logger.log('CSV file parsed successfully', {
        headers: cleanHeaders.length,
        rows: rows.length,
      });

      return {
        headers: cleanHeaders,
        rows,
        totalRows: rows.length,
        fileType: 'csv',
      };
    } catch (error) {
      this.logger.error('Error parsing CSV file', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current);

    return result;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
  }
}
