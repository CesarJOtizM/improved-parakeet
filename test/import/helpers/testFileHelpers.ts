import * as XLSX from 'xlsx';

/**
 * Helper utilities for generating test files (Excel/CSV) for import tests
 */

export interface ITestFileOptions {
  headers: string[];
  rows: Record<string, unknown>[];
  filename?: string;
  mimetype?: string;
}

/**
 * Generate Excel file buffer for testing
 */
export function generateExcelFile(options: ITestFileOptions): Express.Multer.File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    options.headers,
    ...options.rows.map(row => options.headers.map(header => row[header] ?? '')),
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    fieldname: 'file',
    originalname: options.filename || 'test.xlsx',
    encoding: '7bit',
    mimetype:
      options.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

/**
 * Generate CSV file buffer for testing
 */
export function generateCSVFile(options: ITestFileOptions): Express.Multer.File {
  const lines: string[] = [];

  // Add headers
  lines.push(options.headers.join(','));

  // Add rows
  for (const row of options.rows) {
    const values = options.headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape CSV values
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }

  const content = lines.join('\n');
  const buffer = Buffer.from(content, 'utf-8');

  return {
    fieldname: 'file',
    originalname: options.filename || 'test.csv',
    encoding: '7bit',
    mimetype: options.mimetype || 'text/csv',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

/**
 * Generate invalid file (wrong extension)
 */
export function generateInvalidFile(): Express.Multer.File {
  const buffer = Buffer.from('invalid content', 'utf-8');

  return {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

/**
 * Generate file that's too large
 */
export function generateLargeFile(): Express.Multer.File {
  // Generate 11MB file (exceeds 10MB limit)
  const largeContent = 'x'.repeat(11 * 1024 * 1024);
  const buffer = Buffer.from(largeContent, 'utf-8');

  return {
    fieldname: 'file',
    originalname: 'large.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

/**
 * Generate empty file
 */
export function generateEmptyFile(): Express.Multer.File {
  const buffer = Buffer.from('', 'utf-8');

  return {
    fieldname: 'file',
    originalname: 'empty.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
    size: 0,
  } as Express.Multer.File;
}

/**
 * Generate valid products import file
 */
export function generateValidProductsFile(): Express.Multer.File {
  return generateExcelFile({
    headers: ['SKU', 'Name', 'Description', 'Unit Code', 'Unit Name', 'Unit Precision', 'Status'],
    rows: [
      {
        SKU: 'PROD-001',
        Name: 'Test Product 1',
        Description: 'Test Description',
        'Unit Code': 'UNIT',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
        Status: 'ACTIVE',
      },
      {
        SKU: 'PROD-002',
        Name: 'Test Product 2',
        Description: 'Test Description 2',
        'Unit Code': 'KG',
        'Unit Name': 'Kilogram',
        'Unit Precision': 2,
        Status: 'ACTIVE',
      },
    ],
    filename: 'products.xlsx',
  });
}

/**
 * Generate products file with errors
 */
export function generateProductsFileWithErrors(): Express.Multer.File {
  return generateExcelFile({
    headers: ['SKU', 'Name', 'Description', 'Unit Code', 'Unit Name', 'Unit Precision', 'Status'],
    rows: [
      {
        SKU: '', // Missing required field
        Name: 'Test Product 1',
        Description: 'Test Description',
        'Unit Code': 'UNIT',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
        Status: 'ACTIVE',
      },
      {
        SKU: 'PROD-002',
        Name: '', // Missing required field
        Description: 'Test Description 2',
        'Unit Code': 'KG',
        'Unit Name': 'Kilogram',
        'Unit Precision': 'invalid', // Invalid type
        Status: 'INVALID_STATUS', // Invalid enum
      },
    ],
    filename: 'products-errors.xlsx',
  });
}

/**
 * Generate valid movements import file
 */
export function generateValidMovementsFile(): Express.Multer.File {
  return generateExcelFile({
    headers: [
      'Type',
      'Warehouse Code',
      'Product SKU',
      'Location Code',
      'Quantity',
      'Unit Cost',
      'Currency',
      'Reference',
      'Reason',
    ],
    rows: [
      {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        'Location Code': 'LOC-001',
        Quantity: 10,
        'Unit Cost': 100.5,
        Currency: 'COP',
        Reference: 'REF-001',
        Reason: 'Purchase',
      },
    ],
    filename: 'movements.xlsx',
  });
}
