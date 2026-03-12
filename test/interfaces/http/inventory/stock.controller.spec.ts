/* eslint-disable @typescript-eslint/no-explicit-any */
import { StockController } from '@interface/http/inventory/stock.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError } from '@shared/domain/result/domainError';

describe('StockController', () => {
  let controller: StockController;
  let mockGetStockUseCase: any;

  const mockStockData = [
    {
      productId: 'prod-1',
      warehouseId: 'wh-1',
      quantity: 100,
      averageCost: 25.5,
      totalValue: 2550,
      currency: 'USD',
    },
    {
      productId: 'prod-2',
      warehouseId: 'wh-1',
      quantity: 50,
      averageCost: 10.0,
      totalValue: 500,
      currency: 'USD',
    },
  ];

  beforeEach(() => {
    mockGetStockUseCase = { execute: jest.fn() };

    controller = new StockController(mockGetStockUseCase);
  });

  describe('getStock', () => {
    it('Given: no filters When: getting stock Then: should return all stock items', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'Stock retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = (await controller.getStock('org-123')) as any;

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('Given: warehouseId filter When: getting stock Then: should split comma-separated warehouseIds', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockStockData[0]],
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', 'wh-1,wh-2');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          warehouseIds: ['wh-1', 'wh-2'],
        })
      );
    });

    it('Given: productId filter When: getting stock Then: should pass productId to use case', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockStockData[0]],
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', undefined, 'prod-1');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          productId: 'prod-1',
        })
      );
    });

    it('Given: lowStock=true filter When: getting stock Then: should convert string to boolean', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({ success: true, data: [], message: 'OK', timestamp: new Date().toISOString() })
      );

      // Act
      await controller.getStock('org-123', undefined, undefined, 'true');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          lowStock: true,
        })
      );
    });

    it('Given: lowStock=false filter When: getting stock Then: should convert string to boolean false', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', undefined, undefined, 'false');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          lowStock: false,
        })
      );
    });

    it('Given: sortBy and sortOrder When: getting stock Then: should pass sort params to use case', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock(
        'org-123',
        undefined,
        undefined,
        undefined,
        undefined,
        'quantity',
        'desc'
      );

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'quantity',
          sortOrder: 'desc',
        })
      );
    });

    it('Given: no warehouseId When: getting stock Then: warehouseIds should be undefined', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          warehouseIds: undefined,
        })
      );
    });

    it('Given: companyId filter When: getting stock Then: should pass companyId to use case', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', undefined, undefined, undefined, 'company-456');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          companyId: 'company-456',
        })
      );
    });

    it('Given: single warehouseId When: getting stock Then: should create array with single element', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockStockData[0]],
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', 'wh-1');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseIds: ['wh-1'],
        })
      );
    });

    it('Given: warehouseId with spaces When: getting stock Then: should trim ids', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', 'wh-1 , wh-2 ');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseIds: ['wh-1', 'wh-2'],
        })
      );
    });

    it('Given: warehouseId with empty segments When: getting stock Then: should filter empty strings', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123', 'wh-1,,wh-2,');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseIds: ['wh-1', 'wh-2'],
        })
      );
    });

    it('Given: lowStock undefined When: getting stock Then: should pass false', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock('org-123');

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          lowStock: false,
        })
      );
    });

    it('Given: use case error When: getting stock Then: should throw', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve stock'))
      );

      // Act & Assert
      await expect(controller.getStock('org-123')).rejects.toThrow();
    });

    it('Given: use case rejects When: getting stock Then: should propagate error', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getStock('org-123')).rejects.toThrow('Database error');
    });

    it('Given: all params When: getting stock Then: should pass all to use case', async () => {
      // Arrange
      mockGetStockUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockStockData,
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getStock(
        'org-123',
        'wh-1',
        'prod-1',
        'true',
        'company-1',
        'quantity',
        'desc'
      );

      // Assert
      expect(mockGetStockUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        warehouseIds: ['wh-1'],
        productId: 'prod-1',
        companyId: 'company-1',
        lowStock: true,
        sortBy: 'quantity',
        sortOrder: 'desc',
      });
    });
  });
});
