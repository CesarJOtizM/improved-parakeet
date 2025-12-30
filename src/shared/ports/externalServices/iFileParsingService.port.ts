/**
 * Parsed file data structure
 */
export interface IParsedFileData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  fileType: 'excel' | 'csv';
}

/**
 * File validation result
 */
export interface IFileValidationResult {
  isValid: boolean;
  errors: string[];
  fileType?: 'excel' | 'csv';
  maxSize?: number; // bytes
}

/**
 * File Parsing Service Port
 * Output port for parsing Excel and CSV files following Hexagonal Architecture
 *
 * Current implementation: Uses xlsx library
 * Future implementation: Can be replaced with exceljs, csv-parser, or any other library
 * without affecting domain/application layers
 *
 * @example
 * // Inject in use case or service
 * constructor(
 *   @Inject('FileParsingService')
 *   private readonly fileParsingService: IFileParsingService
 * ) {}
 *
 * // Use the service
 * const result = await this.fileParsingService.parseFile(file);
 * if (result.headers && result.rows) {
 *   // Process parsed data
 * }
 */
export interface IFileParsingService {
  /**
   * Parse Excel or CSV file into structured data
   * @param file - File buffer from multer
   * @returns Promise with parsed file data (headers and rows)
   * @throws Error if file format is invalid or parsing fails
   */
  parseFile(file: Express.Multer.File): Promise<IParsedFileData>;

  /**
   * Validate file format before parsing
   * @param file - File buffer from multer
   * @returns File validation result with errors if invalid
   */
  validateFileFormat(file: Express.Multer.File): IFileValidationResult;
}
