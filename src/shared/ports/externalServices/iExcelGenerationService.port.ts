import type { ImportBatch, ImportType } from '@import/domain';

/**
 * Excel Generation Service Port
 * Output port for generating Excel (XLSX) files following Hexagonal Architecture
 *
 * Current implementation: Uses ExcelJS library
 * Can be replaced with any other Excel generation library
 * without affecting domain/application layers
 *
 * @example
 * // Inject in use case or service
 * constructor(
 *   @Inject('ExcelGenerationService')
 *   private readonly excelService: IExcelGenerationService
 * ) {}
 *
 * // Use the service
 * const buffer = await this.excelService.generateTemplateXlsx(type);
 */
export interface IExcelGenerationService {
  /**
   * Generate an XLSX template file for a given import type
   * @param type - The import type to generate a template for
   * @returns Promise with a Buffer containing the XLSX file
   */
  generateTemplateXlsx(type: ImportType): Promise<Buffer>;

  /**
   * Generate an XLSX error report for a given import batch
   * @param batch - The import batch to generate an error report for
   * @returns Promise with a Buffer containing the XLSX file
   */
  generateErrorReportXlsx(batch: ImportBatch): Promise<Buffer>;
}
