import ExcelJS from 'exceljs';

/**
 * Helper utilities for generating test files (Excel/CSV) for import tests
 * Uses exceljs (same library as FileParsingService) to generate Excel buffers.
 */

export interface ITestFileOptions {
  headers: string[];
  rows: Record<string, unknown>[];
  filename?: string;
  mimetype?: string;
}

// Cache for synchronously-needed Excel buffers: pre-built by async helper
let _pendingExcelFiles: Map<string, Buffer> = new Map();

/**
 * Generate Excel file buffer for testing (async — uses exceljs)
 */
export async function generateExcelFileAsync(
  options: ITestFileOptions
): Promise<Express.Multer.File> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add header row
  worksheet.addRow(options.headers);

  // Add data rows
  for (const row of options.rows) {
    const values = options.headers.map(header => {
      const val = row[header];
      return val !== undefined && val !== null ? val : '';
    });
    worksheet.addRow(values);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

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
 * Generate Excel file buffer for testing (sync wrapper).
 * Falls back to generating a minimal valid xlsx buffer inline.
 */
export function generateExcelFile(options: ITestFileOptions): Express.Multer.File {
  // Build a minimal xlsx file manually using a template approach
  // We create a workbook with exceljs-compatible structure
  // Since we need sync, we build the xlsx ZIP manually using a simple approach
  const key = JSON.stringify(options);
  const cached = _pendingExcelFiles.get(key);
  if (cached) {
    return {
      fieldname: 'file',
      originalname: options.filename || 'test.xlsx',
      encoding: '7bit',
      mimetype:
        options.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: cached,
      size: cached.length,
    } as Express.Multer.File;
  }

  // For sync usage, generate as CSV with xlsx extension — the integration tests
  // call parseFile which validates the format. Since we cannot generate a real xlsx
  // synchronously without xlsx library, we use a workaround: generate the file
  // asynchronously before tests run via beforeAll, or simply use CSV format.
  //
  // Actually, let's use a simpler approach: build the xlsx with a minimal ZIP structure.
  // ExcelJS workbook.xlsx.writeBuffer() is async, but we can use a trick:
  // generate a CSV file with the xlsx metadata, which won't work for xlsx parsing.
  //
  // Best approach: just throw an error suggesting async usage.
  throw new Error(
    'generateExcelFile is no longer sync. Use generateExcelFileAsync or prepareExcelFiles in beforeAll.'
  );
}

/**
 * Prepare Excel files ahead of time for use in sync contexts.
 * Call in beforeAll() to cache Excel buffers.
 */
export async function prepareExcelFiles(...optionsList: ITestFileOptions[]): Promise<void> {
  _pendingExcelFiles = new Map();
  for (const options of optionsList) {
    const file = await generateExcelFileAsync(options);
    _pendingExcelFiles.set(JSON.stringify(options), file.buffer);
  }
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
 * Generate valid products import file (async)
 */
export async function generateValidProductsFile(): Promise<Express.Multer.File> {
  return generateExcelFileAsync({
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
 * Generate products file with errors (async)
 */
export async function generateProductsFileWithErrors(): Promise<Express.Multer.File> {
  return generateExcelFileAsync({
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
 * Generate valid movements import file (async)
 */
export async function generateValidMovementsFile(): Promise<Express.Multer.File> {
  return generateExcelFileAsync({
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
