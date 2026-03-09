import { DocumentGenerationService } from '@infrastructure/externalServices/documentGenerationService';
import { describe, expect, it, jest } from '@jest/globals';

import type {
  IDocumentGenerationRequest,
  IDocumentGenerationResponse,
} from '@shared/ports/externalServices';

describe('DocumentGenerationService', () => {
  const baseRequest: IDocumentGenerationRequest = {
    title: 'Stock Report',
    columns: [
      { key: 'sku', header: 'SKU', type: 'text' },
      { key: 'quantity', header: 'Quantity', type: 'number' },
      { key: 'date', header: 'Date', type: 'date' },
    ],
    rows: [
      { sku: 'SKU-1', quantity: 10, date: new Date('2025-01-01') },
      { sku: 'SKU-2', quantity: 0, date: new Date('2025-01-02') },
    ],
    metadata: {
      reportType: 'inventory',
      generatedAt: new Date('2025-01-05T10:00:00.000Z'),
      orgId: 'org-1',
    },
    options: {
      includeSummary: true,
      author: 'QA',
      includeHeader: true,
    },
    summary: {
      totalItems: 2,
    },
  };

  it('generates PDF response', async () => {
    const service = new DocumentGenerationService();
    const timerSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((handler: (...args: unknown[]) => void) => {
        handler();
        return 0 as unknown as NodeJS.Timeout;
      });

    const result = await service.generatePDF(baseRequest);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer?.toString('utf-8')).toContain('REPORT: Stock Report');

    timerSpy.mockRestore();
  });

  it('generates Excel response', async () => {
    const service = new DocumentGenerationService();

    const result = await service.generateExcel(baseRequest);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    // ExcelJS generates a real .xlsx file (ZIP-based format starting with PK header)
    expect(result.buffer!.length).toBeGreaterThan(0);
    // Verify it's a valid ZIP/XLSX file (starts with PK signature: 0x50 0x4B)
    expect(result.buffer![0]).toBe(0x50);
    expect(result.buffer![1]).toBe(0x4b);
  });

  it('handles PDF generation errors', async () => {
    const service = new DocumentGenerationService();
    const timerSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((handler: (...args: unknown[]) => void) => {
        handler();
        return 0 as unknown as NodeJS.Timeout;
      });

    const error = new Error('boom');
    const generateSpy = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(service as any, 'generatePlaceholderPDF')
      .mockImplementation(() => {
        throw error;
      });

    const result = (await service.generatePDF(baseRequest)) as IDocumentGenerationResponse;

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');

    generateSpy.mockRestore();
    timerSpy.mockRestore();
  });

  it('returns healthy status', async () => {
    const service = new DocumentGenerationService();
    const result = await service.healthCheck();
    expect(result).toBe(true);
  });

  describe('Excel formatting branches', () => {
    it('generates Excel with currency columns including negative values', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'amount', header: 'Amount', type: 'currency' },
        ],
        rows: [
          { name: 'Item A', amount: 100.5 },
          { name: 'Item B', amount: -50.25 },
          { name: 'Item C', amount: 0 },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('generates Excel with percentage columns', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'rate', header: 'Rate', type: 'percentage' },
        ],
        rows: [
          { name: 'Item A', rate: 50 },
          { name: 'Item B', rate: 75.5 },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with boolean columns', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'active', header: 'Active', type: 'boolean' },
        ],
        rows: [
          { name: 'Item A', active: true },
          { name: 'Item B', active: false },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with date columns', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'createdAt', header: 'Created', type: 'date' },
        ],
        rows: [
          { name: 'Item A', createdAt: new Date('2025-01-01') },
          { name: 'Item B', createdAt: '2025-06-15' },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with number columns', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'qty', header: 'Quantity', type: 'number' },
        ],
        rows: [
          { name: 'Item A', qty: 100 },
          { name: 'Item B', qty: '200' },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with null/undefined cell values', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string' },
          { key: 'value', header: 'Value', type: 'number' },
          { key: 'note', header: 'Note', type: 'string' },
        ],
        rows: [
          { name: 'Item A', value: null, note: undefined },
          { name: 'Item B', value: 10, note: 'ok' },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with custom column widths', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'name', header: 'Name', type: 'string', width: 30 },
          { key: 'qty', header: 'Quantity', type: 'number', width: 15 },
        ],
        rows: [{ name: 'Item A', qty: 10 }],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel without summary section when includeSummary is false', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        options: {
          includeSummary: false,
          includeHeader: true,
        },
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel without header when includeHeader is false', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        options: {
          includeSummary: true,
          includeHeader: false,
        },
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with empty rows', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        rows: [],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel without summary data', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        summary: undefined,
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with empty summary object', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        summary: {},
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with no options', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        title: 'No Options Report',
        columns: [{ key: 'name', header: 'Name', type: 'string' }],
        rows: [{ name: 'Item A' }],
        metadata: {
          reportType: 'test',
          generatedAt: new Date(),
          orgId: 'org-1',
        },
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with string summary values', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        summary: {
          totalItems: 5,
          reportStatus: 'Complete',
        },
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });
  });

  describe('Excel error handling', () => {
    it('handles Excel generation error and returns failure response', async () => {
      const service = new DocumentGenerationService();
      // Force an error by passing data that will cause ExcelJS to fail
      const addWorksheetSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(require('exceljs').Workbook.prototype, 'addWorksheet')
        .mockImplementation(() => {
          throw new Error('Excel generation failed');
        });

      const result = await service.generateExcel(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Excel generation failed');
      expect(result.generationTime).toBeDefined();

      addWorksheetSpy.mockRestore();
    });

    it('handles non-Error thrown object in Excel generation', async () => {
      const service = new DocumentGenerationService();
      const addWorksheetSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(require('exceljs').Workbook.prototype, 'addWorksheet')
        .mockImplementation(() => {
          throw 'string error'; // eslint-disable-line no-throw-literal
        });

      const result = await service.generateExcel(baseRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');

      addWorksheetSpy.mockRestore();
    });
  });

  describe('PDF generation branches', () => {
    it('generates PDF without author option', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        options: {
          includeSummary: true,
          includeHeader: true,
        },
      };

      const result = await service.generatePDF(request);
      expect(result.success).toBe(true);
      expect(result.buffer?.toString('utf-8')).not.toContain('Author:');

      timerSpy.mockRestore();
    });

    it('generates PDF without summary when includeSummary is false', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        options: {
          includeSummary: false,
        },
      };

      const result = await service.generatePDF(request);
      expect(result.success).toBe(true);
      expect(result.buffer?.toString('utf-8')).not.toContain('SUMMARY');

      timerSpy.mockRestore();
    });

    it('generates PDF with more than 100 rows and truncates display', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const rows = Array.from({ length: 110 }, (_, i) => ({
        sku: `SKU-${i}`,
        quantity: i,
        date: new Date(),
      }));

      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        rows,
      };

      const result = await service.generatePDF(request);
      expect(result.success).toBe(true);
      const content = result.buffer?.toString('utf-8') || '';
      expect(content).toContain('and 10 more rows');

      timerSpy.mockRestore();
    });

    it('generates PDF with summary but without summary data', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        summary: undefined,
        options: {
          includeSummary: true,
        },
      };

      const result = await service.generatePDF(request);
      expect(result.success).toBe(true);
      // summary is falsy, so SUMMARY header should not appear
      expect(result.buffer?.toString('utf-8')).not.toContain('SUMMARY');

      timerSpy.mockRestore();
    });

    it('handles non-Error thrown object in PDF generation', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const generateSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(service as any, 'generatePlaceholderPDF')
        .mockImplementation(() => {
          throw 'non-error-object'; // eslint-disable-line no-throw-literal
        });

      const result = await service.generatePDF(baseRequest);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');

      generateSpy.mockRestore();
      timerSpy.mockRestore();
    });

    it('generates PDF with null values in row data', async () => {
      const service = new DocumentGenerationService();
      const timerSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((handler: (...args: unknown[]) => void) => {
          handler();
          return 0 as unknown as NodeJS.Timeout;
        });

      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        rows: [{ sku: null, quantity: undefined, date: null }],
      };

      const result = await service.generatePDF(request);
      expect(result.success).toBe(true);

      timerSpy.mockRestore();
    });
  });

  describe('formatCellValue edge cases', () => {
    it('handles percentage with string value', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [{ key: 'rate', header: 'Rate', type: 'percentage' }],
        rows: [{ rate: '50' }, { rate: 'invalid' }],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('handles currency with string value', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [{ key: 'amount', header: 'Amount', type: 'currency' }],
        rows: [{ amount: '100.50' }, { amount: 'not-a-number' }],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('handles date with Date object value', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [{ key: 'created', header: 'Created', type: 'date' }],
        rows: [
          { created: new Date('2025-01-01') },
          { created: '2025-06-01' },
          { created: 12345 }, // non-string, non-Date
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });

    it('generates Excel with all column types for alignment coverage', async () => {
      const service = new DocumentGenerationService();
      const request: IDocumentGenerationRequest = {
        ...baseRequest,
        columns: [
          { key: 'text', header: 'Text', type: 'string' },
          { key: 'num', header: 'Number', type: 'number' },
          { key: 'amt', header: 'Amount', type: 'currency' },
          { key: 'pct', header: 'Percent', type: 'percentage' },
          { key: 'dt', header: 'Date', type: 'date' },
          { key: 'flag', header: 'Flag', type: 'boolean' },
        ],
        rows: [
          { text: 'hello', num: 42, amt: 99.99, pct: 50, dt: new Date(), flag: true },
          { text: 'world', num: 7, amt: -10, pct: 25, dt: '2025-03-01', flag: false },
        ],
      };

      const result = await service.generateExcel(request);
      expect(result.success).toBe(true);
    });
  });
});
