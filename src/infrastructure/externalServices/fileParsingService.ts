import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

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

    // Validate MIME type
    if (file.mimetype && !this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    const fileType = extension === '.csv' ? 'csv' : 'excel';

    return {
      isValid: errors.length === 0,
      errors,
      fileType: errors.length === 0 ? fileType : undefined,
      maxSize: this.MAX_FILE_SIZE,
    };
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
    } else {
      return this.parseExcel(file.buffer);
    }
  }

  private parseExcel(buffer: Buffer): IParsedFileData {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error('Excel file is empty or has no sheets');
      }

      // Convert to JSON with header row
      const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        raw: false, // Convert all values to strings for consistency
      });

      if (data.length === 0) {
        throw new Error('Excel file has no data');
      }

      // First row is headers
      const headers = data[0] as unknown[];
      if (!headers || headers.length === 0) {
        throw new Error('Excel file has no headers');
      }

      // Clean headers (trim, remove nulls)
      const cleanHeaders = headers
        .map(h => (h ? String(h).trim() : null))
        .filter((h): h is string => h !== null && h !== '');

      if (cleanHeaders.length === 0) {
        throw new Error('Excel file has no valid headers');
      }

      // Convert rows to objects
      const rows = data.slice(1).map((row: unknown[]) => {
        const rowObj: Record<string, unknown> = {};
        cleanHeaders.forEach((header, colIndex) => {
          const value = row[colIndex];
          // Convert null/undefined to null, otherwise keep as is
          rowObj[header] = value === undefined || value === null ? null : value;
        });
        return rowObj;
      });

      this.logger.log('Excel file parsed successfully', {
        headers: cleanHeaders.length,
        rows: rows.length,
      });

      return {
        headers: cleanHeaders,
        rows,
        totalRows: rows.length,
        fileType: 'excel',
      };
    } catch (error) {
      this.logger.error('Error parsing Excel file', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
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
