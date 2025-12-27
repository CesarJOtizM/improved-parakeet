/**
 * Document column definition for report generation
 */
export interface IDocumentColumn {
  key: string;
  header: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean';
  width?: number;
}

/**
 * Document metadata
 */
export interface IDocumentMetadata {
  reportType: string;
  generatedAt: Date;
  generatedBy?: string;
  orgId: string;
}

/**
 * Document generation options
 */
export interface IDocumentOptions {
  includeHeader?: boolean;
  includeSummary?: boolean;
  author?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

/**
 * Document generation request
 */
export interface IDocumentGenerationRequest {
  title: string;
  columns: IDocumentColumn[];
  rows: Record<string, unknown>[];
  summary?: Record<string, number | string>;
  metadata: IDocumentMetadata;
  options?: IDocumentOptions;
}

/**
 * Document generation response
 */
export interface IDocumentGenerationResponse {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  generationTime?: number; // milliseconds
}

/**
 * Document Generation Service Port
 * Output port for generating documents (PDF, Excel) following Hexagonal Architecture
 *
 * Current implementation: Mock (logs only, returns placeholder content)
 * Future implementation: AWS Lambda, external microservice, third-party API, etc.
 *
 * @example
 * // Inject in use case or service
 * constructor(
 *   @Inject('DocumentGenerationService')
 *   private readonly documentService: IDocumentGenerationService
 * ) {}
 *
 * // Use the service
 * const result = await this.documentService.generatePDF(request);
 * if (result.success && result.buffer) {
 *   // Use the generated buffer
 * }
 */
export interface IDocumentGenerationService {
  /**
   * Generate PDF document
   * @param request - Document generation request with data and options
   * @returns Promise with generation result containing buffer or error
   */
  generatePDF(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse>;

  /**
   * Generate Excel document (.xlsx)
   * @param request - Document generation request with data and options
   * @returns Promise with generation result containing buffer or error
   */
  generateExcel(request: IDocumentGenerationRequest): Promise<IDocumentGenerationResponse>;

  /**
   * Check if service is available and healthy
   * @returns Promise<boolean> - true if service is operational
   */
  healthCheck(): Promise<boolean>;
}
