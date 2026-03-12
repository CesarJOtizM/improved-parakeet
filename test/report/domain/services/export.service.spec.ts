import { ExportService } from '@report/domain/services/export.service';
import { REPORT_FORMATS, REPORT_TYPES } from '@report/domain/valueObjects';

import type { IReportColumn, ReportViewService } from '@report/domain/services/reportView.service';
import type { IDocumentColumn, IDocumentGenerationService } from '@shared/ports/externalServices';

describe('ExportService', () => {
  const reportViewService = {
    viewReport: jest.fn(),
  } as any;
  const documentGenerationService = {
    generateExcel: jest.fn(),
    generatePDF: jest.fn(),
    healthCheck: jest.fn(),
  } as any;
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
    const result = serviceAccess.mapToDocumentColumns(columns as any);

    // Assert
    expect(result[0]).toEqual({ key: 'name', header: 'Name', type: 'string', width: 100 });
    expect(result[1]).toEqual({ key: 'note', header: 'Note', type: 'string' });
  });

  it('Given: columns without width When: mapping Then: should not include width property', () => {
    // Arrange
    const columns = [{ key: 'name', header: 'Name', type: 'string' }];

    // Act
    const serviceAccess = service as unknown as {
      mapToDocumentColumns: (input: IReportColumn[]) => IDocumentColumn[];
    };
    const result = serviceAccess.mapToDocumentColumns(columns as any);

    // Assert
    expect(result[0]).toEqual({ key: 'name', header: 'Name', type: 'string' });
    expect(result[0].width).toBeUndefined();
  });

  it('Given: CSV format with includeHeader=false When: exporting Then: should omit header row', async () => {
    // Act
    const result = await service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.CSV, {}, 'org-1', {
      includeHeader: false,
    });

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).not.toContain('Name,Amount');
    // Should still have data rows
    expect(csv).toContain('"Widget, A"');
  });

  it('Given: CSV with null and undefined values When: exporting Then: should output empty strings', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [
        { key: 'name', header: 'Name', type: 'string' },
        { key: 'value', header: 'Value', type: 'number' },
      ],
      rows: [{ name: null, value: undefined }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain(',');
    expect(result.mimeType).toBe('text/csv; charset=utf-8');
  });

  it('Given: CSV with date column using string date When: formatting Then: should escape string date', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'date', header: 'Date', type: 'date' }],
      rows: [{ date: '2024-01-15' }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('2024-01-15');
  });

  it('Given: CSV with currency as string type When: formatting Then: should output string value', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'amount', header: 'Amount', type: 'currency' }],
      rows: [{ amount: 'N/A' }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('N/A');
  });

  it('Given: CSV with percentage as string type When: formatting Then: should output string value', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'ratio', header: 'Ratio', type: 'percentage' }],
      rows: [{ ratio: 'N/A' }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('N/A');
  });

  it('Given: CSV with boolean false value When: formatting Then: should output No', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'active', header: 'Active', type: 'boolean' }],
      rows: [{ active: false }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('No');
  });

  it('Given: CSV with header containing special chars When: escaping Then: should wrap in quotes', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'desc', header: 'Description, with comma', type: 'string' }],
      rows: [{ desc: 'simple' }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('"Description, with comma"');
  });

  it('Given: CSV with value containing newline When: escaping Then: should wrap in quotes', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [{ key: 'note', header: 'Note', type: 'string' }],
      rows: [{ note: 'line1\nline2' }],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 1,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toContain('"line1\nline2"');
  });

  it('Given: empty data rows When: exporting CSV Then: should return CSV with only headers', async () => {
    // Arrange
    reportViewService.viewReport.mockResolvedValueOnce({
      columns: [
        { key: 'name', header: 'Name', type: 'string' },
        { key: 'value', header: 'Value', type: 'number' },
      ],
      rows: [],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        reportTitle: 'Sales Report',
        generatedAt: new Date('2024-01-01T00:00:00.000Z'),
        parameters: {},
        totalRecords: 0,
        orgId: 'org-1',
      },
      summary: {},
    });

    // Act
    const result = await service.exportToCSV(REPORT_TYPES.SALES, {}, 'org-1', {
      includeHeader: true,
    });

    // Assert
    const csv = result.buffer.toString('utf-8');
    expect(csv).toBe('Name,Value');
    expect(result.size).toBeGreaterThan(0);
  });

  it('Given: Excel generation fails without error message When: exporting Then: should throw default message', async () => {
    // Arrange
    documentGenerationService.generateExcel.mockResolvedValueOnce({
      success: false,
    });

    // Act & Assert
    await expect(
      service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.EXCEL, {}, 'org-1')
    ).rejects.toThrow('Failed to generate Excel document');
  });

  it('Given: Excel generation returns null buffer When: exporting Then: should throw', async () => {
    // Arrange
    documentGenerationService.generateExcel.mockResolvedValueOnce({
      success: true,
      buffer: null,
    });

    // Act & Assert
    await expect(
      service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.EXCEL, {}, 'org-1')
    ).rejects.toThrow('Failed to generate Excel document');
  });

  it('Given: PDF generation fails without error message When: exporting Then: should throw default message', async () => {
    // Arrange
    documentGenerationService.generatePDF.mockResolvedValueOnce({
      success: false,
    });

    // Act & Assert
    await expect(
      service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.PDF, {}, 'org-1')
    ).rejects.toThrow('Failed to generate PDF document');
  });

  it('Given: Excel export with author option When: exporting Then: should pass author to document service', async () => {
    // Act
    await service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.EXCEL, {}, 'org-1', {
      author: 'Test User',
      includeHeader: true,
    });

    // Assert
    expect(documentGenerationService.generateExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ generatedBy: 'Test User' }),
        options: expect.objectContaining({ author: 'Test User', includeHeader: true }),
      })
    );
  });

  it('Given: PDF export with custom title and options When: exporting Then: should pass to document service', async () => {
    // Act
    await service.exportReport(REPORT_TYPES.SALES, REPORT_FORMATS.PDF, {}, 'org-1', {
      title: 'Custom PDF Title',
      includeSummary: true,
      author: 'Admin',
    });

    // Assert
    expect(documentGenerationService.generatePDF).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Custom PDF Title',
        options: expect.objectContaining({
          includeSummary: true,
          author: 'Admin',
        }),
      })
    );
  });

  it('Given: JSON export When: exporting Then: should return properly formatted JSON', async () => {
    // Act
    const result = await service.exportToJSON(REPORT_TYPES.SALES, {}, 'org-1', {});

    // Assert
    expect(result.mimeType).toBe('application/json');
    expect(result.filename).toContain('.json');
    const parsed = JSON.parse(result.buffer.toString('utf-8'));
    expect(parsed).toHaveProperty('metadata');
    expect(parsed).toHaveProperty('rows');
  });
});
