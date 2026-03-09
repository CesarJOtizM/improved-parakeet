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

  const mockExportData = {
    data: {
      buffer: Buffer.from('mock-file-content'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'report-2024-01-01.xlsx',
      size: 17,
    },
  };

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockQuery = {} as any;

  const createMockResponse = () => {
    const res: any = {
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      closed: false,
    };
    return res;
  };

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

  // ============================================================
  // VIEW ENDPOINTS
  // ============================================================

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

  describe('viewMovementHistory', () => {
    it('Given: valid request When: viewing movement history Then: should return report data', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewMovementHistory(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MOVEMENT_HISTORY',
          orgId: mockOrgId,
          viewedBy: mockUserId,
        })
      );
    });

    it('Given: use case error When: viewing movement history Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewMovementHistory(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewValuation', () => {
    it('Given: valid request When: viewing valuation Then: should return valuation report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewValuation(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VALUATION' })
      );
    });

    it('Given: use case error When: viewing valuation Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewValuation(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
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

    it('Given: use case error When: viewing low stock Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewLowStock(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
    });
  });

  describe('viewMovementsSummary', () => {
    it('Given: valid request When: viewing movements summary Then: should return movements report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewMovementsSummary(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MOVEMENTS' })
      );
    });

    it('Given: use case error When: viewing movements summary Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewMovementsSummary(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewFinancial', () => {
    it('Given: valid request When: viewing financial Then: should return financial report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewFinancial(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FINANCIAL' })
      );
    });

    it('Given: use case error When: viewing financial Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewFinancial(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
    });
  });

  describe('viewTurnover', () => {
    it('Given: valid request When: viewing turnover Then: should return turnover report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewTurnover(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TURNOVER' })
      );
    });

    it('Given: use case error When: viewing turnover Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewTurnover(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
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

    it('Given: use case error When: viewing ABC analysis Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewAbcAnalysis(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
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

    it('Given: use case error When: viewing dead stock Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewDeadStock(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
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

    it('Given: use case error When: viewing sales Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewSales(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
    });
  });

  describe('viewSalesByProduct', () => {
    it('Given: valid request When: viewing sales by product Then: should return sales by product report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewSalesByProduct(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SALES_BY_PRODUCT' })
      );
    });

    it('Given: use case error When: viewing sales by product Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewSalesByProduct(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewSalesByWarehouse', () => {
    it('Given: valid request When: viewing sales by warehouse Then: should return sales by warehouse report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewSalesByWarehouse(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SALES_BY_WAREHOUSE' })
      );
    });

    it('Given: use case error When: viewing sales by warehouse Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewSalesByWarehouse(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewSalesByClient', () => {
    it('Given: valid request When: viewing sales by client Then: should return sales by client report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewSalesByClient(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SALES_BY_CLIENT' })
      );
    });

    it('Given: use case error When: viewing sales by client Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewSalesByClient(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
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

    it('Given: use case error When: viewing returns Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(controller.viewReturns(mockQuery, mockOrgId, mockUserId)).rejects.toThrow();
    });
  });

  describe('viewReturnsByType', () => {
    it('Given: valid request When: viewing returns by type Then: should return returns by type report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewReturnsByType(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RETURNS_BY_TYPE' })
      );
    });

    it('Given: use case error When: viewing returns by type Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewReturnsByType(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewReturnsByProduct', () => {
    it('Given: valid request When: viewing returns by product Then: should return returns by product report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewReturnsByProduct(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RETURNS_BY_PRODUCT' })
      );
    });

    it('Given: use case error When: viewing returns by product Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewReturnsByProduct(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
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

    it('Given: use case error When: viewing returns by sale Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewReturnsBySale(mockQuery, 'sale-123', mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewCustomerReturns', () => {
    it('Given: valid request When: viewing customer returns Then: should return customer returns report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewCustomerReturns(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RETURNS_CUSTOMER' })
      );
    });

    it('Given: use case error When: viewing customer returns Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewCustomerReturns(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('viewSupplierReturns', () => {
    it('Given: valid request When: viewing supplier returns Then: should return supplier returns report', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      const result = await controller.viewSupplierReturns(mockQuery, mockOrgId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RETURNS_SUPPLIER' })
      );
    });

    it('Given: use case error When: viewing supplier returns Then: should throw', async () => {
      // Arrange
      mockViewReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to generate report'))
      );

      // Act & Assert
      await expect(
        controller.viewSupplierReturns(mockQuery, mockOrgId, mockUserId)
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // EXPORT ENDPOINTS
  // ============================================================

  describe('exportAvailableInventory', () => {
    it('Given: valid dto When: exporting available inventory Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVAILABLE_INVENTORY',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': mockExportData.data.mimeType,
          'Content-Disposition': `attachment; filename="${mockExportData.data.filename}"`,
          'Content-Length': mockExportData.data.size,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting available inventory Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportMovementHistory', () => {
    it('Given: valid dto When: exporting movement history Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'CSV', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportMovementHistory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MOVEMENT_HISTORY',
          format: 'CSV',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.set).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting movement history Then: should throw', async () => {
      // Arrange
      const dto = { format: 'CSV' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportMovementHistory(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportValuation', () => {
    it('Given: valid dto When: exporting valuation Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'PDF', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportValuation(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'VALUATION',
          format: 'PDF',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting valuation Then: should throw', async () => {
      // Arrange
      const dto = { format: 'PDF' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportValuation(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportLowStock', () => {
    it('Given: valid dto When: exporting low stock Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportLowStock(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOW_STOCK',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting low stock Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportLowStock(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportMovementsSummary', () => {
    it('Given: valid dto When: exporting movements summary Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportMovementsSummary(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MOVEMENTS',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting movements summary Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportMovementsSummary(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportFinancial', () => {
    it('Given: valid dto When: exporting financial Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportFinancial(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FINANCIAL',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting financial Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportFinancial(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportTurnover', () => {
    it('Given: valid dto When: exporting turnover Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportTurnover(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TURNOVER',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting turnover Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportTurnover(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportSales', () => {
    it('Given: valid dto When: exporting sales Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportSales(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting sales Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportSales(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportSalesByProduct', () => {
    it('Given: valid dto When: exporting sales by product Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportSalesByProduct(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES_BY_PRODUCT',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting sales by product Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportSalesByProduct(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportSalesByWarehouse', () => {
    it('Given: valid dto When: exporting sales by warehouse Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportSalesByWarehouse(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES_BY_WAREHOUSE',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting sales by warehouse Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportSalesByWarehouse(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportSalesByClient', () => {
    it('Given: valid dto When: exporting sales by client Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportSalesByClient(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES_BY_CLIENT',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting sales by client Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportSalesByClient(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportReturns', () => {
    it('Given: valid dto When: exporting returns Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportReturns(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting returns Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportReturns(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportReturnsByType', () => {
    it('Given: valid dto When: exporting returns by type Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportReturnsByType(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS_BY_TYPE',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting returns by type Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportReturnsByType(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportReturnsByProduct', () => {
    it('Given: valid dto When: exporting returns by product Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportReturnsByProduct(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS_BY_PRODUCT',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting returns by product Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(
        controller.exportReturnsByProduct(dto, mockOrgId, mockUserId, res)
      ).rejects.toThrow();
    });
  });

  describe('exportAbcAnalysis', () => {
    it('Given: valid dto When: exporting ABC analysis Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAbcAnalysis(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ABC_ANALYSIS',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting ABC analysis Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportAbcAnalysis(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  describe('exportDeadStock', () => {
    it('Given: valid dto When: exporting dead stock Then: should set headers and send buffer', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportDeadStock(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DEAD_STOCK',
          format: 'EXCEL',
          orgId: mockOrgId,
          exportedBy: mockUserId,
        })
      );
      expect(res.send).toHaveBeenCalledWith(mockExportData.data.buffer);
    });

    it('Given: use case error When: exporting dead stock Then: should throw', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to export report'))
      );

      // Act & Assert
      await expect(controller.exportDeadStock(dto, mockOrgId, mockUserId, res)).rejects.toThrow();
    });
  });

  // ============================================================
  // STREAM ENDPOINTS
  // ============================================================

  describe('streamAvailableInventory', () => {
    it('Given: valid request When: streaming available inventory Then: should stream NDJSON data', async () => {
      // Arrange
      const res = createMockResponse();
      const mockBatches = [
        [
          { sku: 'SKU-001', quantity: 100 },
          { sku: 'SKU-002', quantity: 50 },
        ],
        [{ sku: 'SKU-003', quantity: 25 }],
      ];
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          for (const batch of mockBatches) {
            yield batch;
          }
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.write).toHaveBeenCalledTimes(3);
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ sku: 'SKU-001', quantity: 100 }) + '\n'
      );
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ sku: 'SKU-002', quantity: 50 }) + '\n'
      );
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ sku: 'SKU-003', quantity: 25 }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: stream error When: streaming available inventory Then: should write error and end', async () => {
      // Arrange
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Stream failed');
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Stream failed' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: client disconnects When: streaming available inventory Then: should stop streaming', async () => {
      // Arrange
      const res = createMockResponse();
      let batchCount = 0;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          yield [{ sku: 'SKU-001', quantity: 100 }];
          batchCount++;
          // Simulate client disconnect after first batch
          res.closed = true;
          yield [{ sku: 'SKU-002', quantity: 50 }];
          batchCount++;
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledTimes(1);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('streamSales', () => {
    it('Given: valid request When: streaming sales Then: should stream NDJSON data', async () => {
      // Arrange
      const res = createMockResponse();
      const mockBatches = [[{ saleId: 'sale-1', total: 150 }]];
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          for (const batch of mockBatches) {
            yield batch;
          }
        })()
      );

      // Act
      await controller.streamSales(mockQuery, mockOrgId, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ saleId: 'sale-1', total: 150 }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
      expect(mockStreamReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES',
          orgId: mockOrgId,
        })
      );
    });

    it('Given: stream error When: streaming sales Then: should write error and end', async () => {
      // Arrange
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Sales stream failed');
        })()
      );

      // Act
      await controller.streamSales(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Sales stream failed' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('streamReturns', () => {
    it('Given: valid request When: streaming returns Then: should stream NDJSON data', async () => {
      // Arrange
      const res = createMockResponse();
      const mockBatches = [[{ returnId: 'ret-1', reason: 'Defective' }]];
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          for (const batch of mockBatches) {
            yield batch;
          }
        })()
      );

      // Act
      await controller.streamReturns(mockQuery, mockOrgId, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ returnId: 'ret-1', reason: 'Defective' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
      expect(mockStreamReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS',
          orgId: mockOrgId,
        })
      );
    });

    it('Given: stream error When: streaming returns Then: should write error and end', async () => {
      // Arrange
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Returns stream failed');
        })()
      );

      // Act
      await controller.streamReturns(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Returns stream failed' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });
  });

  // ============================================================
  // REPORT HISTORY
  // ============================================================

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

    it('Given: all filters provided When: getting history Then: should pass all filters including dates', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      await controller.getReportHistory(
        'SALES',
        'COMPLETED',
        'user-456',
        '2024-01-01',
        '2024-12-31',
        mockOrgId
      );

      // Assert
      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          type: 'SALES',
          status: 'COMPLETED',
          generatedBy: 'user-456',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        })
      );
    });

    it('Given: no filters When: getting history Then: should pass undefined filters', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      await controller.getReportHistory(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockOrgId
      );

      // Assert
      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        status: undefined,
        generatedBy: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  // ============================================================
  // USERID FALLBACK
  // ============================================================

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

    it('Given: no userId header When: exporting report Then: should use system as exportedBy', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, '', res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });
  });

  // ============================================================
  // HELPER METHODS: mapQueryToParameters
  // ============================================================

  describe('mapQueryToParameters (via view endpoints)', () => {
    it('Given: query with dateRange When: mapping parameters Then: should convert date strings to Date objects', async () => {
      // Arrange
      const queryWithDates = {
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithDates, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
            },
          }),
        })
      );
    });

    it('Given: query without dateRange When: mapping parameters Then: dateRange should be undefined', async () => {
      // Arrange
      const queryNoDates = {} as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryNoDates, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            dateRange: undefined,
          }),
        })
      );
    });

    it('Given: query with warehouseId When: mapping parameters Then: should pass warehouseId', async () => {
      // Arrange
      const queryWithWarehouse = { warehouseId: 'wh-123' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithWarehouse, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            warehouseId: 'wh-123',
          }),
        })
      );
    });

    it('Given: query with productId When: mapping parameters Then: should pass productId', async () => {
      // Arrange
      const queryWithProduct = { productId: 'prod-456' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithProduct, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            productId: 'prod-456',
          }),
        })
      );
    });

    it('Given: query with includeInactive When: mapping parameters Then: should pass includeInactive', async () => {
      // Arrange
      const queryWithInactive = { includeInactive: true } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithInactive, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            includeInactive: true,
          }),
        })
      );
    });

    it('Given: query with category When: mapping parameters Then: should pass category', async () => {
      // Arrange
      const queryWithCategory = { category: 'Electronics' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithCategory, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            category: 'Electronics',
          }),
        })
      );
    });

    it('Given: query with status When: mapping parameters Then: should pass status', async () => {
      // Arrange
      const queryWithStatus = { status: 'CONFIRMED' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithStatus, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            status: 'CONFIRMED',
          }),
        })
      );
    });

    it('Given: query with returnType When: mapping parameters Then: should pass returnType', async () => {
      // Arrange
      const queryWithReturnType = { returnType: 'CUSTOMER' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewReturns(queryWithReturnType, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            returnType: 'CUSTOMER',
          }),
        })
      );
    });

    it('Given: query with groupBy When: mapping parameters Then: should pass groupBy', async () => {
      // Arrange
      const queryWithGroupBy = { groupBy: 'MONTH' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewSales(queryWithGroupBy, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'MONTH',
          }),
        })
      );
    });

    it('Given: query with period When: mapping parameters Then: should pass period', async () => {
      // Arrange
      const queryWithPeriod = { period: 'MONTHLY' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewTurnover(queryWithPeriod, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            period: 'MONTHLY',
          }),
        })
      );
    });

    it('Given: query with movementType When: mapping parameters Then: should pass movementType', async () => {
      // Arrange
      const queryWithMovementType = { movementType: 'IN' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewMovementHistory(queryWithMovementType, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            movementType: 'IN',
          }),
        })
      );
    });

    it('Given: query with customerReference When: mapping parameters Then: should pass customerReference', async () => {
      // Arrange
      const queryWithRef = { customerReference: 'CUST-001' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewReturns(queryWithRef, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            customerReference: 'CUST-001',
          }),
        })
      );
    });

    it('Given: query with saleId When: mapping parameters Then: should pass saleId', async () => {
      // Arrange
      const queryWithSaleId = { saleId: 'sale-789' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewReturns(queryWithSaleId, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            saleId: 'sale-789',
          }),
        })
      );
    });

    it('Given: query with movementId When: mapping parameters Then: should pass movementId', async () => {
      // Arrange
      const queryWithMovementId = { movementId: 'mov-123' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewMovementHistory(queryWithMovementId, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            movementId: 'mov-123',
          }),
        })
      );
    });

    it('Given: query with locationId When: mapping parameters Then: should pass locationId', async () => {
      // Arrange
      const queryWithLocation = { locationId: 'loc-456' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(queryWithLocation, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            locationId: 'loc-456',
          }),
        })
      );
    });

    it('Given: query with severity When: mapping parameters Then: should pass severity', async () => {
      // Arrange
      const queryWithSeverity = { severity: 'CRITICAL' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewLowStock(queryWithSeverity, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            severity: 'CRITICAL',
          }),
        })
      );
    });

    it('Given: query with deadStockDays When: mapping parameters Then: should convert to number', async () => {
      // Arrange
      const queryWithDays = { deadStockDays: '120' } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewDeadStock(queryWithDays, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            deadStockDays: 120,
          }),
        })
      );
    });

    it('Given: query without deadStockDays When: mapping parameters Then: deadStockDays should be undefined', async () => {
      // Arrange
      const queryNoDays = {} as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewDeadStock(queryNoDays, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            deadStockDays: undefined,
          }),
        })
      );
    });

    it('Given: query with all parameters When: mapping parameters Then: should pass all parameters', async () => {
      // Arrange
      const fullQuery = {
        dateRange: { startDate: '2024-01-01', endDate: '2024-06-30' },
        warehouseId: 'wh-100',
        productId: 'prod-200',
        category: 'Food',
        status: 'PENDING',
        returnType: 'SUPPLIER',
        groupBy: 'WEEK',
        period: 'QUARTERLY',
        movementType: 'OUT',
        customerReference: 'REF-999',
        saleId: 'sale-555',
        movementId: 'mov-777',
        includeInactive: false,
        locationId: 'loc-333',
        severity: 'WARNING',
        deadStockDays: '60',
      } as any;
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));

      // Act
      await controller.viewAvailableInventory(fullQuery, mockOrgId, mockUserId);

      // Assert
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-06-30'),
            },
            warehouseId: 'wh-100',
            productId: 'prod-200',
            category: 'Food',
            status: 'PENDING',
            returnType: 'SUPPLIER',
            groupBy: 'WEEK',
            period: 'QUARTERLY',
            movementType: 'OUT',
            customerReference: 'REF-999',
            saleId: 'sale-555',
            movementId: 'mov-777',
            includeInactive: false,
            locationId: 'loc-333',
            severity: 'WARNING',
            deadStockDays: 60,
          },
        })
      );
    });
  });

  // ============================================================
  // HELPER METHODS: mapDtoToParameters (via export endpoints)
  // ============================================================

  describe('mapDtoToParameters (via export endpoints)', () => {
    it('Given: dto with no parameters When: exporting Then: should pass empty parameters', async () => {
      // Arrange
      const dto = { format: 'EXCEL' } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {},
        })
      );
    });

    it('Given: dto with undefined parameters When: exporting Then: should pass empty parameters', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: undefined } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {},
        })
      );
    });

    it('Given: dto with parameters including dateRange When: exporting Then: should convert date strings', async () => {
      // Arrange
      const dto = {
        format: 'PDF',
        parameters: {
          dateRange: { startDate: '2024-03-01', endDate: '2024-03-31' },
          warehouseId: 'wh-export',
        },
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            dateRange: {
              startDate: new Date('2024-03-01'),
              endDate: new Date('2024-03-31'),
            },
            warehouseId: 'wh-export',
          }),
        })
      );
    });

    it('Given: dto with parameters including deadStockDays When: exporting Then: should convert to number', async () => {
      // Arrange
      const dto = {
        format: 'EXCEL',
        parameters: {
          deadStockDays: '90',
        },
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportDeadStock(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            deadStockDays: 90,
          }),
        })
      );
    });
  });

  // ============================================================
  // HELPER METHODS: handleExport
  // ============================================================

  describe('handleExport (via export endpoints)', () => {
    it('Given: successful export When: exporting Then: should set Content-Type header', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
    });

    it('Given: successful export When: exporting Then: should set Content-Disposition with filename', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': 'attachment; filename="report-2024-01-01.xlsx"',
        })
      );
    });

    it('Given: successful export When: exporting Then: should set Content-Length header', async () => {
      // Arrange
      const dto = { format: 'EXCEL', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Length': 17,
        })
      );
    });

    it('Given: export dto with options When: exporting Then: should pass options to use case', async () => {
      // Arrange
      const dto = {
        format: 'EXCEL',
        parameters: {},
        options: { includeHeader: true, includeSummary: true, title: 'My Report', author: 'Admin' },
        saveMetadata: true,
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            includeHeader: true,
            includeSummary: true,
            title: 'My Report',
            author: 'Admin',
          },
          saveMetadata: true,
        })
      );
    });

    it('Given: export with CSV format When: exporting Then: should pass CSV format to use case', async () => {
      // Arrange
      const dto = { format: 'CSV', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportSales(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'CSV',
        })
      );
    });

    it('Given: export with PDF format When: exporting Then: should pass PDF format to use case', async () => {
      // Arrange
      const dto = { format: 'PDF', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      // Act
      await controller.exportReturns(dto, mockOrgId, mockUserId, res);

      // Assert
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'PDF',
        })
      );
    });
  });

  // ============================================================
  // HELPER METHODS: handleStream
  // ============================================================

  describe('handleStream (via stream endpoints)', () => {
    it('Given: empty stream When: streaming Then: should set headers and end without writing data', async () => {
      // Arrange
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // no data yielded
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: non-Error thrown When: streaming Then: should write generic error message', async () => {
      // Arrange
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw 'string error';
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: connection already closed When: stream error occurs Then: should not try to write error', async () => {
      // Arrange
      const res = createMockResponse();
      res.closed = true;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Stream failed');
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('Given: write fails during error handling When: stream error occurs Then: should silently handle', async () => {
      // Arrange
      const res = createMockResponse();
      res.write.mockImplementation(() => {
        throw new Error('Connection reset');
      });
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Stream failed');
        })()
      );

      // Act & Assert - should not throw
      await expect(
        controller.streamAvailableInventory(mockQuery, mockOrgId, res)
      ).resolves.toBeUndefined();
    });

    it('Given: multiple batches When: streaming Then: should write each item as separate JSON line', async () => {
      // Arrange
      const res = createMockResponse();
      const batch1 = [{ id: 1 }, { id: 2 }];
      const batch2 = [{ id: 3 }];
      const batch3 = [{ id: 4 }, { id: 5 }, { id: 6 }];
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          yield batch1;
          yield batch2;
          yield batch3;
        })()
      );

      // Act
      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      // Assert
      expect(res.write).toHaveBeenCalledTimes(6);
      expect(res.write).toHaveBeenNthCalledWith(1, JSON.stringify({ id: 1 }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(2, JSON.stringify({ id: 2 }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(3, JSON.stringify({ id: 3 }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(4, JSON.stringify({ id: 4 }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(5, JSON.stringify({ id: 5 }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(6, JSON.stringify({ id: 6 }) + '\n');
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: stream with query parameters When: streaming Then: should pass mapped parameters', async () => {
      // Arrange
      const res = createMockResponse();
      const queryWithParams = {
        warehouseId: 'wh-stream',
        dateRange: { startDate: '2024-01-01', endDate: '2024-06-30' },
      } as any;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // empty stream
        })()
      );

      // Act
      await controller.streamAvailableInventory(queryWithParams, mockOrgId, res);

      // Assert
      expect(mockStreamReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AVAILABLE_INVENTORY',
          orgId: mockOrgId,
          parameters: expect.objectContaining({
            warehouseId: 'wh-stream',
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-06-30'),
            },
          }),
        })
      );
    });
  });

  // ============================================================
  // VIEW ENDPOINTS: userId fallback per endpoint
  // ============================================================

  describe('view endpoints userId fallback to system', () => {
    beforeEach(() => {
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));
    });

    it('Given: empty userId When: viewMovementHistory Then: should use system', async () => {
      await controller.viewMovementHistory(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewValuation Then: should use system', async () => {
      await controller.viewValuation(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewLowStock Then: should use system', async () => {
      await controller.viewLowStock(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewMovementsSummary Then: should use system', async () => {
      await controller.viewMovementsSummary(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewFinancial Then: should use system', async () => {
      await controller.viewFinancial(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewTurnover Then: should use system', async () => {
      await controller.viewTurnover(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewSales Then: should use system', async () => {
      await controller.viewSales(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewSalesByProduct Then: should use system', async () => {
      await controller.viewSalesByProduct(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewSalesByWarehouse Then: should use system', async () => {
      await controller.viewSalesByWarehouse(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewSalesByClient Then: should use system', async () => {
      await controller.viewSalesByClient(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewReturns Then: should use system', async () => {
      await controller.viewReturns(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewReturnsByType Then: should use system', async () => {
      await controller.viewReturnsByType(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewReturnsByProduct Then: should use system', async () => {
      await controller.viewReturnsByProduct(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewReturnsBySale Then: should use system', async () => {
      await controller.viewReturnsBySale(mockQuery, 'sale-123', mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewCustomerReturns Then: should use system', async () => {
      await controller.viewCustomerReturns(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewSupplierReturns Then: should use system', async () => {
      await controller.viewSupplierReturns(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewAbcAnalysis Then: should use system', async () => {
      await controller.viewAbcAnalysis(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });

    it('Given: empty userId When: viewDeadStock Then: should use system', async () => {
      await controller.viewDeadStock(mockQuery, mockOrgId, '');
      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewedBy: 'system' })
      );
    });
  });

  // ============================================================
  // EXPORT ENDPOINTS: userId fallback per endpoint
  // ============================================================

  describe('export endpoints userId fallback to system', () => {
    const dto = { format: 'EXCEL', parameters: {} } as any;

    beforeEach(() => {
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));
    });

    it('Given: empty userId When: exportMovementHistory Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportMovementHistory(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportValuation Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportValuation(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportLowStock Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportLowStock(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportMovementsSummary Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportMovementsSummary(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportFinancial Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportFinancial(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportTurnover Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportTurnover(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportSales Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportSales(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportSalesByProduct Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportSalesByProduct(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportSalesByWarehouse Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportSalesByWarehouse(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportSalesByClient Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportSalesByClient(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportReturns Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportReturns(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportReturnsByType Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportReturnsByType(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportReturnsByProduct Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportReturnsByProduct(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportAbcAnalysis Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportAbcAnalysis(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });

    it('Given: empty userId When: exportDeadStock Then: should use system', async () => {
      const res = createMockResponse();
      await controller.exportDeadStock(dto, mockOrgId, '', res);
      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ exportedBy: 'system' })
      );
    });
  });

  // ============================================================
  // STREAM ENDPOINTS: additional branch coverage
  // ============================================================

  describe('streamSales additional branches', () => {
    it('Given: client disconnects When: streaming sales Then: should stop streaming', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          yield [{ saleId: 'sale-1', total: 100 }];
          res.closed = true;
          yield [{ saleId: 'sale-2', total: 200 }];
        })()
      );

      await controller.streamSales(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledTimes(1);
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: non-Error thrown When: streaming sales Then: should write generic error message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw 'string error';
        })()
      );

      await controller.streamSales(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: connection already closed When: stream sales error occurs Then: should not write', async () => {
      const res = createMockResponse();
      res.closed = true;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Sales stream failed');
        })()
      );

      await controller.streamSales(mockQuery, mockOrgId, res);

      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('Given: write fails during error handling When: streaming sales Then: should silently handle', async () => {
      const res = createMockResponse();
      res.write.mockImplementation(() => {
        throw new Error('Connection reset');
      });
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Sales stream failed');
        })()
      );

      await expect(controller.streamSales(mockQuery, mockOrgId, res)).resolves.toBeUndefined();
    });

    it('Given: empty stream When: streaming sales Then: should set headers and end', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // no data
        })()
      );

      await controller.streamSales(mockQuery, mockOrgId, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: stream with query params When: streaming sales Then: should pass mapped parameters', async () => {
      const res = createMockResponse();
      const queryWithParams = {
        dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
        productId: 'prod-sales',
      } as any;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // empty stream
        })()
      );

      await controller.streamSales(queryWithParams, mockOrgId, res);

      expect(mockStreamReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES',
          orgId: mockOrgId,
          parameters: expect.objectContaining({
            productId: 'prod-sales',
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
            },
          }),
        })
      );
    });
  });

  describe('streamReturns additional branches', () => {
    it('Given: client disconnects When: streaming returns Then: should stop streaming', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          yield [{ returnId: 'ret-1', reason: 'Defective' }];
          res.closed = true;
          yield [{ returnId: 'ret-2', reason: 'Wrong item' }];
        })()
      );

      await controller.streamReturns(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledTimes(1);
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: non-Error thrown When: streaming returns Then: should write generic error message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw 42;
        })()
      );

      await controller.streamReturns(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: connection already closed When: stream returns error occurs Then: should not write', async () => {
      const res = createMockResponse();
      res.closed = true;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Returns stream failed');
        })()
      );

      await controller.streamReturns(mockQuery, mockOrgId, res);

      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('Given: write fails during error handling When: streaming returns Then: should silently handle', async () => {
      const res = createMockResponse();
      res.write.mockImplementation(() => {
        throw new Error('Connection reset');
      });
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Returns stream failed');
        })()
      );

      await expect(controller.streamReturns(mockQuery, mockOrgId, res)).resolves.toBeUndefined();
    });

    it('Given: empty stream When: streaming returns Then: should set headers and end', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // no data
        })()
      );

      await controller.streamReturns(mockQuery, mockOrgId, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-ndjson');
      expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });

    it('Given: stream with query params When: streaming returns Then: should pass mapped parameters', async () => {
      const res = createMockResponse();
      const queryWithParams = {
        returnType: 'CUSTOMER',
        warehouseId: 'wh-returns',
      } as any;
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          // empty stream
        })()
      );

      await controller.streamReturns(queryWithParams, mockOrgId, res);

      expect(mockStreamReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS',
          orgId: mockOrgId,
          parameters: expect.objectContaining({
            returnType: 'CUSTOMER',
            warehouseId: 'wh-returns',
          }),
        })
      );
    });

    it('Given: multiple batches When: streaming returns Then: should write each item', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          yield [{ id: 'r1' }, { id: 'r2' }];
          yield [{ id: 'r3' }];
        })()
      );

      await controller.streamReturns(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledTimes(3);
      expect(res.write).toHaveBeenNthCalledWith(1, JSON.stringify({ id: 'r1' }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(2, JSON.stringify({ id: 'r2' }) + '\n');
      expect(res.write).toHaveBeenNthCalledWith(3, JSON.stringify({ id: 'r3' }) + '\n');
      expect(res.end).toHaveBeenCalled();
    });
  });

  // ============================================================
  // REPORT HISTORY: additional date branch coverage
  // ============================================================

  describe('getReportHistory additional date branches', () => {
    it('Given: only startDate provided When: getting history Then: should convert startDate and leave endDate undefined', async () => {
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      await controller.getReportHistory(
        undefined,
        undefined,
        undefined,
        '2024-06-15',
        undefined,
        mockOrgId
      );

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        status: undefined,
        generatedBy: undefined,
        startDate: new Date('2024-06-15'),
        endDate: undefined,
      });
    });

    it('Given: only endDate provided When: getting history Then: should leave startDate undefined and convert endDate', async () => {
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      await controller.getReportHistory(
        undefined,
        undefined,
        undefined,
        undefined,
        '2024-12-31',
        mockOrgId
      );

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        status: undefined,
        generatedBy: undefined,
        startDate: undefined,
        endDate: new Date('2024-12-31'),
      });
    });

    it('Given: only generatedBy filter When: getting history Then: should pass generatedBy with other filters undefined', async () => {
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      await controller.getReportHistory(
        undefined,
        undefined,
        'user-admin',
        undefined,
        undefined,
        mockOrgId
      );

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        status: undefined,
        generatedBy: 'user-admin',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('Given: only type filter When: getting history Then: should pass type with other filters undefined', async () => {
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      await controller.getReportHistory(
        'RETURNS',
        undefined,
        undefined,
        undefined,
        undefined,
        mockOrgId
      );

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: 'RETURNS',
        status: undefined,
        generatedBy: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('Given: only status filter When: getting history Then: should pass status with other filters undefined', async () => {
      const historyResponse = {
        success: true,
        data: [],
        message: 'Report history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReportsUseCase.execute.mockResolvedValue(ok(historyResponse));

      await controller.getReportHistory(
        undefined,
        'FAILED',
        undefined,
        undefined,
        undefined,
        mockOrgId
      );

      expect(mockGetReportsUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        type: undefined,
        status: 'FAILED',
        generatedBy: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  // ============================================================
  // handleExport: additional branch coverage for different formats and data
  // ============================================================

  describe('handleExport additional branch coverage', () => {
    it('Given: CSV export data When: exporting Then: should set CSV mimeType in headers', async () => {
      const csvExportData = {
        data: {
          buffer: Buffer.from('col1,col2\nval1,val2'),
          mimeType: 'text/csv',
          filename: 'report-2024-01-01.csv',
          size: 19,
        },
      };
      const dto = { format: 'CSV', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(csvExportData));

      await controller.exportSales(dto, mockOrgId, mockUserId, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="report-2024-01-01.csv"',
          'Content-Length': 19,
        })
      );
      expect(res.send).toHaveBeenCalledWith(csvExportData.data.buffer);
    });

    it('Given: PDF export data When: exporting Then: should set PDF mimeType in headers', async () => {
      const pdfExportData = {
        data: {
          buffer: Buffer.from('pdf-content'),
          mimeType: 'application/pdf',
          filename: 'report-2024-01-01.pdf',
          size: 11,
        },
      };
      const dto = { format: 'PDF', parameters: {} } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(pdfExportData));

      await controller.exportReturns(dto, mockOrgId, mockUserId, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="report-2024-01-01.pdf"',
          'Content-Length': 11,
        })
      );
      expect(res.send).toHaveBeenCalledWith(pdfExportData.data.buffer);
    });

    it('Given: export dto with saveMetadata false When: exporting Then: should pass saveMetadata false', async () => {
      const dto = {
        format: 'EXCEL',
        parameters: {},
        saveMetadata: false,
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          saveMetadata: false,
        })
      );
    });

    it('Given: export dto without options When: exporting Then: should pass undefined options', async () => {
      const dto = {
        format: 'EXCEL',
        parameters: {},
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      await controller.exportTurnover(dto, mockOrgId, mockUserId, res);

      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          options: undefined,
          saveMetadata: undefined,
        })
      );
    });
  });

  // ============================================================
  // mapDtoToParameters: additional branch coverage
  // ============================================================

  describe('mapDtoToParameters additional coverage', () => {
    it('Given: dto with parameters containing all fields When: exporting Then: should convert all fields', async () => {
      const dto = {
        format: 'EXCEL',
        parameters: {
          dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
          warehouseId: 'wh-100',
          productId: 'prod-200',
          category: 'Electronics',
          status: 'ACTIVE',
          returnType: 'SUPPLIER',
          groupBy: 'MONTH',
          period: 'QUARTERLY',
          movementType: 'IN',
          customerReference: 'REF-100',
          saleId: 'sale-100',
          movementId: 'mov-100',
          includeInactive: true,
          locationId: 'loc-100',
          severity: 'CRITICAL',
          deadStockDays: '180',
        },
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      await controller.exportAvailableInventory(dto, mockOrgId, mockUserId, res);

      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
            },
            warehouseId: 'wh-100',
            productId: 'prod-200',
            category: 'Electronics',
            status: 'ACTIVE',
            returnType: 'SUPPLIER',
            groupBy: 'MONTH',
            period: 'QUARTERLY',
            movementType: 'IN',
            customerReference: 'REF-100',
            saleId: 'sale-100',
            movementId: 'mov-100',
            includeInactive: true,
            locationId: 'loc-100',
            severity: 'CRITICAL',
            deadStockDays: 180,
          },
        })
      );
    });

    it('Given: dto with parameters without dateRange When: exporting Then: dateRange should be undefined', async () => {
      const dto = {
        format: 'CSV',
        parameters: {
          warehouseId: 'wh-no-dates',
        },
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      await controller.exportSalesByProduct(dto, mockOrgId, mockUserId, res);

      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            dateRange: undefined,
            warehouseId: 'wh-no-dates',
          }),
        })
      );
    });

    it('Given: dto with parameters without deadStockDays When: exporting Then: deadStockDays should be undefined', async () => {
      const dto = {
        format: 'EXCEL',
        parameters: {
          productId: 'prod-no-days',
        },
      } as any;
      const res = createMockResponse();
      mockExportReportUseCase.execute.mockResolvedValue(ok(mockExportData));

      await controller.exportDeadStock(dto, mockOrgId, mockUserId, res);

      expect(mockExportReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            deadStockDays: undefined,
            productId: 'prod-no-days',
          }),
        })
      );
    });
  });

  // ============================================================
  // mapQueryToParameters: additional branch coverage
  // ============================================================

  describe('mapQueryToParameters additional coverage via different endpoints', () => {
    beforeEach(() => {
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));
    });

    it('Given: query with all params via viewSalesByClient Then: should map all parameters', async () => {
      const fullQuery = {
        dateRange: { startDate: '2024-02-01', endDate: '2024-02-28' },
        warehouseId: 'wh-client',
        productId: 'prod-client',
        category: 'Clothing',
        status: 'CONFIRMED',
        groupBy: 'CUSTOMER',
        period: 'YEARLY',
        includeInactive: false,
        locationId: 'loc-client',
      } as any;

      await controller.viewSalesByClient(fullQuery, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SALES_BY_CLIENT',
          parameters: expect.objectContaining({
            dateRange: {
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-02-28'),
            },
            warehouseId: 'wh-client',
            productId: 'prod-client',
            category: 'Clothing',
            status: 'CONFIRMED',
            groupBy: 'CUSTOMER',
            period: 'YEARLY',
            includeInactive: false,
            locationId: 'loc-client',
          }),
        })
      );
    });

    it('Given: query with severity WARNING via viewLowStock Then: should pass WARNING severity', async () => {
      const queryWithWarning = { severity: 'WARNING' } as any;
      await controller.viewLowStock(queryWithWarning, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            severity: 'WARNING',
          }),
        })
      );
    });

    it('Given: query with groupBy DAY via viewSalesByProduct Then: should pass DAY groupBy', async () => {
      const queryWithGroupBy = { groupBy: 'DAY' } as any;
      await controller.viewSalesByProduct(queryWithGroupBy, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'DAY',
          }),
        })
      );
    });

    it('Given: query with groupBy WEEK via viewSalesByWarehouse Then: should pass WEEK groupBy', async () => {
      const queryWithGroupBy = { groupBy: 'WEEK' } as any;
      await controller.viewSalesByWarehouse(queryWithGroupBy, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'WEEK',
          }),
        })
      );
    });

    it('Given: query with groupBy PRODUCT via viewReturns Then: should pass PRODUCT groupBy', async () => {
      const queryWithGroupBy = { groupBy: 'PRODUCT' } as any;
      await controller.viewReturns(queryWithGroupBy, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'PRODUCT',
          }),
        })
      );
    });

    it('Given: query with groupBy WAREHOUSE via viewReturnsByType Then: should pass WAREHOUSE groupBy', async () => {
      const queryWithGroupBy = { groupBy: 'WAREHOUSE' } as any;
      await controller.viewReturnsByType(queryWithGroupBy, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'WAREHOUSE',
          }),
        })
      );
    });

    it('Given: query with groupBy TYPE via viewReturnsByProduct Then: should pass TYPE groupBy', async () => {
      const queryWithGroupBy = { groupBy: 'TYPE' } as any;
      await controller.viewReturnsByProduct(queryWithGroupBy, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            groupBy: 'TYPE',
          }),
        })
      );
    });

    it('Given: query with returnType SUPPLIER via viewReturnsByType Then: should pass SUPPLIER returnType', async () => {
      const queryWithReturnType = { returnType: 'SUPPLIER' } as any;
      await controller.viewReturnsByType(queryWithReturnType, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            returnType: 'SUPPLIER',
          }),
        })
      );
    });

    it('Given: query with period YEARLY via viewAbcAnalysis Then: should pass YEARLY period', async () => {
      const queryWithPeriod = { period: 'YEARLY' } as any;
      await controller.viewAbcAnalysis(queryWithPeriod, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            period: 'YEARLY',
          }),
        })
      );
    });

    it('Given: query with period QUARTERLY via viewFinancial Then: should pass QUARTERLY period', async () => {
      const queryWithPeriod = { period: 'QUARTERLY' } as any;
      await controller.viewFinancial(queryWithPeriod, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            period: 'QUARTERLY',
          }),
        })
      );
    });

    it('Given: query with customerReference via viewCustomerReturns Then: should pass customerReference', async () => {
      const queryWithRef = { customerReference: 'CUST-500' } as any;
      await controller.viewCustomerReturns(queryWithRef, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            customerReference: 'CUST-500',
          }),
        })
      );
    });

    it('Given: query with deadStockDays 0 via viewDeadStock Then: should convert to number 0', async () => {
      const queryWithZero = { deadStockDays: '0' } as any;
      await controller.viewDeadStock(queryWithZero, mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            deadStockDays: 0,
          }),
        })
      );
    });
  });

  // ============================================================
  // handleStream: error logging branch for instanceof Error
  // ============================================================

  describe('handleStream error instanceof Error branch in logger', () => {
    it('Given: Error instance thrown When: streaming Then: should log error message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw new Error('Specific error message');
        })()
      );

      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Specific error message' }) + '\n'
      );
    });

    it('Given: non-Error thrown When: streaming with open connection Then: should write generic message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw { code: 'UNKNOWN', details: 'something' };
        })()
      );

      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
    });

    it('Given: null thrown When: streaming Then: should write generic error message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw null;
        })()
      );

      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
    });

    it('Given: undefined thrown When: streaming Then: should write generic error message', async () => {
      const res = createMockResponse();
      mockStreamReportUseCase.execute.mockReturnValue(
        (async function* () {
          throw undefined;
        })()
      );

      await controller.streamAvailableInventory(mockQuery, mockOrgId, res);

      expect(res.write).toHaveBeenCalledWith(
        JSON.stringify({ error: true, message: 'Failed to stream report' }) + '\n'
      );
    });
  });

  // ============================================================
  // viewReturnsBySale: additional param coverage
  // ============================================================

  describe('viewReturnsBySale additional coverage', () => {
    it('Given: query with dateRange and saleId param When: viewing returns by sale Then: should merge saleId with query params', async () => {
      mockViewReportUseCase.execute.mockResolvedValue(ok(mockReportData));
      const queryWithDates = {
        dateRange: { startDate: '2024-01-01', endDate: '2024-06-30' },
        warehouseId: 'wh-sale',
      } as any;

      await controller.viewReturnsBySale(queryWithDates, 'sale-456', mockOrgId, mockUserId);

      expect(mockViewReportUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RETURNS_BY_SALE',
          parameters: expect.objectContaining({
            saleId: 'sale-456',
            warehouseId: 'wh-sale',
            dateRange: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-06-30'),
            },
          }),
        })
      );
    });
  });
});
