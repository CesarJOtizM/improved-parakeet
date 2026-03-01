/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReportController } from '@interface/http/report/report.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

describe('ReportController', () => {
  let controller: ReportController;
  let mockViewReportUseCase: any;
  let mockStreamReportUseCase: any;
  let mockExportReportUseCase: any;
  let mockGetReportsUseCase: any;

  const mockReportData = {
    success: true,
    data: {
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Product Name' },
        { key: 'quantity', label: 'Quantity' },
      ],
      rows: [
        { sku: 'SKU-001', name: 'Product 1', quantity: 100 },
        { sku: 'SKU-002', name: 'Product 2', quantity: 50 },
      ],
      metadata: { totalRecords: 2, generatedAt: new Date().toISOString() },
    },
    message: 'Report generated successfully',
    timestamp: new Date().toISOString(),
  };

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockQuery = {} as any;

  beforeEach(() => {
    mockViewReportUseCase = { execute: jest.fn() };
    mockStreamReportUseCase = { execute: jest.fn() };
    mockExportReportUseCase = { execute: jest.fn() };
    mockGetReportsUseCase = { execute: jest.fn() };

    controller = new ReportController(
      mockViewReportUseCase,
      mockStreamReportUseCase,
      mockExportReportUseCase,
      mockGetReportsUseCase
    );
  });

  describe('viewAvailableInventory', () => {
    it('Given: valid request When: viewing available inventory Then: should return report data', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewAvailableInventory(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVAILABLE_INVENTORY',
          orgId: mockOrgId,
          viewedBy: mockUserId,
        })
      );
    });

    it('Given: use case error When: viewing available inventory Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewAvailableInventory(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewLowStock', () => {
    it('Given: valid request When: viewing low stock Then: should return low stock report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewLowStock(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'LOW_STOCK' })
      );
    });
  });

  describe('viewAbcAnalysis', () => {
    it('Given: valid request When: viewing ABC analysis Then: should return ABC report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewAbcAnalysis(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ABC_ANALYSIS' })
      );
    });
  });

  describe('viewDeadStock', () => {
    it('Given: valid request When: viewing dead stock Then: should return dead stock report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewDeadStock(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DEAD_STOCK' })
      );
    });
  });

  describe('viewSales', () => {
    it('Given: valid request When: viewing sales report Then: should return sales data', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewSales(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SALES' })
      );
    });
  });

  describe('viewReturns', () => {
    it('Given: valid request When: viewing returns report Then: should return returns data', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewReturns(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RETURNS' })
      );
    });
  });

  describe('viewReturnsBySale', () => {
    it('Given: valid saleId When: viewing returns by sale Then: should include saleId in params', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewReturnsBySale(
        mockQuery,
        'sale-123',
        mockOrgId,
        mockUserId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS_BY_SALE',
          parameters: expect.objectContaining({ saleId: 'sale-123' }),
        })
      );
    });
  });

  describe('getReportHistory', () => {
    it('Given: valid filters When: getting report history Then: should return history', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [{ id: 'report-1', type: 'AVAILABLE_INVENTORY', status: 'COMPLETED' }],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      const result = await controller.getReportHistory(
        'AVAILABLE_INVENTORY',
        'COMPLETED',
        undefined,
        undefined,
        undefined,
        mockOrgId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          type: 'AVAILABLE_INVENTORY',
          status: 'COMPLETED',
        })
      );
    });

    it('Given: use case error When: getting history Then: should throw', async () => {
      // Arrange
      mockGetReportsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve report history'))
      );

      // Act & Assert
      await expect(
        controller.getReportHistory(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          mockOrgId
        )
      ).rejects.toThrow();
    });
  });

  describe('userId fallback', () => {
    it('Given: no userId header When: viewing report Then: should use system as viewedBy', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(mockQuery, mockOrgId, '');

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });
  });
});
