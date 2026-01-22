import { ReportViewService, type IReportColumn } from '@report/domain/services/reportView.service';
import { REPORT_TYPES } from '@report/domain/valueObjects';

import type { ReportGenerationService } from '@report/domain/services/reportGeneration.service';

describe('ReportViewService', () => {
  const reportGenerationService: Pick<ReportGenerationService, 'generateReport'> = {
    generateReport: jest.fn(),
  };
  const service = new ReportViewService(
    reportGenerationService as unknown as ReportGenerationService
  );
  const serviceAccess = service as unknown as {
    getColumnsForReportType: (type: string) => IReportColumn[];
    calculateSummary: (
      type: string,
      result: {
        data: Record<string, unknown>[];
        metadata: {
          reportType: string;
          generatedAt: Date;
          parameters: Record<string, unknown>;
          totalRecords: number;
          orgId: string;
        };
      }
    ) => Record<string, unknown> | undefined;
  };

  it('Given: report data When: viewing report Then: should return columns, metadata, and summary', async () => {
    // Arrange
    const type = REPORT_TYPES.SALES;
    const parameters = { warehouseId: 'warehouse-1' };
    const generatedAt = new Date('2024-01-15');
    reportGenerationService.generateReport.mockResolvedValue({
      data: [
        { totalAmount: 100, totalItems: 2 },
        { totalAmount: 50, totalItems: 1 },
      ],
      metadata: {
        reportType: type,
        generatedAt,
        parameters,
        totalRecords: 2,
        orgId: 'org-1',
      },
    });

    // Act
    const result = await service.viewReport(type, parameters, 'org-1');

    // Assert
    expect(result.columns.length).toBeGreaterThan(0);
    expect(result.metadata.reportType).toBe(type);
    expect(result.summary).toEqual({
      totalSales: 2,
      totalAmount: 150,
      totalItems: 3,
    });
  });

  it('Given: all report types When: requesting columns Then: should return definitions', () => {
    // Arrange
    const types = Object.values(REPORT_TYPES);

    // Act & Assert
    types.forEach(type => {
      const columns = serviceAccess.getColumnsForReportType(type);
      expect(columns.length).toBeGreaterThan(0);
    });
  });

  it('Given: report types When: calculating summary Then: should compute expected totals', () => {
    // Arrange
    const baseMeta = {
      reportType: REPORT_TYPES.AVAILABLE_INVENTORY,
      generatedAt: new Date('2024-01-15'),
      parameters: {},
      totalRecords: 0,
      orgId: 'org-1',
    };

    const cases = [
      {
        type: REPORT_TYPES.AVAILABLE_INVENTORY,
        data: [{ totalValue: 10, quantity: 2 }],
        expected: { totalRecords: 1, totalValue: 10, totalQuantity: 2 },
      },
      {
        type: REPORT_TYPES.MOVEMENT_HISTORY,
        data: [{ totalCost: 5 }],
        expected: { totalRecords: 1, totalCost: 5 },
      },
      {
        type: REPORT_TYPES.LOW_STOCK,
        data: [{ severity: 'CRITICAL', deficit: 3 }],
        expected: { totalAlerts: 1, criticalCount: 1, warningCount: 0, totalDeficit: 3 },
      },
      {
        type: REPORT_TYPES.MOVEMENTS,
        data: [{ totalMovements: 2, totalQuantity: 5, totalValue: 20 }],
        expected: { totalRecords: 1, totalMovements: 2, totalQuantity: 5, totalValue: 20 },
      },
      {
        type: REPORT_TYPES.FINANCIAL,
        data: [{ totalInventoryValue: 10, totalRevenue: 50, totalCost: 5, grossMargin: 45 }],
        expected: {
          totalInventoryValue: 10,
          totalRevenue: 50,
          totalCost: 5,
          totalGrossMargin: 45,
        },
      },
      {
        type: REPORT_TYPES.TURNOVER,
        data: [{ classification: 'FAST_MOVING' }],
        expected: { totalRecords: 1, slowMovingCount: 0, normalCount: 0, fastMovingCount: 1 },
      },
      {
        type: REPORT_TYPES.SALES_BY_PRODUCT,
        data: [{ totalRevenue: 100, totalQuantitySold: 4 }],
        expected: { totalProducts: 1, totalRevenue: 100, totalQuantitySold: 4 },
      },
      {
        type: REPORT_TYPES.SALES_BY_WAREHOUSE,
        data: [{ totalRevenue: 100, totalSales: 2 }],
        expected: { totalWarehouses: 1, totalRevenue: 100, totalSales: 2 },
      },
      {
        type: REPORT_TYPES.RETURNS,
        data: [{ totalValue: 20, totalItems: 2 }],
        expected: { totalReturns: 1, totalValue: 20, totalItems: 2 },
      },
      {
        type: REPORT_TYPES.RETURNS_BY_PRODUCT,
        data: [{ totalQuantityReturned: 2, totalValueReturned: 10 }],
        expected: {
          totalProducts: 1,
          totalQuantityReturned: 2,
          totalValueReturned: 10,
        },
      },
    ];

    // Act & Assert
    cases.forEach(testCase => {
      const result = serviceAccess.calculateSummary(testCase.type, {
        data: testCase.data,
        metadata: { ...baseMeta, reportType: testCase.type },
      });
      expect(result).toEqual(testCase.expected);
    });
  });

  it('Given: empty data When: calculating summary Then: should return undefined', () => {
    // Arrange
    const result = serviceAccess.calculateSummary(REPORT_TYPES.SALES, {
      data: [],
      metadata: {
        reportType: REPORT_TYPES.SALES,
        generatedAt: new Date('2024-01-15'),
        parameters: {},
        totalRecords: 0,
        orgId: 'org-1',
      },
    });

    // Act & Assert
    expect(result).toBeUndefined();
  });

  it('Given: unknown report type When: calculating summary Then: should return totalRecords only', () => {
    // Arrange
    const result = serviceAccess.calculateSummary('UNKNOWN_TYPE', {
      data: [{ id: 1 }, { id: 2 }],
      metadata: {
        reportType: 'UNKNOWN_TYPE',
        generatedAt: new Date('2024-01-15'),
        parameters: {},
        totalRecords: 2,
        orgId: 'org-1',
      },
    });

    // Act & Assert
    expect(result).toEqual({ totalRecords: 2 });
  });
});
