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
});
