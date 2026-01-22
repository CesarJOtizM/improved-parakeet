import { ExportService } from '@report/domain/services/export.service';
import { REPORT_FORMATS, REPORT_TYPES } from '@report/domain/valueObjects';

import type { IReportColumn, ReportViewService } from '@report/domain/services/reportView.service';
import type { IDocumentColumn, IDocumentGenerationService } from '@shared/ports/externalServices';

describe('ExportService', () => {
  const reportViewService: Pick<ReportViewService, 'viewReport'> = {
    viewReport: jest.fn(),
  };
  const documentGenerationService: Pick<
    IDocumentGenerationService,
    'generateExcel' | 'generatePDF' | 'healthCheck'
  > = {
    generateExcel: jest.fn(),
    generatePDF: jest.fn(),
    healthCheck: jest.fn(),
  };
  const service = new ExportService(
    reportViewService as unknown as ReportViewService,
    documentGenerationService as unknown as IDocumentGenerationService
  );

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    reportViewService.viewReport.mockResolvedValue({
      columns: [
        { key: 'name', header: 'Name', type: 'string' },
        { key: 'amount', header: 'Amount', type: 'currency' },
        { key: 'ratio', header: 'Ratio', type: 'percentage' },
        { key: 'active', header: 'Active', type: 'boolean' },
        { key: 'date', header: 'Date', type: 'date' },
        { key: 'note', header: 'Note', type: 'string' },
        { key: 'count', header: 'Count', type: 'number' },
      ],
      rows: [
        {
          name: 'Widget, A',
          amount: 10,
          ratio: 0.5,
          active: true,
          date: new Date('2024-01-01T00:00:00.000Z'),
          note: 'He said "hi"',
          count: 3,
        },
      ],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: { total: 1 },
    });

    documentGenerationService.generateExcel.mockResolvedValue({
      success: true,
      buffer: Buffer.from('excel'),
    });
    documentGenerationService.generatePDF.mockResolvedValue({
      success: true,
      buffer: Buffer.from('pdf'),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('Given: CSV format When: exporting report Then: should return CSV file', async () => {
    // Arrange
    const parameters = {};

    // Act
    const result = await service.exportReport(
      REPORT_TYPES.SALES,
      REPORT_FORMATS.CSV,
      parameters,
      'org-1',
      { includeHeader: true }
    );

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(result.filename).toBe('sales-report-2024-01-01.csv');
    expect(csv).toContain('"Widget, A"');
    expect(csv).toContain('10.00');
    expect(csv).toContain('0.50%');
    expect(csv).toContain('Yes');
    expect(csv).toContain('2024-01-01');
    expect(csv).toContain('"He said ""hi"""');
  });

  it('Given: JSON format When: exporting report Then: should return JSON file', async () => {
    // Arrange
    const parameters = {};

    // Act
    const result = await service.exportReport(
      REPORT_TYPES.SALES,
      REPORT_FORMATS.JSON,
      parameters,
      'org-1'
    );

    // Assert
    const parsed = JSON.parse(result.buffer.toString('utf-8'));
    expect(result.filename).toBe('sales-report-2024-01-01.json');
    expect(parsed.metadata.reportTitle).toBe('Sales Report');
    expect(parsed.rows).toHaveLength(1);
  });

  it('Given: Excel format When: exporting report Then: should call document service', async () => {
    // Arrange
    const parameters = {};

    // Act
    const result = await service.exportReport(
      REPORT_TYPES.SALES,
      REPORT_FORMATS.EXCEL,
      parameters,
      'org-1',
      { title: 'Custom Title', includeSummary: true }
    );

    // Assert
    expect(documentGenerationService.generateExcel).toHaveBeenCalled();
    expect(result.filename).toBe('sales-report-2024-01-01.xlsx');
    expect(result.buffer.toString('utf-8')).toBe('excel');
  });

  it('Given: PDF format When: exporting report Then: should call document service', async () => {
    // Arrange
    const parameters = {};

    // Act
    const result = await service.exportReport(
      REPORT_TYPES.SALES,
      REPORT_FORMATS.PDF,
      parameters,
      'org-1'
    );

    // Assert
    expect(documentGenerationService.generatePDF).toHaveBeenCalled();
    expect(result.filename).toBe('sales-report-2024-01-01.pdf');
  });

  it('Given: document service error When: exporting Then: should throw', async () => {
    // Arrange
    documentGenerationService.generatePDF.mockResolvedValueOnce({
      success: false,
      error: 'boom',
    });

    // Act & Assert
    await expect(
      service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.PDF, {}, 'org-1')
    ).rejects.toThrow('boom');
  });

  it('Given: columns with width When: mapping Then: should parse numeric width', () => {
    // Arrange
    const columns = [
      { key: 'name', header: 'Name', type: 'string', width: '100' },
      { key: 'note', header: 'Note', type: 'string', width: 'auto' },
    ];

    // Act
    const serviceAccess = service as unknown as {
      mapToDocumentColumns: (input: IReportColumn[]) => IDocumentColumn[];
    };
    const result = serviceAccess.mapToDocumentColumns(columns);

    // Assert
    expect(result[0]).toEqual({ key: 'name', header: 'Name', type: 'string', width: 100 });
    expect(result[1]).toEqual({ key: 'note', header: 'Note', type: 'string' });
  });
});
