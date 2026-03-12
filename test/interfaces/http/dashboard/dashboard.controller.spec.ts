/* eslint-disable @typescript-eslint/no-explicit-any */
import { DashboardController } from '@interface/http/dashboard/dashboard.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockGetDashboardMetricsUseCase: any;

  const mockMetricsData = {
    success: true,
    message: 'Dashboard metrics retrieved',
    data: {
      inventorySummary: { totalProducts: 100, totalCategories: 10, totalWarehouses: 5 },
      lowStockCount: 3,
      monthlySales: { total: 50000, count: 120 },
      salesTrend: [
        { date: '2026-02-21', total: 7000, count: 15 },
        { date: '2026-02-22', total: 8000, count: 18 },
      ],
      topProducts: [{ productId: 'prod-1', name: 'Product A', totalSold: 200, revenue: 20000 }],
      stockByWarehouse: [{ warehouseId: 'wh-1', name: 'Main Warehouse', totalStock: 5000 }],
      recentActivity: [{ id: 'act-1', type: 'SALE', description: 'Sale #001 created' }],
    },
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetDashboardMetricsUseCase = { execute: jest.fn() };

    controller = new DashboardController(mockGetDashboardMetricsUseCase);
  });

  describe('getMetrics', () => {
    it('Given: valid orgId When: getting metrics Then: should return dashboard metrics', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(ok(mockMetricsData));

      // Act
      const result = await controller.getMetrics('org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).inventorySummary).toBeDefined();
      expect((result.data as any).lowStockCount).toBe(3);
      expect(mockGetDashboardMetricsUseCase.execute).toHaveBeenCalledWith({ orgId: 'org-123' });
    });

    it('Given: valid orgId When: getting metrics Then: should pass orgId to use case', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(ok(mockMetricsData));

      // Act
      await controller.getMetrics('org-456');

      // Assert
      expect(mockGetDashboardMetricsUseCase.execute).toHaveBeenCalledWith({ orgId: 'org-456' });
    });

    it('Given: use case returns error When: getting metrics Then: should throw', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve dashboard metrics'))
      );

      // Act & Assert
      await expect(controller.getMetrics('org-123')).rejects.toThrow();
    });

    it('Given: use case rejects When: getting metrics Then: should propagate error', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(controller.getMetrics('org-123')).rejects.toThrow('Database connection failed');
    });

    it('Given: empty metrics data When: getting metrics Then: should return empty data', async () => {
      // Arrange
      const emptyMetrics = {
        success: true,
        message: 'Dashboard metrics retrieved',
        data: {
          inventorySummary: { totalProducts: 0, totalCategories: 0, totalWarehouses: 0 },
          lowStockCount: 0,
          monthlySales: { total: 0, count: 0 },
          salesTrend: [],
          topProducts: [],
          stockByWarehouse: [],
          recentActivity: [],
        },
        timestamp: new Date().toISOString(),
      };
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(ok(emptyMetrics));

      // Act
      const result = await controller.getMetrics('org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.salesTrend).toHaveLength(0);
      expect(result.data.topProducts).toHaveLength(0);
    });

    it('Given: companyId filter When: getting metrics Then: should pass companyId to use case', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(ok(mockMetricsData));

      // Act
      const result = await controller.getMetrics('org-123', 'company-456');

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetDashboardMetricsUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        companyId: 'company-456',
      });
    });

    it('Given: no companyId When: getting metrics Then: should pass undefined companyId', async () => {
      // Arrange
      mockGetDashboardMetricsUseCase.execute.mockResolvedValue(ok(mockMetricsData));

      // Act
      await controller.getMetrics('org-123', undefined);

      // Assert
      expect(mockGetDashboardMetricsUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        companyId: undefined,
      });
    });
  });
});
